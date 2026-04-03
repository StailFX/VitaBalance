"""Re-seed the database: update vitamins, products, recipes, symptoms.

Safe to run on an existing database — adds new records and updates existing ones
without touching user data (entries, favorites, profiles).
"""
import json
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base
from app.models.vitamin import Vitamin, SymptomVitaminMap
from app.models.product import Product, ProductVitamin
from app.models.recipe import Recipe, RecipeIngredient
from app.models.user import User, UserProfile
from app.models.user_data import UserVitaminEntry, Favorite

SEED_DIR = Path(__file__).parent / "seed_data"


def reseed_db():
    engine = create_engine(settings.DATABASE_URL_SYNC)
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        # 1. Vitamins — upsert by code
        with open(SEED_DIR / "vitamins.json", encoding="utf-8") as f:
            vitamins_data = json.load(f)

        vitamin_map = {}
        added_v = 0
        updated_v = 0
        for v in vitamins_data:
            existing = db.query(Vitamin).filter_by(code=v["code"]).first()
            if existing:
                for key, val in v.items():
                    if key != "code":
                        setattr(existing, key, val)
                vitamin_map[v["code"]] = existing
                updated_v += 1
            else:
                vit = Vitamin(**v)
                db.add(vit)
                db.flush()
                vitamin_map[v["code"]] = vit
                added_v += 1
        db.flush()
        print(f"Vitamins: {added_v} added, {updated_v} updated")

        # 2. Symptoms — drop all and re-insert (no user data depends on this)
        db.query(SymptomVitaminMap).delete()
        with open(SEED_DIR / "symptoms.json", encoding="utf-8") as f:
            symptoms_data = json.load(f)

        for s in symptoms_data:
            vit = vitamin_map.get(s["vitamin_code"])
            if vit:
                db.add(SymptomVitaminMap(
                    symptom_text=s["symptom_text"],
                    vitamin_id=vit.id,
                    weight=s["weight"],
                ))
        print(f"Symptoms: {len(symptoms_data)} re-seeded")

        # 3. Products — upsert by name, replace vitamin links
        with open(SEED_DIR / "products.json", encoding="utf-8") as f:
            products_data = json.load(f)

        product_map = {}
        added_p = 0
        updated_p = 0
        for p in products_data:
            existing = db.query(Product).filter_by(name=p["name"]).first()
            if existing:
                existing.category = p["category"]
                # Remove old vitamin links and re-add
                db.query(ProductVitamin).filter_by(product_id=existing.id).delete()
                prod = existing
                updated_p += 1
            else:
                prod = Product(name=p["name"], category=p["category"])
                db.add(prod)
                db.flush()
                added_p += 1

            product_map[p["name"]] = prod

            for vit_code, amount in p.get("vitamins", {}).items():
                vit = vitamin_map.get(vit_code)
                if vit:
                    db.add(ProductVitamin(
                        product_id=prod.id,
                        vitamin_id=vit.id,
                        amount_per_100g=amount,
                    ))
        db.flush()
        print(f"Products: {added_p} added, {updated_p} updated")

        # 4. Recipes — upsert by title, replace ingredients
        with open(SEED_DIR / "recipes.json", encoding="utf-8") as f:
            recipes_data = json.load(f)

        added_r = 0
        updated_r = 0
        for r in recipes_data:
            existing = db.query(Recipe).filter_by(title=r["title"]).first()
            if existing:
                existing.description = r["description"]
                existing.image_url = r.get("image_url")
                existing.cook_time_minutes = r["cook_time_minutes"]
                existing.instructions = r["instructions"]
                db.query(RecipeIngredient).filter_by(recipe_id=existing.id).delete()
                recipe = existing
                updated_r += 1
            else:
                recipe = Recipe(
                    title=r["title"],
                    description=r["description"],
                    image_url=r.get("image_url"),
                    cook_time_minutes=r["cook_time_minutes"],
                    instructions=r["instructions"],
                )
                db.add(recipe)
                db.flush()
                added_r += 1

            for ing in r.get("ingredients", []):
                prod = product_map.get(ing["product_name"])
                if prod:
                    db.add(RecipeIngredient(
                        recipe_id=recipe.id,
                        product_id=prod.id,
                        amount=ing["amount"],
                        unit=ing["unit"],
                    ))
        print(f"Recipes: {added_r} added, {updated_r} updated")

        db.commit()
        print("Re-seed complete!")


if __name__ == "__main__":
    reseed_db()
