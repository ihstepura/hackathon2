"""
FinanceIQ v6 — Agent Router
Multi-agent analysis with SSE streaming.
"""
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from agents import run_full_analysis

router = APIRouter()


@router.get("/analyze/{ticker}")
async def agent_analyze(ticker: str):
    """
    Trigger multi-agent analysis with SSE streaming.
    Streams agent thoughts in real-time to the Research Scratchpad.
    """
    ticker = ticker.upper().strip()
    return EventSourceResponse(run_full_analysis(ticker))
