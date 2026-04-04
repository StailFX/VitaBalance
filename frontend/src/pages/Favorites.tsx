import { useState, useEffect, useMemo, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { CardSkeleton } from '../components/Skeleton'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useToast } from '../context/ToastContext'
import type { FavoriteOut } from '../types'

type SortKey = 'date' | 'title' | 'cooktime'

interface SummaryCard {
  label: string
  value: string
  description: string
  accent: string
  surface: string
  border: string
}

const sortLabelMap: Record<SortKey, string> = {
  date: 'Сначала новые',
  title: 'По названию',
  cooktime: 'По времени готовки',
}

const sortApiMap: Record<SortKey, string> = {
  date: 'newest',
  title: 'title',
  cooktime: 'cook_time',
}

function trimText(value: string, maxLength = 100): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trimEnd()}...`
}

export default function Favorites() {
  const [recipes, setRecipes] = useState<FavoriteOut[]>([])
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [error, setError] = useState(false)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>('date')
  const { addToast } = useToast()

  useEffect(() => {
    let mounted = true
    const initialLoad = loading

    if (initialLoad) setLoading(true)
    else setListLoading(true)

    api.get<FavoriteOut[]>('/favorites/', {
      params: {
        sort: sortApiMap[sortBy],
      },
    }).then((res) => {
      if (!mounted) return
      setRecipes(res.data)
      setError(false)
    }).catch(() => {
      if (!mounted) return
      if (initialLoad) setError(true)
      else addToast('Не удалось обновить сортировку избранного', 'error')
    }).finally(() => {
      if (!mounted) return
      if (initialLoad) setLoading(false)
      else setListLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [addToast, sortBy])

  const removeFavorite = async (recipeId: number) => {
    try {
      await api.delete(`/favorites/${recipeId}`)
      setRecipes((prev) => prev.filter((item) => item.recipe_id !== recipeId))
      setConfirmingId(null)
      addToast('Рецепт удален из избранного', 'success')
    } catch {
      addToast('Ошибка удаления из избранного', 'error')
    }
  }

  const averageCookTime = useMemo(() => {
    const valid = recipes
      .map((item) => item.recipe?.cook_time_minutes ?? null)
      .filter((value): value is number => value !== null)

    if (valid.length === 0) return 0
    return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length)
  }, [recipes])

  const fastestRecipe = useMemo(() => {
    return recipes.reduce<FavoriteOut | null>((best, current) => {
      if (!current.recipe) return best
      if (!best?.recipe) return current
      return current.recipe.cook_time_minutes < best.recipe.cook_time_minutes ? current : best
    }, null)
  }, [recipes])

  const longestRecipe = useMemo(() => {
    return recipes.reduce<FavoriteOut | null>((best, current) => {
      if (!current.recipe) return best
      if (!best?.recipe) return current
      return current.recipe.cook_time_minutes > best.recipe.cook_time_minutes ? current : best
    }, null)
  }, [recipes])

  const summaryCards: SummaryCard[] = [
    {
      label: 'В избранном',
      value: `${recipes.length}`,
      description: recipes.length > 0 ? 'Столько рецептов уже сохранено для быстрого возврата.' : 'Подборка пока пустая, но ее легко собрать по ходу использования приложения.',
      accent: 'text-rose-600 dark:text-rose-300',
      surface: 'from-rose-50 via-white to-white dark:from-rose-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-rose-100 dark:border-rose-500/20',
    },
    {
      label: 'Среднее время',
      value: averageCookTime ? `${averageCookTime} мин` : 'Нет данных',
      description: 'Так выглядит средняя длительность приготовления в текущей подборке.',
      accent: 'text-cyan-600 dark:text-cyan-300',
      surface: 'from-cyan-50 via-white to-white dark:from-cyan-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-cyan-100 dark:border-cyan-500/20',
    },
    {
      label: 'Самый быстрый',
      value: fastestRecipe?.recipe ? `${fastestRecipe.recipe.cook_time_minutes} мин` : 'Пока нет',
      description: fastestRecipe?.recipe ? fastestRecipe.recipe.title : 'Появится, когда вы сохраните хотя бы один рецепт.',
      accent: 'text-emerald-600 dark:text-emerald-300',
      surface: 'from-emerald-50 via-white to-white dark:from-emerald-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-emerald-100 dark:border-emerald-500/20',
    },
    {
      label: 'Сортировка',
      value: sortLabelMap[sortBy],
      description: 'Можно быстро переключать взгляд между новыми, быстрыми и алфавитными вариантами.',
      accent: 'text-primary-600 dark:text-primary-300',
      surface: 'from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-primary-100 dark:border-primary-500/20',
    },
  ]

  if (error) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.401 3.003c1.155-2 4.043-2 5.198 0l6.125 10.607c1.154 1.999-.289 4.498-2.599 4.498H5.875c-2.31 0-3.753-2.499-2.599-4.498L9.401 3.003z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Не удалось загрузить избранное</h1>
          <p className="text-gray-500 dark:text-gray-300 mb-8">Попробуйте обновить страницу чуть позже или вернитесь к подборке рецептов.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold"
            >
              Обновить страницу
            </button>
            <Link
              to="/recipes"
              className="px-8 py-3 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08]"
            >
              К рецептам
            </Link>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-xl shadow-gray-200/40 dark:shadow-primary-500/[0.05]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 left-0 h-44 w-44 rounded-full bg-rose-500/[0.08] dark:bg-rose-500/[0.14] blur-3xl" />
            <div className="absolute top-1/3 right-0 h-56 w-56 rounded-full bg-primary-500/[0.08] dark:bg-primary-500/[0.12] blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            />
          </div>

          <div className="relative grid xl:grid-cols-[1.15fr_0.85fr] gap-6 p-6 sm:p-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/70 dark:bg-white/[0.06] border border-rose-200/60 dark:border-rose-500/20 backdrop-blur-sm mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Избранные рецепты</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                {recipes.length > 0 ? 'Личная подборка уже собрана вокруг ваших решений' : 'Избранное пока пустое, но сценарий уже готов'}
              </h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-gray-300 leading-relaxed max-w-xl mb-6">
                {recipes.length > 0
                  ? 'Здесь удобно держать рецепты, к которым хочется быстро возвращаться: любимые, быстрые или просто самые практичные под ваш ритм.'
                  : 'Сохраняйте удачные рецепты прямо из подборки или со страницы конкретного блюда, и здесь начнет формироваться личный набор без лишнего поиска.'}
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <Link
                  to="/recipes"
                  className="btn-primary text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
                >
                  Открыть рецепты
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  to="/meal-plan"
                  className="px-6 py-3 rounded-2xl bg-gray-100/90 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08] hover:bg-white dark:hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2"
                >
                  План питания
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12m-12 5.25h12m-12 5.25h12m-16.5-10.5h.008v.008H3.75V6.75zm0 5.25h.008v.008H3.75V12zm0 5.25h.008v.008H3.75v-.008z" />
                  </svg>
                </Link>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {recipes.length} сохраненных карточек
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  Сортировка: {sortLabelMap[sortBy]}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {listLoading ? 'Обновляем список...' : `Среднее время: ${averageCookTime || 0} мин`}
                </span>
              </div>
            </div>

            <StaggerChildren variant="fade-up" stagger={70} className="grid gap-3 self-start sm:grid-cols-2">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-[1.5rem] border ${card.border} bg-gradient-to-br ${card.surface} p-4 sm:p-5`}
                >
                  <div className={`text-xs uppercase tracking-[0.18em] ${card.accent} mb-2`}>{card.label}</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">{card.description}</p>
                </div>
              ))}
            </StaggerChildren>
          </div>
        </section>

        {recipes.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-rose-200 dark:text-rose-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Пока ничего не сохранено</h2>
            <p className="text-gray-500 dark:text-gray-300 mb-8">Добавляйте понравившиеся рецепты в избранное, чтобы быстро возвращаться к ним без повторного поиска.</p>
            <Link to="/recipes" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
              Посмотреть рецепты
            </Link>
          </div>
        ) : (
          <div className="grid xl:grid-cols-[1.12fr_0.88fr] gap-6 items-start">
            <AnimateIn variant="blur" className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">
                    Подборка
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Сортируйте и очищайте коллекцию без хаоса</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                    Список уже синхронизирован с backend-сортировкой, поэтому порядок карточек соответствует выбранному режиму.
                  </p>
                </div>
                <label className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Сортировка:</span>
                  <select
                    value={sortBy}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as SortKey)}
                    className="text-sm px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  >
                    <option value="date">По дате добавления</option>
                    <option value="title">По названию</option>
                    <option value="cooktime">По времени готовки</option>
                  </select>
                </label>
              </div>

              {listLoading && (
                <div className="rounded-[1.6rem] border border-gray-200 dark:border-white/[0.08] bg-gradient-to-r from-rose-50 via-white to-primary-50 dark:from-rose-500/10 dark:via-white/[0.03] dark:to-primary-500/8 p-4 mb-5 text-sm text-gray-500 dark:text-gray-300">
                  Обновляем порядок карточек под выбранную сортировку...
                </div>
              )}

              <StaggerChildren variant="fade-up" stagger={45} className="grid md:grid-cols-2 gap-5">
                {recipes.map((favorite) => (
                  <div
                    key={favorite.recipe_id}
                    className="group overflow-hidden rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] bg-gradient-to-br from-white to-gray-50 dark:from-white/[0.03] dark:to-white/[0.02] shadow-sm"
                  >
                    <div className="relative h-48 bg-gradient-to-br from-rose-100 to-primary-100 dark:from-rose-900/30 dark:to-primary-900/30 overflow-hidden">
                      {favorite.recipe?.image_url ? (
                        <img
                          src={favorite.recipe.image_url}
                          alt={favorite.recipe.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(event) => { (event.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-14 h-14 text-rose-200 dark:text-rose-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                          </svg>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />

                      {favorite.recipe && (
                        <div className="absolute bottom-4 left-4">
                          <span className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-white/[0.08] backdrop-blur-sm text-xs font-semibold text-gray-700 dark:text-gray-200 border border-white/80 dark:border-white/[0.08]">
                            {favorite.recipe.cook_time_minutes} мин
                          </span>
                        </div>
                      )}

                      {confirmingId === favorite.recipe_id ? (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white dark:bg-gray-800 rounded-full px-3 py-2 shadow-lg border border-gray-200 dark:border-white/[0.1]">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Удалить?</span>
                          <button
                            type="button"
                            onClick={() => removeFavorite(favorite.recipe_id)}
                            className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                          >
                            Да
                          </button>
                          <span className="text-gray-300 dark:text-gray-600">/</span>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                          >
                            Нет
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(favorite.recipe_id)}
                          className="absolute top-4 right-4 w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-[11px] font-semibold text-rose-700 dark:text-rose-200">
                          Сохранено
                        </span>
                        {favorite.recipe ? (
                          <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-[11px] font-semibold text-gray-500 dark:text-gray-300">
                            {favorite.recipe.cook_time_minutes} мин
                          </span>
                        ) : null}
                      </div>

                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 leading-snug">
                        {favorite.recipe?.title || 'Рецепт недоступен'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed mb-5">
                        {favorite.recipe?.description ? trimText(favorite.recipe.description) : 'Описание недоступно.'}
                      </p>

                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setConfirmingId(favorite.recipe_id)}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-200"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                          </svg>
                          Удалить
                        </button>

                        <Link
                          to={`/recipes/${favorite.recipe_id}`}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          Открыть
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </StaggerChildren>
            </AnimateIn>

            <StaggerChildren variant="fade-up" stagger={60} className="space-y-4">
              <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                  Быстрый контекст
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Что сейчас внутри подборки</h3>
                <div className="space-y-3 text-sm text-gray-500 dark:text-gray-300">
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                    Самый быстрый вариант: {fastestRecipe?.recipe ? `${fastestRecipe.recipe.title} (${fastestRecipe.recipe.cook_time_minutes} мин)` : 'пока нет данных'}.
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                    Самый долгий вариант: {longestRecipe?.recipe ? `${longestRecipe.recipe.title} (${longestRecipe.recipe.cook_time_minutes} мин)` : 'пока нет данных'}.
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                  Сценарий
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Как использовать избранное с пользой</h3>
                <div className="space-y-3 text-sm text-gray-500 dark:text-gray-300">
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                    1. Сохраняйте сюда блюда, которые реально готовы повторять, а не просто “выглядят полезно”.
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                    2. Держите баланс между быстрыми рецептами и более насыщенными вариантами на выходные.
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                    3. Используйте эту страницу как личную “полку решений”, а не как архив случайных блюд.
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                  Переходы
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Что удобно открыть дальше</h3>
                <div className="space-y-3">
                  <Link
                    to="/recipes"
                    className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3 hover:border-primary-200 dark:hover:border-primary-500/20 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Найти новые рецепты</div>
                      <div className="text-xs text-gray-400">Расширить подборку под текущие цели.</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>

                  <Link
                    to="/meal-plan"
                    className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3 hover:border-primary-200 dark:hover:border-primary-500/20 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">План питания</div>
                      <div className="text-xs text-gray-400">Посмотреть дневную структуру вокруг рекомендаций.</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </StaggerChildren>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
