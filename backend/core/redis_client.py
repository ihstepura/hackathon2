"""
FinanceIQ v6 — Redis Client with in-memory fallback.
Falls back to a local dict cache if Redis is unavailable.
"""
import json
import time
from typing import Any, Optional
from .config import get_settings
from .logging import logger

settings = get_settings()

_fallback_cache: dict[str, tuple[Any, float]] = {}
_use_fallback = False
redis_client = None

try:
    import redis.asyncio as aioredis
    redis_client = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )
except Exception:
    _use_fallback = True


async def cache_get(key: str) -> Optional[Any]:
    """Get a cached value, returns parsed JSON or None."""
    if _use_fallback:
        entry = _fallback_cache.get(key)
        if entry and (entry[1] == 0 or time.time() < entry[1]):
            logger.debug(f"CACHE HIT (memory): {key}")
            return entry[0]
        logger.debug(f"CACHE MISS (memory): {key}")
        return None
    try:
        val = await redis_client.get(key)
        if val is None:
            logger.debug(f"CACHE MISS: {key}")
            return None
        logger.debug(f"CACHE HIT: {key}")
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return val
    except Exception:
        return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """Cache a value as JSON with TTL in seconds."""
    if _use_fallback:
        _fallback_cache[key] = (value, time.time() + ttl)
        return
    try:
        await redis_client.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception:
        pass


async def cache_delete(key: str) -> None:
    """Delete a cached key."""
    if _use_fallback:
        _fallback_cache.pop(key, None)
        return
    try:
        await redis_client.delete(key)
    except Exception:
        pass
