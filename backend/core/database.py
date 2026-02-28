"""
FinanceIQ v6 — Async Database Engine
PostgreSQL primary with SQLite fallback for local dev.
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from .config import get_settings

settings = get_settings()

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

try:
    if _is_sqlite:
        os.makedirs("data", exist_ok=True)
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
        )
    else:
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
            pool_size=10,
            max_overflow=20,
        )
except Exception:
    # Fallback to SQLite for local dev / hackathon demos
    os.makedirs("data", exist_ok=True)
    engine = create_async_engine(
        "sqlite+aiosqlite:///data/financeiq.db",
        echo=settings.DEBUG,
    )

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db() -> AsyncSession:
    """Dependency: yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
