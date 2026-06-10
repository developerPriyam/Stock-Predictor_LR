"""Tiny in-memory TTL cache.

Used for /predict so we don't re-fetch yfinance + re-train per request.
Thread-safe enough for FastAPI's single-event-loop world.
"""
from __future__ import annotations

import time
from threading import Lock
from typing import Any, Optional

_DEFAULT_TTL = 300  # 5 minutes


class TTLCache:
    def __init__(self, ttl_seconds: int = _DEFAULT_TTL):
        self.ttl = ttl_seconds
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if time.time() > expires_at:
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        with self._lock:
            self._store[key] = (time.time() + (ttl or self.ttl), value)

    def invalidate(self, prefix: str = "") -> int:
        with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                self._store.pop(k, None)
            return len(keys)

    def stats(self) -> dict:
        now = time.time()
        with self._lock:
            live = [(k, exp - now) for k, (exp, _) in self._store.items() if exp > now]
            return {
                "size": len(live),
                "ttl_seconds": self.ttl,
                "entries": [
                    {"key": k, "ttl_remaining_sec": round(r, 1)} for k, r in live
                ],
            }


# Module-level singleton used by server.py
prediction_cache = TTLCache(ttl_seconds=int(__import__("os").environ.get("PREDICTION_CACHE_TTL", "300")))
