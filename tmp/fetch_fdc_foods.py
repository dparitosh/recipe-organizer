import json
import os
import requests  # type: ignore[import-untyped]

API_KEY = os.environ.get("FDC_API_KEY") or os.environ.get("FDC_DEFAULT_API_KEY")
if not API_KEY:
    raise RuntimeError("Set FDC_API_KEY environment variable before running this script.")
URL = "https://api.nal.usda.gov/fdc/v1/foods/list"
PARAMS = {
    "api_key": API_KEY,
}
PAYLOAD = {
    "pageSize": 10,
    "pageNumber": 1,
    "dataType": ["Foundation"],
    "format": "full",
}

def main():
    response = requests.post(URL, params=PARAMS, json=PAYLOAD, timeout=60)
    response.raise_for_status()
    foods = response.json()
    print(json.dumps(foods, indent=2))

if __name__ == "__main__":
    main()
