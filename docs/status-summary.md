# Kanban Project — Status Summary (Parts 1–11 complete)

> **Update**: Part 11 added real user accounts and multi-board support (see below) on top of the finished Part 1–10 MVP. The live AI integration test has previously been run for real against the Anthropic API and **passed** — the AI correctly created a card via the `create_card` tool end-to-end.

## What's built

**Stack**: Next.js frontend (client-rendered) + FastAPI backend + SQLite, both in Docker, wired together over a REST API. AI sidebar chat backed by Claude Sonnet 5 via the Anthropic API.

| Part | What it delivered |
|---|---|
| 1–2 | Plan, scaffolding (`backend/` uv project, Dockerfiles, `docker-compose.yml`, coverage tooling) |
| 3 | Frontend UI: 5-column board, drag-and-drop, add/delete cards, editable column titles |
| 4 | Fake sign-in (hardcoded `user`/`password`), session persists via `sessionStorage` |
| 5 | SQLite schema (users/boards/columns/cards), auto-create + auto-seed on first run |
| 6 | Backend CRUD API: `GET /board`, rename column, create/update/delete/move card |
| 7 | Frontend wired to the real backend (no more dummy data); errors surface as banners instead of crashing |
| 8 | AI sidebar chat (`POST /chat`) — natural-language create/edit/move via Claude tool-calling |
| 9 | Edge-case tests, full Docker verification (clean rebuild, restart/down-up persistence), one real UI bug found and fixed (column titles were truncating with the new chat sidebar) |
| 10 | README rewritten to describe the finished full-stack app (setup, features, stack, tests); no LinkedIn post (optional, not done) |
| 11 | Real user accounts (register/login/logout, hashed passwords, session tokens) replacing the hardcoded sign-in; each user can create/rename/delete/switch between multiple boards, each fully isolated from other users; cards gained priority and an optional due date; a search/filter bar was added to the board |

## What's working (verified, not assumed)

- Register a new account, or sign in/out with the seeded demo account; session persists across refresh.
- Each user can create, rename, delete, and switch between any number of boards from the board-switcher UI; a new board starts with the standard five empty columns.
- One user can never view or modify another user's board — enforced server-side (verified by dedicated tests that a second account gets a 404, not just a hidden UI element).
- Board loads from the real backend on every page load — no dummy in-memory data left in the runtime path (`lib/initialData.ts` still exists but is now only a test fixture).
- Add / delete / rename / drag-drop card, all persisted to SQLite and confirmed to survive a page reload.
- Cards have a priority (low/medium/high) and an optional due date, both editable inline on the card; the board has a search/filter bar that filters by text and priority (drag-and-drop is disabled while a filter is active, so card ordering can't desync from the backend).
- AI chat: create, edit, and move cards via natural language, scoped to the board you're viewing; changes land in the DB and show up on the board immediately.
- Data survives a backend **container restart** and a full **`docker-compose down` → `up`** cycle (verified live against real Docker, not just the dev-mode test servers).
- An existing single-board/single-user database (from before Part 11) upgrades automatically on startup — new columns are backfilled and the old `UNIQUE(boards.user_id)` constraint is removed — without losing the demo data.
- `docker-compose up` on this machine, from a from-scratch rebuild (no cached images/volumes), brings up a fully working app with no manual steps beyond that command (and setting `ANTHROPIC_API_KEY` if you want the chat feature — everything else works without it).
- Backend fails gracefully (502 with a clear message) if `ANTHROPIC_API_KEY` is missing or invalid, instead of crashing.

## Test coverage right now

**Backend** (`backend/tests/`, 11 files): 102 tests passing + 1 skipped, **~97% coverage**.
- `test_routes.py` — every board/column/card route's success/validation/not-found path, plus edge cases (deleting the last card in a column, very long title/details, duplicate column rename), now all board-scoped and behind auth.
- `test_auth.py` — register/login/logout/me, duplicate username, wrong password, short password, missing/invalid token.
- `test_boards.py` — list/create/rename/delete boards, and cross-user ownership denial (a second account can't view, rename, delete, or add cards to another user's board).
- `test_ai.py` — AI tool-calling logic (create/edit/move, not-found handling, unknown tool, max-iteration cutoff) with the Anthropic call mocked, scoped to a board.
- `test_ai_live.py` — hits the real Anthropic API (skipped unless `ANTHROPIC_API_KEY` is set); previously run for real and passed.
- `test_migrations.py` — upgrading a legacy pre-Part-11 schema (missing auth/board/card columns, old single-board unique constraint) in place, and a no-op run on an already-current schema.
- `test_db.py`, `test_db_module.py`, `test_lifespan.py` — schema, seeding idempotency, fresh-DB startup.
- `test_health.py`, `test_alerts.py` — health check + CORS, stale/overloaded thresholds.

**Frontend** (17 unit test files + 1 e2e file): 139 unit tests passing, **~95% coverage**; 21 Playwright e2e tests passing against a real backend + SQLite.
- Unit tests cover every component's behavior including error states, plus a dedicated `lib/api.test.ts` that exercises the fetch wrapper directly (mocking `fetch`) for register/login/logout, board CRUD, and card CRUD — token attachment included.
- New: `BoardSwitcher.test.tsx`, `FilterBar.test.tsx`.
- E2E covers: sign-in (valid/invalid), registration (success + duplicate username), full CRUD, drag-drop across all 5 columns, persistence after reload, card priority/due-date editing, search/filter, multi-board create/switch/rename/delete, a full AI chat scenario (create→edit→move in sequence), and a backend-unreachable error banner.

## What's untested / not yet done

1. No manual click-through testing has been done in a real browser by a human — a live dev-server smoke test was run and screenshotted during development (register/login, priority + due date editing, board switcher, priority filter), but that's still not the same as a human clicking through the finished app.
2. Sharing a board between multiple users (real-time collaboration) is out of scope — each board still belongs to exactly one user.
3. A cosmetic-only, environment-specific quirk: on this Windows machine, the e2e test runner occasionally logs a harmless `EPERM` warning when trying to wipe the test database between runs (has a retry+backoff and always falls back gracefully — never caused a test failure across many runs). Not an app defect, just noise you might see in the console.

## How to run the app right now

**Fastest path (Docker, recommended):**
```bash
cp .env.example .env        # optional — only needed for the AI chat feature
# edit .env and set ANTHROPIC_API_KEY=sk-ant-... if you want AI chat
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8000 (try http://localhost:8000/health)
- Sign in with the seeded demo account (`user` / `password`), or register your own
- Without an API key, everything works except the AI chat panel, which will show a clear error if you try to use it.

**Local dev (no Docker), two terminals:**
```bash
# Terminal 1 — backend
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```
Open http://localhost:3000.

## How to run the tests right now

**Backend:**
```bash
cd backend
uv run pytest                                        # 102 pass, 1 skipped, ~97% coverage
uv run --env-file .env pytest                        # 103 pass — runs the live AI test too
```

**Frontend unit tests:**
```bash
cd frontend
npm run test:coverage
```

**Frontend e2e (spins up its own backend + frontend on ports 8100/3100 with a throwaway SQLite DB — safe to run alongside a `docker compose up` or `npm run dev` you already have going):**
```bash
cd frontend
npx playwright test
```
Requires `uv` on `PATH` for the backend it spins up (see `frontend/playwright.config.ts` if that fails — I had to use `python -m uv` instead of a bare `uv` in this sandboxed environment, since `uv` was only pip-installed here, not on `PATH` directly. On your machine, if `uv` works from a plain shell, you may not need that workaround).
