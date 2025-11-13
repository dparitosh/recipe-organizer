import json
import os
import requests  # type: ignore[import-untyped]

API_KEY = os.environ.get("FDC_API_KEY") or os.environ.get("FDC_DEFAULT_API_KEY")
if not API_KEY:
    raise RuntimeError("Set FDC_API_KEY environment variable before running this script.")
FDC_ID = 2262074

resp = requests.get(
    f"https://api.nal.usda.gov/fdc/v1/food/{FDC_ID}",
    params={"api_key": API_KEY},
    timeout=60,
)
resp.raise_for_status()
print(json.dumps(resp.json().get("foodNutrients", [])[:5], indent=2))
