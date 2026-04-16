from typing import List, Dict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.recipe import Recipe, RecipeIngredient
from app.models.product import ProductVitamin
from app.models.vitamin import Vitamin
from app.services.analysis import get_user_analysis
from app.services.cache import cached_vitamins


async def get_recommended_recipes(user_id: int, db: AsyncSession, limit: int = 20, offset: int = 0) -> List[Dict]:
    """Get recipes ranked by how well they address user's vitamin deficiencies."""
    # 1. Get user's analysis to find deficiencies
    analysis = await get_user_analysis(user_id, db)
    deficiencies = {
        item.vitamin_id: item.severity
        for item in analysis
        if item.status == "deficiency" and item.severity > 0
    }

    if not deficiencies:
        # No deficiencies, return all recipes without scoring
        result = await db.execute(select(Recipe).order_by(Recipe.id.desc()).offset(offset).limit(limit))
        recipes = result.scalars().all()
        return [
            {
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "image_url": r.image_url,
                "cook_time_minutes": r.cook_time_minutes,
                "relevance_score": None,
            }
            for r in recipes
        ]

    # 2. Get all recipes with their ingredients
    # Note: loads all recipes at once, which is acceptable for a small dataset (~60 recipes)
    result = await db.execute(
        select(Recipe).options(selectinload(Recipe.ingredients))
    )
    recipes = result.scalars().all()

    # 3. Get product vitamin data for all products used in recipes
    product_ids = set()
    for recipe in recipes:
        for ing in recipe.ingredients:
            product_ids.add(ing.product_id)

    pv_result = await db.execute(
        select(ProductVitamin).where(ProductVitamin.product_id.in_(product_ids))
    )
    product_vitamins = pv_result.scalars().all()

    # Build map: product_id -> {vitamin_id: amount_per_100g}
    pv_map = {}
    for pv in product_vitamins:
        if pv.product_id not in pv_map:
            pv_map[pv.product_id] = {}
        pv_map[pv.product_id][pv.vitamin_id] = pv.amount_per_100g

    # 4. Score each recipe
    scored = []
    for recipe in recipes:
        score = 0.0
        for ing in recipe.ingredients:
            vit_data = pv_map.get(ing.product_id, {})
            # Convert ingredient amount to factor (relative to 100g)
            factor = ing.amount / 100.0
            for vit_id, severity in deficiencies.items():
                amount = vit_data.get(vit_id, 0)
                score += amount * factor * (severity / 100.0)

        scored.append((recipe, score))

    # 5. Sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)

    # Normalize scores to percentage (max = 100%)
    max_score = scored[0][1] if scored and scored[0][1] > 0 else 1
    return [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "image_url": r.image_url,
            "cook_time_minutes": r.cook_time_minutes,
            "relevance_score": round((s / max_score) * 100, 1) if s > 0 else 0,
        }
        for r, s in scored[offset: offset + limit]
    ]


async def get_recipe_vitamin_content(recipe_id: int, db: AsyncSession) -> List[Dict]:
    """Calculate total vitamin content of a recipe."""
    result = await db.execute(
        select(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe_id)
    )
    ingredients = result.scalars().all()

    # Collect all product IDs and fetch all ProductVitamin rows in one query
    product_ids = [ing.product_id for ing in ingredients]
    if not product_ids:
        return []

    pv_result = await db.execute(
        select(ProductVitamin).where(ProductVitamin.product_id.in_(product_ids))
    )
    all_pvs = pv_result.scalars().all()

    # Build map: product_id -> list of ProductVitamin
    pv_map: Dict[int, List] = {}
    for pv in all_pvs:
        pv_map.setdefault(pv.product_id, []).append(pv)

    totals = {}  # vitamin_id -> total amount
    for ing in ingredients:
        factor = ing.amount / 100.0
        for pv in pv_map.get(ing.product_id, []):
            totals[pv.vitamin_id] = totals.get(pv.vitamin_id, 0) + pv.amount_per_100g * factor

    # Get vitamin names (cached)
    vit_ids = list(totals.keys())
    if not vit_ids:
        return []
    vitamins = {v.id: v for v in await cached_vitamins(db) if v.id in vit_ids}

    return [
        {
            "vitamin_name": vitamins[vid].name,
            "amount": round(amount, 2),
            "unit": vitamins[vid].unit,
        }
        for vid, amount in sorted(totals.items())
        if vid in vitamins and amount > 0.01
    ]
