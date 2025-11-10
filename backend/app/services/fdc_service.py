import aiohttp
import logging
from typing import Any, Dict, List, Optional, Tuple, TYPE_CHECKING

logger = logging.getLogger(__name__)

if TYPE_CHECKING:  # pragma: no cover
    from app.db.neo4j_client import Neo4jClient


class FDCServiceError(Exception):
    """Represents an error returned by the USDA FDC API."""

    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class FDCService:
    """Service layer for interacting with the USDA FoodData Central API."""

    def __init__(self, base_url: str, timeout: int = 30) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout
        self._session: Optional[aiohttp.ClientSession] = None
        self._schema_ready = False

    async def start(self) -> None:
        if self._session is None:
            timeout = aiohttp.ClientTimeout(total=self._timeout_seconds)
            self._session = aiohttp.ClientSession(timeout=timeout)
            logger.info("Initialized FDC service client")

    async def close(self) -> None:
        if self._session is not None:
            await self._session.close()
            self._session = None
            logger.info("Closed FDC service client")

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None:
            await self.start()
        assert self._session is not None  # mypy assurance
        return self._session

    async def search_foods(
        self,
        api_key: str,
        *,
        query: str,
        page_size: int = 25,
        page_number: int = 1,
        data_types: Optional[List[str]] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = None,
    ) -> Dict[str, Any]:
        params: List[Tuple[str, str]] = [
            ("api_key", api_key),
            ("query", query),
            ("pageSize", str(page_size)),
            ("pageNumber", str(page_number)),
        ]

        if data_types:
            params.extend(("dataType", dt) for dt in data_types)

        if sort_by:
            params.append(("sortBy", sort_by))
        if sort_order:
            params.append(("sortOrder", sort_order))

        session = await self._get_session()
        async with session.get(f"{self._base_url}/foods/search", params=params) as response:
            return await self._parse_response(response)

    async def get_food_details(self, api_key: str, fdc_id: int) -> Dict[str, Any]:
        params = {"api_key": api_key}
        session = await self._get_session()
        async with session.get(f"{self._base_url}/food/{fdc_id}", params=params) as response:
            return await self._parse_response(response)

    async def get_foods_by_ids(self, api_key: str, fdc_ids: List[int]) -> List[Dict[str, Any]]:
        payload = {
            "fdcIds": fdc_ids,
            "format": "full",
            "api_key": api_key,
        }
        session = await self._get_session()
        async with session.post(f"{self._base_url}/foods", json=payload) as response:
            data = await self._parse_response(response)
            if isinstance(data, dict) and "foods" in data:
                return data.get("foods", [])
            return data if isinstance(data, list) else []

    async def _parse_response(self, response: aiohttp.ClientResponse) -> Dict[str, Any]:
        try:
            data = await response.json(content_type=None)
        except aiohttp.ContentTypeError:
            text = await response.text()
            data = {"message": text}

        if response.status >= 400:
            detail = (
                data.get("message")
                or data.get("errors")
                or data.get("error")
                or "Unexpected error from FDC API"
            )
            if isinstance(detail, list):
                detail = "; ".join(map(str, detail))
            raise FDCServiceError(response.status, str(detail))

        return data

    def ensure_schema(self, neo4j_client: "Neo4jClient") -> None:
        if self._schema_ready:
            return

        constraints = [
            """
            CREATE CONSTRAINT food_fdc_id IF NOT EXISTS
            FOR (f:Food) REQUIRE f.fdcId IS UNIQUE
            """,
            """
            CREATE CONSTRAINT nutrient_id IF NOT EXISTS
            FOR (n:Nutrient) REQUIRE n.nutrientId IS UNIQUE
            """,
            """
            CREATE CONSTRAINT food_category_desc IF NOT EXISTS
            FOR (c:FoodCategory) REQUIRE c.description IS UNIQUE
            """,
        ]

        for constraint in constraints:
            try:
                neo4j_client.execute_query(constraint)
            except Exception as exc:  # pragma: no cover - best effort
                logger.debug("FDC schema constraint creation skipped: %s", exc)

        self._schema_ready = True

    def ingest_food(self, neo4j_client: "Neo4jClient", food_data: Dict[str, Any]) -> Dict[str, int]:
        nutrients_payload = [
            {
                "nutrientId": nutrient.get("nutrientId"),
                "nutrientName": nutrient.get("nutrientName"),
                "nutrientNumber": nutrient.get("nutrientNumber") or "",
                "unitName": nutrient.get("unitName") or "g",
                "rank": index,
                "value": nutrient.get("value") or 0,
                "derivationCode": nutrient.get("derivationCode") or "",
            }
            for index, nutrient in enumerate(food_data.get("foodNutrients", []), start=1)
            if nutrient.get("nutrientId") is not None
        ]

        cypher = """
        MERGE (f:Food {fdcId: $fdcId})
        SET f.description = $description,
            f.dataType = $dataType,
            f.foodCategory = $foodCategory,
            f.brandOwner = $brandOwner,
            f.brandName = $brandName,
            f.gtinUpc = $gtinUpc,
            f.ingredients = $ingredients,
            f.servingSize = $servingSize,
            f.servingSizeUnit = $servingSizeUnit,
            f.publicationDate = $publicationDate,
            f.updatedAt = datetime()

        WITH f
        MERGE (c:FoodCategory {description: $foodCategory})
        SET c.categoryId = $categoryId
        MERGE (f)-[:BELONGS_TO_CATEGORY]->(c)

        WITH f
        UNWIND $nutrients AS nutrient
          MERGE (n:Nutrient {nutrientId: nutrient.nutrientId})
          SET n.nutrientName = nutrient.nutrientName,
              n.nutrientNumber = nutrient.nutrientNumber,
              n.unitName = nutrient.unitName,
              n.rank = nutrient.rank
          MERGE (f)-[r:CONTAINS_NUTRIENT]->(n)
          SET r.value = nutrient.value,
              r.unit = nutrient.unitName,
              r.per100g = nutrient.value,
              r.derivationCode = nutrient.derivationCode
        """

        params = {
            "fdcId": food_data.get("fdcId"),
            "description": food_data.get("description"),
            "dataType": food_data.get("dataType", "Unknown"),
            "foodCategory": food_data.get("foodCategory") or "Unknown",
            "categoryId": (food_data.get("foodCategory") or "Unknown").lower().replace(" ", "-"),
            "brandOwner": food_data.get("brandOwner"),
            "brandName": food_data.get("brandName"),
            "gtinUpc": food_data.get("gtinUpc"),
            "ingredients": food_data.get("ingredients"),
            "servingSize": food_data.get("servingSize"),
            "servingSizeUnit": food_data.get("servingSizeUnit"),
            "publicationDate": food_data.get("publicationDate"),
            "nutrients": nutrients_payload,
        }

        summary = neo4j_client.execute_write(cypher, params)

        return {
            "nodes_created": summary.get("nodes_created", 0),
            "relationships_created": summary.get("relationships_created", 0),
            "properties_set": summary.get("properties_set", 0),
            "nutrients_linked": len(nutrients_payload),
            "categories_linked": 1,
        }

    def list_ingested_foods(
        self,
        neo4j_client: "Neo4jClient",
        *,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 25,
        include_nutrients: bool = False,
    ) -> Dict[str, Any]:
        """Fetch paginated foods ingested into Neo4j from the FDC data set."""

        page = max(page, 1)
        page_size = max(1, min(page_size, 100))
        offset = (page - 1) * page_size
        search_term = (search or "").strip().lower()

        base_params = {
            "search": search_term,
        }

        match_filter = (
            "WHERE $search = '' "
            "OR toLower(f.description) CONTAINS $search "
            "OR toLower(coalesce(f.brandOwner, '')) CONTAINS $search "
            "OR toLower(coalesce(f.foodCategory, '')) CONTAINS $search"
        )

        query_params = {
            **base_params,
            "skip": offset,
            "limit": page_size,
            "include_nutrients": include_nutrients,
        }

        data_query = (
            "MATCH (f:Food)\n"
            f"{match_filter}\n"
            "WITH f\n"
            "ORDER BY coalesce(f.description, '') ASC, f.fdcId\n"
            "SKIP $skip\n"
            "LIMIT $limit\n"
            "RETURN f {\n"
            "    .fdcId,\n"
            "    .description,\n"
            "    .dataType,\n"
            "    .brandOwner,\n"
            "    .brandName,\n"
            "    .foodCategory,\n"
            "    .servingSize,\n"
            "    .servingSizeUnit,\n"
            "    .ingredients,\n"
            "    .publicationDate,\n"
            "    .updatedAt,\n"
            "    .dataSource\n"
            "} AS food,\n"
            "CASE\n"
            "    WHEN $include_nutrients\n"
            "    THEN [(f)-[rel:CONTAINS_NUTRIENT]->(n:Nutrient) |\n"
            "        {\n"
            "            nutrientId: n.nutrientId,\n"
            "            nutrientName: n.nutrientName,\n"
            "            unitName: n.unitName,\n"
            "            rank: n.rank,\n"
            "            value: rel.value,\n"
            "            unit: rel.unit,\n"
            "            derivationCode: rel.derivationCode\n"
            "        }\n"
            "    ]\n"
            "    ELSE []\n"
            "END AS nutrients"
        )

        records = neo4j_client.execute_query(data_query, query_params)

        def _normalize(raw: Any) -> Dict[str, Any]:
            if isinstance(raw, dict):
                return dict(raw)
            try:
                return dict(raw)
            except TypeError:
                return {}

        items: List[Dict[str, Any]] = []
        for record in records:
            food = _normalize(record.get("food"))
            if include_nutrients:
                food["nutrients"] = record.get("nutrients", []) or []
            items.append(food)

        total_query = (
            "MATCH (f:Food)\n"
            f"{match_filter}\n"
            "RETURN count(f) AS total"
        )

        total_records = neo4j_client.execute_query(total_query, base_params)
        total = total_records[0].get("total", 0) if total_records else 0

        return {
            "items": items,
            "page": page,
            "page_size": page_size,
            "total": total,
            "has_next_page": offset + len(items) < total,
        }
