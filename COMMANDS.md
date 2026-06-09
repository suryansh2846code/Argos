# Argos — Command Reference
# ─────────────────────────────────────────────────────────────────────────────
# All commands assume you are in the project root:
#   /Users/suryanshsingh/workspace/argos
# ─────────────────────────────────────────────────────────────────────────────

# ══════════════════════════════════════════════════════════════════════════════
# 1. FRONTEND
# ══════════════════════════════════════════════════════════════════════════════

# Navigate to frontend
cd "frontend"

# Install dependencies (first time / after pulling)
npm install

# Start dev server  →  http://localhost:3000
npm start

# Production build
npm run build

# Run linter
npm run lint

# ══════════════════════════════════════════════════════════════════════════════
# 2. BACKEND — virtual environment
# ══════════════════════════════════════════════════════════════════════════════

# Navigate to backend
cd "backend"

# Create virtual environment (first time only)
python3 -m venv venv

# Activate virtual environment  ← ALWAYS do this first
source venv/bin/activate

# Deactivate virtual environment
deactivate

# ══════════════════════════════════════════════════════════════════════════════
# 3. BACKEND — package management
#    pip is only available AFTER activating the venv (see above)
# ══════════════════════════════════════════════════════════════════════════════

# Install all dependencies from requirements.txt
pip install -r requirements.txt

# Install a new package and save it
pip install <package-name>
pip freeze > requirements.txt

# Install ImageKit SDK (for media uploads)
pip install imagekitio
pip freeze > requirements.txt

# Upgrade pip itself
pip install --upgrade pip

# ══════════════════════════════════════════════════════════════════════════════
# 4. BACKEND — Django management
# ══════════════════════════════════════════════════════════════════════════════

# Start development server  →  http://localhost:8000
python manage.py runserver 8000

# Start on a different port
python manage.py runserver 0.0.0.0:8000

# Create a new migration after model changes
python manage.py makemigrations

# Apply all pending migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Roll back to a specific migration
python manage.py migrate maps 0002

# Create a superuser
python manage.py createsuperuser

# Open Django shell
python manage.py shell

# Collect static files (production)
python manage.py collectstatic

# ══════════════════════════════════════════════════════════════════════════════
# 5. RUNNING BOTH SERVERS (two separate terminal tabs)
# ══════════════════════════════════════════════════════════════════════════════

# Terminal 1 — Backend
cd "backend" && source venv/bin/activate && python manage.py runserver 8000

# Terminal 2 — Frontend
cd "frontend" && npm start

# ══════════════════════════════════════════════════════════════════════════════
# 6. GIT
# ══════════════════════════════════════════════════════════════════════════════

git status
git add .
git commit -m "feat: <description>"
git push
git pull

# ══════════════════════════════════════════════════════════════════════════════
# 7. QUICK REFERENCE — common issues
# ══════════════════════════════════════════════════════════════════════════════

# "pip: command not found"
#   → You forgot to activate the venv. Run:
#     source backend/venv/bin/activate

# "cd: no such file or directory: backend"
#   → You are already inside the backend directory. Run:
#     cd ..   (to go back to project root first)

# "Port 8000 already in use"
lsof -i :8000
kill -9 <PID>

# "Port 3000 already in use"
lsof -i :3000
kill -9 <PID>

# Frontend node_modules missing
cd "frontend" && npm install

# Reset DB and start fresh (WARNING: deletes all data)
#   cd backend && source venv/bin/activate
#   python manage.py flush
#   python manage.py migrate
