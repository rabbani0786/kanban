# Kanban Project — Status Summary (Parts 1–10 complete)

> **Update**: The live AI integration test has now been run for real against the Anthropic API (key supplied by the user) and **passed** — the AI correctly created a card via the `create_card` tool end-to-end. The AI feature is no longer "untested"; see the updated section below.

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

## What's working (verified, not assumed)

- Sign in/out, session persists across refresh.
- Board loads from the real backend on every page load — no dummy in-memory data left in the runtime path (`lib/initialData.ts` still exists but is now only a test fixture).
- Add / delete / rename / drag-drop card, all persisted to SQLite and confirmed to survive a page reload.
- AI chat: create, edit, and move cards via natural language, changes land in the DB and show up on the board immediately.
- Data survives a backend **container restart** and a full **`docker-compose down` → `up`** cycle (verified live against real Docker, not just the dev-mode test servers).
- `docker-compose up` on this machine, from a from-scratch rebuild (no cached images/volumes), brings up a fully working app with no manual steps beyond that command (and setting `ANTHROPIC_API_KEY` if you want the chat feature — everything else works without it).
- Backend fails gracefully (502 with a clear message) if `ANTHROPIC_API_KEY` is missing or invalid, instead of crashing.

## Test coverage right now

**Backend** (`backend/tests/`, 7 files): 45 tests passing + 1 skipped, **99.4% coverage**.
- `test_routes.py` — every CRUD route's success/validation/not-found path, plus edge cases (deleting the last card in a column, very long title/details, duplicate column rename).
- `test_ai.py` — AI tool-calling logic (create/edit/move, not-found handling, unknown tool, max-iteration cutoff) with the Anthropic call mocked.
- `test_ai_live.py` — hits the real Anthropic API. **Now run for real and passing** (`uv run --env-file .env pytest tests/test_ai_live.py`) — confirmed the AI correctly creates a card end-to-end against the live Anthropic API, not just a mock.
- `test_db.py`, `test_db_module.py`, `test_lifespan.py` — schema, seeding idempotency, fresh-DB startup.
- `test_health.py` — health check + CORS.

**Frontend** (11 unit test files + 1 e2e file): 59 unit tests passing, **92.7% coverage**; 14 Playwright e2e tests passing against a real backend + SQLite.
- Unit tests mock `lib/api.ts` (deliberately — see below) and cover every component's behavior, including error states.
- E2E covers: sign-in (valid/invalid), full CRUD, drag-drop across all 5 columns, persistence after reload, a full AI chat scenario (create→edit→move in sequence, with only the Anthropic call itself mocked — every mutation goes through the real backend), and a backend-unreachable error banner.

**One deliberate, documented gap**: `lib/api.ts` shows ~16% coverage in the vitest report alone. That's intentional — it's a thin fetch wrapper, and all 14 e2e tests exercise it for real against the live backend. Don't be alarmed by that number in isolation; it's covered, just not by unit tests.

## What's untested / not yet done

1. ~~The AI chat feature has never been run against the real Anthropic API.~~ **Done** — `test_ai_live.py` was run with a real key and passed; the AI correctly created a card via a live tool call. Note: `uv run` does not auto-load `.env` files — you need `uv run --env-file .env pytest ...` (or export the var yourself) for the key to actually be picked up.
2. ~~Part 10 hasn't started.~~ **Done** — the README (`README.md`) now describes the finished full-stack app (Docker setup, stack, features, tests). The only remaining item from Part 10 is the optional LinkedIn post, which hasn't been written.
3. No manual click-through testing has been done in a real browser by a human — everything here is automated (Playwright drives a real Chromium browser, but that's still not you looking at it).
4. A cosmetic-only, environment-specific quirk: on this Windows machine, the e2e test runner occasionally logs a harmless `EPERM` warning when trying to wipe the test database between runs (has a retry+backoff and always falls back gracefully — never caused a test failure across many runs). Not an app defect, just noise you might see in the console.

## How to run the app right now

**Fastest path (Docker, recommended):**
```bash
cp .env.example .env        # optional — only needed for the AI chat feature
# edit .env and set ANTHROPIC_API_KEY=sk-ant-... if you want AI chat
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8000 (try http://localhost:8000/health)
- Sign in with `user` / `password`
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
uv run pytest                                        # 45 pass, 1 skipped, 99.4% coverage
uv run --env-file .env pytest                        # 46 pass, 100% on ai.py — runs the live AI test too
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
