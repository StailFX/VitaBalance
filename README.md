# VitaBalance

Веб-сервис персонализированного подбора рациона питания на основе витаминного баланса.

Анализирует данные пользователя (лабораторные анализы или анкету самочувствия), определяет дефициты и профициты витаминов, и подбирает рецепты для нормализации баланса.

## Стек технологий

| Слой | Технологии |
|------|-----------|
| **Frontend** | React 19, TypeScript 5, Vite 8, Tailwind CSS 4, Recharts |
| **Backend** | Python, FastAPI, SQLAlchemy 2.0 (async), Alembic |
| **БД** | PostgreSQL 16 |
| **Инфра** | Docker, Docker Compose, Nginx, Let's Encrypt (HTTPS) |
| **Авторизация** | JWT (access + refresh токены), bcrypt |
| **Интеграции** | USDA FoodData Central API |

## Функционал

- **Регистрация и авторизация** — JWT access/refresh токены, хеширование паролей (bcrypt), rate limiting
- **Личный кабинет** — профиль (пол, возраст, рост, вес), история анализов, экспорт в PDF
- **Ввод данных** — лабораторные анализы витаминов или анкета симптомов самочувствия
- **Анализ витаминного баланса** — определение дефицитов/профицитов 20 витаминов и минералов с учётом пола, визуализация (Recharts)
- **Аналитика** — тепловая карта, сравнение периодов, обзор витаминного профиля
- **Подбор рецептов** — алгоритм ранжирования рецептов по релевантности дефицитам
- **План питания** — автогенерация дневного рациона под ваши дефициты
- **Справочник витаминов** — описание, функции, симптомы дефицита/избытка, нормы
- **Поиск продуктов** — по названию и содержанию витаминов, импорт из USDA API
- **Избранные рецепты** — сохранение, сортировка, управление
- **История анализов** — тренды изменений, сравнение дат
- **Уведомления** — toast-уведомления о критических дефицитах после анализа (дедупликация 24ч)
- **Тёмная/светлая тема** — адаптивный дизайн, mobile-first
- **PWA** — установка на устройство, офлайн-заглушка
- **Анимации** — scroll-анимации, stagger-эффекты, анимированные счётчики

## Отслеживаемые витамины и минералы

| Витамины | Минералы | Другое |
|----------|----------|--------|
| A (Ретинол) | Железо | Омега-3 |
| B1 (Тиамин) | Кальций | |
| B2 (Рибофлавин) | Магний | |
| B3 (Ниацин) | Цинк | |
| B5 (Пантотеновая кислота) | Селен | |
| B6 (Пиридоксин) | Фосфор | |
| B9 (Фолиевая кислота) | Калий | |
| B12 (Кобаламин) | | |
| C (Аскорбиновая кислота) | | |
| D (Кальциферол) | | |
| E (Токоферол) | | |
| K (Филлохинон) | | |

## База данных

- **20** витаминов и минералов с нормами (муж/жен)
- **91** продукт с полным витаминным составом (12 категорий)
- **35** рецептов с ингредиентами и пошаговыми инструкциями
- **108** маппингов симптомов на витамины

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

# 4. Загрузить начальные данные
docker exec vita-balance-backend-1 python -m app.seed
```

Приложение будет доступно:
- **Frontend:** http://localhost
- **Backend API:** http://localhost:8000
- **Swagger UI:** http://localhost:8000/docs

### Обновление данных в существующей БД

```bash
docker exec vita-balance-backend-1 python -m app.reseed
```

Скрипт `reseed.py` безопасно обновляет витамины, продукты, рецепты и симптомы — добавляет новые и обновляет существующие без потери пользовательских данных.

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
│   │   ├── database.py          # SQLAlchemy async engine, session.begin()
│   │   ├── auth_utils.py        # JWT создание/верификация токенов
│   │   ├── seed.py              # Первоначальное заполнение БД
│   │   ├── reseed.py            # Обновление данных в существующей БД
│   │   ├── models/              # SQLAlchemy ORM модели
│   │   ├── schemas/             # Pydantic схемы валидации
│   │   ├── routers/             # API endpoints
│   │   │   ├── auth.py          # Регистрация, логин, refresh, сброс пароля
│   │   │   ├── profile.py       # CRUD профиля пользователя
│   │   │   ├── vitamins.py      # Витамины, анализы, история, продукты
│   │   │   ├── recipes.py       # Рецепты, рекомендации, план питания
│   │   │   ├── favorites.py     # Избранные рецепты
│   │   │   └── notifications.py # Уведомления
│   │   ├── services/            # Бизнес-логика
│   │   │   ├── analysis.py      # Алгоритм анализа витаминов
│   │   │   ├── recommendation.py # Алгоритм подбора рецептов
│   │   │   ├── usda.py          # Интеграция с USDA FoodData Central API
│   │   │   ├── cache.py         # Кэширование справочных данных
│   │   │   ├── history.py       # Работа с историей анализов
│   │   │   └── notifications.py # Логика уведомлений (с дедупликацией 24ч)
│   │   └── seed_data/           # JSON с начальными данными
│   ├── alembic/                 # Миграции БД
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── types/               # TypeScript типы (доменные модели)
│   │   │   ├── index.ts         # Реэкспорт всех типов
│   │   │   ├── auth.ts          # TokenResponse, LoginPayload
│   │   │   ├── user.ts          # UserOut, UserProfile, ProfileUpdate
│   │   │   ├── vitamins.ts      # Vitamin, SymptomMapping, VitaminEntry
│   │   │   ├── analysis.ts      # VitaminStatus, AnalysisSnapshot
│   │   │   ├── recipes.ts       # RecipeShort, RecipeDetail, MealPlanItem
│   │   │   ├── products.ts      # ProductSearchResult
│   │   │   └── notifications.ts # NotificationItem, UnreadCount
│   │   ├── components/          # Переиспользуемые компоненты (.tsx)
│   │   │   ├── Layout.tsx       # Навбар, футер, навигация
│   │   │   ├── AnimateIn.tsx    # Scroll-анимации, stagger-эффекты
│   │   │   └── PageTransition.tsx
│   │   ├── pages/               # 15 страниц приложения (.tsx)
│   │   │   ├── Home.tsx         # Главная с анимациями и статистикой
│   │   │   ├── AnalysisResults.tsx # Результаты анализа (Recharts)
│   │   │   ├── Analytics.tsx    # Аналитика: тепловая карта, сравнение
│   │   │   ├── MealPlan.tsx     # План питания
│   │   │   └── ...
│   │   ├── context/             # React Context (.tsx) — Auth, Theme, Toast
│   │   ├── hooks/               # Хуки (.ts) — useInView, useCountUp
│   │   ├── api/                 # Axios клиент (.ts) с типизацией
│   │   └── utils/               # Утилиты (.ts) — иконки, цвета графиков
│   ├── tsconfig.json            # TypeScript конфигурация
│   ├── vite.config.ts           # Vite конфигурация
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

## API Endpoints

### Аутентификация
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/v1/auth/register` | Регистрация |
| POST | `/api/v1/auth/login` | Авторизация |
| POST | `/api/v1/auth/refresh` | Обновление access токена |
| PUT | `/api/v1/auth/change-password` | Смена пароля |
| POST | `/api/v1/auth/password-reset/request` | Запрос сброса пароля |
| POST | `/api/v1/auth/password-reset/confirm` | Подтверждение сброса |

### Профиль
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/profile/me` | Получить профиль |
| PUT | `/api/v1/profile/me` | Обновить профиль |

### Витамины и анализы
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/vitamins/` | Список витаминов |
| GET | `/api/v1/vitamins/symptoms` | Список симптомов |
| GET | `/api/v1/vitamins/stats` | Статистика (кол-во данных) |
| POST | `/api/v1/vitamins/entries` | Сохранить анализы |
| POST | `/api/v1/vitamins/entries/symptoms` | Отправить анкету симптомов |
| DELETE | `/api/v1/vitamins/entries/{id}` | Удалить запись |
| GET | `/api/v1/vitamins/analysis` | Результат анализа |
| GET | `/api/v1/vitamins/analysis/compare` | Сравнение двух дат |
| GET | `/api/v1/vitamins/history` | История анализов |
| GET | `/api/v1/vitamins/products` | Поиск продуктов |
| GET | `/api/v1/vitamins/products/usda-search` | Поиск в USDA |
| POST | `/api/v1/vitamins/products/usda-import` | Импорт из USDA |
| POST | `/api/v1/vitamins/products/usda-bulk-import` | Массовый импорт из USDA |

### Рецепты
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/recipes/recommended` | Рекомендованные рецепты |
| GET | `/api/v1/recipes/meal-plan` | План питания на день |
| GET | `/api/v1/recipes/search` | Поиск рецептов |
| GET | `/api/v1/recipes/{id}` | Детали рецепта |

### Избранное
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/favorites/` | Список избранного |
| POST | `/api/v1/favorites/{recipe_id}` | Добавить в избранное |
| DELETE | `/api/v1/favorites/{recipe_id}` | Удалить из избранного |

### Уведомления
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/notifications/` | Список уведомлений |
| GET | `/api/v1/notifications/count` | Количество непрочитанных |

## Алгоритм подбора рецептов

1. Из данных пользователя (анализы или анкета) получаются значения витаминов
2. Значения сравниваются с нормами (с учётом пола) — определяются дефициты с severity (% отклонения)
3. Для каждого рецепта через ингредиенты рассчитывается витаминный состав
4. **Relevance score** = сумма (содержание витамина в рецепте × severity дефицита) для каждого дефицитного витамина
5. Рецепты сортируются по score — наиболее релевантные выше

## Лицензия

MIT
