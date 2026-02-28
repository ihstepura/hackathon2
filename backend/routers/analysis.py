"""
FinanceIQ v6 — Analysis Router
Core stock/asset analysis endpoints + news, options, backtest.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from core import get_db, cache_get, cache_set, get_settings
from services.news_service import fetch_news, analyze_sentiment
from services.social_service import aggregate_social_data
from services.alphamath import apply_signal_decay, calculate_divergence
from services.contagion_service import analyze_supply_chain_contagion
from services.options_service import greeks, implied_vol, payoff_diagram, bs_call, bs_put
from services.backtest_service import run_backtest
import yfinance as yf
import pandas as pd
import numpy as np
import traceback

router = APIRouter()
settings = get_settings()


@router.post("/analyze")
async def analyze_security(data: dict, db: AsyncSession = Depends(get_db)):
    """Full analysis: price history, technicals, financials, ratios."""
    ticker = data.get("ticker", "").upper().strip()
    timeframe = data.get("timeframe", "1Y")
    period = data.get("period", "yearly")

    if not ticker:
        return {"error": "Ticker is required"}

    # Check cache first
    cache_key = f"analysis:{ticker}:{timeframe}:{period}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}

        # Map timeframe to yfinance period
        period_map = {"1M": "1mo", "3M": "3mo", "6M": "6mo", "1Y": "1y", "5Y": "5y"}
        yf_period = period_map.get(timeframe, "1y")

        # Price history
        hist = stock.history(period=yf_period)
        if hist.empty:
            return {"error": f"No data found for {ticker}"}

        closes = hist["Close"].values
        highs = hist["High"].values
        lows = hist["Low"].values
        volumes = hist["Volume"].values

        # Technicals
        technicals = _compute_technicals(closes, highs, lows, volumes)
        technicals["price"] = round(float(closes[-1]), 2)

        # Price history for charting
        price_history = []
        for idx, row in hist.iterrows():
            price_history.append({
                "time": idx.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        # Ratios from info
        ratios = {
            "pe": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "pb": info.get("priceToBook"),
            "ps": info.get("priceToSalesTrailing12Months"),
            "ev_ebitda": info.get("enterpriseToEbitda"),
            "roe": info.get("returnOnEquity"),
            "roa": info.get("returnOnAssets"),
            "profit_margin": info.get("profitMargins"),
            "debt_equity": info.get("debtToEquity"),
            "current_ratio": info.get("currentRatio"),
            "dividend_yield": info.get("dividendYield"),
            "beta": info.get("beta"),
        }

        result = {
            "ticker": ticker,
            "name": info.get("longName", ticker),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "market_cap": info.get("marketCap", 0),
            "technicals": technicals,
            "ratios": ratios,
            "price_history": price_history,
        }

        # Cache for 5 minutes
        await cache_set(cache_key, result, ttl=300)
        return result

    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}


@router.get("/technicals/{ticker}")
async def get_technicals(ticker: str):
    """Return technical indicators for a ticker."""
    try:
        stock = yf.Ticker(ticker.upper())
        hist = stock.history(period="1y")
        if hist.empty:
            return {"error": f"No data for {ticker}"}

        closes = hist["Close"].values
        highs = hist["High"].values
        lows = hist["Low"].values
        volumes = hist["Volume"].values

        technicals = _compute_technicals(closes, highs, lows, volumes)
        technicals["price"] = round(float(closes[-1]), 2)
        return technicals
    except Exception as e:
        return {"error": str(e)}


def _compute_technicals(closes, highs, lows, volumes):
    """Compute all technical indicators."""
    def ema(data, period):
        s = pd.Series(data)
        return round(float(s.ewm(span=period, adjust=False).mean().iloc[-1]), 2)

    def sma(data, period):
        if len(data) < period:
            return None
        return round(float(np.mean(data[-period:])), 2)

    # RSI
    deltas = np.diff(closes)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    avg_gain = np.mean(gains[-14:]) if len(gains) >= 14 else 0
    avg_loss = np.mean(losses[-14:]) if len(losses) >= 14 else 0
    rs = avg_gain / avg_loss if avg_loss != 0 else 100
    rsi = round(100 - (100 / (1 + rs)), 2)

    # MACD
    ema12 = pd.Series(closes).ewm(span=12, adjust=False).mean()
    ema26 = pd.Series(closes).ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()

    # Bollinger Bands
    sma20 = pd.Series(closes).rolling(20).mean()
    std20 = pd.Series(closes).rolling(20).std()
    bb_upper = round(float((sma20 + 2 * std20).iloc[-1]), 2) if len(closes) >= 20 else None
    bb_lower = round(float((sma20 - 2 * std20).iloc[-1]), 2) if len(closes) >= 20 else None

    # ATR
    tr_values = []
    for i in range(1, len(closes)):
        tr = max(highs[i] - lows[i], abs(highs[i] - closes[i-1]), abs(lows[i] - closes[i-1]))
        tr_values.append(tr)
    atr = round(float(np.mean(tr_values[-14:])), 2) if len(tr_values) >= 14 else None

    # VWAP
    typical_price = (highs + lows + closes) / 3
    vwap = round(float(np.sum(typical_price * volumes) / np.sum(volumes)), 2) if np.sum(volumes) > 0 else None

    return {
        "ema_5": ema(closes, 5),
        "ema_10": ema(closes, 10),
        "ema_20": ema(closes, 20),
        "ema_50": ema(closes, 50),
        "sma_200": sma(closes, 200),
        "rsi": rsi,
        "macd": round(float(macd_line.iloc[-1]), 4),
        "macd_signal": round(float(signal_line.iloc[-1]), 4),
        "bb_upper": bb_upper,
        "bb_lower": bb_lower,
        "atr": atr,
        "vwap": vwap,
    }


# ══════════════════════════════════════════════════════════
# NEWS & SENTIMENT
# ══════════════════════════════════════════════════════════

@router.get("/news/{ticker}")
async def get_news(ticker: str, limit: int = 10):
    """Fetch news + social and calculate decayed AI sentiment."""
    cache_key = f"alpha_news:{ticker}:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    # 1. Fetch News
    news = fetch_news(ticker.upper(), limit)
    # 2. Fetch Social
    social = aggregate_social_data(ticker.upper(), limit)
    
    combined_data = news + social
    
    # 3. Analyze with FinBERT
    sentiment = analyze_sentiment(combined_data)
    
    # 4. Apply temporal exponential decay
    scored_items = sentiment.get("scored_news", [])
    decayed_items = apply_signal_decay(scored_items, half_life_hours=24.0)
    
    # Recalculate average using decayed scores
    if decayed_items:
        avg_decayed = sum(i.get("decayed_score", 0) for i in decayed_items) / len(decayed_items)
    else:
        avg_decayed = 0.0
        
    overall_label = "Positive" if avg_decayed >= 0.05 else "Negative" if avg_decayed <= -0.05 else "Neutral"
    
    result = {
        "ticker": ticker.upper(),
        "average_score": round(avg_decayed, 4),
        "sentiment_label": overall_label,
        "scored_news": decayed_items
    }
    await cache_set(cache_key, result, ttl=600)
    return result

@router.get("/contagion/{ticker}")
async def get_contagion(ticker: str):
    """Execute deep supply chain contagion analysis using SEC Risk Factors & Ollama."""
    cache_key = f"contagion:{ticker}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
        
    try:
        news_res = await get_news(ticker, limit=5)
        peer_sentiment = news_res.get("average_score", 0.0)
    except Exception:
        peer_sentiment = 0.0

    analysis = analyze_supply_chain_contagion(ticker.upper(), peer_sentiment)
    
    await cache_set(cache_key, analysis, ttl=86400) # 24 hr cache for sec filings
    return analysis

@router.get("/divergence/{ticker}")
async def get_divergence(ticker: str):
    """Calculate Teflon/Value Trap divergence based on 3-day price return vs sentiment."""
    cache_key = f"divergence:{ticker}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    # 1. Fetch 3-day price return
    try:
        stock = yf.Ticker(ticker.upper())
        hist = stock.history(period="5d")
        if len(hist) < 2:
            price_return = 0.0
        else:
            # Trailing 3-day return. 
            start_price = float(hist["Close"].iloc[-min(4, len(hist))])
            end_price = float(hist["Close"].iloc[-1])
            price_return = (end_price - start_price) / start_price * 100
    except:
        price_return = 0.0

    # 2. Fetch decayed sentiment
    try:
        news_data = await get_news(ticker, limit=15)
        sentiment_score = news_data.get("average_score", 0.0)
    except:
        sentiment_score = 0.0

    # 3. Calculate Divergence
    result = calculate_divergence(price_return, sentiment_score)
    result["ticker"] = ticker.upper()

    await cache_set(cache_key, result, ttl=1800) # 30 min cache
    return result


# ══════════════════════════════════════════════════════════
# OPTIONS ANALYTICS
# ══════════════════════════════════════════════════════════

@router.post("/options/greeks")
async def compute_greeks(data: dict):
    """Calculate Black-Scholes Greeks for an option."""
    try:
        S = float(data["spot"])
        K = float(data["strike"])
        T = float(data["expiry_years"])
        r = float(data.get("rate", 0.05))
        sigma = float(data["iv"])
        opt_type = data.get("type", "call")

        result = greeks(S, K, T, r, sigma, opt_type)
        result["bs_price"] = round(bs_call(S, K, T, r, sigma) if opt_type == "call" else bs_put(S, K, T, r, sigma), 4)
        return result
    except Exception as e:
        return {"error": str(e)}


@router.post("/options/payoff")
async def compute_payoff(data: dict):
    """Generate payoff diagram data."""
    try:
        K = float(data["strike"])
        premium = float(data["premium"])
        opt_type = data.get("type", "call")
        is_long = data.get("is_long", True)
        return {"payoff": payoff_diagram(K, premium, opt_type, is_long)}
    except Exception as e:
        return {"error": str(e)}


@router.get("/options/chain/{ticker}")
async def get_options_chain(ticker: str):
    """Get options chain with expiry dates."""
    try:
        if ticker.upper().endswith(".NS") or ticker.upper().endswith(".BO"):
            # === ZERODHA KITE CONNECT SKELETON ===
            # Yfinance fails to pull Indian options consistently. User must supply KITE_API_KEY.
            import os
            kite_api_key = os.getenv("KITE_API_KEY")
            
            if kite_api_key:
                # 1. Initialize KiteConnect(api_key=kite_api_key)
                # 2. Add kite_request_token to get access_token
                # 3. Fetch instruments("NFO")
                # 4. Filter for `name == ticker.replace('.NS', '')` and `instrument_type in ["CE", "PE"]`
                # 5. Build standard FinanceIQ dictionary:
                #    return {"ticker": ticker, "expirations": [...], "calls": [...], "puts": [...]}
                
                # --- Fallback dummy struct for UI testing without auth ---
                return {
                    "ticker": ticker.upper(),
                    "expirations": ["2026-03-26", "2026-04-30"],
                    "selected_expiry": "2026-03-26",
                    "calls": [{"strike": 100, "lastPrice": 5.5, "impliedVolatility": 0.2, "_type": "call"}],
                    "puts": [{"strike": 100, "lastPrice": 4.5, "impliedVolatility": 0.22, "_type": "put"}],
                    "kite_auth_required": True
                }

        # === DEFAULT YFINANCE BEHAVIOR ===
        stock = yf.Ticker(ticker.upper())
        expirations = stock.options
        if not expirations:
            return {"error": f"No options data for {ticker}"}

        # Return first expiry chain
        exp = expirations[0]
        chain = stock.option_chain(exp)

        calls = [{**row.to_dict(), "_type": "call"} for _, row in chain.calls.iterrows()]
        puts = [{**row.to_dict(), "_type": "put"} for _, row in chain.puts.iterrows()]

        return {
            "ticker": ticker.upper(),
            "expirations": list(expirations[:8]),  # first 8 expiries
            "selected_expiry": exp,
            "calls": calls[:20],  # top 20
            "puts": puts[:20],
        }
    except Exception as e:
        return {"error": str(e)}


# ══════════════════════════════════════════════════════════
# BACKTESTING
# ══════════════════════════════════════════════════════════

@router.post("/backtest")
async def backtest(data: dict):
    """Run bi-directional backtest on a ticker."""
    ticker = data.get("ticker", "").upper()
    period = data.get("period", "1y")
    budget = float(data.get("monthly_budget", 300))

    if not ticker:
        return {"error": "Ticker is required"}

    cache_key = f"backtest:{ticker}:{period}:{budget}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    result = run_backtest(ticker, period, budget)
    if "error" not in result:
        await cache_set(cache_key, result, ttl=3600)  # 1-hour cache
    return result

# ══════════════════════════════════════════════════════════
# MONTE CARLO SIMULATION
# ══════════════════════════════════════════════════════════

@router.get("/analyze/monte_carlo/{ticker}")
async def monte_carlo(ticker: str, days: int = 30, sims: int = 100):
    """Simulate 100 future price paths using Geometric Brownian Motion (GBM)."""
    # 100 paths is optimal payload limit for rendering in SVG canvas
    cache_key = f"monte_carlo:{ticker}:{days}:{sims}"
    cached = await cache_get(cache_key)
    if cached: return cached

    try:
        stock = yf.Ticker(ticker.upper())
        hist = stock.history(period="2y")
        if hist.empty:
            return {"error": f"No historical data for {ticker}"}
        
        closes = hist["Close"].values
        current_price = float(closes[-1])
        
        returns = np.diff(closes) / closes[:-1]
        log_returns = np.log(1 + returns)
        
        u = log_returns.mean()
        var = log_returns.var()
        drift = u - (0.5 * var)
        stdev = log_returns.std()
        
        Z = np.random.normal(0, 1, (days, sims))
        daily_returns = np.exp(drift + stdev * Z)
        
        price_paths = np.zeros_like(daily_returns)
        price_paths[0] = current_price
        
        for t in range(1, days):
            price_paths[t] = price_paths[t-1] * daily_returns[t]

        paths = price_paths.T.tolist()

        final_prices = [p[-1] for p in paths]
        mean_final = float(np.mean(final_prices))
        pct_up = float(sum(1 for p in final_prices if p > current_price) / sims * 100)

        result = {
            "paths": paths,
            "mean_final_price": round(mean_final, 2),
            "pct_chance_up": round(pct_up, 2),
            "current_price": round(current_price, 2)
        }
        await cache_set(cache_key, result, ttl=3600) # 1 hour
        return result
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}
