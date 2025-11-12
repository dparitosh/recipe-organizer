"""Nutrition calculation service for formulations."""

import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class NutrientValue:
    """Individual nutrient value."""
    name: str
    amount: float
    unit: str
    daily_value_percent: Optional[float] = None


@dataclass
class NutritionFacts:
    """FDA-compliant nutrition facts data."""
    formulation_id: str
    formulation_name: str
    serving_size: float
    serving_size_unit: str
    servings_per_container: Optional[float]
    calories: float
    total_fat: NutrientValue
    saturated_fat: NutrientValue
    trans_fat: NutrientValue
    cholesterol: NutrientValue
    sodium: NutrientValue
    total_carbohydrate: NutrientValue
    dietary_fiber: NutrientValue
    total_sugars: NutrientValue
    added_sugars: NutrientValue
    protein: NutrientValue
    vitamin_d: NutrientValue
    calcium: NutrientValue
    iron: NutrientValue
    potassium: NutrientValue
    additional_nutrients: List[NutrientValue]


# FDA Daily Values for nutrition label (based on 2000 calorie diet)
FDA_DAILY_VALUES: Dict[str, Dict[str, Any]] = {
    "Total Fat": {"amount": 78, "unit": "g"},
    "Saturated Fat": {"amount": 20, "unit": "g"},
    "Cholesterol": {"amount": 300, "unit": "mg"},
    "Sodium": {"amount": 2300, "unit": "mg"},
    "Total Carbohydrate": {"amount": 275, "unit": "g"},
    "Dietary Fiber": {"amount": 28, "unit": "g"},
    "Added Sugars": {"amount": 50, "unit": "g"},
    "Protein": {"amount": 50, "unit": "g"},
    "Vitamin D": {"amount": 20, "unit": "mcg"},
    "Calcium": {"amount": 1300, "unit": "mg"},
    "Iron": {"amount": 18, "unit": "mg"},
    "Potassium": {"amount": 4700, "unit": "mg"},
}

class NutritionCalculationService:
    """Service responsible for generating nutrition labels from the knowledge graph."""

    def __init__(self, neo4j_client: Any) -> None:
        self.neo4j_client = neo4j_client

    async def calculate_nutrition_label(
        self,
        formulation_id: str,
        serving_size: float,
        serving_size_unit: str,
        servings_per_container: Optional[float],
    ) -> NutritionFacts:
        """Aggregate nutrients and build a NutritionFacts payload."""

        if serving_size <= 0:
            raise ValueError("Serving size must be greater than zero")

        formulation = await self._get_formulation_with_nutrients(formulation_id)
        if not formulation:
            raise ValueError(f"Formulation {formulation_id} not found")

        ingredients = formulation.get("ingredients") or []
        if not ingredients:
            raise ValueError(f"No ingredients found for formulation {formulation_id}")

        aggregated = self._aggregate_nutrients(ingredients, serving_size)
        if not aggregated:
            raise ValueError("No nutrient data available for aggregation")

        return self._build_nutrition_facts(
            formulation_id=formulation.get("id", formulation_id),
            formulation_name=formulation.get("name", ""),
            aggregated_nutrients=aggregated,
            serving_size=serving_size,
            serving_size_unit=serving_size_unit,
            servings_per_container=servings_per_container,
        )

    async def _get_formulation_with_nutrients(
        self,
        formulation_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Fetch formulation data with nutrient details from the knowledge graph."""

        kg_query = """
        MATCH (f:Formulation {id: $formulation_id})
        OPTIONAL MATCH (f)-[ci:CONTAINS_INGREDIENT]->(ing:Ingredient)
        OPTIONAL MATCH (ing)-[:DERIVED_FROM]->(food:Food)
        OPTIONAL MATCH (food)-[cn:CONTAINS_NUTRIENT]->(n:Nutrient)
        WITH f, ci, ing, food,
             collect({
                 nutrient_name: n.nutrientName,
                 amount: cn.value,
                 unit: n.unitName,
                 per100g: cn.per100g,
                 fdc_id: food.fdcId
             }) AS nutrient_rows
        WITH f, ci, ing, food,
             [row IN nutrient_rows WHERE row.nutrient_name IS NOT NULL] AS nutrients
        WITH f,
             collect(
                 CASE
                     WHEN ing IS NULL THEN NULL
                     ELSE {
                         name: ing.name,
                         percentage: ci.percentage,
                         quantity_kg: ci.quantity_kg,
                         food_fdc_id: food.fdcId,
                         food_description: food.description,
                         nutrients: nutrients
                     }
                 END
             ) AS ingredient_collection
        RETURN f.id AS formulation_id,
               f.name AS formulation_name,
               [item IN ingredient_collection WHERE item IS NOT NULL] AS ingredients
        """

        results = self.neo4j_client.execute_query(kg_query, {"formulation_id": formulation_id})
        if results:
            record = results[0]
            ingredients = record.get("ingredients", []) or []
            nutrient_backed = [ing for ing in ingredients if ing.get("nutrients")]
            if nutrient_backed:
                logger.info(
                    "Knowledge graph retrieved %d ingredients with nutrient data",
                    len(nutrient_backed),
                )
                return {
                    "id": record.get("formulation_id"),
                    "name": record.get("formulation_name"),
                    "ingredients": nutrient_backed,
                }

        logger.info(
            "Knowledge graph nutrients missing for %s, falling back to ingredient lookup",
            formulation_id,
        )

        fallback_formulation = self.neo4j_client.execute_query(
            """
            MATCH (f:Formulation {id: $formulation_id})
            RETURN f.id AS id, f.name AS name
            """,
            {"formulation_id": formulation_id},
        )
        if not fallback_formulation:
            return None

        ingredient_rows = self.neo4j_client.execute_query(
            """
            MATCH (f:Formulation {id: $formulation_id})-[rel:CONTAINS_INGREDIENT]->(ing:Ingredient)
            OPTIONAL MATCH (ing)-[:DERIVED_FROM]->(food:Food)
            RETURN ing.name AS ingredient_name,
                   rel.percentage AS percentage,
                   rel.quantity_kg AS quantity_kg,
                   food.description AS food_description,
                   food.fdcId AS food_fdc_id
            """,
            {"formulation_id": formulation_id},
        )

        ingredients_with_nutrients: List[Dict[str, Any]] = []
        for row in ingredient_rows:
            ingredient_name = row.get("ingredient_name")
            if not ingredient_name:
                continue

            nutrient_rows = self.neo4j_client.execute_query(
                """
                MATCH (food:Food)
                WHERE ($fdc_id IS NOT NULL AND food.fdcId = $fdc_id)
                   OR (food.fdcId IS NOT NULL AND toLower(food.description) CONTAINS toLower($ingredient_name))
                OPTIONAL MATCH (food)-[rel:CONTAINS_NUTRIENT]->(n:Nutrient)
                RETURN food.description AS matched_food,
                       food.fdcId AS fdc_id,
                       n.nutrientName AS nutrient_name,
                       rel.value AS amount,
                       n.unitName AS unit,
                       rel.per100g AS per100g
                """,
                {
                    "ingredient_name": ingredient_name,
                    "fdc_id": row.get("food_fdc_id"),
                },
            )

            nutrients = [
                {
                    "nutrient_name": nut.get("nutrient_name"),
                    "amount": nut.get("amount"),
                    "unit": nut.get("unit"),
                    "per100g": nut.get("per100g"),
                    "matched_food": nut.get("matched_food"),
                    "fdc_id": nut.get("fdc_id"),
                }
                for nut in nutrient_rows
                if nut.get("nutrient_name")
            ]

            logger.info(
                "Fallback lookup retrieved %d nutrients for ingredient %s",
                len(nutrients),
                ingredient_name,
            )

            ingredients_with_nutrients.append(
                {
                    "name": ingredient_name,
                    "percentage": row.get("percentage", 0.0),
                    "quantity_kg": row.get("quantity_kg"),
                    "food_description": row.get("food_description"),
                    "food_fdc_id": row.get("food_fdc_id"),
                    "nutrients": nutrients,
                }
            )

        return {
            "id": fallback_formulation[0].get("id", formulation_id),
            "name": fallback_formulation[0].get("name", ""),
            "ingredients": ingredients_with_nutrients,
        }

    def _aggregate_nutrients(
        self,
        ingredients: List[Dict[str, Any]],
        serving_size: float,
    ) -> Dict[str, float]:
        """Aggregate nutrients from ingredients weighted by percentage."""

        logger.info(
            "Aggregating nutrients for %d ingredients (serving_size=%s)",
            len(ingredients),
            serving_size,
        )

        aggregated: Dict[str, float] = {}
        for ingredient in ingredients:
            nutrients = ingredient.get("nutrients", []) or []
            nutrient_count = len(nutrients)
            logger.info(
                "Ingredient %s: percentage=%s, nutrients=%d",
                ingredient.get("name"),
                ingredient.get("percentage"),
                nutrient_count,
            )

            try:
                percentage = float(ingredient.get("percentage", 0)) / 100.0
            except Exception:  # pragma: no cover - defensive fallback
                percentage = 0.0

            if not nutrients:
                continue

            logger.debug(
                "Sample nutrient row for %s: %s",
                ingredient.get("name"),
                nutrients[0],
            )

            for nutrient in nutrients:
                name = None
                amount = None
                unit = None

                if isinstance(nutrient, dict):
                    nested = nutrient.get("nutrient") or nutrient.get("nutrient_info")
                    if isinstance(nested, dict):
                        name = (
                            nested.get("name")
                            or nested.get("nutrientName")
                            or nested.get("nutrient_name")
                        )
                        amount = (
                            nutrient.get("amount")
                            or nested.get("amount")
                            or nested.get("value")
                        )
                        unit = (
                            nutrient.get("unit")
                            or nested.get("unit")
                            or nested.get("unitName")
                        )
                    else:
                        name = (
                            nutrient.get("name")
                            or nutrient.get("nutrientName")
                            or nutrient.get("nutrient_name")
                        )
                        amount = (
                            nutrient.get("amount")
                            or nutrient.get("value")
                            or nutrient.get("nutrientAmount")
                        )
                        unit = nutrient.get("unit") or nutrient.get("unitName")

                if not name:
                    logger.debug(
                        "Skipping unnamed nutrient row for %s",
                        ingredient.get("name"),
                    )
                    continue

                try:
                    amount_val = 0.0 if amount is None else float(amount)
                except Exception as exc:  # pragma: no cover - defensive fallback
                    logger.debug(
                        "Skipping nutrient %s for %s due to non-numeric amount %s (%s)",
                        name,
                        ingredient.get("name"),
                        amount,
                        exc,
                    )
                    continue

                unit = unit or "g"
                weighted_amount = amount_val * percentage * (serving_size / 100.0)

                key = f"{name}|{unit}"
                aggregated[key] = aggregated.get(key, 0.0) + weighted_amount

        return aggregated

    def _build_nutrition_facts(
        self,
        formulation_id: str,
        formulation_name: str,
        aggregated_nutrients: Dict[str, float],
        serving_size: float,
        serving_size_unit: str,
        servings_per_container: Optional[float],
    ) -> NutritionFacts:
        """Build FDA-compliant nutrition facts structure."""

        def get_nutrient(names: List[str]) -> float:
            for name in names:
                for key, value in aggregated_nutrients.items():
                    if key.startswith(name):
                        return value
            return 0.0

        def calc_dv_percent(amount: float, nutrient_name: str) -> Optional[float]:
            dv_info = FDA_DAILY_VALUES.get(nutrient_name)
            if dv_info and float(dv_info["amount"] or 0) > 0:
                return round((amount / float(dv_info["amount"])) * 100, 0)
            return None

        calories = get_nutrient(["Energy", "Calories"])
        total_fat = get_nutrient(["Total lipid (fat)", "Fat, total", "Total Fat"])
        saturated_fat = get_nutrient(["Fatty acids, total saturated", "Saturated fat"])
        trans_fat = get_nutrient(["Fatty acids, total trans", "Trans fat"])
        cholesterol = get_nutrient(["Cholesterol"])
        sodium = get_nutrient(["Sodium, Na", "Sodium"])
        total_carbs = get_nutrient(["Carbohydrate, by difference", "Carbohydrate"])
        fiber = get_nutrient(["Fiber, total dietary", "Fiber"])
        total_sugars = get_nutrient(["Sugars, total including NLEA", "Sugars, total", "Sugars"])
        added_sugars = get_nutrient(["Sugars, added"])
        protein = get_nutrient(["Protein"])
        vitamin_d = get_nutrient(["Vitamin D (D2 + D3)", "Vitamin D"])
        calcium = get_nutrient(["Calcium, Ca", "Calcium"])
        iron = get_nutrient(["Iron, Fe", "Iron"])
        potassium = get_nutrient(["Potassium, K", "Potassium"])

        primary_nutrients = {
            "Total Fat",
            "Saturated Fat",
            "Trans Fat",
            "Cholesterol",
            "Sodium",
            "Total Carbohydrate",
            "Dietary Fiber",
            "Total Sugars",
            "Added Sugars",
            "Protein",
            "Vitamin D",
            "Calcium",
            "Iron",
            "Potassium",
            "Energy",
            "Calories",
        }

        additional: List[NutrientValue] = []
        for key, value in aggregated_nutrients.items():
            name, _, unit = key.partition("|")
            if name in primary_nutrients:
                continue
            additional.append(
                NutrientValue(
                    name=name,
                    amount=round(value, 2),
                    unit=unit or "g",
                    daily_value_percent=None,
                )
            )

        additional.sort(key=lambda nutrient: nutrient.name)

        return NutritionFacts(
            formulation_id=formulation_id,
            formulation_name=formulation_name,
            serving_size=serving_size,
            serving_size_unit=serving_size_unit,
            servings_per_container=servings_per_container,
            calories=round(calories, 0),
            total_fat=NutrientValue(
                "Total Fat",
                round(total_fat, 1),
                "g",
                calc_dv_percent(total_fat, "Total Fat"),
            ),
            saturated_fat=NutrientValue(
                "Saturated Fat",
                round(saturated_fat, 1),
                "g",
                calc_dv_percent(saturated_fat, "Saturated Fat"),
            ),
            trans_fat=NutrientValue("Trans Fat", round(trans_fat, 1), "g"),
            cholesterol=NutrientValue(
                "Cholesterol",
                round(cholesterol, 0),
                "mg",
                calc_dv_percent(cholesterol, "Cholesterol"),
            ),
            sodium=NutrientValue(
                "Sodium",
                round(sodium, 0),
                "mg",
                calc_dv_percent(sodium, "Sodium"),
            ),
            total_carbohydrate=NutrientValue(
                "Total Carbohydrate",
                round(total_carbs, 1),
                "g",
                calc_dv_percent(total_carbs, "Total Carbohydrate"),
            ),
            dietary_fiber=NutrientValue(
                "Dietary Fiber",
                round(fiber, 1),
                "g",
                calc_dv_percent(fiber, "Dietary Fiber"),
            ),
            total_sugars=NutrientValue("Total Sugars", round(total_sugars, 1), "g"),
            added_sugars=NutrientValue(
                "Added Sugars",
                round(added_sugars, 1),
                "g",
                calc_dv_percent(added_sugars, "Added Sugars"),
            ),
            protein=NutrientValue(
                "Protein",
                round(protein, 1),
                "g",
                calc_dv_percent(protein, "Protein"),
            ),
            vitamin_d=NutrientValue(
                "Vitamin D",
                round(vitamin_d, 1),
                "mcg",
                calc_dv_percent(vitamin_d, "Vitamin D"),
            ),
            calcium=NutrientValue(
                "Calcium",
                round(calcium, 0),
                "mg",
                calc_dv_percent(calcium, "Calcium"),
            ),
            iron=NutrientValue(
                "Iron",
                round(iron, 1),
                "mg",
                calc_dv_percent(iron, "Iron"),
            ),
            potassium=NutrientValue(
                "Potassium",
                round(potassium, 0),
                "mg",
                calc_dv_percent(potassium, "Potassium"),
            ),
            additional_nutrients=additional,
        )
