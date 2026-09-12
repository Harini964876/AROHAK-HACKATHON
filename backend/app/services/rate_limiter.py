import time
import threading
from collections import defaultdict, deque
from typing import Optional
from fastapi import HTTPException, status, Request
from app.config import settings

class SlidingWindowRateLimiter:
    """
    Thread-safe, high-performance in-memory sliding window rate limiter.
    Tracks request timestamps per key (e.g., client IP, email) to prevent
    brute-force attacks and credential stuffing.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._hits = defaultdict(deque)

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        if not settings.RATE_LIMIT_ENABLED:
            return True

        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            timestamps = self._hits[key]
            # Remove timestamps outside the sliding window
            while timestamps and timestamps[0] < cutoff:
                timestamps.popleft()

            if len(timestamps) >= max_requests:
                return False

            timestamps.append(now)
            return True

    def reset(self):
        """Clears all tracked timestamps (useful for test isolation)."""
        with self._lock:
            self._hits.clear()

limiter = SlidingWindowRateLimiter()

def enforce_rate_limit(
    request: Request,
    email: Optional[str] = None,
    max_ip_attempts: int = 15,
    max_email_attempts: int = 5,
    window_seconds: int = 60
):
    """
    Enforces rate limiting on authentication attempts:
    - Per IP: max_ip_attempts per window_seconds (default: 15/min)
    - Per Email (if provided): max_email_attempts per window_seconds (default: 5/min)
    """
    if not settings.RATE_LIMIT_ENABLED:
        return

    # Extract client IP (respecting forwarded-for headers if present)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    ip_key = f"ip:{client_ip}"
    if not limiter.is_allowed(ip_key, max_requests=max_ip_attempts, window_seconds=window_seconds):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests from this IP. Please try again in 60 seconds.",
            headers={"Retry-After": str(window_seconds)}
        )

    if email:
        email_key = f"email:{email.lower().strip()}"
        if not limiter.is_allowed(email_key, max_requests=max_email_attempts, window_seconds=window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts for account '{email}'. Please try again in 60 seconds.",
                headers={"Retry-After": str(window_seconds)}
            )
