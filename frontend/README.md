# VitaBalance Frontend

Frontend часть VitaBalance — это React SPA на Vite и TypeScript.

## Стек

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- Recharts

## Главные зоны кода

- `src/pages/` — основные экраны приложения;
- `src/components/` — layout, shared UI, transitions, skeletons;
- `src/context/` — auth, theme, toast;
- `src/api/` — axios client и api cache helpers;
- `src/types/` — доменные типы frontend/backend contract;
- `src/utils/` — pluralization, date formatting, media normalization, chart colors;
- `src/config/` — визуальные токены и icon mapping.

## Важные страницы

- `Home.tsx` — лендинг и вход в продукт;
- `DataEntry.tsx` — ввод лабораторных данных и анкеты симптомов;
- `AnalysisResults.tsx` — текущий анализ;
- `AnalysisHistory.tsx` — история snapshot’ов;
- `Analytics.tsx` — heatmap, compare, overview;
- `ProductSearch.tsx` — поиск продуктов;
- `Recipes.tsx` / `RecipeDetail.tsx` — каталог рецептов и детали;
- `MealPlan.tsx` — дневной план питания;
- `Favorites.tsx` — избранные рецепты.

## Ключевые frontend-решения

- Все даты истории и snapshot’ов форматируются в московском часовом поясе.
- Сравнение в аналитике идёт по конкретным snapshot timestamp’ам, а не просто по календарным датам.
- Формы ввода подтягивают последние сохранённые лабораторные значения, но новые submit’ы должны создавать новый snapshot, а не стирать историю.
- Анкета симптомов показывает fallback-only модель: лабораторные значения главнее, симптомы не вычисляют норму и избыток.

## Команды

```bash
npm install
npm run dev
npm run build
npm run preview
```

По умолчанию Vite dev server работает на `http://localhost:5173`.

## Static assets

- recipe images лежат в `public/recipes/`;
- frontend умеет нормализовать локальные имена файлов и абсолютные `/recipes/...` пути;
- подробности по картинкам и источникам смотри в `/docs/media-guide.md` и `/docs/recipe-image-sources.md`.
