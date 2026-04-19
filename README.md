# VitaBalance

VitaBalance — веб‑сервис для оценки витаминного баланса, просмотра истории замеров и подбора продуктов, рецептов и плана питания под текущие дефициты.

Проект состоит из React/Vite frontend, FastAPI backend и PostgreSQL. Приложение поддерживает два источника входных данных:

- лабораторные значения витаминов и минералов;
- анкета симптомов как fallback-оценка дефицитов, когда анализов нет.

## Что умеет проект сейчас

- регистрация, логин, refresh токены, профиль пользователя;
- ввод лабораторных значений и анкеты самочувствия;
- анализ статусов `deficiency / normal / excess / no_data`;
- история снимков по точным timestamp сохранения;
- аналитика: heatmap, сравнение snapshot’ов, обзор по проценту от нормы;
- PDF-экспорт результатов анализа;
- подбор продуктов по витаминам и поиску;
- рекомендованные рецепты и дневной план питания;
- избранное, уведомления, светлая/тёмная тема, мобильная адаптация;
- PWA-оболочка и статический фронт через nginx.

## Текущие seed-данные

- `20` витаминов и минералов;
- `94` продукта;
- `60` рецептов;
- `108` symptom mapping записей.

## Технологии

| Слой | Стек |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Recharts, React Router |
| Backend | FastAPI, SQLAlchemy 2 async ORM, Pydantic, slowapi |
| База данных | PostgreSQL 16 |
| Инфра | Docker, Docker Compose, nginx |
| Авторизация | JWT access/refresh tokens |
| Интеграции | USDA FoodData Central |

## Архитектура в двух словах

```text
Browser / PWA
  -> nginx (frontend container)
  -> /api/v1/* proxy
  -> FastAPI
  -> SQLAlchemy async session
  -> PostgreSQL
```

Ключевой доменный принцип:

- каждый submit лабораторных данных сохраняется как отдельный snapshot;
- каждый submit анкеты симптомов тоже сохраняется как отдельный snapshot;
- лабораторные значения всегда имеют приоритет над symptom-based оценками;
- symptom flow умеет только оценивать дефициты и не определяет норму/избыток.

## Структура репозитория

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── auth_utils.py
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── seed.py
│   │   ├── reseed.py
│   │   └── seed_data/
│   ├── alembic/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── config/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── types/
│   │   └── utils/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.ts
├── docs/
├── docker-compose.yml
├── ARCHITECTURE.md
└── .github/workflows/deploy.yml
```

## Docker запуск

### Требования

- Docker
- Docker Compose
- заполненный `.env` в корне проекта

### Важные переменные окружения

Минимально нужны:

```env
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=...
SECRET_KEY=...
USDA_API_KEY=...
```

Backend контейнер сам собирает:

- `DATABASE_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}`
- `DATABASE_URL_SYNC=postgresql+psycopg2://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}`

### Старт

```bash
docker compose up -d --build
docker compose exec backend python -m app.seed
```

### Порты в docker-compose

- frontend: `127.0.0.1:3010 -> 80`
- backend: `127.0.0.1:8010 -> 8000`
- PostgreSQL наружу не публикуется

Если поверх контейнеров стоит системный nginx на VPS, он обычно проксирует:

- `https://vita-balance.ru/` -> frontend `127.0.0.1:3010`
- `https://vita-balance.ru/api/` -> backend `127.0.0.1:8010`

### Обновление seed-данных без потери пользовательских данных

```bash
docker compose exec backend python -m app.reseed
```

`reseed.py` обновляет витамины, продукты, рецепты и symptom mapping, не удаляя пользовательские записи.

## Локальная разработка без Docker

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Обычно в dev frontend работает на `http://localhost:5173`.

## Полезные сценарии

### 1. Пользователь ввёл анализы

- frontend отправляет список значений в `POST /api/v1/vitamins/entries`;
- backend сохраняет один новый snapshot с общим `entry_date`;
- история и аналитика видят новый замер как отдельную запись.

### 2. Пользователь заполнил симптомы

- frontend отправляет `symptom_ids` в `POST /api/v1/vitamins/entries/symptoms`;
- backend оценивает вероятные дефициты;
- symptom snapshot не затирает лабораторные данные;
- для витаминов без анализов используются symptom-based значения;
- нормы и избытки из симптомов не вычисляются.

### 3. План питания

`GET /api/v1/recipes/meal-plan` не хранит “один вечный план” в БД. План пересчитывается из текущего анализа и топ-рекомендованных рецептов, поэтому может меняться после новых замеров.

## Основные API группы

- `/api/v1/auth/*` — авторизация, refresh, reset password;
- `/api/v1/profile/*` — профиль пользователя;
- `/api/v1/vitamins/*` — справочник, ввод данных, анализ, история, продукты;
- `/api/v1/recipes/*` — рецепты, рекомендации, план питания;
- `/api/v1/favorites/*` — избранные рецепты;
- `/api/v1/notifications/*` — уведомления.

## CI/CD и деплой

В репозитории есть workflow [`.github/workflows/deploy.yml`](/Users/stailfx/Desktop/KursachArtem/.github/workflows/deploy.yml).

Что делает deploy:

1. реагирует на push в `main`;
2. подключается к VPS по SSH;
3. делает `git fetch origin main`;
4. обновляет рабочую копию на сервере;
5. запускает `docker compose up -d --build --remove-orphans`;
6. прогревает backend;
7. запускает `python -m app.seed`.

Если менялись рецепты, продукты или симптомы, после деплоя стоит дополнительно прогнать:

```bash
docker compose exec backend python -m app.reseed
```

## Документация

- [ARCHITECTURE.md](/Users/stailfx/Desktop/KursachArtem/ARCHITECTURE.md) — актуальная техническая карта проекта;
- [frontend/README.md](/Users/stailfx/Desktop/KursachArtem/frontend/README.md) — frontend-specific notes;
- [docs/media-guide.md](/Users/stailfx/Desktop/KursachArtem/docs/media-guide.md) — работа с рецептами, картинками и иконками;
- [docs/recipe-image-sources.md](/Users/stailfx/Desktop/KursachArtem/docs/recipe-image-sources.md) — источники локальных recipe images.
