"""
ImageKit service module for Argos.

All ImageKit API calls are centralised here so views stay clean.
Upload → returns { url, file_id, thumbnail_url }
Delete → best-effort, logs on failure (never crashes a user-facing request)
"""

import logging
import mimetypes

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
#  File size limits
# ─────────────────────────────────────────────────────────────────────────────

MAX_FILE_SIZE = {
    'image': 10 * 1024 * 1024,   # 10 MB
    'gif':   10 * 1024 * 1024,   # 10 MB
    'video': 100 * 1024 * 1024,  # 100 MB
}

# ─────────────────────────────────────────────────────────────────────────────
#  Allowed MIME types per attachment type
#  Any type NOT in this list is rejected immediately.
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {
    'image': {
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif',
        'image/svg+xml',
        'image/tiff',
        'image/bmp',
    },
    'gif': {
        'image/gif',
        'image/webp',  # animated webp treated as gif
    },
    'video': {
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',      # .mov
        'video/x-msvideo',      # .avi
        'video/x-matroska',     # .mkv
        'video/3gpp',
    },
}

# Explicitly forbidden MIME prefixes (belt-and-suspenders)
BLOCKED_MIME_PREFIXES = (
    'application/x-',  # executables, scripts
    'text/x-',         # scripts
)
BLOCKED_MIME_TYPES = {
    'application/octet-stream',
    'application/zip',
    'application/x-tar',
    'application/x-sh',
    'application/x-python',
    'text/html',
    'text/javascript',
    'application/javascript',
}


def _get_client():
    """Return an authenticated ImageKit client. Raises ImproperlyConfigured if creds missing."""
    from imagekitio import ImageKit

    pub  = getattr(settings, 'IMAGEKIT_PUBLIC_KEY', '')
    priv = getattr(settings, 'IMAGEKIT_PRIVATE_KEY', '')
    url  = getattr(settings, 'IMAGEKIT_URL_ENDPOINT', '')

    if not all([pub, priv, url]):
        raise ImproperlyConfigured(
            'ImageKit is not configured. '
            'Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT '
            'in your environment or .env file.'
        )

    return ImageKit(public_key=pub, private_key=priv, url_endpoint=url)


def _detect_mime(file) -> str:
    """Return MIME type from content_type attribute or filename guess."""
    ct = getattr(file, 'content_type', None)
    if ct:
        return ct.split(';')[0].strip().lower()
    guessed, _ = mimetypes.guess_type(getattr(file, 'name', ''))
    return (guessed or '').lower()


def validate_upload(file, attachment_type: str) -> None:
    """
    Validate file size and MIME type before upload.
    Raises ValueError with a user-friendly message on failure.
    """
    # ── Size check ──
    size_limit = MAX_FILE_SIZE.get(attachment_type)
    if size_limit and hasattr(file, 'size') and file.size > size_limit:
        limit_mb = size_limit // (1024 * 1024)
        actual_mb = file.size / (1024 * 1024)
        raise ValueError(
            f'{attachment_type.capitalize()} files must be under {limit_mb} MB. '
            f'Your file is {actual_mb:.1f} MB.'
        )

    # ── MIME type check ──
    mime = _detect_mime(file)

    # Blocked types first (belt-and-suspenders)
    if mime in BLOCKED_MIME_TYPES:
        raise ValueError(f'File type "{mime}" is not allowed for security reasons.')
    for prefix in BLOCKED_MIME_PREFIXES:
        if mime.startswith(prefix):
            raise ValueError(f'File type "{mime}" is not allowed for security reasons.')

    # Allowed types check
    allowed = ALLOWED_MIME_TYPES.get(attachment_type)
    if allowed and mime not in allowed:
        raise ValueError(
            f'Unsupported file type "{mime or "unknown"}" for {attachment_type}. '
            f'Allowed: {", ".join(sorted(allowed))}.'
        )


def upload_to_imagekit(file, filename: str, folder: str, attachment_type: str) -> dict:
    """
    Validate and upload a file to ImageKit.

    Args:
        file:            Django UploadedFile object
        filename:        Original filename (used as base name on ImageKit)
        folder:          Target folder path, e.g. '/argos/maps/{map_id}/nodes/{node_id}'
        attachment_type: 'image' | 'gif' | 'video'

    Returns:
        {
            'url':           str  — full CDN URL
            'file_id':       str  — ImageKit fileId (for future deletion)
            'thumbnail_url': str | None  — transformation URL (images/gifs only)
        }

    Raises:
        ValueError:             On size / MIME type validation failure
        ImproperlyConfigured:   If ImageKit credentials are missing
        Exception:              On ImageKit API errors (propagated to view)
    """
    validate_upload(file, attachment_type)

    ik = _get_client()

    # Read file bytes
    if hasattr(file, 'seek'):
        file.seek(0)
    file_bytes = file.read()

    # Upload via SDK
    from imagekitio.models.UploadFileRequestOptions import UploadFileRequestOptions

    response = ik.upload_file(
        file=file_bytes,
        file_name=filename,
        options=UploadFileRequestOptions(
            folder=folder,
            use_unique_file_name=True,
            tags=[attachment_type],
        ),
    )

    cdn_url  = response.url
    file_id  = response.file_id

    # ImageKit URL-based thumbnail transformation (images and gifs only)
    # Uses ImageKit's transformation syntax: w-400,h-300,c-at_max (contain, max 400×300)
    thumbnail_url = None
    if attachment_type in ('image', 'gif') and cdn_url:
        thumbnail_url = f'{cdn_url}?tr=w-400,h-300,c-at_max'

    logger.info(
        'ImageKit upload success | file_id=%s | type=%s | folder=%s',
        file_id, attachment_type, folder,
    )

    return {
        'url':           cdn_url,
        'file_id':       file_id,
        'thumbnail_url': thumbnail_url,
    }


def delete_from_imagekit(file_id: str) -> None:
    """
    Delete a file from ImageKit by fileId.
    Best-effort: logs a warning on failure but never raises,
    so a failed CDN delete never blocks a DB row deletion.
    """
    if not file_id:
        return

    try:
        ik = _get_client()
        ik.delete_file(file_id)
        logger.info('ImageKit delete success | file_id=%s', file_id)
    except Exception as exc:
        logger.warning(
            'ImageKit delete failed (file may already be gone) | file_id=%s | error=%s',
            file_id, exc,
        )
