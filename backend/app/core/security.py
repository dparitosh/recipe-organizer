"""Deprecated security helpers retained for backwards compatibility.

These utilities previously enforced API key headers on every backend request.
The authentication requirement has been removed, so this module no longer
exports any functionality. The file remains to avoid import errors in custom
extensions that might still reference :mod:`app.core.security`.
"""

__all__ = []
