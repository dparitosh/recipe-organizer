import json
import requests

API_KEY = "N8J01VZvGtq3CwIrgJpgvlW4p2R03aSdOXcGcSke"
FDC_ID = 2262074

resp = requests.get(
    f"https://api.nal.usda.gov/fdc/v1/food/{FDC_ID}",
    params={"api_key": API_KEY},
    timeout=60,
)
resp.raise_for_status()
print(json.dumps(resp.json().get("foodNutrients", [])[:5], indent=2))
