# Argos — Interactive Mind Mapping & Visual Knowledge Board

Argos is a visual collaboration tool that allows users to create interactive node-link mind maps, attach media (images/videos) or external resources, and vote on nodes. It is designed to run with a Django Rest Framework (DRF) backend and a React (Create React App / Tailwind CSS) frontend.

---

## Repository Structure

```
argos/
├── backend/               # Django API Backend
│   ├── config/            # Settings, routing, WSGI/ASGI entrypoints
│   ├── maps/              # Maps app (Models, Views, Serializers, ImageKit integrations)
│   ├── requirements.txt   # Python production dependencies
│   ├── Procfile           # Railway process definition
│   └── nixpacks.toml      # Railway build definition
├── frontend/              # React Frontend Application
│   ├── public/            # Static assets
│   ├── src/               # React components, routes, API clients
│   ├── package.json       # React dependencies and scripts
│   └── vercel.json        # Vercel routing rules for SPA paths
├── .gitignore             # Root gitignore rules
└── README.md              # Project documentation (this file)
```

---

## Local Development Setup

### 1. Backend (Django)

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # macOS/Linux
   # or: venv\Scripts\activate  # Windows
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template and configure your values:
   ```bash
   cp .env.example .env
   ```
   *Make sure to configure `SECRET_KEY`, `DEBUG=True`, and your `IMAGEKIT_*` keys.*
5. Run migrations:
   ```bash
   python manage.py migrate
   ```
6. Start the development server:
   ```bash
   python manage.py runserver
   ```
   The API will be available at `http://127.0.0.1:8000/`.

### 2. Frontend (React)

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
   *By default, `REACT_APP_API_URL` is set to point to your local backend at `http://127.0.0.1:8000/api`.*
4. Start the React development server:
   ```bash
   npm start
   ```
   The frontend will be available at `http://localhost:3000/`.

---

## Environment Variables Reference

### Backend (Django)

Set these in `backend/.env` for local dev or in the Railway settings dashboard for production:

| Variable | Description | Example / Note |
|---|---|---|
| `SECRET_KEY` | Secret key for Django cryptographic signing | Secure random string |
| `DEBUG` | Enable/disable debug mode | `True` (dev) / `False` (prod) |
| `ALLOWED_HOSTS` | Comma-separated list of host/domain names | `argos-backend.up.railway.app` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgres://user:pass@host:port/db` |
| `CORS_ALLOWED_ORIGINS` | Allowed origins for CORS (comma-separated) | `https://argos.vercel.app` |
| `IMAGEKIT_PUBLIC_KEY` | Public key from ImageKit Dashboard | `public_...` |
| `IMAGEKIT_PRIVATE_KEY` | Private key from ImageKit Dashboard | `private_...` |
| `IMAGEKIT_URL_ENDPOINT` | URL endpoint from ImageKit Dashboard | `https://ik.imagekit.io/your_id` |

### Frontend (React)

Set these in `frontend/.env` for local dev or in Vercel settings dashboard for production:

| Variable | Description | Example |
|---|---|---|
| `REACT_APP_API_URL` | Complete backend API root URL | `https://argos-backend.up.railway.app/api` |

---

## Production Deployment

### Backend — Railway

1. In Railway, create a new project and connect this GitHub repository.
2. Set the root directory of the service to `/backend`.
3. Provision a **PostgreSQL** database service within the same project. Railway will automatically inject the `DATABASE_URL` environment variable.
4. Add the required environment variables:
   * `SECRET_KEY` (use a long, random value)
   * `DEBUG` = `False`
   * `ALLOWED_HOSTS` = `${{ RAILWAY_PUBLIC_DOMAIN }}` (or your custom domain)
   * `CORS_ALLOWED_ORIGINS` = your Vercel URL (e.g., `https://argos.vercel.app`)
   * `IMAGEKIT_PUBLIC_KEY`
   * `IMAGEKIT_PRIVATE_KEY`
   * `IMAGEKIT_URL_ENDPOINT`
5. Railway will build the service using `nixpacks` (running `collectstatic` automatically) and start it using the defined `Procfile` (`gunicorn`).

### Frontend — Vercel

1. In Vercel, import your repository.
2. Select `frontend` as the Root Directory.
3. Configure the build settings:
   * **Framework Preset**: Create React App
   * **Build Command**: `npm run build`
   * **Output Directory**: `build`
4. Add the `REACT_APP_API_URL` environment variable pointing to the Railway API URL.
5. Deploy. The `vercel.json` file ensures that React Router paths are redirected to `index.html` on hard refreshes.
