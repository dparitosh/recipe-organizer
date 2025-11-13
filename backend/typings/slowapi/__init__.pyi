from __future__ import annotations

from collections.abc import Callable, Iterable
from typing import Any

class Limiter:
    def __init__(self, *, key_func: Callable[..., str], default_limits: Iterable[str] | None = ..., enabled: bool = ...) -> None: ...

    def limit(self, limit_value: str | Iterable[str]) -> Callable[..., Any]: ...

def _rate_limit_exceeded_handler(request: Any, exc: Any) -> Any: ...
