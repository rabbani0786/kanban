Kanban Board — Full-Stack Build Plan

## Part 1 — Plan

Scope: a single-board Kanban app, one hardcoded user, 5 renameable columns, cards with title + details, drag-and-drop, add/delete cards, a sidebar AI chat that can create/edit/move cards, all running locally in Docker with a SQLite database. Out of scope: real auth, multiple boards, archive, search/filter, deployment.

Stack: Next.js frontend (already scaffolded in `frontend/`), Python backend (managed with `uv`), SQLite database, Docker for local run.

Testing standard (applies to every phase below): minimum 80% code coverage on both frontend and backend, enforced by the test runner's coverage tool, plus thorough integration testing (not just isolated unit tests) covering realistic multi-step user flows.

**Success criteria**
- [x] Scope and stack agreed and written down (this section)
- [x] No open conflicts between AGENTS.md and this plan

## Part 2 — Scaffolding

Set up `backend/` (Python project via `uv`, entrypoint, dependency file) and top-level Docker config (Dockerfile(s) + docker-compose) so the frontend and backend can each build and run in containers. `frontend/` scaffolding already exists and is not touched here.

**Success criteria**
- [x] `uv` project initializes in `backend/` and installs dependencies
- [x] `docker-compose up` builds both services without error (backend may just serve a health check at this stage)
- [x] `.gitignore` covers Python, Node, SQLite db file, and Docker artifacts
- [x] Coverage tooling configured and wired into a single command for both frontend (vitest coverage) and backend (pytest-cov or equivalent), with an 80% threshold that fails the run if not met

## Part 3 — Frontend (already built)

Kanban board UI: 5 columns, cards, drag-and-drop, add/delete cards, editable column titles. Currently uses dummy in-memory data (resets on refresh). No changes planned here except what's needed later to wire up the backend and AI chat.

**Success criteria**
- [x] Existing unit tests (vitest) and e2e tests (Playwright) pass
- [x] Manually confirmed: drag-drop, add card, delete card, rename column all work with dummy data
- [x] Frontend unit test coverage is at or above 80%; gaps backfilled before moving on

## Part 4 — Fake user sign-in

Add a mock login screen (hardcoded credentials `user` / `password`, no real auth or hashing). On success, the app treats the request as belonging to that one user for the rest of the session.

**Success criteria**
- [x] Wrong credentials are rejected with a visible error
- [x] Correct credentials reach the board
- [x] Session persists across a page refresh (until explicit logout, if one exists)
- [x] Unit tests cover both the valid and invalid login paths

## Part 5 — Database modeling

Design the SQLite schema: `users`, `boards` (one per user), `columns` (5 per board, ordered, renameable), `cards` (title, details, column reference, order). Write the schema so the database file is created automatically on first run if it doesn't exist, and seeded with the same dummy data the frontend currently hardcodes.

**Success criteria**
- [x] Schema covers users/boards/columns/cards with correct foreign keys and ordering fields
- [x] Starting the backend against a missing db file creates and seeds it automatically
- [x] Starting it again against an existing db file does not re-seed or duplicate data
- [x] Tests cover both the fresh-db and existing-db startup paths

## Part 6 — Backend

Build the backend API (CRUD routes for cards and columns: create, read, update, delete, move/reorder). Connect it to the SQLite database from Part 5. Confirm it runs inside its Docker container and the db file persists on the host via a volume mount.

**Success criteria**
- [x] All CRUD routes for cards and columns work, verified via direct API calls
- [x] Backend runs via `docker-compose up` and connects to SQLite successfully
- [x] Restarting the container does not lose data (volume-mounted db file)
- [x] Backend unit/integration tests cover every route's success case, validation errors, and not-found cases; coverage at or above 80%

## Part 7 — Frontend + backend integration

Wire the frontend to the backend so the board reads from and writes to the database instead of dummy data.

**Success criteria**
- [x] Loading the app fetches the board from the backend, not in-memory dummy data
- [x] Add card, delete card, drag-drop move, and column rename all persist: refreshing the page shows the same state
- [x] Existing frontend tests updated/passing against the real backend (or a mocked API layer, for unit tests)
- [x] Integration tests exercise the real frontend-to-backend-to-database path end-to-end (not mocked) for at least add, edit, delete, move, and rename
- [x] Failure paths tested: backend unreachable / API error surfaces a visible error in the UI instead of crashing

## Part 8 — AI assistant feature (sidebar chat)

Add a persistent AI chat panel in the sidebar. The AI can create, edit, and move one or more cards based on the user's natural-language instructions, applying changes directly to the board via the backend API. This is the differentiator that makes it a portfolio piece.

**Success criteria**
- [x] Chat panel is visible alongside the board at all times
- [x] A single instruction can create a new card in a named column
- [x] A single instruction can edit an existing card's title/details
- [x] A single instruction can move one or more existing cards between columns
- [x] Changes made by the AI show up on the board immediately and persist on refresh
- [x] Tests cover the AI's tool-calling logic against the backend API with the LLM call mocked (deterministic unit tests), plus at least one live integration test exercising a real instruction end-to-end

## Part 9 — Testing & polish

Verify all functionality end-to-end (drag-drop, add, delete, persistence, sign-in, AI chat all working together). Run a thorough integration testing pass against the fully wired stack (frontend + backend + SQLite, all in Docker), covering the full user journey and edge cases, not just individual features in isolation. Fix defects. Improve the UI (fit all columns on screen, clean styling).

**Success criteria**
- [x] Full Playwright e2e suite covers, against the real backend: sign-in (valid/invalid), add/delete card, drag-drop between all columns, column rename, persistence after refresh, container restart persistence, and at least one full AI chat scenario (create + edit + move in sequence)
- [x] Integration tests cover edge cases: deleting the last card in a column, adding a card with empty/long title or details, renaming a column to an empty/duplicate name, AI instruction referencing a card or column that doesn't exist
- [x] Combined frontend + backend code coverage is at or above 80%, verified by running the coverage command from Part 2 and reviewing the report (not just trusting a total percentage — check no critical module is under-covered)
- [x] No known defects open
- [x] `docker-compose up` from a clean checkout gives a fully working app with no manual steps beyond that command

## Part 10 — Document & post (optional)

Update the README to reflect the finished full-stack app. Optionally write a LinkedIn post about the finished, working full-stack + AI project.

**Success criteria**
- [x] README accurately describes setup (`docker-compose up`), features, and stack
- [x] No README references to the old dummy-data-only frontend demo
