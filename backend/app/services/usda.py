"""USDA FoodData Central API integration.

Fetches food nutrient data and maps it to VitaBalance vitamin codes.
API docs: https://fdc.nal.usda.gov/api-guide.html
"""
import logging
from typing import List, Dict, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, ProductVitamin
from app.models.vitamin import Vitamin

logger = logging.getLogger("vitabalance.usda")

USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1"

# USDA nutrient ID -> VitaBalance vitamin code
NUTRIENT_MAP = {
    1104: "VIT_A",       # Vitamin A, IU -> convert to mcg RAE
    1175: "VIT_A",       # Vitamin A, RAE (mcg) — preferred
    1165: "VIT_B1",      # Thiamin (mg)
    1166: "VIT_B2",      # Riboflavin (mg)
    1167: "VIT_B3",      # Niacin (mg)
    1170: "VIT_B6",      # Vitamin B-6 (mg)
    1174: "VIT_B5",      # Pantothenic acid (mg)
    1177: "VIT_B9",      # Folate, total (mcg)
    1178: "VIT_B12",     # Vitamin B-12 (mcg)
    1162: "VIT_C",       # Vitamin C (mg)
    1114: "VIT_D",       # Vitamin D (D2 + D3) (mcg)
    1109: "VIT_E",       # Vitamin E (mg)
    1185: "VIT_K",       # Vitamin K (phylloquinone) (mcg)
    1089: "IRON",        # Iron, Fe (mg)
    1087: "CALCIUM",     # Calcium, Ca (mg)
    1090: "MAGNESIUM",   # Magnesium, Mg (mg)
    1095: "ZINC",        # Zinc, Zn (mg)
    1103: "SELENIUM",    # Selenium, Se (mcg)
    1091: "PHOSPHORUS",  # Phosphorus, P (mg)
    1092: "POTASSIUM",   # Potassium, K (mg)
}

# Nutrient IDs to prefer (RAE over IU for Vitamin A)
PREFERRED_NUTRIENT_IDS = {
    "VIT_A": 1175,  # RAE preferred over IU
}

# Russian category mapping
USDA_CATEGORY_MAP = {
    "Dairy and Egg Products": "Молочные продукты",
    "Spices and Herbs": "Специи и травы",
    "Baby Foods": "Детское питание",
    "Fats and Oils": "Масла и жиры",
    "Poultry Products": "Птица",
    "Soups, Sauces, and Gravies": "Супы и соусы",
    "Sausages and Luncheon Meats": "Колбасы",
    "Breakfast Cereals": "Крупы",
    "Fruits and Fruit Juices": "Фрукты и соки",
    "Pork Products": "Свинина",
    "Vegetables and Vegetable Products": "Овощи",
    "Nut and Seed Products": "Орехи и семена",
    "Beef Products": "Говядина",
    "Beverages": "Напитки",
    "Finfish and Shellfish Products": "Рыба и морепродукты",
    "Legumes and Legume Products": "Бобовые",
    "Lamb, Veal, and Game Products": "Баранина и дичь",
    "Baked Products": "Выпечка",
    "Sweets": "Сладости",
    "Cereal Grains and Pasta": "Крупы и макароны",
    "Fast Foods": "Фастфуд",
    "Meals, Entrees, and Side Dishes": "Блюда",
    "Snacks": "Снеки",
    "American Indian/Alaska Native Foods": "Другое",
    "Restaurant Foods": "Ресторанная еда",
}


async def search_usda_foods(
    query: str,
    api_key: str,
    page_size: int = 25,
    data_type: str = "SR Legacy,Foundation",
) -> List[Dict]:
    """Search USDA FoodData Central for foods."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{USDA_BASE_URL}/foods/search",
            params={
                "api_key": api_key,
                "query": query,
                "pageSize": page_size,
                "dataType": data_type,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("foods", [])


async def get_usda_food_details(
    fdc_id: int,
    api_key: str,
) -> Optional[Dict]:
    """Get detailed nutrient data for a specific food by FDC ID."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{USDA_BASE_URL}/food/{fdc_id}",
            params={"api_key": api_key},
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()


def extract_vitamins_from_usda(food_data: Dict) -> Dict[str, float]:
    """Extract vitamin amounts from USDA food data, mapped to VitaBalance codes."""
    nutrients = food_data.get("foodNutrients", [])
    result = {}
    seen_codes = {}

    for nutrient in nutrients:
        # Handle both search result format and detail format
        nutrient_id = nutrient.get("nutrientId") or nutrient.get("nutrient", {}).get("id")
        amount = nutrient.get("value") or nutrient.get("amount", 0)

        if nutrient_id is None or not amount or amount <= 0:
            continue

        code = NUTRIENT_MAP.get(nutrient_id)
        if code is None:
            continue

        # If we already have this vitamin, prefer the preferred nutrient ID
        preferred_id = PREFERRED_NUTRIENT_IDS.get(code)
        if code in seen_codes:
            if preferred_id and nutrient_id == preferred_id:
                result[code] = round(amount, 2)
                seen_codes[code] = nutrient_id
            continue

        result[code] = round(amount, 2)
        seen_codes[code] = nutrient_id

    return result


async def import_usda_food(
    fdc_id: int,
    api_key: str,
    db: AsyncSession,
    custom_name: Optional[str] = None,
    custom_category: Optional[str] = None,
) -> Optional[Dict]:
    """Import a single food from USDA into the local database."""
    food_data = await get_usda_food_details(fdc_id, api_key)
    if not food_data:
        return None

    name = custom_name or food_data.get("description", "Unknown")
    category_en = food_data.get("foodCategory", {}).get("description", "Другое")
    category = custom_category or USDA_CATEGORY_MAP.get(category_en, category_en)

    vitamins = extract_vitamins_from_usda(food_data)
    if not vitamins:
        return None

    # Check if product already exists
    existing = await db.scalar(select(Product).where(Product.name == name))
    if existing:
        return {"id": existing.id, "name": name, "status": "already_exists"}

    # Get vitamin code -> id mapping
    vit_result = await db.execute(select(Vitamin))
    vit_map = {v.code: v.id for v in vit_result.scalars().all()}

    product = Product(name=name, category=category)
    db.add(product)
    await db.flush()

    added_vitamins = {}
    for code, amount in vitamins.items():
        vit_id = vit_map.get(code)
        if vit_id is None:
            continue
        db.add(ProductVitamin(
            product_id=product.id,
            vitamin_id=vit_id,
            amount_per_100g=amount,
        ))
        added_vitamins[code] = amount

    await db.commit()

    return {
        "id": product.id,
        "name": name,
        "category": category,
        "vitamins": added_vitamins,
        "status": "imported",
    }


async def search_and_import_usda(
    query: str,
    api_key: str,
    db: AsyncSession,
    limit: int = 10,
) -> List[Dict]:
    """Search USDA and import matching foods into the database."""
    foods = await search_usda_foods(query, api_key, page_size=limit)
    results = []

    vit_result = await db.execute(select(Vitamin))
    vit_map = {v.code: v.id for v in vit_result.scalars().all()}

    for food in foods:
        name = food.get("description", "Unknown")
        category_en = food.get("foodCategory", "Другое")
        category = USDA_CATEGORY_MAP.get(category_en, category_en)

        # Check if already exists
        existing = await db.scalar(select(Product).where(Product.name == name))
        if existing:
            results.append({"name": name, "status": "already_exists", "id": existing.id})
            continue

        vitamins = extract_vitamins_from_usda(food)
        if not vitamins:
            results.append({"name": name, "status": "no_vitamin_data"})
            continue

        product = Product(name=name, category=category)
        db.add(product)
        await db.flush()

        for code, amount in vitamins.items():
            vit_id = vit_map.get(code)
            if vit_id is None:
                continue
            db.add(ProductVitamin(
                product_id=product.id,
                vitamin_id=vit_id,
                amount_per_100g=amount,
            ))

        results.append({
            "name": name,
            "category": category,
            "vitamins": vitamins,
            "status": "imported",
            "id": product.id,
        })

    await db.commit()
    return results
