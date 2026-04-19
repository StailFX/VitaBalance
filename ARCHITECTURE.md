# VitaBalance — подробная техническая архитектура

Этот документ описывает актуальную архитектуру проекта в текущем состоянии репозитория: реальные модули, текущие data-flow, ограничения доменной логики и путь деплоя на VPS.

## Оглавление

1. Общая схема системы
2. Backend
3. База данных и доменные сущности
4. Ключевые сценарии данных
5. Frontend
6. Seed / reseed / справочные данные
7. Docker, CI/CD и VPS
8. Текущие архитектурные договорённости

## 1. Общая схема системы

```text
Browser / PWA
  -> React SPA
  -> nginx внутри frontend container
  -> /api/v1/* запросы
  -> FastAPI backend
  -> service layer
  -> PostgreSQL
```

На проде поверх docker-контейнеров работает системный nginx на VPS, который проксирует трафик в контейнеры, поднятые на localhost.

### Runtime цепочка

1. Пользователь открывает фронтенд по домену.
2. Frontend отдает SPA-страницу и ассеты через nginx.
3. Все API-вызовы идут на `/api/v1/*`.
4. nginx проксирует API в backend-контейнер.
5. FastAPI обрабатывает запрос, при необходимости авторизует пользователя по JWT.
6. Service layer читает или пишет данные через SQLAlchemy.
7. PostgreSQL хранит справочники, рецепты, пользовательские snapshot’ы, уведомления и избранное.

### Инфраструктурные порты

По текущему `docker-compose.yml`:

- frontend: `127.0.0.1:3010 -> 80`
- backend: `127.0.0.1:8010 -> 8000`
- db: только внутренняя docker-сеть, наружу не публикуется

## 2. Backend

Главная backend-структура находится в [backend/app](/Users/stailfx/Desktop/KursachArtem/backend/app).

### 2.1. Точка входа и конфигурация

- [backend/app/main.py](/Users/stailfx/Desktop/KursachArtem/backend/app/main.py)
- [backend/app/config.py](/Users/stailfx/Desktop/KursachArtem/backend/app/config.py)
- [backend/app/database.py](/Users/stailfx/Desktop/KursachArtem/backend/app/database.py)
- [backend/app/auth_utils.py](/Users/stailfx/Desktop/KursachArtem/backend/app/auth_utils.py)

### Что делает `main.py`

- создаёт FastAPI приложение;
- подключает CORS;
- подключает rate limiting на чувствительные auth-endpoint’ы;
- монтирует API-роутеры;
- включает /docs в dev-среде;
- настраивает базовый request logging.

### Основные env-переменные

- `DATABASE_URL`
- `DATABASE_URL_SYNC`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `SECRET_KEY`
- `CORS_ORIGINS`
- `USDA_API_KEY`
- `ENVIRONMENT`

### Работа с БД

`get_db()` отдаёт `AsyncSession`, а backend-код опирается на SQLAlchemy 2 async style.

Транзакционная логика завязана на единицу запроса: запись snapshot’а, добавление избранного, создание уведомления и т.д. происходят в одном request lifecycle.

### 2.2. API-роутеры

#### Auth

[backend/app/routers/auth.py](/Users/stailfx/Desktop/KursachArtem/backend/app/routers/auth.py)

Отвечает за:

- регистрацию;
- логин;
- refresh token flow;
- смену пароля;
- reset password request / confirm.

#### Profile

[backend/app/routers/profile.py](/Users/stailfx/Desktop/KursachArtem/backend/app/routers/profile.py)

Профиль хранит:

- пол;
- возраст;
- рост;
- вес.

Пол важен для подстановки gender-aware норм витаминов.

#### Vitamins

[backend/app/routers/vitamins.py](/Users/stailfx/Desktop/KursachArtem/backend/app/routers/vitamins.py)

Это центральный доменный роутер проекта. Он отвечает за:

- выдачу справочника витаминов;
- symptom mapping;
- сохранение лабораторных entries;
- сохранение symptom snapshot’ов;
- расчёт текущего анализа;
- историю;
- сравнение snapshot’ов;
- поиск продуктов;
- USDA импорт;
- PDF export анализа.

Ключевой архитектурный момент именно здесь:

- `POST /vitamins/entries` больше должен создавать новый snapshot, а не затирать старые lab-данные;
- `POST /vitamins/entries/symptoms` должен создавать symptom snapshot, не уничтожая лабораторную историю.

#### Recipes

[backend/app/routers/recipes.py](/Users/stailfx/Desktop/KursachArtem/backend/app/routers/recipes.py)

Отвечает за:

- рекомендованные рецепты;
- поиск и фильтрацию рецептов;
- meal plan;
- детализацию рецепта.

#### Favorites

[backend/app/routers/favorites.py](/Users/stailfx/Desktop/KursachArtem/backend/app/routers/favorites.py)

CRUD для избранных рецептов пользователя.

#### Notifications

[backend/app/routers/notifications.py](/Users/stailfx/Desktop/KursachArtem/backend/app/routers/notifications.py)

Список уведомлений, count непрочитанных, mark-as-read.

### 2.3. Service layer

#### Analysis

[backend/app/services/analysis.py](/Users/stailfx/Desktop/KursachArtem/backend/app/services/analysis.py)

Основная ответственность:

- собрать последние значения пользователя по витаминам;
- отдать лабораторные значения с более высоким приоритетом;
- использовать symptom-based значения как fallback;
- вычислить `status` и `severity`.

#### History

[backend/app/services/history.py](/Users/stailfx/Desktop/KursachArtem/backend/app/services/history.py)

Отвечает за:

- группировку `user_vitamin_entries` по snapshot timestamp;
- сериализацию history для frontend;
- сравнение двух snapshot’ов между собой;
- source precedence внутри snapshot’а, если вдруг данные смешались.

#### Recommendation

[backend/app/services/recommendation.py](/Users/stailfx/Desktop/KursachArtem/backend/app/services/recommendation.py)

Отвечает за:

- расчёт recipe relevance на основе текущих дефицитов;
- нормализацию score до процентов;
- вычисление витаминного состава рецепта из ингредиентов.

#### PDF export

[backend/app/services/pdf_export.py](/Users/stailfx/Desktop/KursachArtem/backend/app/services/pdf_export.py)

Строит PDF-документ по текущему анализу.

#### Notifications

[backend/app/services/notifications.py](/Users/stailfx/Desktop/KursachArtem/backend/app/services/notifications.py)

Создаёт продуктовые уведомления и защищает от повторного спама за счёт deduplication.

#### Cache

[backend/app/services/cache.py](/Users/stailfx/Desktop/KursachArtem/backend/app/services/cache.py)

Кэширует справочник витаминов и symptom mapping, чтобы не ходить каждый раз в БД за статическими данными.

#### USDA

[backend/app/services/usda.py](/Users/stailfx/Desktop/KursachArtem/backend/app/services/usda.py)

Поиск и импорт продуктов из USDA FoodData Central.

#### Utils

[backend/app/services/utils.py](/Users/stailfx/Desktop/KursachArtem/backend/app/services/utils.py)

Доменные helper-функции:

- определение норм по полу;
- классификация статуса витамина;
- получение пола пользователя.

## 3. База данных и доменные сущности

### 3.1. Пользовательский блок

#### `users`

- email;
- password hash;
- дата создания.

#### `user_profiles`

- `gender`
- `age`
- `height_cm`
- `weight_kg`

Этот блок не только “профиль ради профиля”: пол влияет на интерпретацию норм в анализе.

#### `password_reset_tokens`

Служебная таблица для password reset flow.

#### `notifications`

Хранит уведомления продукта: дефициты, избытки, achievement-события.

#### `favorites`

Связка user -> recipe с уникальностью по паре `(user_id, recipe_id)`.

### 3.2. Справочники

#### `vitamins`

Текущий объём:

- `20` витаминов / минералов / omega-3 сущностей.

Каждая запись содержит:

- код;
- название;
- единицу измерения;
- описание;
- симптомы дефицита;
- симптомы избытка;
- male/female нормы.

#### `symptom_vitamin_map`

Текущий объём:

- `108` связок symptom -> vitamin.

Каждая строка хранит:

- текст симптома;
- целевой витамин;
- weight связи.

### 3.3. Продукты и рецепты

#### `products`

Текущий объём:

- `94` продукта.

#### `product_vitamins`

Хранит витаминный состав продукта на 100 г.

#### `recipes`

Текущий объём:

- `60` рецептов.

Хранит:

- title;
- description;
- image_url;
- cook_time_minutes;
- instructions.

#### `recipe_ingredients`

Связывает recipe с product и хранит amount / unit.

### 3.4. История пользовательских измерений

#### `user_vitamin_entries`

Это ключевая таблица проекта.

Каждая запись содержит:

- `user_id`
- `vitamin_id`
- `value`
- `source` (`lab` или `symptom`)
- `entry_date`

### Почему история строится именно через `entry_date`

Архитектурный смысл snapshot’а такой:

- один submit формы отправляет несколько vitamin values;
- всем этим значениям ставится один и тот же `entry_date`;
- этот общий timestamp и является идентификатором snapshot’а.

Это позволяет:

- строить историю по реальным сохранениям;
- сравнивать два конкретных набора измерений;
- не терять старые замеры при новом submit.

## 4. Ключевые сценарии данных

### 4.1. Сохранение лабораторных данных

Файлы:

- [frontend/src/pages/DataEntry.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/DataEntry.tsx)
- [backend/app/routers/vitamins.py](/Users/stailfx/Desktop/KursachArtem/backend/app/routers/vitamins.py)

Flow:

1. Frontend запрашивает список витаминов и последние lab entries.
2. Поля формы предзаполняются последними сохранёнными значениями.
3. Пользователь отправляет список заполненных витаминов.
4. Backend создаёт `snapshot_at`.
5. Каждая запись получает один и тот же `entry_date=snapshot_at`.
6. История пополняется новым snapshot’ом.

### 4.2. Сохранение анкеты симптомов

Файлы:

- [frontend/src/pages/DataEntry.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/DataEntry.tsx)
- [backend/app/services/analysis.py](/Users/stailfx/Desktop/KursachArtem/backend/app/services/analysis.py)

Flow:

1. Пользователь отмечает симптомы.
2. Frontend отправляет `symptom_ids`.
3. Backend собирает symptom mapping и суммирует веса по витаминам.
4. Для витаминов рассчитывается оценочное значение ниже нормы.
5. Создаётся symptom snapshot со своим `entry_date`.

### Важное доменное ограничение

Symptom flow:

- не выводит норму;
- не выводит избыток;
- не заменяет лабораторные данные;
- нужен для дефицитной оценки при отсутствии анализа.

То есть пользователь может получить через symptoms:

- `deficiency`
- `no_data`

А полноценная норма/избыток по продуктовой логике — это зона лабораторных значений.

### 4.3. Построение текущего анализа

Файл:

- [backend/app/services/analysis.py](/Users/stailfx/Desktop/KursachArtem/backend/app/services/analysis.py)

Алгоритм:

1. Берутся последние `lab` записи по каждому витамину.
2. Отдельно берутся последние `non-lab` записи по каждому витамину.
3. Собирается итоговая карта значений.
4. Lab значения поверх symptom значений переопределяют итог.
5. Для каждого витамина вычисляется статус относительно пола пользователя.

### Формула severity

- для дефицита: насколько процентно значение ниже минимальной нормы;
- для избытка: насколько процентно значение выше верхней нормы.

### 4.4. История и сравнение snapshot’ов

Файлы:

- [backend/app/services/history.py](/Users/stailfx/Desktop/KursachArtem/backend/app/services/history.py)
- [frontend/src/pages/AnalysisHistory.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/AnalysisHistory.tsx)
- [frontend/src/pages/Analytics.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/Analytics.tsx)

Текущая модель:

- история хранится как список snapshot’ов;
- snapshot key = точный ISO timestamp;
- frontend в сравнении оперирует именно snapshot timestamp, а не только датой;
- отображение времени идёт в `Europe/Moscow`.

### 4.5. Поиск продуктов

Файлы:

- [backend/app/routers/vitamins.py](/Users/stailfx/Desktop/KursachArtem/backend/app/routers/vitamins.py)
- [frontend/src/pages/ProductSearch.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/ProductSearch.tsx)

Текущая логика:

- backend поддерживает `limit/offset`;
- frontend показывает выдачу порциями;
- пользователь может догружать следующие записи кнопкой, а не бесконечным скроллом.

### 4.6. Рекомендации рецептов

Файл:

- [backend/app/services/recommendation.py](/Users/stailfx/Desktop/KursachArtem/backend/app/services/recommendation.py)

Алгоритм:

1. получить текущие дефициты;
2. взять все рецепты и их ингредиенты;
3. пройти по продуктам внутри рецепта;
4. умножить вклад витамина на amount ингредиента и severity дефицита;
5. получить сырой score;
6. нормализовать score до относительного процента.

### 4.7. План питания

Файлы:

- [backend/app/routers/recipes.py](/Users/stailfx/Desktop/KursachArtem/backend/app/routers/recipes.py)
- [frontend/src/pages/MealPlan.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/MealPlan.tsx)

План питания не хранится как отдельная persistent сущность.

Он собирается на лету из top recommended recipes:

- breakfast
- lunch
- dinner
- snack

Из этого следует:

- план может меняться после новых анализов;
- план зависит от текущего набора дефицитов;
- одинаковый пользователь с новыми snapshot’ами может получить другой план.

## 5. Frontend

### 5.1. Основной каркас

- [frontend/src/main.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/main.tsx)
- [frontend/src/App.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/App.tsx)
- [frontend/src/components/AppRoutes.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/components/AppRoutes.tsx)
- [frontend/src/components/Layout.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/components/Layout.tsx)

### 5.2. Контексты

- [frontend/src/context/AuthContext.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/context/AuthContext.tsx)
  Хранит текущего пользователя, login/register/logout и refresh behavior.

- [frontend/src/context/ThemeContext.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/context/ThemeContext.tsx)
  Управляет светлой и тёмной темой.

- [frontend/src/context/ToastContext.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/context/ToastContext.tsx)
  Локальная система уведомлений UI.

### 5.3. Навигация и страницы

Основные route-группы:

- публичные: home, login, register, vitamin guide;
- приватные: data entry, analysis, history, analytics, recipes, favorites, meal plan.

### Ключевые страницы

- [frontend/src/pages/Home.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/Home.tsx)
  Лендинг, продуктовый оффер, статистика, блоки преимуществ.

- [frontend/src/pages/DataEntry.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/DataEntry.tsx)
  Dual-mode форма: лабораторные данные / симптомы.

- [frontend/src/pages/AnalysisResults.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/AnalysisResults.tsx)
  Текущий анализ, summary cards, charts, export PDF.

- [frontend/src/pages/AnalysisHistory.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/AnalysisHistory.tsx)
  История snapshot’ов и динамика между последними замерами.

- [frontend/src/pages/Analytics.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/Analytics.tsx)
  Heatmap, compare, overview.

- [frontend/src/pages/ProductSearch.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/ProductSearch.tsx)
  Порционный каталог продуктов.

- [frontend/src/pages/Recipes.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/Recipes.tsx)
  Поиск, фильтрация и порционная загрузка рецептов.

- [frontend/src/pages/RecipeDetail.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/RecipeDetail.tsx)
  Ингредиенты, инструкции, витаминный вклад, масштабирование порций.

- [frontend/src/pages/MealPlan.tsx](/Users/stailfx/Desktop/KursachArtem/frontend/src/pages/MealPlan.tsx)
  Автогенерируемый план питания на текущий анализ.

### 5.4. Frontend utils и config

- [frontend/src/api/client.ts](/Users/stailfx/Desktop/KursachArtem/frontend/src/api/client.ts)
  Axios client, refresh токены, очередь повторных запросов после refresh.

- [frontend/src/utils/datetime.ts](/Users/stailfx/Desktop/KursachArtem/frontend/src/utils/datetime.ts)
  Нормализация API времени и отображение в МСК.

- [frontend/src/utils/plural.ts](/Users/stailfx/Desktop/KursachArtem/frontend/src/utils/plural.ts)
  Склонения “1 продукт / 2 продукта / 5 продуктов”.

- [frontend/src/utils/recipeMedia.ts](/Users/stailfx/Desktop/KursachArtem/frontend/src/utils/recipeMedia.ts)
  Превращает recipe media path в рабочий frontend URL.

- [frontend/src/config/uiVisuals.ts](/Users/stailfx/Desktop/KursachArtem/frontend/src/config/uiVisuals.ts)
  Хранит продуктовые визуальные токены: иконки, градиенты, meal visuals.

## 6. Seed / reseed / справочные данные

Файлы:

- [backend/app/seed.py](/Users/stailfx/Desktop/KursachArtem/backend/app/seed.py)
- [backend/app/reseed.py](/Users/stailfx/Desktop/KursachArtem/backend/app/reseed.py)
- [backend/app/seed_data/vitamins.json](/Users/stailfx/Desktop/KursachArtem/backend/app/seed_data/vitamins.json)
- [backend/app/seed_data/products.json](/Users/stailfx/Desktop/KursachArtem/backend/app/seed_data/products.json)
- [backend/app/seed_data/recipes.json](/Users/stailfx/Desktop/KursachArtem/backend/app/seed_data/recipes.json)
- [backend/app/seed_data/symptoms.json](/Users/stailfx/Desktop/KursachArtem/backend/app/seed_data/symptoms.json)

Актуальные объёмы:

- `20` vitamins;
- `94` products;
- `60` recipes;
- `108` symptom mappings.

### Разница между `seed` и `reseed`

`seed.py`:

- для первого поднятия пустой БД;
- загружает стартовый справочник.

`reseed.py`:

- обновляет справочники в уже существующей БД;
- нужен после изменений продуктов, рецептов или symptoms;
- не должен трогать пользовательские данные.

## 7. Docker, CI/CD и VPS

### 7.1. Docker Compose

Файл:

- [docker-compose.yml](/Users/stailfx/Desktop/KursachArtem/docker-compose.yml)

Сервисы:

- `db`
- `backend`
- `frontend`

### 7.2. GitHub Actions

Workflow:

- [`.github/workflows/deploy.yml`](/Users/stailfx/Desktop/KursachArtem/.github/workflows/deploy.yml)

Pipeline сейчас делает:

1. checkout;
2. SSH на VPS;
3. `git fetch origin main`;
4. обновление кода на сервере;
5. `docker compose up -d --build --remove-orphans`;
6. ожидание готовности backend;
7. `python -m app.seed`.

### 7.3. Что нужно помнить при deploy

Если менялись:

- `recipes.json`
- `products.json`
- `symptoms.json`
- `vitamins.json`

то после обычного deploy нужен ещё:

```bash
docker compose exec backend python -m app.reseed
```

Иначе контейнеры поднимутся, но существующая БД не получит обновлённые справочные записи.

### 7.4. Ручной VPS deploy flow

Обычно ручной путь такой:

```bash
ssh stailfx@151.245.139.21
cd ~/vita-balance
git pull
docker compose up -d --build
docker compose exec backend python -m app.reseed
```

## 8. Текущие архитектурные договорённости

1. История строится по snapshot’ам, а не по “последнему состоянию”.
2. Лабораторные значения приоритетнее symptom-based значений.
3. Symptom flow даёт только дефицитные оценки и не формирует избыток.
4. План питания и рекомендации — вычисляемые, а не сохранённые сущности.
5. Recipe images желательно хранить локально в frontend public assets, а не на случайных внешних ссылках.
6. Изменения справочников должны сопровождаться `reseed`.
7. Для GitHub push должен использоваться SSH-ключ аккаунта `StailFX`, а не посторонний ключ.
