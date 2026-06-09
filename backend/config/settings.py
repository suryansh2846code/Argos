"""
Django settings for Argos.

All sensitive values are read from environment variables.
Never hardcode credentials here.

Local development:  set values in backend/.env  (loaded by python-dotenv)
Production:         set values in Railway environment variables dashboard
"""

from datetime import timedelta
from pathlib import Path
import os

# ─────────────────────────────────────────────────────────────────────────────
# Load .env for local development
# ─────────────────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / '.env')
except ImportError:
    pass  # python-dotenv not installed — env vars must be set manually


# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent


# ─────────────────────────────────────────────────────────────────────────────
# Core security settings  ← ALL from environment variables
# ─────────────────────────────────────────────────────────────────────────────

# SECURITY WARNING: keep the secret key used in production secret!
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(50))"
SECRET_KEY = os.environ.get('SECRET_KEY', '')
if not SECRET_KEY:
    raise RuntimeError(
        'SECRET_KEY environment variable is not set. '
        'Add it to backend/.env for local dev or Railway Variables for production.'
    )

# SECURITY WARNING: set DEBUG=False in production!
DEBUG = os.environ.get('DEBUG', 'False').strip().lower() in ('true', '1', 'yes')

# Comma-separated list of hosts, e.g.:
#   ALLOWED_HOSTS=your-app.up.railway.app,your-custom-domain.com
_allowed_hosts_env = os.environ.get('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts_env.split(',') if h.strip()]

# Allow localhost in development
if DEBUG:
    ALLOWED_HOSTS += ['localhost', '127.0.0.1', '0.0.0.0']

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ─────────────────────────────────────────────────────────────────────────────
# Application definition
# ─────────────────────────────────────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'maps',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',        # must be first
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',    # static files in production
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# ─────────────────────────────────────────────────────────────────────────────
# Database
# Railway sets DATABASE_URL automatically when you attach a PostgreSQL plugin.
# Local fallback uses your local postgres credentials via .env.
# ─────────────────────────────────────────────────────────────────────────────
import dj_database_url

_DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql://postgres:singh@localhost:5432/argos'  # local dev default
)

DATABASES = {
    'default': dj_database_url.config(
        default=_DATABASE_URL,
        conn_max_age=600,       # persistent connections (60 seconds idle)
        conn_health_checks=True,
    )
}


# ─────────────────────────────────────────────────────────────────────────────
# CORS
# In production, restrict to your Vercel frontend domain only.
# CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
# ─────────────────────────────────────────────────────────────────────────────
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    _cors_env = os.environ.get('CORS_ALLOWED_ORIGINS', '')
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_env.split(',') if o.strip()]
    if not CORS_ALLOWED_ORIGINS:
        raise RuntimeError(
            'CORS_ALLOWED_ORIGINS must be set in production. '
            'Example: https://your-app.vercel.app'
        )


# ─────────────────────────────────────────────────────────────────────────────
# Password validation
# ─────────────────────────────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ─────────────────────────────────────────────────────────────────────────────
# Internationalisation
# ─────────────────────────────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# ─────────────────────────────────────────────────────────────────────────────
# Static & media files
# WhiteNoise serves static files directly from gunicorn (no Nginx required).
# Media files (legacy local uploads) stay on disk; new uploads go to ImageKit.
# ─────────────────────────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# ─────────────────────────────────────────────────────────────────────────────
# HTTPS / security headers (enforced when DEBUG=False)
# Railway terminates TLS at the load balancer — use SECURE_PROXY_SSL_HEADER.
# ─────────────────────────────────────────────────────────────────────────────
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000          # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'


# ─────────────────────────────────────────────────────────────────────────────
# REST Framework
# ─────────────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_RENDERER_CLASSES': (
        ['rest_framework.renderers.JSONRenderer']
        if not DEBUG
        else [
            'rest_framework.renderers.JSONRenderer',
            'rest_framework.renderers.BrowsableAPIRenderer',
        ]
    ),
}


# ─────────────────────────────────────────────────────────────────────────────
# JWT
# ─────────────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}


# ─────────────────────────────────────────────────────────────────────────────
# ImageKit CDN storage
# Set in backend/.env (local) or Railway Variables (production).
# ─────────────────────────────────────────────────────────────────────────────
IMAGEKIT_PUBLIC_KEY   = os.environ.get('IMAGEKIT_PUBLIC_KEY',   '')
IMAGEKIT_PRIVATE_KEY  = os.environ.get('IMAGEKIT_PRIVATE_KEY',  '')
IMAGEKIT_URL_ENDPOINT = os.environ.get('IMAGEKIT_URL_ENDPOINT', '')


# ─────────────────────────────────────────────────────────────────────────────
# Logging
# Development: DEBUG level to console.
# Production:  WARNING+ to console (Railway captures stdout).
# ─────────────────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG' if DEBUG else 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO' if DEBUG else 'WARNING',
            'propagate': False,
        },
        'maps': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}