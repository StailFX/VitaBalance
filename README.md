# VitaBalance

Веб-сервис персонализированного подбора рациона питания на основе витаминного баланса.

Анализирует данные пользователя (лабораторные анализы или анкету самочувствия), определяет дефициты и профициты витаминов, и подбирает рецепты для нормализации баланса.

## Стек технологий

| Слой | Технологии |
|------|-----------|
| **Frontend** | React 19, Vite 8, Tailwind CSS 4 |
| **Backend** | Python, FastAPI, SQLAlchemy 2.0 (async), Alembic |
| **БД** | PostgreSQL 15 |
| **Инфра** | Docker, Docker Compose, Nginx |
| **Авторизация** | JWT (PyJWT), bcrypt |

## Функционал

- **Регистрация и авторизация** — JWT-токены, хеширование паролей (bcrypt)
- **Личный кабинет** — профиль (пол, возраст, рост, вес), история анализов
- **Ввод данных** — лабораторные анализы витаминов или анкета симптомов самочувствия
- **Анализ витаминного баланса** — определение дефицитов/профицитов 10 витаминов с учётом пола, визуализация (Recharts)
- **Подбор рецептов** — алгоритм ранжирования рецептов по релевантности дефицитам
- **Справочник витаминов** — описание, функции, симптомы дефицита/избытка, нормы
- **Поиск продуктов** — по названию и содержанию витаминов
- **Избранные рецепты** — сохранение, сортировка, управление
- **История анализов** — тренды изменений, сравнение дат
- **Тёмная/светлая тема** — адаптивный дизайн, mobile-first

## Отслеживаемые витамины

Витамин A, B6, B9 (фолиевая кислота), B12, C, D, E, Железо, Кальций, Магний

## Быстрый старт

### Требования

- Docker и Docker Compose

### Запуск

```bash
# 1. Клонировать репозиторий
git clone https://github.com/StailFX/VitaBalance.git
cd VitaBalance

# 2. Создать .env файл
cp backend/.env.example backend/.env
# Отредактировать SECRET_KEY в .env

# 3. Запустить все сервисы
docker compose up -d --build

# 4. Создать таблицы в БД
docker exec vita-backend python -c "
from sqlalchemy import create_engine
from app.config import settings
from app.database import Base
from app.models import user, vitamin, product, recipe, user_data
engine = create_engine(settings.DATABASE_URL_SYNC)
Base.metadata.create_all(engine)
"

# 5. Загрузить начальные данные
docker exec vita-backend python -m app.seed
```

Приложение будет доступно:
- **Frontend:** http://localhost
- **Backend API:** http://localhost:8000
- **Swagger UI:** http://localhost:8000/docs

### Локальная разработка (без Docker)

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Структура проекта

```
VitaBalance/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI приложение, CORS, middleware
│   │   ├── config.py            # Настройки (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy async engine, session
│   │   ├── auth_utils.py        # JWT создание/верификация токенов
│   │   ├── models/              # SQLAlchemy ORM модели
│   │   ├── schemas/             # Pydantic схемы валидации
│   │   ├── routers/             # API endpoints
│   │   │   ├── auth.py          # Регистрация, логин, смена пароля
│   │   │   ├── profile.py       # CRUD профиля пользователя
│   │   │   ├── vitamins.py      # Витамины, анализы, история
│   │   │   ├── recipes.py       # Рецепты, рекомендации, поиск
│   │   │   └── favorites.py     # Избранные рецепты
│   │   ├── services/            # Бизнес-логика
│   │   │   ├── analysis.py      # Алгоритм анализа витаминов
│   │   │   ├── recommendation.py # Алгоритм подбора рецептов
│   │   │   └── utils.py         # Общие утилиты
│   │   └── seed_data/           # JSON с начальными данными
│   ├── alembic/                 # Миграции БД
│   ├── tests/                   # Pytest тесты
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # Переиспользуемые компоненты
│   │   ├── pages/               # Страницы приложения
│   │   ├── context/             # React Context (Auth, Theme, Toast)
│   │   ├── api/                 # Axios клиент с интерцепторами
│   │   └── utils/               # Утилиты (иконки, цвета графиков)
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

## API Endpoints

### Аутентификация
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Авторизация |
| PUT | `/api/auth/change-password` | Смена пароля |

### Профиль
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/profile/` | Получить профиль |
| PUT | `/api/profile/` | Обновить профиль |

### Витамины и анализы
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/vitamins/` | Список витаминов |
| GET | `/api/vitamins/symptoms` | Список симптомов |
| POST | `/api/vitamins/entries` | Сохранить анализы |
| POST | `/api/vitamins/entries/symptoms` | Отправить анкету симптомов |
| GET | `/api/vitamins/analysis` | Результат анализа |
| GET | `/api/vitamins/analysis/history` | История анализов |
| GET | `/api/vitamins/analysis/compare` | Сравнение двух дат |
| GET | `/api/vitamins/products` | Поиск продуктов |

### Рецепты
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/recipes/recommended` | Рекомендованные рецепты |
| GET | `/api/recipes/search` | Поиск рецептов |
| GET | `/api/recipes/{id}` | Детали рецепта |

### Избранное
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/favorites/` | Список избранного |
| POST | `/api/favorites/{recipe_id}` | Добавить в избранное |
| DELETE | `/api/favorites/{recipe_id}` | Удалить из избранного |

## Алгоритм подбора рецептов

1. Из введённых данных пользователя получаются значения витаминов
2. Значения сравниваются с нормами (с учётом пола) — определяются дефициты с severity (% отклонения)
3. Для каждого рецепта через ингредиенты рассчитывается витаминный состав
4. **Relevance score** = сумма (содержание витамина в рецепте × severity дефицита) для каждого дефицитного витамина
5. Рецепты сортируются по score — наиболее релевантные выше

## Начальные данные

- **10** витаминов и минералов с нормами
- **46** продуктов с витаминным составом
- **35** рецептов с ингредиентами и инструкциями
- **38** маппингов симптомов на витамины

## Лицензия

MIT
