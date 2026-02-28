"""
FinanceIQ v6 — Database ORM Models
"""
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Text, Boolean, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class Security(Base):
    """Cached security metadata."""
    __tablename__ = "securities"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    asset_type: Mapped[str] = mapped_column(String(20), default="stock")  # stock, etf, index, crypto, fx
    sector: Mapped[str] = mapped_column(String(100), default="")
    industry: Mapped[str] = mapped_column(String(100), default="")
    market_cap: Mapped[float] = mapped_column(Float, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PortfolioPosition(Base):
    """Paper trading positions."""
    __tablename__ = "portfolio_positions"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(20), index=True)
    asset_type: Mapped[str] = mapped_column(String(20), default="stock")
    shares: Mapped[float] = mapped_column(Float, default=0)
    avg_cost: Mapped[float] = mapped_column(Float, default=0)
    side: Mapped[str] = mapped_column(String(10), default="LONG")  # LONG or SHORT
    opened_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PortfolioTransaction(Base):
    """Trade history."""
    __tablename__ = "portfolio_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(20), index=True)
    action: Mapped[str] = mapped_column(String(20))  # BUY, SELL, SHORT, COVER
    side: Mapped[str] = mapped_column(String(10))
    shares: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    commission: Mapped[float] = mapped_column(Float, default=0)
    total: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AgentSession(Base):
    """AI agent analysis sessions."""
    __tablename__ = "agent_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(20), index=True)
    status: Mapped[str] = mapped_column(String(20), default="running")  # running, completed, failed
    verdict: Mapped[str] = mapped_column(String(10), default="")  # BUY, SELL, HOLD
    confidence: Mapped[float] = mapped_column(Float, default=0)
    report_md: Mapped[str] = mapped_column(Text, default="")
    fundamental_score: Mapped[float] = mapped_column(Float, default=0)
    technical_score: Mapped[float] = mapped_column(Float, default=0)
    sentiment_score: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)


class Prediction(Base):
    """LSTM price predictions."""
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(20), index=True)
    horizon_days: Mapped[int] = mapped_column(Integer, default=7)
    predicted_prices: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    confidence_upper: Mapped[str] = mapped_column(Text, default="[]")
    confidence_lower: Mapped[str] = mapped_column(Text, default="[]")
    mse: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
