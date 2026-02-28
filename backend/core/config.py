"""
FinanceIQ v6 — Backend Configuration
Loads environment variables and provides typed settings.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/financeiq"
    DATABASE_SYNC_URL: str = "postgresql://postgres:postgres@localhost:5432/financeiq"

    # ── Redis ─────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_PRICE: int = 300       # 5 minutes
    CACHE_TTL_FUNDAMENTALS: int = 3600  # 1 hour

    # ── API Keys ──────────────────────────────────────
    FMP_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ALPHA_VANTAGE_KEY: str = ""
    FINNHUB_API_KEY: str = ""
    FRED_API_KEY: str = ""

    # ── AI Backend ────────────────────────────────────
    OLLAMA_URL: str = "http://localhost:11434"
    AI_MODEL: str = "gemini-2.0-flash"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # ── App ───────────────────────────────────────────
    APP_NAME: str = "FinanceIQ"
    APP_VERSION: str = "6.0.0"
    DEBUG: bool = True
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
