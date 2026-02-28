"""
FinanceIQ v6 — Unified LLM Service
Groq Cloud (primary) with Ollama fallback.
Provides a single interface for all LLM calls in the app.
"""
import asyncio
import json
from typing import AsyncGenerator
from core.config import get_settings
from core.logging import logger

settings = get_settings()


async def llm_chat(
    messages: list[dict],
    stream: bool = False,
    json_mode: bool = False,
) -> str | AsyncGenerator[str, None]:
    """
    Send a chat completion. Tries Groq first, falls back to Ollama.

    Args:
        messages: [{"role": "system"|"user"|"assistant", "content": "..."}]
        stream: If True, returns an async generator yielding chunks.
        json_mode: If True, requests JSON output format.
    """
    if settings.GROQ_API_KEY:
        return await _groq_chat(messages, stream, json_mode)
    else:
        return await _ollama_chat(messages, stream, json_mode)


async def _groq_chat(
    messages: list[dict],
    stream: bool,
    json_mode: bool,
) -> str | AsyncGenerator[str, None]:
    """Groq Cloud — OpenAI-compatible, 300+ tok/s."""
    from groq import Groq

    client = Groq(api_key=settings.GROQ_API_KEY)

    kwargs = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "max_tokens": 1024,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    if stream:
        async def _stream():
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: client.chat.completions.create(**kwargs, stream=True),
            )
            for chunk in response:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content

        return _stream()
    else:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(**kwargs),
        )
        return response.choices[0].message.content


async def _ollama_chat(
    messages: list[dict],
    stream: bool,
    json_mode: bool,
) -> str | AsyncGenerator[str, None]:
    """Ollama fallback — local inference."""
    import ollama

    kwargs = {
        "model": "llama3.1:latest",
        "messages": messages,
    }
    if json_mode:
        kwargs["format"] = "json"

    if stream:
        async def _stream():
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: ollama.chat(**kwargs, stream=True),
            )
            for chunk in response:
                if "message" in chunk and "content" in chunk["message"]:
                    yield chunk["message"]["content"]

        return _stream()
    else:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: ollama.chat(**kwargs),
        )
        return response["message"]["content"]
