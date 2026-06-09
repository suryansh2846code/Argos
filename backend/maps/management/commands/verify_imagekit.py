"""
Management command: verify_imagekit

Verifies ImageKit connectivity end-to-end:
  1. Load credentials from settings
  2. Initialise ImageKit v5 client
  3. Upload a tiny test PNG
  4. Print returned CDN URL
  5. Delete the test file
  6. Print overall pass/fail

Usage:
    cd backend
    source venv/bin/activate
    python manage.py verify_imagekit
"""

import base64
import io
import sys

from django.core.management.base import BaseCommand


# 1×1 transparent PNG (67 bytes) — smallest valid PNG, no Pillow required
_TINY_PNG_B64 = (
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=='
)


class Command(BaseCommand):
    help = 'Verify ImageKit credentials and end-to-end upload/delete connectivity.'

    def handle(self, *args, **options):
        self.stdout.write('\n── ImageKit Verification ──────────────────────────────\n')

        # ── Step 1: Check credentials ──────────────────────────────────────
        self._step('1. Checking credentials from settings...')
        try:
            from maps.imagekit_service import _get_credentials
            priv, pub, url = _get_credentials()
            self._ok(f'   private_key : {priv[:12]}...{priv[-4:]}')
            self._ok(f'   public_key  : {pub[:12]}...')
            self._ok(f'   url_endpoint: {url}')
        except Exception as exc:
            self._fail(f'   Credentials check FAILED: {exc}')
            sys.exit(1)

        # ── Step 2: Initialise client ──────────────────────────────────────
        self._step('2. Initialising ImageKit v5 client...')
        try:
            from maps.imagekit_service import _get_client
            ik = _get_client()
            self._ok(f'   Client initialised: {type(ik).__name__}')
        except Exception as exc:
            self._fail(f'   Client init FAILED: {exc}')
            sys.exit(1)

        # ── Step 3: Upload test file ───────────────────────────────────────
        self._step('3. Uploading 1×1 test PNG to ImageKit...')
        file_id  = None
        cdn_url  = None
        try:
            png_bytes  = base64.b64decode(_TINY_PNG_B64)
            file_io    = io.BytesIO(png_bytes)
            file_io.name = 'argos_verify_test.png'

            response = ik.files.upload(
                file=file_io,
                file_name='argos_verify_test.png',
                public_key=pub,
                folder='/argos/_verify',
                use_unique_file_name=True,
                tags=['verify', 'argos'],
            )
            file_id = response.file_id
            cdn_url = response.url
            self._ok(f'   Upload SUCCESS')
            self._ok(f'   CDN URL  : {cdn_url}')
            self._ok(f'   File ID  : {file_id}')
            if response.thumbnail_url:
                self._ok(f'   Thumbnail: {response.thumbnail_url}')
        except Exception as exc:
            self._fail(f'   Upload FAILED: {exc}')
            sys.exit(1)

        # ── Step 4: Delete test file ───────────────────────────────────────
        self._step('4. Deleting test file from ImageKit...')
        try:
            ik.files.delete(file_id)
            self._ok(f'   Delete SUCCESS | file_id={file_id}')
        except Exception as exc:
            self._fail(f'   Delete FAILED (file may remain on CDN): {exc}')
            # Non-fatal — credentials clearly work if upload succeeded

        # ── Summary ───────────────────────────────────────────────────────
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✓ ImageKit integration is working correctly.\n'))

    # ── Helpers ───────────────────────────────────────────────────────────

    def _step(self, msg: str) -> None:
        self.stdout.write(self.style.HTTP_INFO(msg))

    def _ok(self, msg: str) -> None:
        self.stdout.write(self.style.SUCCESS(msg))

    def _fail(self, msg: str) -> None:
        self.stdout.write(self.style.ERROR(msg))
