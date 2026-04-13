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

## Environment

Frontend uses `frontend/.env`.

Required key:

- `VITE_GOOGLE_CLIENT_ID=<your_google_oauth_client_id>`

## Git Ignore Layout

This repo now uses 3 `.gitignore` files:

- Root: monorepo-wide ignores (editor files, env files, node/python artifacts)
- `frontend/.gitignore`: Vite/Node-specific ignores
- `backend/.gitignore`: Python/FastAPI-specific ignores

This keeps ignore rules close to each app while preserving shared rules at root.
