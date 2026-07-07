import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from app.db import engine, init_db, reset_db
from app.routes import router
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    if os.environ.get("RESET_DB_ON_STARTUP") == "1":
        reset_db()
    else:
        init_db()
    if os.environ.get("SEED_DB_ON_STARTUP", "1") == "1":
        with Session(engine) as session:
            seed_if_empty(session)
    yield


app = FastAPI(title="Kanban API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3100"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
