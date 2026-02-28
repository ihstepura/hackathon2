"""
FinanceIQ v6 — Multi-Agent System
Four specialized agents that debate to reach a consensus verdict.
Uses event collector pattern: each agent appends events to a shared list
and returns its score.
"""
import asyncio
import json
from typing import AsyncGenerator
import yfinance as yf
import numpy as np
import pandas as pd

from services.news_service import fetch_news, analyze_sentiment
from core import get_settings

settings = get_settings()


class AgentEvent:
    """Structured event from an agent."""
    def __init__(self, event_type: str, agent: str, content: str):
        self.event_type = event_type
        self.agent = agent
        self.content = content

    def to_sse(self):
        return {
            "event": self.event_type,
            "data": json.dumps({"agent": self.agent, "content": self.content}),
        }


# ══════════════════════════════════════════════════════════
# FUNDAMENTAL ANALYST
# ══════════════════════════════════════════════════════════

def compute_fundamental_score(info: dict) -> tuple[float, list[AgentEvent]]:
    """Compute fundamental score and return events. Pure function."""
    ticker = info.get("symbol", "")
    events: list[AgentEvent] = []
    events.append(AgentEvent("thinking", "Fundamental Analyst",
                             f"Evaluating financial statements and valuation metrics..."))

    pe = info.get("trailingPE")
    pb = info.get("priceToBook")
    roe = info.get("returnOnEquity")
    profit_margin = info.get("profitMargins")
    revenue_growth = info.get("revenueGrowth")
    debt_equity = info.get("debtToEquity")
    current_ratio = info.get("currentRatio")

    findings = []
    score = 5.0

    # Valuation
    events.append(AgentEvent("thinking", "Fundamental Analyst", "Assessing valuation ratios..."))
    if pe is not None:
        if pe < 12:
            score += 1.5; findings.append(f"P/E {pe:.1f} — deeply undervalued territory")
        elif pe < 20:
            score += 0.5; findings.append(f"P/E {pe:.1f} — reasonably valued")
        elif pe < 35:
            findings.append(f"P/E {pe:.1f} — growth premium priced in")
        else:
            score -= 1; findings.append(f"P/E {pe:.1f} — elevated, overvaluation risk")
    else:
        findings.append("P/E unavailable (negative earnings or data missing)")

    if pb is not None:
        if pb < 1:
            score += 1; findings.append(f"P/B {pb:.2f} — below book value")
        elif pb > 10:
            score -= 0.5; findings.append(f"P/B {pb:.2f} — significant premium to book")

    # Profitability
    events.append(AgentEvent("thinking", "Fundamental Analyst", "Analyzing profitability..."))
    if roe is not None:
        pct = roe * 100
        if roe > 0.20:
            score += 1; findings.append(f"ROE {pct:.1f}% — excellent capital efficiency")
        elif roe > 0.10:
            score += 0.5; findings.append(f"ROE {pct:.1f}% — solid returns")
        elif roe < 0:
            score -= 1; findings.append(f"ROE {pct:.1f}% — negative returns")

    if profit_margin is not None:
        pct = profit_margin * 100
        if profit_margin > 0.20:
            score += 1; findings.append(f"Margin {pct:.1f}% — strong pricing power")
        elif profit_margin < 0:
            score -= 1; findings.append(f"Margin {pct:.1f}% — unprofitable")

    if revenue_growth is not None:
        pct = revenue_growth * 100
        if revenue_growth > 0.20:
            score += 1; findings.append(f"Revenue growth {pct:.1f}% — strong expansion")
        elif revenue_growth > 0.05:
            score += 0.5; findings.append(f"Revenue growth {pct:.1f}% — moderate")
        elif revenue_growth < 0:
            score -= 0.5; findings.append(f"Revenue growth {pct:.1f}% — declining")

    # Balance sheet
    events.append(AgentEvent("thinking", "Fundamental Analyst", "Checking balance sheet..."))
    if debt_equity is not None:
        if debt_equity < 30:
            score += 0.5; findings.append(f"D/E {debt_equity:.1f} — conservative leverage")
        elif debt_equity > 200:
            score -= 1; findings.append(f"D/E {debt_equity:.1f} — highly leveraged")

    if current_ratio is not None:
        if current_ratio > 2:
            score += 0.5; findings.append(f"Current ratio {current_ratio:.2f} — strong liquidity")
        elif current_ratio < 1:
            score -= 0.5; findings.append(f"Current ratio {current_ratio:.2f} — liquidity concern")

    score = max(1.0, min(10.0, round(score, 1)))
    for f in findings:
        events.append(AgentEvent("finding", "Fundamental Analyst", f))

    verdict = "BULLISH" if score >= 7 else "BEARISH" if score <= 3.5 else "NEUTRAL"
    events.append(AgentEvent("finding", "Fundamental Analyst",
                             f"📊 Fundamental Score: {score}/10 — {verdict}"))
    return score, events


# ══════════════════════════════════════════════════════════
# TECHNICAL STRATEGIST
# ══════════════════════════════════════════════════════════

def compute_technical_score(hist: pd.DataFrame) -> tuple[float, list[AgentEvent]]:
    """Compute technical score and return events."""
    events: list[AgentEvent] = []
    events.append(AgentEvent("thinking", "Technical Strategist",
                             "Computing technical indicators..."))

    closes = hist["Close"].values
    volumes = hist["Volume"].values
    price = float(closes[-1])

    if len(closes) < 50:
        events.append(AgentEvent("finding", "Technical Strategist", "Insufficient data"))
        return 5.0, events

    findings = []
    score = 5.0

    # EMAs
    ema20 = float(pd.Series(closes).ewm(span=20).mean().iloc[-1])
    ema50 = float(pd.Series(closes).ewm(span=50).mean().iloc[-1])

    if price > ema20:
        score += 0.5; findings.append(f"Price ${price:.2f} above EMA20 — short-term bullish")
    else:
        score -= 0.5; findings.append(f"Price ${price:.2f} below EMA20 — short-term bearish")

    if price > ema50:
        score += 0.5; findings.append(f"Above EMA50 — medium-term uptrend")
    else:
        score -= 0.5; findings.append(f"Below EMA50 — medium-term downtrend")

    # Golden/Death cross
    ema20_series = pd.Series(closes).ewm(span=20).mean()
    ema50_series = pd.Series(closes).ewm(span=50).mean()
    if len(closes) > 5:
        if ema20 > ema50 and float(ema20_series.iloc[-5]) <= float(ema50_series.iloc[-5]):
            score += 1; findings.append("⭐ Golden cross (EMA20 > EMA50) — bullish")
        elif ema20 < ema50 and float(ema20_series.iloc[-5]) >= float(ema50_series.iloc[-5]):
            score -= 1; findings.append("☠️ Death cross (EMA20 < EMA50) — bearish")

    events.append(AgentEvent("thinking", "Technical Strategist", "Analyzing momentum..."))

    # SMA 200
    if len(closes) >= 200:
        sma200 = float(np.mean(closes[-200:]))
        if price > sma200:
            score += 0.5; findings.append(f"Above SMA200 — long-term bull market")
        else:
            score -= 0.5; findings.append(f"Below SMA200 — bear territory")

    # RSI
    deltas = np.diff(closes)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    avg_gain = np.mean(gains[-14:])
    avg_loss = np.mean(losses[-14:])
    rs = avg_gain / avg_loss if avg_loss != 0 else 100
    rsi = 100 - (100 / (1 + rs))

    if rsi < 30:
        score += 1; findings.append(f"RSI {rsi:.1f} — oversold, reversal opportunity")
    elif rsi > 70:
        score -= 1; findings.append(f"RSI {rsi:.1f} — overbought, correction risk")
    else:
        findings.append(f"RSI {rsi:.1f} — neutral momentum")

    # MACD
    ema12 = pd.Series(closes).ewm(span=12).mean()
    ema26 = pd.Series(closes).ewm(span=26).mean()
    macd = float((ema12 - ema26).iloc[-1])
    signal = float((ema12 - ema26).ewm(span=9).mean().iloc[-1])
    if macd > signal:
        score += 0.5; findings.append(f"MACD above signal — bullish momentum")
    else:
        score -= 0.5; findings.append(f"MACD below signal — bearish momentum")

    # Volume
    if len(volumes) >= 20:
        vol_ratio = np.mean(volumes[-5:]) / np.mean(volumes[-20:]) if np.mean(volumes[-20:]) > 0 else 1
        if vol_ratio > 1.5:
            findings.append(f"Volume surge {vol_ratio:.1f}x — strong participation")
        elif vol_ratio < 0.5:
            findings.append(f"Volume dry-up {vol_ratio:.1f}x — low conviction")

    score = max(1.0, min(10.0, round(score, 1)))
    for f in findings:
        events.append(AgentEvent("finding", "Technical Strategist", f))

    verdict = "BULLISH" if score >= 7 else "BEARISH" if score <= 3.5 else "NEUTRAL"
    events.append(AgentEvent("finding", "Technical Strategist",
                             f"📈 Technical Score: {score}/10 — {verdict}"))
    return score, events


# ══════════════════════════════════════════════════════════
# SENTIMENT ANALYST
# ══════════════════════════════════════════════════════════

def compute_sentiment_score(ticker: str) -> tuple[float, list[AgentEvent]]:
    """Compute sentiment score from news."""
    events: list[AgentEvent] = []
    events.append(AgentEvent("thinking", "Sentiment Analyst",
                             f"Scanning news feeds for {ticker}..."))

    news_items = fetch_news(ticker, limit=8)
    sentiment = analyze_sentiment(news_items)

    if not news_items:
        events.append(AgentEvent("finding", "Sentiment Analyst", "No recent news — defaulting to neutral"))
        return 5.0, events

    events.append(AgentEvent("thinking", "Sentiment Analyst",
                             f"Analyzing {len(news_items)} articles with FinBERT NLP..."))

    scored = sentiment.get("scored_news", [])
    for item in scored[:5]:
        s = item.get("sentiment_score", 0)
        icon = "🟢" if s > 0.1 else "🔴" if s < -0.1 else "⚪"
        events.append(AgentEvent("finding", "Sentiment Analyst",
                                 f"{icon} [{s:+.3f}] {item['title'][:80]}"))

    avg = sentiment["average_score"]
    label = sentiment["sentiment_label"]
    score = max(1.0, min(10.0, round(5 + (avg * 5), 1)))

    events.append(AgentEvent("finding", "Sentiment Analyst",
                             f"📰 Sentiment Score: {score}/10 — {label} (avg: {avg:+.4f})"))
    return score, events


# ══════════════════════════════════════════════════════════
# DIRECTOR — Orchestrates & Synthesizes
# ══════════════════════════════════════════════════════════

async def run_full_analysis(ticker: str) -> AsyncGenerator[dict, None]:
    """Run multi-agent pipeline. Yields SSE events."""
    ticker = ticker.upper().strip()

    yield AgentEvent("thinking", "Director",
                     f"🎯 Initiating multi-agent analysis for {ticker}").to_sse()
    yield AgentEvent("thinking", "Director",
                     "Dispatching: Fundamental, Technical, Sentiment agents").to_sse()
    await asyncio.sleep(0.3)

    # Fetch data
    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}
        hist = stock.history(period="1y")
        if hist.empty:
            yield AgentEvent("error", "Director", f"No data for {ticker}").to_sse()
            return
    except Exception as e:
        yield AgentEvent("error", "Director", f"Data error: {e}").to_sse()
        return

    price = float(hist["Close"].iloc[-1])
    name = info.get("longName", ticker)
    yield AgentEvent("thinking", "Director",
                     f"Loaded: {name} at ${price:.2f}").to_sse()
    await asyncio.sleep(0.2)

    # ── Fundamental ───────────────────────────────────────
    yield AgentEvent("thinking", "Director", "→ Fundamental Analyst...").to_sse()
    f_score, f_events = compute_fundamental_score(info)
    for ev in f_events:
        yield ev.to_sse()
        await asyncio.sleep(0.12)

    # ── Technical ─────────────────────────────────────────
    yield AgentEvent("thinking", "Director", "→ Technical Strategist...").to_sse()
    t_score, t_events = compute_technical_score(hist)
    for ev in t_events:
        yield ev.to_sse()
        await asyncio.sleep(0.1)

    # ── Sentiment ─────────────────────────────────────────
    yield AgentEvent("thinking", "Director", "→ Sentiment Analyst...").to_sse()
    s_score, s_events = compute_sentiment_score(ticker)
    for ev in s_events:
        yield ev.to_sse()
        await asyncio.sleep(0.1)

    # ── Debate ────────────────────────────────────────────
    yield AgentEvent("debate", "Director",
                     f"⚖️ Scores — F:{f_score} T:{t_score} S:{s_score}").to_sse()
    await asyncio.sleep(0.3)

    spread = max(f_score, t_score, s_score) - min(f_score, t_score, s_score)
    if f_score >= 6.5 and t_score >= 6.5 and s_score >= 6:
        yield AgentEvent("debate", "Director",
                         "✅ ALL agents BULLISH — high-conviction signal").to_sse()
    elif f_score <= 4 and t_score <= 4 and s_score <= 4.5:
        yield AgentEvent("debate", "Director",
                         "🔴 ALL agents BEARISH — high-conviction sell").to_sse()
    elif spread > 4:
        yield AgentEvent("debate", "Director",
                         "⚠️ Agents DISAGREE significantly — risk-adjusted weighting").to_sse()
    await asyncio.sleep(0.2)

    # Weighted verdict
    W = {"f": 0.40, "t": 0.35, "s": 0.25}
    total = f_score * W["f"] + t_score * W["t"] + s_score * W["s"]
    confidence = min(95, max(15, round(100 - spread * 8)))
    verdict = "BUY" if total >= 6.5 else "SELL" if total <= 4.0 else "HOLD"

    report = f"""# {ticker} — Multi-Agent Analysis Report
## {name} | ${price:.2f}

## Verdict: **{verdict}** ({confidence}% confidence)

| Agent | Score | Weight | Weighted |
|-------|-------|--------|----------|
| Fundamental | {f_score}/10 | 40% | {f_score*W['f']:.2f} |
| Technical | {t_score}/10 | 35% | {t_score*W['t']:.2f} |
| Sentiment | {s_score}/10 | 25% | {s_score*W['s']:.2f} |
| **Composite** | **{total:.1f}/10** | | **{total:.2f}** |

### Risk: {'Low' if spread < 2 else 'Medium' if spread < 4 else 'High — agents disagree'}
*FinanceIQ Multi-Agent System v6.0*"""

    yield AgentEvent("debate", "Director",
                     f"Composite: {total:.1f}/10").to_sse()
    await asyncio.sleep(0.2)

    yield AgentEvent("conclusion", "Director", json.dumps({
        "verdict": verdict,
        "confidence": confidence,
        "report": report,
        "scores": {"fundamental": f_score, "technical": t_score,
                   "sentiment": s_score, "total": round(total, 1)},
        "ticker": ticker, "price": price, "company": name,
    })).to_sse()
