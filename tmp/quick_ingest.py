import os
import requests  # type: ignore[import-untyped]

API_KEY = os.environ.get("FDC_API_KEY") or os.environ.get("FDC_DEFAULT_API_KEY")
if not API_KEY:
    raise RuntimeError("Set FDC_API_KEY environment variable before running this script.")

payload = {
    "api_key": API_KEY,
    "search_term": "almond butter",
    "count": 5,
}

resp = requests.post("http://localhost:8000/api/fdc/quick-ingest", json=payload, timeout=120)
print(resp.status_code)
print(resp.json())
