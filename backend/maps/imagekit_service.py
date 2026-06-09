"""
ImageKit service module for Argos — compatible with imagekitio==5.6.0

v5 SDK was completely rewritten (Stainless / OpenAPI-generated).
Key API differences from v4:
  - ImageKit(private_key=...)          ← no public_key, no url_endpoint in constructor
  - ik.files.upload(file, file_name, public_key=..., folder=..., ...)
  - ik.files.delete(file_id)          ← positional first arg, not keyword
  - Response fields: response.url, response.file_id, response.thumbnail_url
"""

import io
import logging
import mimetypes

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
#  File size limits (enforced before upload)
# ─────────────────────────────────────────────────────────────────────────────

MAX_FILE_SIZE = {
    'image': 10 * 1024 * 1024,   # 10 MB
    'gif':   10 * 1024 * 1024,   # 10 MB
    'video': 100 * 1024 * 1024,  # 100 MB
}

# ─────────────────────────────────────────────────────────────────────────────
#  Allowed MIME types per attachment category
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {
    'image': {
        'image/jpeg', 'image/png', 'image/webp',
        'image/avif', 'image/svg+xml', 'image/tiff', 'image/bmp',
    },
    'gif': {
        'image/gif',
        'image/webp',   # animated webp
    },
    'video': {
        'video/mp4', 'video/webm', 'video/ogg',
        'video/quicktime',   # .mov
        'video/x-msvideo',   # .avi
        'video/x-matroska',  # .mkv
        'video/3gpp',
    },
}

# Explicitly forbidden types (belt-and-suspenders security layer)
BLOCKED_MIME_TYPES = {
    'application/octet-stream', 'application/zip', 'application/x-tar',
    'application/x-sh', 'application/x-python', 'text/html',
    'text/javascript', 'application/javascript',
}
BLOCKED_MIME_PREFIXES = ('application/x-', 'text/x-')


# ─────────────────────────────────────────────────────────────────────────────
#  Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_credentials() -> tuple[str, str, str]:
    """
    Return (private_key, public_key, url_endpoint) from Django settings.
    Raises ImproperlyConfigured if any are missing.
    """
    pub  = getattr(settings, 'IMAGEKIT_PUBLIC_KEY', '')
    priv = getattr(settings, 'IMAGEKIT_PRIVATE_KEY', '')
    url  = getattr(settings, 'IMAGEKIT_URL_ENDPOINT', '')

    if not all([pub, priv, url]):
        missing = [k for k, v in [
            ('IMAGEKIT_PUBLIC_KEY', pub),
            ('IMAGEKIT_PRIVATE_KEY', priv),
            ('IMAGEKIT_URL_ENDPOINT', url),
        ] if not v]
        raise ImproperlyConfigured(
            f'ImageKit is not fully configured. Missing: {", ".join(missing)}. '
            'Set them in backend/.env or as environment variables.'
        )
    return priv, pub, url


def _get_client():
    """
    Return an authenticated ImageKit v5 client.

    In imagekitio==5.6.0 the constructor only accepts `private_key`.
    The `public_key` is passed per-upload call; `url_endpoint` defines the
    CDN base URL but is not a constructor argument.
    """
    from imagekitio import ImageKit

    priv, _pub, _url = _get_credentials()
    return ImageKit(private_key=priv)


def _detect_mime(file) -> str:
    """Return MIME type from content_type attribute or filename guess."""
    ct = getattr(file, 'content_type', None)
    if ct:
        return ct.split(';')[0].strip().lower()
    guessed, _ = mimetypes.guess_type(getattr(file, 'name', ''))
    return (guessed or '').lower()


# ─────────────────────────────────────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────────────────────────────────────

def validate_upload(file, attachment_type: str) -> None:
    """
    Validate file size and MIME type before hitting ImageKit.
    Raises ValueError with a user-friendly message on failure.
    Called by perform_create in views.py.
    """
    # ── Size check ──
    size_limit = MAX_FILE_SIZE.get(attachment_type)
    if size_limit and hasattr(file, 'size') and file.size > size_limit:
        limit_mb  = size_limit // (1024 * 1024)
        actual_mb = file.size / (1024 * 1024)
        raise ValueError(
            f'{attachment_type.capitalize()} files must be under {limit_mb} MB. '
            f'Your file is {actual_mb:.1f} MB.'
        )

    # ── MIME type check ──
    mime = _detect_mime(file)

    # Hard-blocked types
    if mime in BLOCKED_MIME_TYPES:
        raise ValueError(f'File type "{mime}" is not allowed for security reasons.')
    for prefix in BLOCKED_MIME_PREFIXES:
        if mime.startswith(prefix):
            raise ValueError(f'File type "{mime}" is not allowed for security reasons.')

    # Allowlist check
    allowed = ALLOWED_MIME_TYPES.get(attachment_type)
    if allowed and mime not in allowed:
        raise ValueError(
            f'Unsupported file type "{mime or "unknown"}" for {attachment_type}. '
            f'Allowed: {", ".join(sorted(allowed))}.'
        )


def upload_to_imagekit(file, filename: str, folder: str, attachment_type: str) -> dict:
    """
    Validate then upload a file to ImageKit using the v5 SDK.

    imagekitio v5 upload call:
        ik.files.upload(
            file=<bytes | base64 str | URL>,
            file_name=<str>,
            public_key=<str>,   ← required per-call
            folder=<str>,
            use_unique_file_name=True,
            tags=[...],
        )

    Args:
        file:            Django UploadedFile
        filename:        Original filename (used as base name on ImageKit)
        folder:          Target folder, e.g. '/argos/maps/{map_id}/nodes/{node_id}'
        attachment_type: 'image' | 'gif' | 'video'

    Returns:
        {   
            'url':           str   — full CDN URL
            'file_id':       str   — ImageKit fileId (for deletion)
            'thumbnail_url': str | None  — 400×300 transform URL for images/GIFs
        }

    Raises:
        ValueError:             On size / MIME validation failure (→ HTTP 400)
        ImproperlyConfigured:   If credentials are missing (→ HTTP 500)
        Exception:              On ImageKit API errors (→ HTTP 500, logged)
    """
    validate_upload(file, attachment_type)

    _priv, pub, _url = _get_credentials()
    ik = _get_client()

    # Read bytes and wrap in BytesIO (required by imagekitio v5 SDK)
    if hasattr(file, 'seek'):
        file.seek(0)
    raw_bytes = file.read()
    file_io = io.BytesIO(raw_bytes)
    file_io.name = filename  # SDK uses .name to determine content type

    logger.info(
        'ImageKit upload starting | type=%s | folder=%s | size=%d bytes',
        attachment_type, folder, len(raw_bytes),
    )

    try:
        response = ik.files.upload(
            file=file_io,
            file_name=filename,
            public_key=pub,
            folder=folder,
            use_unique_file_name=True,
            tags=[attachment_type, 'argos'],
        )
    except Exception as exc:
        logger.error(
            'ImageKit upload FAILED | type=%s | folder=%s | error=%s',
            attachment_type, folder, exc,
        )
        raise

    cdn_url = response.url
    file_id = response.file_id

    # Use ImageKit's built-in thumbnail (returned by API) when available,
    # or construct one via URL transformation parameters.
    thumbnail_url = None
    if attachment_type in ('image', 'gif') and cdn_url:
        # Prefer the API-returned thumbnail; fall back to URL transform
        thumbnail_url = response.thumbnail_url or f'{cdn_url}?tr=w-400,h-300,c-at_max'

    logger.info(
        'ImageKit upload SUCCESS | file_id=%s | url=%s',
        file_id, cdn_url,
    )

    return {
        'url':           cdn_url,
        'file_id':       file_id,
        'thumbnail_url': thumbnail_url,
    }


def delete_from_imagekit(file_id: str) -> None:
    """
    Delete a file from ImageKit by fileId.

    imagekitio v5 delete call:
        ik.files.delete(file_id)   ← positional first arg

    Best-effort: logs a warning on failure but never raises,
    so a CDN delete failure never blocks a DB row deletion.
    """
    if not file_id:
        return

    try:
        ik = _get_client()
        ik.files.delete(file_id)
        logger.info('ImageKit delete SUCCESS | file_id=%s', file_id)
    except Exception as exc:
        logger.warning(
            'ImageKit delete failed (file may already be gone) | file_id=%s | error=%s',
            file_id, exc,
        )
