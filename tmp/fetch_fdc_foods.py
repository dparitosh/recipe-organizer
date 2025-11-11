import json
import requests

API_KEY = "N8J01VZvGtq3CwIrgJpgvlW4p2R03aSdOXcGcSke"
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
