"""
FinanceIQ v6 — Redis Client (caching + vector store)
"""
import redis.asyncio as aioredis
import json
from typing import Any, Optional
from .config import get_settings

settings = get_settings()

redis_client = aioredis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
)


async def cache_get(key: str) -> Optional[Any]:
    """Get a cached value, returns parsed JSON or None."""
    val = await redis_client.get(key)
    if val is None:
        return None
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return val


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """Cache a value as JSON with TTL in seconds."""
    await redis_client.set(key, json.dumps(value, default=str), ex=ttl)


async def cache_delete(key: str) -> None:
    """Delete a cached key."""
    await redis_client.delete(key)
