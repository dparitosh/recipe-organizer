import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.fdc_service import FDCService  # type: ignore[import]


class FakeNeo4jClient:
    def __init__(self, responses):
        self.responses = list(responses)
        self.executed = []

    def execute_query(self, query, parameters=None):
        self.executed.append((query, parameters or {}))
        if not self.responses:
            pytest.fail("No prepared response available for query execution")
        return self.responses.pop(0)


def build_service():
    return FDCService(base_url="https://api.nal.usda.gov/fdc/v1")


def test_list_ingested_foods_returns_paginated_results():
    data_records = [
        {
            "food": {
                "fdcId": 1,
                "description": "Orange Juice",
                "dataType": "Branded",
            },
            "nutrients": [],
        },
        {
            "food": {
                "fdcId": 2,
                "description": "Apple Juice",
                "dataType": "Branded",
            },
            "nutrients": [],
        },
    ]
    total_records = [{"total": 2}]
    client = FakeNeo4jClient([data_records, total_records])

    service = build_service()

    result = service.list_ingested_foods(client)

    assert result["items"] == [record["food"] for record in data_records]
    assert result["page"] == 1
    assert result["page_size"] == 25
    assert result["total"] == 2
    assert result["has_next_page"] is False

    query, params = client.executed[0]
    assert "MATCH (f:Food)" in query
    assert params["skip"] == 0
    assert params["limit"] == 25
    assert params["include_nutrients"] is False


def test_list_ingested_foods_supports_nutrient_expansion_and_pagination():
    data_records = [
        {
            "food": {
                "fdcId": 10,
                "description": "Spinach",
                "dataType": "SR Legacy",
            },
            "nutrients": [
                {
                    "nutrientId": 1008,
                    "nutrientName": "Energy",
                    "unitName": "kcal",
                    "rank": 500,
                    "value": 23.0,
                    "unit": "kcal",
                    "derivationCode": "A"
                }
            ],
        }
    ]
    total_records = [{"total": 30}]
    client = FakeNeo4jClient([data_records, total_records])

    service = build_service()

    result = service.list_ingested_foods(
        client,
        page=-2,
        page_size=200,
        include_nutrients=True,
        search="spinach",
    )

    expected_item = data_records[0]["food"].copy()
    expected_item["nutrients"] = data_records[0]["nutrients"]
    assert result["items"][0] == expected_item
    assert result["page"] == 1  # clamped from negative
    assert result["page_size"] == 100  # clamped to upper bound
    assert result["total"] == 30
    assert result["has_next_page"] is True

    _, params = client.executed[0]
    assert params["skip"] == 0
    assert params["limit"] == 100
    assert params["include_nutrients"] is True
    assert params["search"] == "spinach"
