"""Tiny in-memory TTL cache. One singleton per cache type."""
from __future__ import annotations

import os
import time
from threading import Lock
from typing import Any, Optional


class TTLCache:
    def __init__(self, ttl_seconds: int = 300, name: str = "cache"):
        self.ttl = ttl_seconds
        self.name = name
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = Lock()
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None
            expires_at, value = entry
            if time.time() > expires_at:
                self._store.pop(key, None)
                self._misses += 1
                return None
            self._hits += 1
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
            live = [k for k, (exp, _) in self._store.items() if exp > now]
            total = self._hits + self._misses
            return {
                "name": self.name,
                "size": len(live),
                "ttl_seconds": self.ttl,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": round(self._hits / total, 3) if total else 0.0,
            }


prediction_cache = TTLCache(int(os.environ.get("PREDICTION_CACHE_TTL", "300")), "prediction")
quote_cache = TTLCache(int(os.environ.get("QUOTE_CACHE_TTL", "60")), "quote")
history_cache = TTLCache(int(os.environ.get("HISTORY_CACHE_TTL", "600")), "history")
news_cache = TTLCache(int(os.environ.get("NEWS_CACHE_TTL", "900")), "news")
