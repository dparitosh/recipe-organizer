from __future__ import annotations

from collections.abc import Iterable

try:  # pragma: no cover - dependency import guard
    from slowapi import Limiter  # type: ignore[import-not-found]
    from slowapi.util import get_remote_address  # type: ignore[import-not-found]
except ImportError as exc:  # pragma: no cover - fail fast if missing
    raise RuntimeError("slowapi must be installed to use rate limiting") from exc

from app.core.config import settings

_default_limits: list[str] = []
rate_defaults = settings.RATE_LIMIT_DEFAULT
if isinstance(rate_defaults, str):
    _default_limits = [rate_defaults]
elif isinstance(rate_defaults, Iterable):
    _default_limits = [str(limit) for limit in rate_defaults]

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=_default_limits,
    enabled=settings.RATE_LIMIT_ENABLED,
)

__all__ = ["limiter"]
