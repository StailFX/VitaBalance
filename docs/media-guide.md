# Recipe media and icons

## Recipe images

- Put local recipe images into `frontend/public/recipes/`.
- In `backend/app/seed_data/recipes.json` or directly in the `recipes.image_url` DB field, you can use:
  - `salmon-bowl.jpg`   
  - `/recipes/salmon-bowl.jpg`
  - `https://...` if you still need an external image
- The frontend now normalizes plain file names to `/recipes/<file>`.

## Where to edit visuals

- Vitamin icons and gradients: `frontend/src/config/uiVisuals.ts`
- Product category icons: `frontend/src/config/uiVisuals.ts`
- Meal plan icons: `frontend/src/config/uiVisuals.ts`

## Keeping changes after deploy

If you change recipe image links in `backend/app/seed_data/recipes.json`, reseed recipes so the DB gets the new `image_url` values.
