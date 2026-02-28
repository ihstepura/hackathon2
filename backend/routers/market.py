"""
FinanceIQ v6 — Market Router
Global market overview and indices data.
"""
from fastapi import APIRouter
from core import cache_get, cache_set
import yfinance as yf
import traceback

router = APIRouter()


@router.get("/market/pulse")
async def market_pulse():
    """Global market snapshot: indices, commodities, currencies."""
    # Check cache (5-min)
    cached = await cache_get("market:pulse")
    if cached:
        return cached

    symbols = {
        "indices": [
            ("^NSEI", "NIFTY 50"), ("^BSESN", "SENSEX"),
            ("^GSPC", "S&P 500"), ("^IXIC", "NASDAQ"),
            ("^FTSE", "FTSE 100"), ("^N225", "Nikkei 225"),
        ],
        "commodities": [
            ("GC=F", "Gold"), ("SI=F", "Silver"),
            ("CL=F", "Crude Oil WTI"), ("NG=F", "Natural Gas"),
        ],
        "currencies": [
            ("EURUSD=X", "EUR/USD"), ("GBPUSD=X", "GBP/USD"),
            ("USDJPY=X", "USD/JPY"), ("USDINR=X", "USD/INR"),
        ],
    }

    result = {}
    for category, items in symbols.items():
        cat_list = []
        for sym, name in items:
            try:
                ticker = yf.Ticker(sym)
                hist = ticker.history(period="5d")
                if hist is not None and len(hist) >= 1:
                    latest = hist.iloc[-1]
                    prev = hist.iloc[-2] if len(hist) >= 2 else hist.iloc[-1]
                    price = float(latest["Close"])
                    prev_close = float(prev["Close"])
                    change = price - prev_close
                    change_pct = (change / prev_close * 100) if prev_close else 0
                    cat_list.append({
                        "symbol": sym, "name": name,
                        "price": round(price, 2),
                        "change": round(change, 2),
                        "change_pct": round(change_pct, 2),
                    })
                else:
                    cat_list.append({"symbol": sym, "name": name, "price": 0, "change": 0, "change_pct": 0})
            except Exception:
                cat_list.append({"symbol": sym, "name": name, "price": 0, "change": 0, "change_pct": 0})
        result[category] = cat_list

    await cache_set("market:pulse", result, ttl=300)
    return result

import httpx

@router.get("/market/search")
async def search_tickers(q: str):
    """Search for valid tickers using Yahoo Finance autocomplete API."""
    if not q or len(q) < 1:
        return []

    # Check cache (1-hour TTL for searches)
    cache_key = f"search:{q.upper()}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=8&newsCount=0"
    headers = {"User-Agent": "Mozilla/5.0"}
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers)
            data = resp.json()
            
            quotes = data.get("quotes", [])
            results = []
            for item in quotes:
                # filter only equities, ETFs, futures, currencies, cryptos
                if item.get("quoteType") in ["EQUITY", "ETF", "FUTURE", "CURRENCY", "CRYPTOCURRENCY", "INDEX"]:
                    results.append({
                        "symbol": item.get("symbol"),
                        "shortname": item.get("shortname", item.get("longname", "")),
                        "type": item.get("quoteType"),
                        "exchange": item.get("exchange", "")
                    })
            
            await cache_set(cache_key, results, ttl=3600)
            return results
    except Exception as e:
        return []

import os

FINNHUB_KEY = os.getenv("FINNHUB_API_KEY")

@router.get("/market/peers/{ticker}")
async def get_peers(ticker: str):
    """Get Finnhub competitors and enrich with Yahoo statistics."""
    ticker = ticker.upper()
    cache_key = f"peers:{ticker}"
    cached = await cache_get(cache_key)
    if cached: return cached

    peers = [ticker]
    try:
        url = f"https://finnhub.io/api/v1/stock/peers?symbol={ticker}&token={FINNHUB_KEY}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                p_list = resp.json()
                if isinstance(p_list, list):
                    peers = list(dict.fromkeys([ticker] + p_list))[:6] # Top 5 peers + target
    except Exception:
        pass

    results = []
    for p in peers:
        try:
            stock = yf.Ticker(p)
            info = stock.info
            # Some tickers might be fundamentally broken on Yahoo
            if info.get("regularMarketPrice") or info.get("currentPrice") or info.get("previousClose"):
                results.append({
                    "ticker": p,
                    "price": info.get("regularMarketPrice", info.get("currentPrice", info.get("previousClose"))),
                    "market_cap": info.get("marketCap", None),
                    "pe_ratio": info.get("trailingPE", None),
                    "forward_pe": info.get("forwardPE", None),
                    "eps": info.get("trailingEps", None),
                    "similar": 1 if p != ticker else 0 # 0 for target
                })
        except:
            pass

    # Sort target first, then by market cap
    results = sorted(results, key=lambda x: (x["ticker"] != ticker, -(x.get("market_cap") or 0)))
    
    await cache_set(cache_key, {"peers": results}, ttl=86400) # cache for 1 day
    return {"peers": results}
