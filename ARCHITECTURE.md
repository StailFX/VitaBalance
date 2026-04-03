# VitaBalance --- Полная техническая документация

Подробное описание архитектуры, всех модулей, алгоритмов и взаимосвязей проекта.

---

## Оглавление

1. [Общая архитектура](#1-общая-архитектура)
2. [Backend: ядро приложения](#2-backend-ядро-приложения)
   - [Точка входа и конфигурация](#21-точка-входа-и-конфигурация)
   - [База данных и ORM](#22-база-данных-и-orm)
   - [Модели данных](#23-модели-данных)
   - [Схемы валидации (Pydantic)](#24-схемы-валидации-pydantic)
   - [Аутентификация и авторизация](#25-аутентификация-и-авторизация)
   - [API-роутеры](#26-api-роутеры)
   - [Сервисный слой (бизнес-логика)](#27-сервисный-слой-бизнес-логика)
   - [Seed-данные и скрипты](#28-seed-данные-и-скрипты)
   - [Миграции (Alembic)](#29-миграции-alembic)
3. [Frontend: клиентское приложение](#3-frontend-клиентское-приложение)
   - [Точка входа и маршрутизация](#31-точка-входа-и-маршрутизация)
   - [API-клиент (Axios)](#32-api-клиент-axios)
   - [Контексты (глобальное состояние)](#33-контексты-глобальное-состояние)
   - [Компоненты](#34-компоненты)
   - [Хуки](#35-хуки)
   - [Страницы](#36-страницы)
   - [Утилиты](#37-утилиты)
4. [Ключевые алгоритмы](#4-ключевые-алгоритмы)
   - [Анализ витаминного баланса](#41-анализ-витаминного-баланса)
   - [Обработка симптомов](#42-обработка-симптомов)
   - [Подбор рецептов](#43-подбор-рецептов)
   - [Генерация плана питания](#44-генерация-плана-питания)
   - [Сравнение анализов](#45-сравнение-анализов)
5. [Интеграция с USDA API](#5-интеграция-с-usda-api)
6. [PWA и Service Worker](#6-pwa-и-service-worker)
7. [Docker и деплой](#7-docker-и-деплой)
8. [Схема базы данных](#8-схема-базы-данных)
9. [Полная карта файлов](#9-полная-карта-файлов)

---

## 1. Общая архитектура

VitaBalance --- трёхуровневое веб-приложение:

```
┌─────────────────────────────────────────────────┐
│                   Клиент (Browser)              │
│  React 19 + Vite 8 + Tailwind CSS 4 + Recharts │
└────────────────────┬────────────────────────────┘
                     │ HTTP/HTTPS (JSON)
┌────────────────────▼────────────────────────────┐
│              Nginx (reverse proxy)              │
│  Статика (SPA) + проксирование /api/ → backend  │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│           FastAPI (async Python)                │
│  Роутеры → Сервисы → SQLAlchemy ORM → asyncpg  │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              PostgreSQL 16                       │
│  11 таблиц, индексы, FK-ограничения             │
└─────────────────────────────────────────────────┘
```

**Поток данных:**
1. Пользователь открывает SPA (React) в браузере
2. React делает запросы к `/api/*` через Axios
3. Nginx проксирует `/api/*` на FastAPI-бэкенд (порт 8000)
4. FastAPI валидирует запрос (Pydantic), проверяет JWT-токен
5. Сервисный слой выполняет бизнес-логику
6. SQLAlchemy ORM взаимодействует с PostgreSQL через asyncpg
7. Ответ возвращается клиенту в JSON

---

## 2. Backend: ядро приложения

### 2.1. Точка входа и конфигурация

#### `backend/app/main.py`
Создаёт и настраивает FastAPI-приложение:

- **CORS Middleware** --- разрешает кросс-доменные запросы. Список origins читается из переменной `CORS_ORIGINS` (через запятую). В dev-режиме это `http://localhost:5173` (Vite dev server).
- **Rate Limiting** --- через библиотеку `slowapi`. Лимиты задаются на уровне эндпоинтов (например, 5 запросов/мин на регистрацию).
- **Request Logging Middleware** --- логирует каждый запрос: метод, путь, код ответа, время выполнения в мс. Помогает при отладке производительности.
- **Swagger UI** --- автодокументация API. Включена только в development-режиме (`ENVIRONMENT != production`). Доступна по `/docs`.
- **Монтирование роутеров** --- 6 роутеров подключаются с префиксом `/api/`:
  - `/api/auth/` --- аутентификация
  - `/api/profile/` --- профиль пользователя
  - `/api/vitamins/` --- витамины, анализы, продукты
  - `/api/recipes/` --- рецепты, план питания
  - `/api/favorites/` --- избранное
  - `/api/notifications/` --- уведомления

#### `backend/app/config.py`
Настройки приложения через `pydantic-settings`. Все значения читаются из `.env` файла или переменных окружения:

| Переменная | Назначение | Значение по умолчанию |
|-----------|-----------|----------------------|
| `DATABASE_URL` | Async-подключение к БД | `postgresql+asyncpg://...` |
| `DATABASE_URL_SYNC` | Sync-подключение (для seed-скриптов) | `postgresql+psycopg2://...` |
| `SECRET_KEY` | Ключ подписи JWT-токенов | `change-me-...` |
| `ALGORITHM` | Алгоритм JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Время жизни access-токена | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Время жизни refresh-токена | `30` |
| `CORS_ORIGINS` | Разрешённые origin'ы | `http://localhost:5173` |
| `USDA_API_KEY` | Ключ API USDA FoodData Central | (пусто) |
| `ENVIRONMENT` | Окружение: development/production | `development` |

### 2.2. База данных и ORM

#### `backend/app/database.py`
Настройка подключения к PostgreSQL через SQLAlchemy 2.0 (async):

```python
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,       # 10 постоянных соединений в пуле
    max_overflow=20,    # до 20 дополнительных при нагрузке
    pool_recycle=3600,  # пересоздание соединений каждый час
)
```

**`get_db()`** --- FastAPI-зависимость (dependency injection). Создаёт AsyncSession для каждого запроса и гарантирует rollback при ошибке:

```python
async def get_db():
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
```

Каждый роутер/сервис получает `db: AsyncSession` через `Depends(get_db)`.

### 2.3. Модели данных

Все модели используют SQLAlchemy 2.0 стиль с `Mapped[]` и `mapped_column()`.

#### `backend/app/models/user.py` --- Пользователь

**Таблица `users`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | Integer PK | Автоинкремент |
| `email` | String(255), unique | Email пользователя |
| `password_hash` | String(255) | Хеш пароля (bcrypt) |
| `created_at` | DateTime | Время регистрации |

Связи:
- `profile` → UserProfile (one-to-one, cascade delete)
- `vitamin_entries` → UserVitaminEntry (one-to-many)
- `favorites` → Favorite (one-to-many)

**Таблица `user_profiles`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `user_id` | Integer FK → users.id, unique | Привязка к пользователю |
| `gender` | String(10), nullable | `"male"` или `"female"` |
| `age` | Integer, nullable | Возраст |
| `height_cm` | Float, nullable | Рост в см |
| `weight_kg` | Float, nullable | Вес в кг |

Пол используется для выбора нормы витаминов (мужские/женские нормы различаются).

**Таблица `password_reset_tokens`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `user_id` | Integer FK → users.id | Пользователь |
| `token` | String(100), unique | Токен сброса |
| `expires_at` | DateTime | Срок действия |
| `used` | Boolean | Использован ли |

#### `backend/app/models/vitamin.py` --- Витамины и симптомы

**Таблица `vitamins`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `name` | String(100) | "Витамин A (Ретинол)" |
| `code` | String(20), unique | "VIT_A", "IRON", "OMEGA3" и т.д. |
| `description` | Text | Описание функций витамина |
| `deficiency_symptoms` | Text | Симптомы дефицита (текст) |
| `excess_symptoms` | Text | Симптомы избытка (текст) |
| `unit` | String(30) | Единица измерения: "мг", "мкг", "нг/мл" |
| `norm_male_min` / `norm_male_max` | Float | Нормы для мужчин |
| `norm_female_min` / `norm_female_max` | Float | Нормы для женщин |

Всего 20 витаминов и минералов: VIT_A, VIT_B1, VIT_B2, VIT_B3, VIT_B5, VIT_B6, VIT_B9, VIT_B12, VIT_C, VIT_D, VIT_E, VIT_K, IRON, CALCIUM, MAGNESIUM, ZINC, SELENIUM, PHOSPHORUS, POTASSIUM, OMEGA3.

**Таблица `symptom_vitamin_map`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `symptom_text` | String(255) | "Мышечные судороги" |
| `vitamin_id` | Integer FK → vitamins.id | Связанный витамин |
| `weight` | Float (0.0 - 1.0) | Сила связи симптома с дефицитом |

Один симптом может быть связан с несколькими витаминами (например, "Мышечные судороги" → Магний (0.9), Кальций (0.7), Калий (0.7)). Вес (weight) определяет, насколько этот симптом свидетельствует о дефиците конкретного витамина. 108 маппингов всего.

#### `backend/app/models/product.py` --- Продукты

**Таблица `products`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `name` | String(200) | "Куриная печень" |
| `category` | String(100) | "Мясо и птица" |

**Таблица `product_vitamins`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `product_id` | Integer FK → products.id (indexed) | Продукт |
| `vitamin_id` | Integer FK → vitamins.id (indexed) | Витамин |
| `amount_per_100g` | Float | Содержание на 100г продукта |

91 продукт в 12 категориях: Мясо и птица, Рыба и морепродукты, Яйца, Молочные продукты, Овощи, Фрукты и ягоды, Зерновые и бобовые, Орехи и семена, Масла и жиры, Сухофрукты, Соевые продукты, Зелень и травы.

#### `backend/app/models/recipe.py` --- Рецепты

**Таблица `recipes`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `title` | String(300) | Название рецепта |
| `description` | Text | Описание блюда |
| `image_url` | String(500), nullable | URL изображения (Unsplash) |
| `cook_time_minutes` | Integer | Время приготовления |
| `instructions` | Text | Пошаговая инструкция |

**Таблица `recipe_ingredients`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `recipe_id` | Integer FK → recipes.id (indexed) | Рецепт |
| `product_id` | Integer FK → products.id | Продукт |
| `amount` | Float | Количество |
| `unit` | String(50) | Единица: "г", "шт", "ст.л." |

35 рецептов. Каждый рецепт ссылается на продукты из таблицы `products`, поэтому витаминный состав рецепта вычисляется автоматически через ингредиенты.

#### `backend/app/models/user_data.py` --- Данные пользователя

**Таблица `user_vitamin_entries`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `user_id` | Integer FK → users.id | Пользователь |
| `vitamin_id` | Integer FK → vitamins.id | Витамин |
| `value` | Float | Значение (в единицах витамина) |
| `source` | String(20) | `"lab"` (анализы) или `"symptom"` (из анкеты) |
| `entry_date` | DateTime | Дата записи |

Индексы:
- `(user_id, vitamin_id)` --- быстрый поиск записей пользователя по витамину
- `(user_id, entry_date)` --- быстрая сортировка по дате для истории

**Таблица `favorites`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `user_id` | Integer FK → users.id | Пользователь |
| `recipe_id` | Integer FK → recipes.id | Рецепт |
| `created_at` | DateTime | Когда добавлен |

Unique constraint на `(user_id, recipe_id)` --- нельзя добавить рецепт дважды.

#### `backend/app/models/notification.py` --- Уведомления

**Таблица `notifications`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `user_id` | Integer FK → users.id (indexed) | Пользователь |
| `title` | String(200) | Заголовок |
| `message` | Text | Текст уведомления |
| `type` | String(50) | `"deficiency"`, `"excess"`, `"achievement"`, `"info"` |
| `read` | Boolean | Прочитано ли |
| `created_at` | DateTime | Дата создания |

### 2.4. Схемы валидации (Pydantic)

Pydantic-схемы обеспечивают валидацию входящих данных и сериализацию ответов.

#### `backend/app/schemas/user.py`

- **`UserCreate`** --- валидация при регистрации:
  - `email`: проверка формата через `EmailStr`
  - `password`: 6--100 символов, обязательно хотя бы одна заглавная буква и одна цифра (field_validator)
- **`Token`** --- ответ при логине: `access_token`, `refresh_token`, `token_type`
- **`ProfileUpdate`** --- обновление профиля: gender (male/female), age (1-150), height (0-300), weight (0-500)
- **`UserOut`** --- сериализация пользователя с профилем

#### `backend/app/schemas/vitamin.py`

- **`VitaminOut`** --- полная информация о витамине (название, код, описание, нормы, симптомы)
- **`VitaminEntryCreate`** --- создание записи: vitamin_id, value (>0), source
- **`SymptomSubmit`** --- отправка симптомов: список ID симптомов (минимум 1)

#### `backend/app/schemas/analysis.py`

- **`VitaminAnalysisItem`** --- результат анализа одного витамина: статус (deficiency/normal/excess/no_data), severity (% отклонения)
- **`ComparisonItem`** --- сравнение двух дат: значения, % изменения, статусы
- **`AnalysisSnapshot`** --- срез анализа за дату: список витаминных записей
- **`ProductSearchResult`** --- результат поиска продукта с витаминным составом

#### `backend/app/schemas/recipe.py`

- **`RecipeShort`** --- краткая карточка рецепта (для списков): + `relevance_score`
- **`RecipeDetail`** --- полная информация: + ингредиенты, инструкции, витаминный состав
- **`MealPlanItem`** --- элемент плана питания: тип приёма пищи + рецепт

### 2.5. Аутентификация и авторизация

#### `backend/app/auth_utils.py`

**Хеширование паролей:**
```
passlib.CryptContext(schemes=["bcrypt"]) → verify_password() / get_password_hash()
```

**JWT-токены:**
- **Access token** --- время жизни 60 минут. Содержит: `sub` (email), `jti` (UUID), `type: "access"`, `exp`.
- **Refresh token** --- время жизни 30 дней. Содержит: `sub` (email), `jti` (UUID), `type: "refresh"`, `exp`.
- Подписываются `SECRET_KEY` алгоритмом `HS256`.
- `jti` (JWT ID) --- уникальный UUID для каждого токена. Может использоваться для блокировки токенов.

**`get_current_user()`** --- FastAPI-зависимость:
1. Извлекает токен из заголовка `Authorization: Bearer <token>`
2. Декодирует JWT, проверяет подпись и срок действия
3. Проверяет `type == "access"` (не refresh)
4. Находит пользователя в БД по email из `sub`
5. Возвращает объект `User` или бросает `401 Unauthorized`

Используется во всех защищённых эндпоинтах через `Depends(get_current_user)`.

### 2.6. API-роутеры

#### `backend/app/routers/auth.py` --- Аутентификация

| Эндпоинт | Rate limit | Что делает |
|----------|-----------|-----------|
| `POST /register` | 5/мин | Создаёт пользователя + пустой профиль. Возвращает access + refresh токены |
| `POST /login` | 10/мин | Принимает form-data (OAuth2). Проверяет email + пароль. Возвращает токены |
| `POST /refresh` | 30/мин | Принимает refresh_token в body. Проверяет тип = "refresh". Выдаёт новую пару токенов |
| `PUT /change-password` | --- | Требует auth. Проверяет старый пароль, устанавливает новый |
| `POST /password-reset/request` | 3/мин | Принимает email. Создаёт токен сброса (UUID, 1 час). В dev-режиме возвращает токен в ответе |
| `POST /password-reset/confirm` | 5/мин | Принимает token + new_password. Проверяет срок действия и использование. Обновляет пароль |

#### `backend/app/routers/profile.py` --- Профиль

| Эндпоинт | Что делает |
|----------|-----------|
| `GET /me` | Возвращает User + UserProfile (email, gender, age, height, weight) |
| `PUT /me` | Обновляет поля профиля. Создаёт профиль если не существует |

#### `backend/app/routers/vitamins.py` --- Витамины, анализы, продукты

Самый большой роутер (~260 строк, 13 эндпоинтов):

| Эндпоинт | Auth | Что делает |
|----------|------|-----------|
| `GET /` | Нет | Список всех 20 витаминов (кэшируется 5 мин) |
| `GET /symptoms` | Нет | Список всех симптомов с маппингом на витамины (кэшируется) |
| `GET /stats` | Нет | Количество витаминов, продуктов, рецептов в БД |
| `POST /entries` | Да | Сохранение лабораторных анализов. Удаляет старые lab-записи, вставляет новые (макс 50) |
| `POST /entries/symptoms` | Да | Обработка анкеты симптомов. Вызывает `process_symptoms()` |
| `DELETE /entries/{id}` | Да | Удаление одной записи (проверка владельца) |
| `GET /analysis` | Да | Текущий анализ всех витаминов + автогенерация уведомлений |
| `GET /analysis/compare` | Да | Сравнение двух дат (query params: date1, date2) |
| `GET /history` | Да | История анализов, пагинация (limit/offset, макс 100) |
| `GET /products` | Нет | Поиск продуктов по имени, фильтр по витамину (макс 50) |
| `GET /products/usda-search` | Да | Поиск в USDA API (макс 25) |
| `POST /products/usda-import` | Да | Импорт одного продукта из USDA по FDC ID |
| `POST /products/usda-bulk-import` | Да | Поиск + массовый импорт из USDA |

**Безопасность поиска продуктов:** экранирование SQL LIKE wildcard-символов (`%`, `_`, `\`) перед `ilike()`.

#### `backend/app/routers/recipes.py` --- Рецепты

| Эндпоинт | Auth | Что делает |
|----------|------|-----------|
| `GET /recommended` | Да | Рекомендованные рецепты на основе дефицитов пользователя (топ-10 по relevance score) |
| `GET /meal-plan` | Да | План питания на день: 4 рецепта (завтрак, обед, ужин, перекус) |
| `GET /search` | Нет | Поиск рецептов по названию/описанию, фильтр по времени, сортировка |
| `GET /{recipe_id}` | Нет | Детали рецепта + ингредиенты + витаминный состав (через `get_recipe_vitamin_content()`) |

#### `backend/app/routers/favorites.py` --- Избранное

| Эндпоинт | Что делает |
|----------|-----------|
| `GET /` | Список избранных рецептов с сортировкой (newest/title/cook_time) и пагинацией |
| `POST /{recipe_id}` | Добавить в избранное (проверка уникальности, проверка существования рецепта) |
| `DELETE /{recipe_id}` | Удалить из избранного |

#### `backend/app/routers/notifications.py` --- Уведомления

| Эндпоинт | Что делает |
|----------|-----------|
| `GET /` | Список уведомлений (фильтр unread_only, макс 50) |
| `GET /count` | Количество непрочитанных |
| `PUT /{id}/read` | Отметить одно как прочитанное |
| `PUT /read-all` | Отметить все как прочитанные |

### 2.7. Сервисный слой (бизнес-логика)

#### `backend/app/services/analysis.py` --- Анализ витаминов

**`get_user_analysis(user_id, db)`** --- основной алгоритм анализа:

1. Определяет пол пользователя (`get_user_gender()`) для выбора нормы
2. Загружает все витамины из БД
3. Для каждого витамина находит последнюю запись пользователя (subquery: `MAX(entry_date)` по `user_id` и `vitamin_id`)
4. Классифицирует статус: `deficiency` (< norm_min), `normal`, `excess` (> norm_max), `no_data`
5. Рассчитывает severity (% отклонения от нормы):
   - Дефицит: `(norm_min - value) / norm_min * 100`
   - Избыток: `(value - norm_max) / norm_max * 100`

**`process_symptoms(user_id, symptom_ids, db)`** --- оценка по симптомам:

1. Загружает выбранные симптомы и их маппинги на витамины
2. Группирует по витамину, суммирует веса: `total_weight = sum(weight for each symptom)`
3. Удаляет старые symptom-записи пользователя
4. Для каждого витамина рассчитывает оценочное значение:
   ```
   estimated_value = norm_min * (1 - min(total_weight, 1.0) * 0.5)
   ```
   Формула: чем больше суммарный вес симптомов, тем ниже оценка (максимум 50% от norm_min)
5. Создаёт новые записи с `source="symptom"`

#### `backend/app/services/recommendation.py` --- Рекомендация рецептов

**`get_recommended_recipes(user_id, db, limit=10)`:**

1. Получает анализ пользователя через `get_user_analysis()`
2. Фильтрует дефицитные витамины (status == "deficiency")
3. Загружает все рецепты с ингредиентами и витаминным составом (`selectinload`)
4. Для каждого рецепта рассчитывает score:
   ```
   score = sum(
       ingredient.amount_per_100g * (ingredient.amount / 100) * deficiency.severity
       for each ingredient, for each deficient vitamin
   )
   ```
5. Нормализует скоры к 0--100% (относительно максимального скора)
6. Сортирует по убыванию, возвращает топ-N

**`get_recipe_vitamin_content(recipe, db)`** --- витаминный состав рецепта:

Для каждого ингредиента рецепта:
```
vitamin_amount = product.amount_per_100g * (ingredient.amount / 100)
```
Суммирует по всем ингредиентам, фильтрует незначительные (<0.01).

#### `backend/app/services/history.py` --- История анализов

**`get_vitamin_history(user_id, db, limit, offset)`:**

1. Группирует записи по дате (`date_trunc('day', entry_date)`)
2. Пагинация по уникальным датам (не по записям!)
3. Для каждой даты загружает все витаминные записи
4. Классифицирует статус каждой записи

**`compare_vitamin_analysis(user_id, date1, date2, db)`:**

1. Для каждой даты находит ближайшие записи (по `ABS(entry_date - target_date)`)
2. Для каждого витамина сравнивает значения на две даты
3. Рассчитывает `change_percent = (value2 - value1) / value1 * 100`

#### `backend/app/services/cache.py` --- Кэширование

Простой in-memory TTL-кэш для справочных данных (витамины, симптомы):

```python
_cache = {}  # key -> (data, expires_at)
TTL = 300    # 5 минут

async def cached_vitamins(db):
    cached = _get_cached("vitamins")
    if cached:
        return cached
    result = await db.execute(select(Vitamin).order_by(Vitamin.id))
    data = result.scalars().all()
    _set_cached("vitamins", data)
    return data
```

Витамины и симптомы почти никогда не меняются --- нет смысла запрашивать из БД каждый раз.

#### `backend/app/services/notifications.py` --- Уведомления

**`check_and_notify(user_id, analysis, db)`:**

Автоматически создаёт уведомления после каждого анализа:
- **Критический дефицит** (severity >= 30%): "Критический дефицит: Витамин D, Железо. Рекомендуем скорректировать рацион."
- **Избыток** (severity >= 20%): "Избыток: Витамин A. Проверьте дозировку."
- **Все в норме**: "Все витамины в норме! Продолжайте в том же духе."

Уведомления сохраняются в БД, но на фронтенде отображаются как toast-уведомления (без отдельной страницы).

#### `backend/app/services/utils.py` --- Утилиты

- `classify_vitamin_status(value, norm_min, norm_max)` → "deficiency" / "normal" / "excess"
- `get_norms_for_gender(vitamin, gender)` → (norm_min, norm_max) с учётом пола
- `get_user_gender(user_id, db)` → "male" / "female" (по умолчанию "male")

#### `backend/app/services/usda.py` --- USDA API

Подробно описан в [разделе 5](#5-интеграция-с-usda-api).

### 2.8. Seed-данные и скрипты

#### `backend/app/seed_data/` --- JSON-файлы с начальными данными

| Файл | Записей | Описание |
|------|---------|----------|
| `vitamins.json` | 20 | Витамины с кодами, нормами, описаниями |
| `products.json` | 91 | Продукты с витаминным составом на 100г |
| `recipes.json` | 35 | Рецепты с ингредиентами и инструкциями |
| `symptoms.json` | 108 | Маппинги симптомов → витамины с весами |

#### `backend/app/seed.py` --- Первоначальное заполнение

Запускается один раз: `python -m app.seed`. Проверяет `Vitamin.count() > 0` --- если данные уже есть, пропускает. Порядок вставки важен (FK-зависимости): витамины → симптомы → продукты → рецепты.

#### `backend/app/reseed.py` --- Обновление данных

Безопасно обновляет существующую БД:
- **Витамины** --- upsert по `code` (обновляет описание и нормы)
- **Симптомы** --- полная перезагрузка (DELETE + INSERT, пользовательские данные не зависят)
- **Продукты** --- upsert по `name` (обновляет категорию и витаминный состав)
- **Рецепты** --- upsert по `title` (обновляет описание и ингредиенты)

Не трогает пользовательские данные (entries, favorites, profiles).

### 2.9. Миграции (Alembic)

4 миграции, выполняются последовательно:

1. **`ce2db5fe1584` --- initial_with_fk**: Создание всех основных таблиц (users, vitamins, products, recipes, favorites и т.д.)
2. **`a1b2c3d4e5f6` --- add_user_entry_date_index**: Индекс `(user_id, entry_date)` на таблице `user_vitamin_entries` для ускорения истории
3. **`b2c3d4e5f6a7` --- add_password_reset_tokens**: Таблица `password_reset_tokens` для сброса пароля
4. **`c3d4e5f6a7b8` --- add_notifications**: Таблица `notifications` с индексом по `user_id`

---

## 3. Frontend: клиентское приложение

### 3.1. Точка входа и маршрутизация

#### `frontend/src/main.jsx`
Рендерит `<App />` в `#root` с `React.StrictMode`.

#### `frontend/src/App.jsx`
Определяет дерево провайдеров и маршруты:

```
ThemeProvider
  └─ ToastProvider
       └─ AuthProvider
            └─ BrowserRouter
                 └─ Routes
                      ├─ Layout (с Outlet)
                      │   ├─ / → Home
                      │   ├─ /login → Login
                      │   ├─ /register → Register
                      │   ├─ /vitamins → VitaminGuide
                      │   ├─ /products → ProductSearch
                      │   ├─ /dashboard → PrivateRoute → Dashboard
                      │   ├─ /data-entry → PrivateRoute → DataEntry
                      │   ├─ /analysis → PrivateRoute → AnalysisResults
                      │   ├─ /history → PrivateRoute → AnalysisHistory
                      │   ├─ /analytics → PrivateRoute → Analytics
                      │   ├─ /recipes → PrivateRoute → Recipes
                      │   ├─ /recipes/:id → PrivateRoute → RecipeDetail
                      │   ├─ /favorites → PrivateRoute → Favorites
                      │   ├─ /meal-plan → PrivateRoute → MealPlan
                      │   └─ * → NotFound
```

**PrivateRoute** --- компонент-обёртка. Если пользователь не авторизован → редирект на `/login`. Пока идёт проверка auth → показывает спиннер.

### 3.2. API-клиент (Axios)

#### `frontend/src/api/client.js`

Создаёт Axios-инстанс с базовым URL `/api`:

**Request interceptor:**
```javascript
// Перед каждым запросом добавляет JWT-токен из localStorage
headers.Authorization = `Bearer ${localStorage.getItem('token')}`
```

**Response interceptor (обработка 401):**
1. При получении 401 (токен истёк) --- пробует refresh
2. Берёт `refreshToken` из localStorage, отправляет `POST /auth/refresh`
3. Если refresh успешен --- сохраняет новые токены, повторяет оригинальный запрос
4. Если refresh не удался --- вызывает `logout()` и редиректит на `/login`
5. **Защита от дублей:** используется флаг `isRefreshing` и очередь `failedQueue`. Пока идёт refresh, все новые 401-запросы добавляются в очередь и выполняются после получения нового токена.

### 3.3. Контексты (глобальное состояние)

#### `frontend/src/context/AuthContext.jsx`

Управляет авторизацией:
- **State:** `user` (объект или null), `loading` (boolean)
- **При монтировании:** если есть `token` в localStorage → запрашивает `GET /profile/me`. Если 401 → очищает токены.
- **`login(email, password)`** → `POST /auth/login` → сохраняет токены → загружает профиль
- **`register(email, password)`** → `POST /auth/register` → сохраняет токены → загружает профиль
- **`logout()`** → очищает localStorage → `user = null`
- Устанавливает callback `onLogout` для API-клиента

#### `frontend/src/context/ThemeContext.jsx`

Тёмная/светлая тема:
- Читает начальное значение из `localStorage('theme')` или `prefers-color-scheme: dark`
- При переключении добавляет/убирает класс `dark` на `<html>`
- **`toggle()`** --- переключает тему и сохраняет в localStorage

#### `frontend/src/context/ToastContext.jsx`

Система toast-уведомлений:
- **`addToast(message, type)`** --- создаёт уведомление (success / error / info)
- Максимум 3 одновременно (FIFO --- первый добавлен, первый удалён)
- Автоудаление через 3 секунды
- Анимация появления/исчезновения (slide-in / fade-out)
- Рендерится в fixed-контейнере вверху справа

### 3.4. Компоненты

#### `frontend/src/components/Layout.jsx` (288 строк)

Основной layout приложения:

**Хедер (sticky, glass-эффект):**
- Логотип (сердце на градиенте + "VitaBalance")
- Desktop-навигация: ссылки зависят от авторизации
  - Неавторизован: Справочник, Продукты, Войти, Регистрация
  - Авторизован: Ввод данных, Анализ, Аналитика, Рецепты + выпадающее меню пользователя
- Кнопка темы (солнце/луна)
- Выпадающее меню пользователя: аватар-инициал, ссылки (План питания, Избранное, Аналитика, Кабинет), кнопка выхода
- Mobile: гамбургер-меню с полной навигацией

**`<Outlet />`** --- сюда рендерится текущая страница (React Router)

**Футер:**
- Логотип + описание
- Навигационные ссылки (2 колонки)
- Дисклеймер: "Не является медицинской рекомендацией"
- Копирайт

#### `frontend/src/components/AnimateIn.jsx`

Scroll-анимации через IntersectionObserver:

**`<AnimateIn variant="fade-up" delay={200}>`:**
- Оборачивает children в div с CSS-классом анимации
- При попадании в viewport добавляет класс `.anim-visible`
- Варианты: fade-up, fade-down, fade-left, fade-right, scale, blur, flip

**`<StaggerChildren variant="fade-up" stagger={80}>`:**
- Обёртка для списка элементов
- Каждый child получает incremental `transition-delay` (0ms, 80ms, 160ms...)
- Создаёт каскадный эффект появления

#### Другие компоненты

- **`PrivateRoute.jsx`** --- проверка auth, редирект на /login, спиннер при загрузке
- **`ErrorBoundary.jsx`** --- React Error Boundary, показывает fallback UI при крэше
- **`PageTransition.jsx`** --- обёртка с CSS-анимацией `animate-slide-up`
- **`Skeleton.jsx`** --- placeholder-скелетоны при загрузке данных (пульсирующая анимация)
- **`Input.jsx`** --- стилизованный input-компонент

### 3.5. Хуки

#### `frontend/src/hooks/useAnimations.js`

**`useInView(options)`:**
```javascript
// Возвращает [ref, isVisible]
// Использует IntersectionObserver
// options: { threshold: 0.15, rootMargin: '0px', once: true }
```
Привязываешь `ref` к DOM-элементу --- `isVisible` станет `true` при прокрутке до него.

**`useCountUp(target, options)`:**
```javascript
// Анимированный счётчик от 0 до target
// options: { duration: 1500, enabled: true }
// Easing: ease-out cubic (быстрый старт, плавное замедление)
// Возвращает текущее анимированное значение (число)
```

### 3.6. Страницы

#### `Home.jsx` --- Главная (~430 строк)

**Секции:**
1. **Hero** --- заголовок "Ваш витаминный помощник", описание, CTA-кнопки, анимированные витаминные карточки (десктоп)
2. **Статистика** --- динамические счётчики из API (`/vitamins/stats`): кол-во витаминов, рецептов, продуктов. Анимация useCountUp при скролле. Русское склонение через `plural()`.
3. **"Как это работает"** --- 3 шага (Ввод данных → Анализ → Рецепты) со stagger-анимацией
4. **"Возможности"** --- 4 карточки фич (Анализ, Рекомендации, Анкета, Избранное)
5. **Мобильная витаминная витрина** --- сетка 6 витаминов + "...и ещё N показателей"
6. **CTA-секция** --- призыв к регистрации с blur-анимацией

#### `Login.jsx` / `Register.jsx` --- Вход/Регистрация

Формы с валидацией:
- Login: email + пароль → `auth.login()` → редирект на `/dashboard`
- Register: email + пароль + подтверждение пароля → `auth.register()` → редирект на `/dashboard`
- Визуальный индикатор силы пароля (weak/medium/strong)
- Показ/скрытие пароля (иконка глаза)
- Toast-уведомления при ошибках

#### `Dashboard.jsx` --- Кабинет (~280 строк)

Личный кабинет пользователя:
- **Профиль**: отображение и редактирование (gender, age, height, weight). Inline-форма с сохранением через API.
- **Quick-actions**: карточки быстрого доступа (Ввод данных, Анализ, Рецепты, Избранное) со stagger-анимацией и hover-lift эффектом.
- Бейдж: дата последнего анализа, кол-во дефицитов.

#### `DataEntry.jsx` --- Ввод данных (~320 строк)

Два режима:
1. **Лабораторные анализы:** для каждого витамина --- input с числовым значением. Отображает единицу, нормы с учётом пола, иконку витамина. Прогресс-бар заполненности. При отправке: `POST /vitamins/entries`.
2. **Анкета симптомов:** multi-select симптомов. Каждый симптом показывает связанный витамин. Счётчик выбранных. При отправке: `POST /vitamins/entries/symptoms`.

#### `AnalysisResults.jsx` --- Результаты анализа (~370 строк)

Визуализация текущего витаминного баланса:
- **Summary-карточки**: кол-во дефицитов (красный), в норме (зелёный), избыток (оранжевый)
- **Radar Chart** (Recharts): наложение текущих значений на нормы
- **Bar Chart**: значения витаминов vs нормы с цветовой индикацией
- **Карточки витаминов**: progress-бар, severity %, статус
- **Toast-уведомления**: после загрузки анализа --- критические дефициты (error), избытки (warning), всё в норме (success)
- **Кнопки**: перейти к рецептам, экспорт в PDF

#### `AnalysisHistory.jsx` --- История (~230 строк)

- **Line Chart**: тренды витаминов во времени (Recharts)
- Фильтр по витаминам
- Карточки по датам со статусами каждого витамина
- % изменения между записями
- Пагинация

#### `Analytics.jsx` --- Аналитика (~490 строк)

Три вкладки:
1. **Тепловая карта**: витамины (строки) × даты (столбцы). Цвет ячейки: зелёный (норма), красный (дефицит), оранжевый (избыток).
2. **Сравнение**: выбор двух дат. Side-by-side бары, % изменения, радар-наложение двух периодов.
3. **Обзор**: горизонтальные бары (% от нормы), рейтинг дефицитов по severity, summary-статистика.

#### `Recipes.jsx` --- Рецепты (~350 строк)

- Поиск по названию/описанию (debounce 300ms)
- Фильтр по времени приготовления
- Сортировка: по релевантности, названию, времени
- Карточки рецептов: изображение, название, описание, время, relevance score, кнопка избранного
- Пагинация (20 на страницу)

#### `RecipeDetail.jsx` --- Детали рецепта (~270 строк)

- Hero-изображение
- Витаминный состав рецепта (рассчитывается через ингредиенты)
- Список ингредиентов с множителем порций (1x, 2x, 3x)
- Пошаговая инструкция
- Кнопка избранного
- Похожие рецепты

#### `ProductSearch.jsx` --- Поиск продуктов (~140 строк)

- Поиск по имени (debounce)
- Фильтр по содержанию конкретного витамина
- Карточки продуктов: категория, витаминный состав (таблица на 100г)

#### `MealPlan.jsx` --- План питания (~120 строк)

4 приёма пищи с цветовой кодировкой:
- Завтрак (жёлтый), Обед (зелёный), Ужин (фиолетовый), Перекус (розовый)
- Каждый --- рецепт из рекомендаций, ссылка на детали
- Кнопка перегенерации

#### `Favorites.jsx` --- Избранное (~200 строк)

- Сортировка: по дате, названию, времени
- Удаление с подтверждением
- Счётчик с русским склонением
- Empty state при пустом списке

#### `VitaminGuide.jsx` --- Справочник витаминов (~190 строк)

- Аккордеон: раскрываемые карточки для каждого витамина
- Поиск по названию, описанию, симптомам
- Информация: описание, нормы (муж/жен), симптомы дефицита и избытка
- Ссылки на поиск продуктов с этим витамином

### 3.7. Утилиты

#### `frontend/src/utils/vitaminIcons.js`

Маппинг витаминных кодов на визуальное оформление:

```javascript
const vitaminMap = {
  VIT_A:      { emoji: '🥕', gradient: 'from-orange-400 to-amber-500', bg: '...' },
  VIT_B1:     { emoji: '🌾', gradient: 'from-yellow-500 to-amber-600', bg: '...' },
  // ... для всех 20 витаминов
  OMEGA3:     { emoji: '🐟', gradient: 'from-sky-400 to-cyan-500', bg: '...' },
}
```

Используется во всех компонентах для отображения иконок и цветов витаминов.

#### `frontend/src/utils/chartColors.js`

Палитра цветов для графиков Recharts. Используется в AnalysisResults, Analytics, AnalysisHistory.

---

## 4. Ключевые алгоритмы

### 4.1. Анализ витаминного баланса

```
Вход: user_id
Выход: [{vitamin_name, value, status, severity}, ...]

1. gender = get_user_gender(user_id)  // "male" или "female"
2. vitamins = SELECT * FROM vitamins
3. Для каждого витамина:
   a. latest_entry = SELECT value FROM user_vitamin_entries
        WHERE user_id = ? AND vitamin_id = ?
        ORDER BY entry_date DESC LIMIT 1
   b. norm_min, norm_max = norms_for_gender(vitamin, gender)
   c. Если latest_entry == null:
        status = "no_data", severity = 0
   d. Если value < norm_min:
        status = "deficiency"
        severity = (norm_min - value) / norm_min * 100
   e. Если value > norm_max:
        status = "excess"
        severity = (value - norm_max) / norm_max * 100
   f. Иначе:
        status = "normal", severity = 0
4. return список результатов
```

### 4.2. Обработка симптомов

```
Вход: user_id, [symptom_id_1, symptom_id_2, ...]
Выход: создаются записи в user_vitamin_entries

1. symptoms = SELECT * FROM symptom_vitamin_map WHERE id IN (symptom_ids)
2. Группировка по vitamin_id:
   vitamin_weights = {
     VIT_D: [0.7, 0.8, 0.9],  // от разных симптомов
     MAGNESIUM: [0.9, 0.6],
     ...
   }
3. DELETE FROM user_vitamin_entries WHERE user_id = ? AND source = 'symptom'
4. Для каждого витамина с weight-списком:
   total_weight = sum(weights)  // может быть > 1.0
   clamped = min(total_weight, 1.0)
   estimated_value = norm_min * (1 - clamped * 0.5)
   // Пример: norm_min = 30, clamped = 0.8
   // estimated = 30 * (1 - 0.8 * 0.5) = 30 * 0.6 = 18
   INSERT INTO user_vitamin_entries (value=estimated_value, source='symptom')
```

### 4.3. Подбор рецептов

```
Вход: user_id
Выход: [{recipe, relevance_score}, ...] отсортированы по score

1. analysis = get_user_analysis(user_id)
2. deficiencies = [a for a in analysis if a.status == 'deficiency']
3. Если нет дефицитов → вернуть все рецепты без скора
4. recipes = SELECT * FROM recipes WITH ingredients WITH product_vitamins
5. Для каждого рецепта:
   score = 0
   Для каждого ингредиента:
     Для каждого дефицитного витамина:
       vitamin_amount = product.amount_per_100g * (ingredient.amount / 100)
       score += vitamin_amount * deficiency.severity
6. max_score = max(all scores)
7. normalized_score = (score / max_score) * 100  // 0-100%
8. Сортировка по score DESC, return top-10
```

### 4.4. Генерация плана питания

```
Вход: user_id
Выход: [{meal_type: "breakfast", recipe: ...}, ...]

1. recommended = get_recommended_recipes(user_id, limit=4)
2. meal_types = ["breakfast", "lunch", "dinner", "snack"]
3. return zip(meal_types, recommended[:4])
```

### 4.5. Сравнение анализов

```
Вход: user_id, date1, date2
Выход: [{vitamin_name, value1, value2, change_percent, status1, status2}, ...]

1. Для каждого витамина:
   entry1 = ближайшая запись к date1 (по |entry_date - date1|)
   entry2 = ближайшая запись к date2
2. change_percent = (value2 - value1) / value1 * 100
3. status1 = classify(value1, norm_min, norm_max)
4. status2 = classify(value2, norm_min, norm_max)
```

---

## 5. Интеграция с USDA API

#### `backend/app/services/usda.py`

USDA FoodData Central --- база данных нутриентного состава продуктов (api.nal.usda.gov).

**Маппинг нутриентов USDA → VitaBalance:**

| USDA Nutrient ID | Витамин VitaBalance | Единица |
|-----------------|---------------------|---------|
| 1175 (preferred) / 1104 | VIT_A | мкг RAE |
| 1165 | VIT_B1 | мг |
| 1166 | VIT_B2 | мг |
| 1167 | VIT_B3 | мг |
| 1174 | VIT_B5 | мг |
| 1170 | VIT_B6 | мг |
| 1177 | VIT_B9 | мкг |
| 1178 | VIT_B12 | мкг |
| 1162 | VIT_C | мг |
| 1114 | VIT_D | мкг |
| 1109 | VIT_E | мг |
| 1185 | VIT_K | мкг |
| 1089 | IRON | мг |
| 1087 | CALCIUM | мг |
| 1090 | MAGNESIUM | мг |
| 1095 | ZINC | мг |
| 1103 | SELENIUM | мкг |
| 1091 | PHOSPHORUS | мг |
| 1092 | POTASSIUM | мг |

**Workflow импорта:**
1. `search_usda_foods(query)` --- поиск по названию (SR Legacy + Foundation datasets)
2. `extract_vitamins_from_usda(food)` --- извлечение витаминов из ответа, маппинг на коды VitaBalance
3. `import_usda_food(fdc_id)` --- импорт конкретного продукта: создание Product + ProductVitamin записей
4. Проверка дубликатов по имени продукта

**Категории USDA → русские:**
```python
"Dairy and Egg Products" → "Молочные продукты"
"Finfish and Shellfish Products" → "Рыба и морепродукты"
"Nut and Seed Products" → "Орехи и семена"
# ... 25 категорий
```

---

## 6. PWA и Service Worker

#### `frontend/public/manifest.json`

```json
{
  "name": "VitaBalance — Витаминный баланс",
  "short_name": "VitaBalance",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#6366f1",
  "background_color": "#0d1117"
}
```

Иконки: 192x192 и 512x512 PNG (сердце на градиенте).

#### `frontend/public/sw.js`

Service Worker со стратегией cache-first:
- **Install:** кэширует статические ассеты (index.html, CSS, JS)
- **Fetch:** сначала проверяет кэш, при промахе --- сеть. Обновляет кэш на успешный ответ
- **API-запросы (`/api/`)** --- всегда идут в сеть (не кэшируются)
- **Activate:** удаляет старые версии кэша

---

## 7. Docker и деплой

### Архитектура контейнеров

```
┌──────────────────────────────────┐
│  vita-balance-frontend-1         │
│  nginx:alpine                    │
│  Порт: 3010 → 80 (внутренний)   │
│  Раздаёт: dist/ (SPA)           │
│  Проксирует: /api/ → backend    │
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│  vita-balance-backend-1          │
│  python:3.11-slim + uvicorn      │
│  Порт: 8010 → 8000 (внутренний) │
│  FastAPI приложение              │
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│  vita-balance-db-1               │
│  postgres:16-alpine              │
│  Volume: pgdata                  │
│  Внутренняя сеть: app-network    │
└──────────────────────────────────┘
```

### `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `frontend/Dockerfile`

Двухэтапная сборка:
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS build
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build          # → dist/

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### `frontend/nginx.conf`

- Раздаёт SPA: `try_files $uri $uri/ /index.html` (все пути → index.html для React Router)
- Проксирует `/api/` на `http://backend:8000/api/` (Docker DNS)
- Заголовки: `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`

### Продакшен (сервер 151.245.139.21)

На сервере есть системный nginx (порт 80/443) с конфигом для `vita-balance.ru`:
- HTTPS (Let's Encrypt) → проксирует на `127.0.0.1:3010` (frontend) и `127.0.0.1:8010` (backend API)
- Docker Compose использует порты 3010/8010 (не 80/8000), чтобы не конфликтовать с другими проектами на сервере

---

## 8. Схема базы данных

```
users
  ├──< user_profiles (1:1)
  ├──< user_vitamin_entries (1:N)
  ├──< favorites (1:N)
  ├──< notifications (1:N)
  └──< password_reset_tokens (1:N)

vitamins
  ├──< symptom_vitamin_map (1:N)
  ├──< product_vitamins (1:N)
  └──< user_vitamin_entries (1:N)

products
  ├──< product_vitamins (1:N)
  └──< recipe_ingredients (1:N)

recipes
  ├──< recipe_ingredients (1:N)
  └──< favorites (1:N)
```

**Индексы:**
- `users.email` --- unique
- `vitamins.code` --- unique
- `user_vitamin_entries.(user_id, vitamin_id)` --- composite
- `user_vitamin_entries.(user_id, entry_date)` --- composite
- `product_vitamins.product_id` --- обычный
- `product_vitamins.vitamin_id` --- обычный
- `recipe_ingredients.recipe_id` --- обычный
- `notifications.user_id` --- обычный
- `password_reset_tokens.token` --- unique
- `favorites.(user_id, recipe_id)` --- unique

---

## 9. Полная карта файлов

```
VitaBalance/
├── README.md                          # Основная документация
├── ARCHITECTURE.md                    # Эта документация
├── docker-compose.yml                 # Оркестрация 3 сервисов
│
├── backend/
│   ├── Dockerfile                     # Python 3.11 + uvicorn
│   ├── requirements.txt               # 16 Python-зависимостей
│   ├── .env.example                   # Шаблон настроек
│   ├── alembic.ini                    # Конфиг Alembic
│   ├── alembic/
│   │   ├── env.py                     # Настройка миграций
│   │   └── versions/
│   │       ├── ce2db5fe1584_initial_with_fk.py
│   │       ├── a1b2c3d4e5f6_add_user_entry_date_index.py
│   │       ├── b2c3d4e5f6a7_add_password_reset_tokens.py
│   │       └── c3d4e5f6a7b8_add_notifications.py
│   └── app/
│       ├── main.py                    # FastAPI app, CORS, middleware, роутеры
│       ├── config.py                  # Pydantic Settings
│       ├── database.py                # SQLAlchemy async engine + get_db()
│       ├── auth_utils.py              # JWT, bcrypt, get_current_user()
│       ├── seed.py                    # Первоначальное заполнение БД
│       ├── reseed.py                  # Обновление данных в существующей БД
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user.py                # User, UserProfile, PasswordResetToken
│       │   ├── user_data.py           # UserVitaminEntry, Favorite
│       │   ├── vitamin.py             # Vitamin, SymptomVitaminMap
│       │   ├── product.py             # Product, ProductVitamin
│       │   ├── recipe.py              # Recipe, RecipeIngredient
│       │   └── notification.py        # Notification
│       ├── schemas/
│       │   ├── user.py                # UserCreate, Token, ProfileUpdate, UserOut
│       │   ├── vitamin.py             # VitaminOut, VitaminEntryCreate, SymptomSubmit
│       │   ├── recipe.py              # RecipeShort, RecipeDetail, MealPlanItem
│       │   └── analysis.py            # VitaminAnalysisItem, ComparisonItem
│       ├── routers/
│       │   ├── auth.py                # 6 эндпоинтов: register, login, refresh, ...
│       │   ├── profile.py             # 2 эндпоинта: GET/PUT /me
│       │   ├── vitamins.py            # 13 эндпоинтов: анализы, продукты, USDA
│       │   ├── recipes.py             # 4 эндпоинта: recommended, meal-plan, search
│       │   ├── favorites.py           # 3 эндпоинта: list, add, remove
│       │   └── notifications.py       # 4 эндпоинта: list, count, read, read-all
│       ├── services/
│       │   ├── analysis.py            # get_user_analysis(), process_symptoms()
│       │   ├── recommendation.py      # get_recommended_recipes(), vitamin_content()
│       │   ├── history.py             # get_vitamin_history(), compare_analysis()
│       │   ├── cache.py               # In-memory TTL кэш (5 мин)
│       │   ├── notifications.py       # check_and_notify()
│       │   ├── usda.py                # USDA FoodData Central API интеграция
│       │   └── utils.py               # classify_status(), get_norms(), get_gender()
│       └── seed_data/
│           ├── vitamins.json          # 20 витаминов
│           ├── products.json          # 91 продукт
│           ├── recipes.json           # 35 рецептов
│           └── symptoms.json          # 108 маппингов
│
└── frontend/
    ├── Dockerfile                     # Node build → Nginx serve
    ├── nginx.conf                     # SPA routing + API proxy
    ├── package.json                   # React 19, Vite 8, Tailwind 4, Recharts
    ├── vite.config.js                 # Vite конфигурация
    ├── index.html                     # Точка входа HTML + PWA мета-теги
    ├── public/
    │   ├── favicon.svg                # SVG-иконка (сердце на градиенте)
    │   ├── manifest.json              # PWA манифест
    │   ├── sw.js                      # Service Worker
    │   └── icons/
    │       ├── icon-192.png           # PWA иконка 192x192
    │       └── icon-512.png           # PWA иконка 512x512
    └── src/
        ├── main.jsx                   # ReactDOM.render → App
        ├── App.jsx                    # Провайдеры + маршруты
        ├── index.css                  # Tailwind + кастомные анимации
        ├── api/
        │   └── client.js             # Axios + interceptors + auto-refresh
        ├── context/
        │   ├── AuthContext.jsx        # Авторизация (user, login, logout)
        │   ├── ThemeContext.jsx        # Тёмная/светлая тема
        │   └── ToastContext.jsx        # Toast-уведомления
        ├── hooks/
        │   └── useAnimations.js       # useInView(), useCountUp()
        ├── components/
        │   ├── Layout.jsx             # Хедер + футер + навигация
        │   ├── AnimateIn.jsx          # Scroll-анимации + StaggerChildren
        │   ├── PrivateRoute.jsx       # Защита маршрутов
        │   ├── ErrorBoundary.jsx      # Обработка ошибок
        │   ├── PageTransition.jsx     # Анимация перехода
        │   ├── Skeleton.jsx           # Loading-скелетоны
        │   └── Input.jsx              # Стилизованный input
        ├── pages/
        │   ├── Home.jsx               # Главная (~430 строк)
        │   ├── Login.jsx              # Вход (~110 строк)
        │   ├── Register.jsx           # Регистрация (~155 строк)
        │   ├── Dashboard.jsx          # Кабинет (~280 строк)
        │   ├── DataEntry.jsx          # Ввод данных (~320 строк)
        │   ├── AnalysisResults.jsx    # Результаты анализа (~370 строк)
        │   ├── AnalysisHistory.jsx    # История (~230 строк)
        │   ├── Analytics.jsx          # Аналитика (~490 строк)
        │   ├── Recipes.jsx            # Рецепты (~350 строк)
        │   ├── RecipeDetail.jsx       # Детали рецепта (~270 строк)
        │   ├── ProductSearch.jsx      # Поиск продуктов (~140 строк)
        │   ├── MealPlan.jsx           # План питания (~120 строк)
        │   ├── Favorites.jsx          # Избранное (~200 строк)
        │   ├── VitaminGuide.jsx       # Справочник (~190 строк)
        │   └── NotFound.jsx           # 404 (~30 строк)
        └── utils/
            ├── vitaminIcons.js        # Emoji + цвета для 20 витаминов
            └── chartColors.js         # Палитра графиков
```

**Итого:**
- Backend: ~1 600 строк Python + ~500 строк миграций
- Frontend: ~4 300 строк JSX/JS + ~300 строк CSS
- Конфигурация: ~200 строк (Docker, Nginx, манифест)
- Seed-данные: ~3 000 строк JSON
