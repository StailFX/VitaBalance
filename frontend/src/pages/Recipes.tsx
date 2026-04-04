import { useState, useEffect, useRef, useMemo, useCallback, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { CardSkeleton } from '../components/Skeleton'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useToast } from '../context/ToastContext'
import type { FavoriteOut, RecipeShort } from '../types'

const LIMIT = 20

interface SummaryCard {
  label: string
  value: string
  description: string
  accent: string
  surface: string
  border: string
}

function getScoreLabel(score?: number | null): string | null {
  if (score == null) return null
  if (score >= 75) return 'Сильное попадание'
  if (score >= 45) return 'Хороший фокус'
  return 'Можно рассмотреть'
}

function trimText(value: string, maxLength = 120): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trimEnd()}...`
}

export default function Recipes() {
  const [recipes, setRecipes] = useState<RecipeShort[]>([])
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [maxTime, setMaxTime] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { addToast } = useToast()

  const isSearchActive = searchText.trim() !== '' || maxTime !== '' || sortBy !== ''

  const loadRecommended = useCallback(async () => {
    const [recipesRes, favoritesRes] = await Promise.allSettled([
      api.get<RecipeShort[]>('/recipes/recommended'),
      api.get<FavoriteOut[]>('/favorites/'),
    ])

    if (recipesRes.status === 'fulfilled') {
      setRecipes(recipesRes.value.data)
      setError(false)
    } else {
      setError(true)
    }

    if (favoritesRes.status === 'fulfilled') {
      setFavorites(new Set(favoritesRes.value.data.map((item) => item.recipe_id)))
    }
  }, [])

  const fetchSearch = useCallback(async (
    query: string,
    time: string,
    sort: string,
    currentOffset: number,
    append: boolean,
  ) => {
    setSearchLoading(true)

    try {
      const res = await api.get<RecipeShort[]>('/recipes/search', {
        params: {
          q: query || undefined,
          max_time: time || undefined,
          sort: sort || undefined,
          limit: LIMIT,
          offset: currentOffset,
        },
      })

      const data = Array.isArray(res.data) ? res.data : []
      setRecipes((prev) => (append ? [...prev, ...data] : data))
      setHasMore(data.length >= LIMIT)
      setError(false)
    } catch {
      if (!append) setRecipes([])
      setHasMore(false)
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    loadRecommended().finally(() => {
      if (!mounted) return
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [loadRecommended])

  useEffect(() => {
    if (loading || !isSearchActive) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setOffset(0)
      fetchSearch(searchText.trim(), maxTime, sortBy, 0, false)
    }, 260)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchSearch, isSearchActive, loading, maxTime, searchText, sortBy])

  useEffect(() => {
    if (loading || isSearchActive) return

    api.get<RecipeShort[]>('/recipes/recommended').then((res) => {
      setRecipes(res.data)
      setOffset(0)
      setHasMore(false)
    }).catch(() => {
      setRecipes([])
    })
  }, [isSearchActive, loading])

  const handleLoadMore = () => {
    const nextOffset = offset + LIMIT
    setOffset(nextOffset)
    fetchSearch(searchText.trim(), maxTime, sortBy, nextOffset, true)
  }

  const toggleFavorite = async (recipeId: number) => {
    try {
      if (favorites.has(recipeId)) {
        await api.delete(`/favorites/${recipeId}`)
        setFavorites((prev) => {
          const next = new Set(prev)
          next.delete(recipeId)
          return next
        })
        addToast('Удалено из избранного', 'info')
      } else {
        await api.post(`/favorites/${recipeId}`)
        setFavorites((prev) => new Set(prev).add(recipeId))
        addToast('Добавлено в избранное', 'success')
      }
    } catch {
      addToast('Не удалось обновить избранное', 'error')
    }
  }

  const averageCookTime = useMemo(() => {
    if (recipes.length === 0) return 0
    return Math.round(recipes.reduce((sum, recipe) => sum + recipe.cook_time_minutes, 0) / recipes.length)
  }, [recipes])

  const recipesWithScore = recipes.filter((recipe) => recipe.relevance_score != null).length
  const heroTitle = isSearchActive
    ? 'Подберите рецепты под текущий запрос и ритм дня'
    : 'Рецепты уже собраны вокруг ваших приоритетов'
  const heroText = isSearchActive
    ? 'Поиск помогает быстро сузить выдачу по названию, времени и логике сортировки, чтобы не теряться в длинной подборке.'
    : 'Здесь собраны блюда, которые можно использовать как практическое продолжение анализа: меньше теории, больше понятных действий через рацион.'
  const summaryCards: SummaryCard[] = [
    {
      label: 'В выдаче',
      value: `${recipes.length}`,
      description: isSearchActive ? 'Столько рецептов сейчас совпало с фильтрами.' : 'Столько рекомендаций показано на основе профиля.',
      accent: 'text-primary-600 dark:text-primary-300',
      surface: 'from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-primary-100 dark:border-primary-500/20',
    },
    {
      label: 'Избранное',
      value: `${favorites.size}`,
      description: 'Столько рецептов уже сохранено для быстрого возврата.',
      accent: 'text-rose-600 dark:text-rose-300',
      surface: 'from-rose-50 via-white to-white dark:from-rose-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-rose-100 dark:border-rose-500/20',
    },
    {
      label: 'Среднее время',
      value: averageCookTime ? `${averageCookTime} мин` : 'Нет данных',
      description: 'Так выглядит средняя длительность рецептов в текущей подборке.',
      accent: 'text-cyan-600 dark:text-cyan-300',
      surface: 'from-cyan-50 via-white to-white dark:from-cyan-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-cyan-100 dark:border-cyan-500/20',
    },
    {
      label: 'Персонализация',
      value: recipesWithScore > 0 ? `${recipesWithScore}` : 'Общая',
      description: recipesWithScore > 0 ? 'У этих карточек есть релевантность под текущие дефициты.' : 'Сейчас показана общая выдача без явного приоритета.',
      accent: 'text-emerald-600 dark:text-emerald-300',
      surface: 'from-emerald-50 via-white to-white dark:from-emerald-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-emerald-100 dark:border-emerald-500/20',
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Не удалось загрузить рецепты</h1>
          <p className="text-gray-500 dark:text-gray-300 mb-8">Попробуйте обновить страницу чуть позже или вернитесь после нового анализа.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold"
            >
              Обновить страницу
            </button>
            <Link
              to="/analysis"
              className="px-8 py-3 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08]"
            >
              К анализу
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
            {Array.from({ length: 6 }).map((_, index) => (
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
            <div className="absolute -top-10 left-0 h-44 w-44 rounded-full bg-primary-500/[0.08] dark:bg-primary-500/[0.14] blur-3xl" />
            <div className="absolute top-1/3 right-0 h-56 w-56 rounded-full bg-accent-500/[0.08] dark:bg-accent-500/[0.12] blur-3xl" />
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
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/70 dark:bg-white/[0.06] border border-primary-200/60 dark:border-primary-500/20 backdrop-blur-sm mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
                </span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {isSearchActive ? 'Поиск рецептов' : 'Рекомендованные рецепты'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                {heroTitle}
              </h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-gray-300 leading-relaxed max-w-xl mb-6">
                {heroText}
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <Link
                  to="/favorites"
                  className="btn-primary text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
                >
                  Открыть избранное
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
                  {isSearchActive ? 'Режим: поиск' : 'Режим: персональные рекомендации'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {recipes.length} карточек в выдаче
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {searchLoading ? 'Подборка обновляется...' : `Избранное: ${favorites.size}`}
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

        <div className="grid xl:grid-cols-[1.12fr_0.88fr] gap-6 items-start">
          <AnimateIn variant="blur" className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">
                  Фильтры и выдача
                </span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Соберите подборку под свой ритм</h2>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  Поиск по названию, фильтр по времени и сортировка помогают быстро перейти от “что бы приготовить?” к понятному решению.
                </p>
              </div>
              {isSearchActive && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchText('')
                    setMaxTime('')
                    setSortBy('')
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/[0.08] text-sm font-semibold"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-5">
              <label>
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Название рецепта</span>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                    placeholder="Например, салат, рыба, каша"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              </label>

              <label>
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Время приготовления</span>
                <select
                  value={maxTime}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setMaxTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white"
                >
                  <option value="">Любое время</option>
                  <option value="15">До 15 минут</option>
                  <option value="30">До 30 минут</option>
                  <option value="60">До 60 минут</option>
                </select>
              </label>

              <label>
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Сортировка</span>
                <select
                  value={sortBy}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white"
                >
                  <option value="">Сначала новые</option>
                  <option value="title">По названию</option>
                  <option value="time">Быстрые сначала</option>
                </select>
              </label>
            </div>

            <div className="rounded-[1.6rem] border border-gray-200 dark:border-white/[0.08] bg-gradient-to-r from-primary-50 via-white to-accent-50 dark:from-primary-500/10 dark:via-white/[0.03] dark:to-accent-500/8 p-5 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {isSearchActive ? 'Поиск активен' : 'Персональная подборка активна'}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                    {isSearchActive
                      ? `Сейчас показано ${recipes.length} результатов. Можно догружать выдачу порциями по ${LIMIT} карточек.`
                      : 'Когда фильтры пусты, страница возвращается к персональным рекомендациям на основе анализа.'}
                  </p>
                </div>
                {searchLoading && (
                  <span className="px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Обновляем список...
                  </span>
                )}
              </div>
            </div>

            {searchLoading && recipes.length === 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <CardSkeleton key={index} />
                ))}
              </div>
            ) : recipes.length === 0 ? (
              <div className="rounded-[1.7rem] border border-dashed border-gray-300 dark:border-white/[0.12] px-6 py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {isSearchActive ? 'Рецепты не найдены' : 'Пока нет персональных рекомендаций'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-300 max-w-md mx-auto mb-6">
                  {isSearchActive
                    ? 'Попробуйте упростить запрос, увеличить время приготовления или изменить сортировку.'
                    : 'Сначала добавьте данные анализа, чтобы система смогла подобрать блюда под ваши дефициты.'}
                </p>
                {!isSearchActive && (
                  <Link to="/data-entry" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
                    Ввести данные
                  </Link>
                )}
              </div>
            ) : (
              <>
                <StaggerChildren variant="fade-up" stagger={45} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recipes.map((recipe) => {
                    const scoreLabel = getScoreLabel(recipe.relevance_score)

                    return (
                      <div
                        key={recipe.id}
                        className="group relative overflow-hidden rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm"
                      >
                        <div className="relative h-52 overflow-hidden bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-900/30">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-12 h-12 text-primary-300/60 dark:text-primary-700/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12" />
                            </svg>
                          </div>

                          {recipe.image_url && (
                            <img
                              src={recipe.image_url}
                              alt={recipe.title}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(event) => { (event.target as HTMLImageElement).style.display = 'none' }}
                            />
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                          <button
                            type="button"
                            onClick={() => toggleFavorite(recipe.id)}
                            className={`absolute top-4 right-4 w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                              favorites.has(recipe.id)
                                ? 'bg-red-500 text-white shadow-lg'
                                : 'bg-white/85 dark:bg-white/[0.08] backdrop-blur-sm text-gray-500 hover:text-red-500 hover:bg-white'
                            }`}
                          >
                            <svg className="w-5 h-5" fill={favorites.has(recipe.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                            </svg>
                          </button>

                          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                            <span className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-white/[0.08] backdrop-blur-sm text-xs font-semibold text-gray-700 dark:text-gray-200 border border-white/80 dark:border-white/[0.08]">
                              {recipe.cook_time_minutes} мин
                            </span>
                            {scoreLabel && recipe.relevance_score != null && (
                              <span className="px-3 py-1.5 rounded-full bg-accent-500/90 text-white text-xs font-semibold shadow-sm">
                                {Math.round(recipe.relevance_score)}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-5">
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-[11px] font-semibold text-gray-500 dark:text-gray-300">
                              {isSearchActive ? 'Результат поиска' : 'Персональная рекомендация'}
                            </span>
                            {scoreLabel && (
                              <span className="px-2.5 py-1 rounded-full bg-accent-50 dark:bg-accent-500/10 border border-accent-100 dark:border-accent-500/20 text-[11px] font-semibold text-accent-700 dark:text-accent-200">
                                {scoreLabel}
                              </span>
                            )}
                          </div>

                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 leading-snug">
                            {recipe.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed mb-5">
                            {trimText(recipe.description)}
                          </p>

                          {recipe.relevance_score != null && (
                            <div className="mb-5">
                              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                                <span>Релевантность под текущий профиль</span>
                                <span>{Math.round(recipe.relevance_score)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-accent-400 to-accent-500 rounded-full"
                                  style={{ width: `${Math.min(recipe.relevance_score, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => toggleFavorite(recipe.id)}
                              className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
                                favorites.has(recipe.id)
                                  ? 'text-rose-600 dark:text-rose-300'
                                  : 'text-gray-500 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-300'
                              }`}
                            >
                              <svg className="w-4 h-4" fill={favorites.has(recipe.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                              </svg>
                              {favorites.has(recipe.id) ? 'Сохранено' : 'В избранное'}
                            </button>

                            <Link
                              to={`/recipes/${recipe.id}`}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            >
                              Подробнее
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </StaggerChildren>

                {isSearchActive && hasMore && (
                  <div className="text-center mt-8">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={searchLoading}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.1] rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-all disabled:opacity-50"
                    >
                      {searchLoading ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-primary-500 animate-spin" />
                          Загрузка...
                        </>
                      ) : (
                        <>
                          Показать ещё
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </AnimateIn>

          <StaggerChildren variant="fade-up" stagger={60} className="space-y-4">
            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Активный режим
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {isSearchActive ? 'Поиск управляет подборкой' : 'Сейчас вы в режиме персональных рекомендаций'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">
                {isSearchActive
                  ? 'Любой фильтр переключает страницу в поисковый режим. Когда вы очистите параметры, список снова вернется к персональной подборке на основе анализа.'
                  : 'Эта выдача полезна как следующий шаг после анализа: можно быстро перейти от дефицита к конкретному блюду, а потом сохранить удачные варианты в избранное.'}
              </p>
            </div>

            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Короткий маршрут
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Как использовать раздел без лишних шагов</h3>
              <div className="space-y-3 text-sm text-gray-500 dark:text-gray-300">
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  1. Начните с персональных рекомендаций, если только что пришли со страницы анализа.
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  2. Добавьте фильтры, если нужен рецепт под конкретное время или знакомое название.
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  3. Сохраняйте удачные рецепты в избранное и собирайте из них план питания.
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
                  to="/analysis"
                  className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3 hover:border-primary-200 dark:hover:border-primary-500/20 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Вернуться к анализу</div>
                    <div className="text-xs text-gray-400">Сверить, какие дефициты сейчас важнее всего.</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>

                <Link
                  to="/favorites"
                  className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3 hover:border-primary-200 dark:hover:border-primary-500/20 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Открыть избранное</div>
                    <div className="text-xs text-gray-400">Собрать личную подборку без повторного поиска.</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </StaggerChildren>
        </div>
      </div>
    </PageTransition>
  )
}
