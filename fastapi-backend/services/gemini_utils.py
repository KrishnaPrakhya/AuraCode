"""
Shared Gemini utilities for the FastAPI backend.

Features:
  - Exponential backoff retry on 429 / quota errors (sync + async versions)
  - In-memory response cache keyed on a prompt fingerprint (90 s TTL)
  - Per-key cooldown guard (prevents the same session from spamming the API)
"""

import asyncio
import hashlib
import logging
import time
from functools import wraps
from threading import Lock
from typing import Any, Callable, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# ── Retry config ──────────────────────────────────────────────────────────────
MAX_RETRIES = 3
INITIAL_DELAY = 1.0  # seconds; doubles each attempt → 1 s, 2 s, 4 s

_RATE_ERRORS = ("429", "quota", "rate limit", "resource_exhausted", "too many requests")


def _is_rate_error(exc: Exception) -> bool:
    s = str(exc).lower()
    return any(token in s for token in _RATE_ERRORS)


def gemini_retry_sync(func: Callable) -> Callable:
    """Decorator for *synchronous* Gemini calls — retries on 429/quota errors."""

    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        last_exc: Optional[Exception] = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                return func(*args, **kwargs)
            except Exception as exc:
                if _is_rate_error(exc) and attempt < MAX_RETRIES:
                    last_exc = exc
                    delay = INITIAL_DELAY * (2 ** attempt)
                    logger.warning(
                        "[gemini] 429 rate limit on '%s' — retry %d/%d after %.1f s",
                        func.__name__, attempt + 1, MAX_RETRIES, delay,
                    )
                    time.sleep(delay)
                else:
                    raise
        raise last_exc  # type: ignore[misc]

    return wrapper


def gemini_retry_async(func: Callable) -> Callable:
    """Decorator for *async* Gemini calls — retries on 429/quota errors."""

    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        last_exc: Optional[Exception] = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                return await func(*args, **kwargs)
            except Exception as exc:
                if _is_rate_error(exc) and attempt < MAX_RETRIES:
                    last_exc = exc
                    delay = INITIAL_DELAY * (2 ** attempt)
                    logger.warning(
                        "[gemini] 429 rate limit on '%s' — retry %d/%d after %.1f s",
                        func.__name__, attempt + 1, MAX_RETRIES, delay,
                    )
                    await asyncio.sleep(delay)
                else:
                    raise
        raise last_exc  # type: ignore[misc]

    return wrapper


# ── In-memory response cache ──────────────────────────────────────────────────
CACHE_TTL = 90.0  # seconds
CACHE_MAX = 300    # entries

_cache: Dict[str, Tuple[str, float]] = {}  # key → (text, expires_at)
_cache_lock = Lock()


def _prompt_key(prompt: str, model: str = "") -> str:
    """A short deterministic key for a prompt (first 200 + last 200 chars + sha1 length)."""
    digest = hashlib.sha1(prompt.encode()).hexdigest()[:12]
    return f"{model}:{digest}:{len(prompt)}"


def cache_get(prompt: str, model: str = "") -> Optional[str]:
    key = _prompt_key(prompt, model)
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        text, exp = entry
        if time.time() > exp:
            del _cache[key]
            return None
        return text


def cache_put(prompt: str, text: str, model: str = "") -> None:
    key = _prompt_key(prompt, model)
    with _cache_lock:
        if len(_cache) >= CACHE_MAX:
            # Evict the oldest entry
            oldest = next(iter(_cache))
            del _cache[oldest]
        _cache[key] = (text, time.time() + CACHE_TTL)


# ── Per-key cooldown guard ────────────────────────────────────────────────────
_cooldown: Dict[str, float] = {}
_cooldown_lock = Lock()


def check_cooldown(key: str, min_gap: float) -> bool:
    """
    Returns True (and records the timestamp) if *key* has not been called
    within the last *min_gap* seconds.  Returns False if still on cooldown.
    """
    now = time.time()
    with _cooldown_lock:
        last = _cooldown.get(key, 0.0)
        if now - last < min_gap:
            return False
        _cooldown[key] = now
        return True
