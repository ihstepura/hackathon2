"""
FinanceIQ v6 — AI Router
Routing for machine learning predictions and LLM chat.
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from core import cache_get, cache_set
from services.llm_service import llm_chat

router = APIRouter()


@router.get("/predict/{ticker}")
async def get_prediction(ticker: str, days: int = 10):
    """
    Run the PyTorch LSTM model on historical data.
    Returns 10-day forecast with XAI feature importance logic.
    """
    from services.ai_service import generate_forecast
    cache_key = f"predict:{ticker}:{days}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    result = generate_forecast(ticker, days=days)
    if "error" not in result:
        # Cache for 12 hours since ML training is expensive
        await cache_set(cache_key, result, ttl=43200)
    return result


@router.post("/chat")
async def ai_chat(data: dict):
    """
    Stream a conversational response via Groq Cloud (or Ollama fallback).
    If neither is available, return a built-in text response.
    """
    ticker = data.get("ticker", "General")
    messages = data.get("messages", [])

    # Fetch real financial data to inject into context
    data_context = ""
    try:
        import yfinance as yf
        info = yf.Ticker(ticker).info
        data_context = (
            f"\n\nCURRENT FINANCIAL DATA FOR {ticker}:\n"
            f"Company: {info.get('longName', ticker)}\n"
            f"Sector: {info.get('sector', 'N/A')} | Industry: {info.get('industry', 'N/A')}\n"
            f"Current Price: ${info.get('currentPrice', info.get('regularMarketPrice', 'N/A'))}\n"
            f"Market Cap: ${info.get('marketCap', 'N/A'):,}\n"
            f"P/E Ratio: {info.get('trailingPE', 'N/A')}\n"
            f"Forward P/E: {info.get('forwardPE', 'N/A')}\n"
            f"P/B Ratio: {info.get('priceToBook', 'N/A')}\n"
            f"EPS (TTM): ${info.get('trailingEps', 'N/A')}\n"
            f"Revenue (TTM): ${info.get('totalRevenue', 'N/A'):,}\n"
            f"Net Income: ${info.get('netIncomeToCommon', 'N/A'):,}\n"
            f"Free Cash Flow: ${info.get('freeCashflow', 'N/A'):,}\n"
            f"Operating Margin: {info.get('operatingMargins', 'N/A')}\n"
            f"Net Margin: {info.get('profitMargins', 'N/A')}\n"
            f"ROE: {info.get('returnOnEquity', 'N/A')}\n"
            f"D/E Ratio: {info.get('debtToEquity', 'N/A')}\n"
            f"Dividend Yield: {info.get('dividendYield', 'N/A')}\n"
            f"Beta: {info.get('beta', 'N/A')}\n"
            f"52W High: ${info.get('fiftyTwoWeekHigh', 'N/A')} | 52W Low: ${info.get('fiftyTwoWeekLow', 'N/A')}\n"
            f"50-Day Avg: ${info.get('fiftyDayAverage', 'N/A')} | 200-Day Avg: ${info.get('twoHundredDayAverage', 'N/A')}\n"
        )
    except Exception:
        data_context = f"\n\n(No live data available for {ticker})\n"

    system_instruction = (
        f"You are the AlphaFilter 'Council of Bots', an elite financial analysis engine focusing on {ticker}. "
        "You have access to real-time financial data provided below. "
        "Use the ACTUAL NUMBERS from the data when answering — never use placeholders like ### or N/A if real data is available. "
        "Keep responses sharp, analytical, and well-structured. "
        "Format numbers properly (e.g., $3.88T, $264.18, 33.44x). "
        + data_context
    )

    formatted = [{"role": "system", "content": system_instruction}]

    for m in messages:
        role = "user" if m.get("role") == "user" else "assistant"
        content = m.get("content", "").strip()
        if content:
            formatted.append({"role": role, "content": content})

    if len(formatted) == 1:
        formatted.append({"role": "user", "content": "Hello. Summarize the current data."})

    async def generate():
        try:
            stream = await llm_chat(formatted, stream=True)
            async for chunk in stream:
                yield chunk
        except Exception as e:
            error_str = str(e)
            if "Connection" in error_str or "refused" in error_str or "Invalid API" in error_str or "401" in error_str:
                # No LLM backend available — return a helpful built-in response
                yield (
                    f"**AlphaFilter AI Council — {ticker}**\n\n"
                    f"I'm currently unable to connect to an AI engine (Groq Cloud or local Ollama).\n\n"
                    f"**To enable the AI chatbot**, please do one of the following:\n\n"
                    f"1. **Groq Cloud (recommended)**: Sign up at [console.groq.com](https://console.groq.com), "
                    f"get a free API key, and add it to your `.env` file as `GROQ_API_KEY=gsk_...`\n\n"
                    f"2. **Local Ollama**: Install [Ollama](https://ollama.ai), run `ollama pull llama3.1:latest`, "
                    f"then start the Ollama desktop app.\n\n"
                    f"Once configured, restart the backend and the chat will work."
                )
            else:
                yield f"\n[AI Error: {error_str}]"

    return StreamingResponse(generate(), media_type="text/plain")
