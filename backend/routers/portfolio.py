"""
FinanceIQ v6 — Portfolio Router
Paper trading endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from core import get_db
from models import PortfolioPosition, PortfolioTransaction
import yfinance as yf

router = APIRouter()

# In-memory portfolio meta (will migrate to DB later)
INITIAL_CASH = 100_000.0


@router.get("/portfolio")
async def get_portfolio(db: AsyncSession = Depends(get_db)):
    """Get portfolio summary with current positions."""
    positions = (await db.execute(select(PortfolioPosition))).scalars().all()
    transactions = (await db.execute(select(PortfolioTransaction))).scalars().all()

    # Calculate exact cash from transaction ledger
    cash = INITIAL_CASH
    for txn in transactions:
        if txn.action in ("BUY", "COVER"):
            cash -= txn.total
        elif txn.action in ("SELL", "SHORT"):
            cash += txn.total

    total_current = 0
    positions_list = []

    for p in positions:
        try:
            stock = yf.Ticker(p.ticker)
            current_price = stock.info.get("regularMarketPrice") or p.avg_cost
        except Exception:
            current_price = p.avg_cost

        # Liability for shorts, asset for longs
        market_value = p.shares * current_price
        cost_basis = p.shares * p.avg_cost

        if p.side == "SHORT":
            unrealized_pnl = (p.avg_cost - current_price) * p.shares
            total_current -= market_value  # Liability
        else:
            unrealized_pnl = (current_price - p.avg_cost) * p.shares
            total_current += market_value  # Asset

        positions_list.append({
            "ticker": p.ticker,
            "shares": p.shares,
            "avg_cost": round(p.avg_cost, 2),
            "current_price": round(current_price, 2),
            "market_value": round(market_value, 2) if p.side == "LONG" else round(-market_value, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "side": p.side,
        })

    return {
        "cash": round(cash, 2),
        "total_value": round(cash + total_current, 2),
        "positions": positions_list,
    }


@router.post("/portfolio/trade")
async def execute_trade(data: dict, db: AsyncSession = Depends(get_db)):
    """Execute a paper trade (BUY/SELL/SHORT/COVER)."""
    ticker = data.get("ticker", "").upper()
    action = data.get("action", "").upper()
    shares = float(data.get("shares", 0))

    if not ticker or not action or shares <= 0:
        return {"error": "Invalid trade parameters"}

    try:
        stock = yf.Ticker(ticker)
        price = stock.info.get("regularMarketPrice", 0)
        if not price:
            return {"error": f"Cannot get price for {ticker}"}

        # Create transaction
        txn = PortfolioTransaction(
            ticker=ticker,
            action=action,
            side="SHORT" if action in ("SHORT", "COVER") else "LONG",
            shares=shares,
            price=price,
            total=shares * price,
        )
        db.add(txn)

        # Update position
        side = "SHORT" if action in ("SHORT", "COVER") else "LONG"
        existing = (await db.execute(
            select(PortfolioPosition).where(
                PortfolioPosition.ticker == ticker,
                PortfolioPosition.side == side,
            )
        )).scalar_one_or_none()

        if action in ("BUY", "SHORT"):
            if existing:
                new_shares = existing.shares + shares
                existing.avg_cost = ((existing.shares * existing.avg_cost) + (shares * price)) / new_shares
                existing.shares = new_shares
            else:
                db.add(PortfolioPosition(
                    ticker=ticker, shares=shares, avg_cost=price, side=side,
                ))
        elif action in ("SELL", "COVER"):
            if not existing or existing.shares < shares:
                return {"error": f"Insufficient shares to {action}"}
            existing.shares -= shares
            if existing.shares <= 0:
                await db.delete(existing)

        await db.commit()
        return {"success": True, "action": action, "ticker": ticker, "shares": shares, "price": round(price, 2)}

    except Exception as e:
        return {"error": str(e)}
