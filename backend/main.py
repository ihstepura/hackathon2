"""
FinanceIQ v6 — FastAPI Main Application
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core import get_settings, engine, Base

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables. Shutdown: dispose engine."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print(f"\n  {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"  Backend: http://localhost:8000")
    print(f"  Docs:    http://localhost:8000/docs\n")
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Mount Routers ─────────────────────────────────────
from routers import analysis, market, portfolio, agents, ai  # noqa: E402

app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
app.include_router(market.router, prefix="/api", tags=["Market"])
app.include_router(portfolio.router, prefix="/api", tags=["Portfolio"])
app.include_router(agents.router, prefix="/agent", tags=["Agents"])
app.include_router(ai.router, prefix="/api/ai", tags=["LSTM Predictions"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
