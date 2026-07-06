# Kanban Project Manager

A single-board Kanban app with drag-and-drop, a Python backend, SQLite persistence, and an AI assistant that creates, edits, and moves cards from natural-language instructions.

## Stack

- Frontend: Next.js (client-rendered), TypeScript
- Backend: FastAPI (Python, managed with `uv`)
- Database: SQLite
- AI: Anthropic Claude, via tool use
- Everything runs in Docker

## Setup

### Docker (recommended)

```bash
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY if you want the AI assistant
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

Sign in with username `user` and password `password`. Everything works without `ANTHROPIC_API_KEY` set except the AI assistant, which will show a clear error if used.

### Local development (without Docker)

Backend:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

## Features

- One board with five renameable columns
- Cards with a title and details
- Drag and drop between columns
- Add and delete cards
- Data persists in SQLite across restarts
- Sign-in (hardcoded credentials for this MVP)
- AI assistant in the sidebar: create, edit, and move cards from natural language

## Tests

Backend:

```bash
cd backend
uv run pytest                         # mocks the AI call
uv run --env-file .env pytest         # also runs the live AI test, needs ANTHROPIC_API_KEY
```

Frontend unit tests:

```bash
cd frontend
npm run test:coverage
```

Frontend end-to-end tests (spins up its own backend and frontend on separate ports with a throwaway database):

```bash
cd frontend
npx playwright test
```
