# Kanban Project Manager

A multi-board Kanban project management app with real user accounts, drag-and-drop, a Python backend, SQLite persistence, and an AI assistant that creates, edits, and moves cards from natural-language instructions.

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

Sign in with the seeded demo account (username `user`, password `password`), or register a new account of your own. Everything works without `ANTHROPIC_API_KEY` set except the AI assistant, which will show a clear error if used.

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

- Real user accounts: register, sign in/out, passwords hashed (never stored in plain text)
- Each user can have any number of boards: create, rename, switch between, and delete boards
- Every board has five renameable columns
- Cards have a title, details, priority (low/medium/high), and an optional due date
- Search and filter cards by text and priority
- Drag and drop between columns (disabled while a filter is active, so positions stay consistent)
- Add and delete cards
- Data persists in SQLite across restarts
- AI assistant in the sidebar, scoped to the board you're viewing: create, edit, and move cards from natural language

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
