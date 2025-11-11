from __future__ import annotations

from typing import List, Sequence

import requests


class EmbeddingClientError(RuntimeError):
    """Raised when the embedding backend returns an unexpected response."""


class EmbeddingClient:
    """Protocol-style base class describing the embedding interface."""

    def embed_texts(self, texts: Sequence[str]) -> Sequence[Sequence[float]]:  # pragma: no cover - interface definition
        raise NotImplementedError


class OllamaEmbeddingClient(EmbeddingClient):
    """Thin synchronous wrapper around Ollama's /api/embed endpoint."""

    def __init__(
        self,
        *,
        base_url: str,
        model: str,
        timeout: float = 60.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def embed_texts(self, texts: Sequence[str]) -> Sequence[Sequence[float]]:
        if not texts:
            return []
        payload = {
            "model": self.model,
            "input": list(texts),
        }

        try:
            response = requests.post(
                f"{self.base_url}/api/embed",
                json=payload,
                timeout=self.timeout,
            )
        except requests.RequestException as exc:  # pragma: no cover - network failure path
            raise EmbeddingClientError(f"Ollama embed request failed: {exc}") from exc

        if response.status_code != 200:
            detail = response.text.strip()
            raise EmbeddingClientError(
                f"Ollama embed request failed ({response.status_code}): {detail}"
            )

        try:
            data = response.json()
        except ValueError as exc:
            raise EmbeddingClientError("Ollama embed response was not valid JSON") from exc

        embeddings = self._extract_embeddings(data)
        if len(embeddings) != len(texts):
            raise EmbeddingClientError(
                "Embedding response size mismatch: "
                f"expected {len(texts)} vectors, received {len(embeddings)}"
            )

        return embeddings

    @staticmethod
    def _extract_embeddings(payload: object) -> Sequence[Sequence[float]]:
        if not isinstance(payload, dict):
            raise EmbeddingClientError("Embedding payload must be a JSON object")

        if "embeddings" in payload:
            candidates = payload.get("embeddings")
        else:
            candidates = payload.get("embedding")

        if candidates is None:
            raise EmbeddingClientError("Embedding payload missing 'embedding(s)' key")

        if not isinstance(candidates, list):
            raise EmbeddingClientError("Embedding payload must be a list of vectors")

        if candidates and isinstance(candidates[0], (int, float)):
            return [[float(value) for value in candidates]]

        normalized: List[List[float]] = []
        for vector in candidates:
            if not isinstance(vector, (list, tuple)):
                raise EmbeddingClientError("Embedding vector must be a list or tuple of floats")
            normalized.append([float(value) for value in vector])

        return normalized
