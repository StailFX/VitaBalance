"""Seed the database with initial data."""
import json
import os
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


def seed_db():
    engine = create_engine(settings.DATABASE_URL_SYNC)
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        # Check if base data (vitamins, products) already seeded
        already_seeded = db.query(Vitamin).count() > 0

        if already_seeded:
            print("Base data already seeded. Checking for new recipes...")

            # Build lookup maps from existing DB data
            vitamin_map = {v.code: v for v in db.query(Vitamin).all()}
            product_map = {p.name: p for p in db.query(Product).all()}

            # Check for new recipes to add
            with open(SEED_DIR / "recipes.json", encoding="utf-8") as f:
                recipes_data = json.load(f)

            existing_titles = {r.title for r in db.query(Recipe.title).all()}
            new_recipes = [r for r in recipes_data if r["title"] not in existing_titles]

            if not new_recipes:
                print("No new recipes to add. Skipping.")
                return

            for r in new_recipes:
                recipe = Recipe(
                    title=r["title"],
                    description=r["description"],
                    image_url=r.get("image_url"),
                    cook_time_minutes=r["cook_time_minutes"],
                    instructions=r["instructions"],
                )
                db.add(recipe)
                db.flush()

                for ing in r.get("ingredients", []):
                    prod = product_map.get(ing["product_name"])
                    if prod:
                        db.add(RecipeIngredient(
                            recipe_id=recipe.id,
                            product_id=prod.id,
                            amount=ing["amount"],
                            unit=ing["unit"],
                        ))
                    else:
                        print(f"  Warning: product '{ing['product_name']}' not found, skipping ingredient")

            db.commit()
            print(f"Added {len(new_recipes)} new recipes!")
            return

        # ---- Full initial seed ----

        # 1. Vitamins
        with open(SEED_DIR / "vitamins.json", encoding="utf-8") as f:
            vitamins_data = json.load(f)

        vitamin_map = {}  # code -> Vitamin object
        for v in vitamins_data:
            vit = Vitamin(**v)
            db.add(vit)
            db.flush()
            vitamin_map[v["code"]] = vit
        print(f"Seeded {len(vitamins_data)} vitamins")

        # 2. Symptoms
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
        print(f"Seeded {len(symptoms_data)} symptom mappings")

        # 3. Products
        with open(SEED_DIR / "products.json", encoding="utf-8") as f:
            products_data = json.load(f)

        product_map = {}  # name -> Product object
        for p in products_data:
            prod = Product(name=p["name"], category=p["category"])
            db.add(prod)
            db.flush()
            product_map[p["name"]] = prod

            for vit_code, amount in p.get("vitamins", {}).items():
                vit = vitamin_map.get(vit_code)
                if vit:
                    db.add(ProductVitamin(
                        product_id=prod.id,
                        vitamin_id=vit.id,
                        amount_per_100g=amount,
                    ))
        print(f"Seeded {len(products_data)} products")

        # 4. Recipes
        with open(SEED_DIR / "recipes.json", encoding="utf-8") as f:
            recipes_data = json.load(f)

        for r in recipes_data:
            recipe = Recipe(
                title=r["title"],
                description=r["description"],
                image_url=r.get("image_url"),
                cook_time_minutes=r["cook_time_minutes"],
                instructions=r["instructions"],
            )
            db.add(recipe)
            db.flush()

            for ing in r.get("ingredients", []):
                prod = product_map.get(ing["product_name"])
                if prod:
                    db.add(RecipeIngredient(
                        recipe_id=recipe.id,
                        product_id=prod.id,
                        amount=ing["amount"],
                        unit=ing["unit"],
                    ))
                else:
                    print(f"  Warning: product '{ing['product_name']}' not found, skipping ingredient")
        print(f"Seeded {len(recipes_data)} recipes")

        db.commit()
        print("Seeding complete!")


if __name__ == "__main__":
    seed_db()
