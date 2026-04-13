# Portfolio OS

Portfolio OS is a full-stack investment assistant with:

- Portfolio tracking (cost, market value, P/L)
- Risk analysis and projections
- Dynamic build-portfolio recommendations
- Arbitrage monitoring with alerts
- Google SSO login flow (frontend)

## Tech Stack

- Frontend: React + Vite
- Backend: FastAPI + SQLAlchemy
- Market data: yfinance

## Project Structure

```
portfolio-os/
	backend/
	frontend/
	scripts/
```

## Local Setup

### 0. Install root dependencies (for combined dev run)

From repo root:

```bash
yarn install
```

### 1. Backend

From `backend/`:

```bash
python -m venv .venv
# Windows (PowerShell)
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

Backend runs on `http://127.0.0.1:8000`.

### 2. Frontend

From `frontend/`:

```bash
yarn install
yarn dev
```

Frontend runs on `http://localhost:5173`.

### 3. Run both together

From repo root:

```bash
yarn dev
```

## Environment

Environment is split by app, with a root reference file:

- Root reference: `.env.example`
- Backend runtime: `backend/.env`
- Frontend runtime: `frontend/.env`

Quick start:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Backend (`backend/.env`)

- `DB_URL` (default: `sqlite:///./portfolio.db`)
- `BACKEND_HOST` / `BACKEND_PORT`
- `FRONTEND_HOST` / `FRONTEND_PORT`
- `FRONTEND_ORIGIN_INTERNAL` / `FRONTEND_ORIGIN_EXTERNAL`
- `ALLOWED_ORIGINS` (comma-separated CORS origins)

### Frontend (`frontend/.env`)

- `VITE_GOOGLE_CLIENT_ID=<your_google_oauth_client_id>`
- `VITE_FRONTEND_HOST` / `VITE_FRONTEND_PORT`
- `VITE_BACKEND_PORT`
- `VITE_API_BASE_INTERNAL`
- `VITE_API_BASE_EXTERNAL`

This allows internal/external backend and frontend ports/URLs to be configured without code changes.

## Git Ignore Layout

This repo now uses 3 `.gitignore` files:

- Root: monorepo-wide ignores (editor files, env files, node/python artifacts)
- `frontend/.gitignore`: Vite/Node-specific ignores
- `backend/.gitignore`: Python/FastAPI-specific ignores

This keeps ignore rules close to each app while preserving shared rules at root.
