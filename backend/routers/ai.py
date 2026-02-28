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
    """
    ticker = data.get("ticker", "General")
    messages = data.get("messages", [])

    system_instruction = (
        f"You are the AlphaFilter 'Council of Bots', an elite financial summarization engine focusing on {ticker}. "
        "Your strict mandate is to OBJECTIVELY SUMMARIZE technicals, fundamentals, and alternative data sentiment. "
        "CRITICAL RULE: You must absolutely REFUSE to make any predictions about future stock price action. "
        "If asked to predict, state that you are a summarization engine and cannot predict the future. "
        "Keep responses sharp, analytical, and format numbers optimally using markdown."
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
            yield f"\n[AI Error: {str(e)}]"

    return StreamingResponse(generate(), media_type="text/plain")
