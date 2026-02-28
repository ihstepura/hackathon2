"""
FinanceIQ v6 — FastAPI Main Application
"""
import asyncio
import time
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from core import get_settings, engine, Base, logger

settings = get_settings()


def _preload_models():
    """Preload heavy ML models at startup (runs in background thread)."""
    try:
        from services.news_service import get_finbert
        logger.info("Preloading FinBERT sentiment model...")
        get_finbert()
        logger.info("FinBERT ready.")
    except Exception as e:
        logger.warning(f"FinBERT preload failed (non-fatal): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables + preload models. Shutdown: dispose engine."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Preload FinBERT in background thread (non-blocking)
    executor = ThreadPoolExecutor(max_workers=1)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(executor, _preload_models)

    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("Backend: http://localhost:8000")
    logger.info("Docs:    http://localhost:8000/docs")
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# ── Compression ───────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request Logging Middleware ────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        f"{request.method} {request.url.path} "
        f"status={response.status_code} "
        f"duration={duration_ms:.1f}ms"
    )
    response.headers["X-Response-Time"] = f"{duration_ms:.1f}ms"
    return response


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
