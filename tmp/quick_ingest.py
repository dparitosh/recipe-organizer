import requests

payload = {
    "api_key": "N8J01VZvGtq3CwIrgJpgvlW4p2R03aSdOXcGcSke",
    "search_term": "almond butter",
    "count": 5,
}

resp = requests.post("http://localhost:8000/api/fdc/quick-ingest", json=payload, timeout=120)
print(resp.status_code)
print(resp.json())
