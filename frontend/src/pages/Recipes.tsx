import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { CardSkeleton } from '../components/Skeleton'
import { getRecipeFallbackVisual } from '../config/uiVisuals'
import { useToast } from '../context/ToastContext'
import { recipeWord } from '../utils/plural'
import { resolveRecipeImageSrc } from '../utils/recipeMedia'
import type { RecipeShort, FavoriteOut } from '../types'

export default function Recipes() {
  const [recipes, setRecipes] = useState<RecipeShort[]>([])
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [loadedImageIds, setLoadedImageIds] = useState<Set<number>>(new Set())
  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { addToast } = useToast()

  // Search & filter state
  const [searchText, setSearchText] = useState('')
  const [maxTime, setMaxTime] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasSearchActiveRef = useRef(false)
  const LIMIT = 20
  const REQUEST_LIMIT = LIMIT + 1

  const isSearchActive = searchText.trim() !== '' || maxTime !== '' || sortBy !== ''
  const duplicateImageRecipeIds = useMemo(() => {
    const seen = new Set<string>()
    const duplicates = new Set<number>()

    recipes.forEach((recipe) => {
      const imageSrc = resolveRecipeImageSrc(recipe.image_url)
      if (!imageSrc) return
      const key = imageSrc.trim()
      if (seen.has(key)) {
        duplicates.add(recipe.id)
        return
      }
      seen.add(key)
    })

    return duplicates
  }, [recipes])

  const toVisiblePage = (data: RecipeShort[]) => ({
    page: data.slice(0, LIMIT),
    hasNextPage: data.length > LIMIT,
  })

  const fetchRecommended = useCallback((currentOffset: number, append: boolean) => {
    setSearchLoading(true)
    const params = new URLSearchParams()
    params.set('limit', String(REQUEST_LIMIT))
    params.set('offset', String(currentOffset))

    api.get(`/recipes/recommended?${params.toString()}`).then((res) => {
      const data: RecipeShort[] = Array.isArray(res.data) ? res.data : []
      const { page, hasNextPage } = toVisiblePage(data)
      setRecipes((prev) => append ? [...prev, ...page] : page)
      setHasMore(hasNextPage)
      setSearchLoading(false)
      setLoading(false)
    }).catch(() => {
      if (!append) setRecipes([])
      setHasMore(false)
      setSearchLoading(false)
      setLoading(false)
    })
  }, [])

  // Load recommended recipes initially
  useEffect(() => {
    Promise.all([
      api.get(`/recipes/recommended?limit=${REQUEST_LIMIT}&offset=0`),
      api.get('/favorites/'),
    ]).then(([recRes, favRes]) => {
      const data: RecipeShort[] = Array.isArray(recRes.data) ? recRes.data : []
      const { page, hasNextPage } = toVisiblePage(data)
      setRecipes(page)
      setHasMore(hasNextPage)
      setFavorites(new Set((favRes.data as FavoriteOut[]).map((f) => f.recipe_id)))
      setLoading(false)
    }).catch(() => {
      setError(true)
      setLoading(false)
    })
  }, [])

  const fetchSearch = useCallback((query: string, time: string, sort: string, currentOffset: number, append: boolean) => {
    setSearchLoading(true)
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (time) params.set('max_time', time)
    if (sort) params.set('sort', sort)
    params.set('limit', String(REQUEST_LIMIT))
    params.set('offset', String(currentOffset))

    api.get(`/recipes/search?${params.toString()}`).then((res) => {
      const data: RecipeShort[] = Array.isArray(res.data) ? res.data : (res.data.items || res.data.results || [])
      const { page, hasNextPage } = toVisiblePage(data)
      if (append) {
        setRecipes((prev) => [...prev, ...page])
      } else {
        setRecipes(page)
      }
      setHasMore(hasNextPage)
      setSearchLoading(false)
    }).catch(() => {
      if (!append) setRecipes([])
      setHasMore(false)
      setSearchLoading(false)
    })
  }, [])

  // Debounced search when filters change
  useEffect(() => {
    if (!isSearchActive) return
    wasSearchActiveRef.current = true
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setOffset(0)
      fetchSearch(searchText.trim(), maxTime, sortBy, 0, false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchText, maxTime, sortBy, isSearchActive, fetchSearch])

  // Reset to recommended when clearing all filters
  useEffect(() => {
    if (!isSearchActive && !loading && wasSearchActiveRef.current) {
      wasSearchActiveRef.current = false
      setOffset(0)
      fetchRecommended(0, false)
    }
  }, [isSearchActive, loading, fetchRecommended])

  const handleLoadMore = () => {
    const newOffset = offset + LIMIT
    setOffset(newOffset)
    if (isSearchActive) {
      fetchSearch(searchText.trim(), maxTime, sortBy, newOffset, true)
    } else {
      fetchRecommended(newOffset, true)
    }
  }

  const handleImageLoad = (recipeId: number) => {
    setLoadedImageIds((prev) => {
      if (prev.has(recipeId)) return prev
      return new Set(prev).add(recipeId)
    })
  }

  const handleImageError = (recipeId: number) => {
    setFailedImageIds((prev) => {
      if (prev.has(recipeId)) return prev
      return new Set(prev).add(recipeId)
    })
  }

  const toggleFavorite = async (recipeId: number) => {
    try {
      if (favorites.has(recipeId)) {
        await api.delete(`/favorites/${recipeId}`)
        setFavorites((prev) => { const s = new Set(prev); s.delete(recipeId); return s })
      } else {
        await api.post(`/favorites/${recipeId}`)
        setFavorites((prev) => new Set(prev).add(recipeId))
      }
    } catch {
      addToast('Ошибка', 'error')
    }
  }

  if (error) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-700 dark:text-gray-300 mb-4">Ошибка загрузки рецептов</p>
          <Link to="/" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">На главную</Link>
        </div>
      </PageTransition>
    )
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <span className="section-eyebrow inline-block px-4 py-1.5 rounded-full bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 text-xs font-semibold uppercase tracking-wider mb-4">
            {isSearchActive ? 'Поиск' : 'Рекомендации'}
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isSearchActive ? 'Поиск рецептов' : 'Рекомендованные рецепты'}
          </h1>
          <p className="text-gray-500 dark:text-gray-300 mt-2">
            {isSearchActive ? 'Результаты по вашему запросу' : 'Подобраны на основе ваших дефицитов витаминов'}
          </p>
        </div>

        {/* Search & Filter Card */}
        <div className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Search input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Название рецепта</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Введите название..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
                />
              </div>
            </div>
            {/* Max cook time */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Время приготовления</label>
              <select
                value={maxTime}
                onChange={(e) => setMaxTime(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white"
              >
                <option value="">Любое время</option>
                <option value="15">До 15 мин</option>
                <option value="30">До 30 мин</option>
                <option value="60">До 60 мин</option>
              </select>
            </div>
            {/* Sort */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Сортировка</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white"
              >
                <option value="">По релевантности</option>
                <option value="title">По названию</option>
                <option value="time">Быстрые сначала</option>
              </select>
            </div>
          </div>
          {isSearchActive && (
            <button
              onClick={() => { setSearchText(''); setMaxTime(''); setSortBy('') }}
              className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Сбросить фильтры
            </button>
          )}
        </div>

        {!isSearchActive && recipes.some((recipe) => typeof recipe.relevance_score === 'number') && (
          <div className="surface-banner mb-6 rounded-2xl border border-accent-300/70 bg-accent-50/95 px-4 py-3 text-sm text-accent-950 dark:border-accent-900/50 dark:bg-accent-950/40 dark:text-accent-100">
            Процент под рецептом показывает, насколько хорошо он закрывает ваши текущие дефициты относительно лучшей рекомендации в списке. 100% означает самый релевантный вариант среди показанных рецептов.
          </div>
        )}

        {recipes.length > 0 && (
          <div className="surface-banner mb-6 flex flex-col gap-2 rounded-2xl border border-primary-200/80 bg-primary-50/90 px-4 py-3 text-sm text-primary-950 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-100 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Показано {recipes.length} {recipeWord(recipes.length)}
              {hasMore ? '. Ниже можно открыть следующую порцию.' : '. Это все найденные рецепты.'}
            </span>
            {hasMore && (
              <span className="font-semibold text-primary-700 dark:text-primary-200">Загрузка идёт порциями по {LIMIT}</span>
            )}
          </div>
        )}

        {searchLoading && recipes.length === 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              {isSearchActive ? 'Ничего не найдено' : 'Нет рекомендаций'}
            </h2>
            <p className="text-gray-500 dark:text-gray-300 mb-8">
              {isSearchActive
                ? 'Попробуйте изменить параметры поиска'
                : 'Сначала введите данные анализов, чтобы мы подобрали рецепты'}
            </p>
            {!isSearchActive && (
              <Link to="/data-entry" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
                Ввести данные
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe, index) => (
                <div
                  key={recipe.id}
                  className="group bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden card-hover"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {(() => {
                    const recipeImageSrc = resolveRecipeImageSrc(recipe.image_url)
                    const fallback = getRecipeFallbackVisual(recipe.id)

                    return (
                      <div className="relative h-48 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-900/30 overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${fallback.gradient} flex flex-col items-center justify-center text-white`}>
                          <svg className="w-12 h-12 opacity-80 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12" />
                          </svg>
                          <div className="text-sm font-semibold">{fallback.text}</div>
                          <div className="text-[11px] opacity-80 mt-1">Иллюстрация рецепта</div>
                        </div>
                        {recipeImageSrc && !duplicateImageRecipeIds.has(recipe.id) && !failedImageIds.has(recipe.id) && (
                          <img
                            src={recipeImageSrc}
                            alt={recipe.title}
                            loading="lazy"
                            className={`absolute inset-0 z-[1] w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
                              loadedImageIds.has(recipe.id) ? 'opacity-100' : 'opacity-0'
                            }`}
                            onLoad={() => handleImageLoad(recipe.id)}
                            onError={() => handleImageError(recipe.id)}
                          />
                        )}
                    {/* Hover overlay with quick actions */}
                    <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-4 gap-3">
                      <Link
                        to={`/recipes/${recipe.id}`}
                        className="px-4 py-2 bg-white/90 backdrop-blur-sm text-gray-900 text-sm font-medium rounded-xl hover:bg-white transition-colors"
                      >
                        Подробнее
                      </Link>
                      <button
                        onClick={(e) => { e.preventDefault(); toggleFavorite(recipe.id) }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm transition-colors ${
                          favorites.has(recipe.id)
                            ? 'bg-red-500 text-white'
                            : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
                        }`}
                      >
                        <svg className="w-5 h-5" fill={favorites.has(recipe.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                      </button>
                    </div>
                    {/* Favorite button (visible without hover) */}
                    <button
                      onClick={(e) => { e.preventDefault(); toggleFavorite(recipe.id) }}
                      className={`absolute z-[2] top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:opacity-0 ${
                        favorites.has(recipe.id)
                          ? 'bg-red-500 text-white shadow-lg'
                          : 'bg-white/80 dark:bg-white/[0.05] backdrop-blur-sm text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <svg className="w-5 h-5" fill={favorites.has(recipe.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                    </button>
                    {/* Cook time badge */}
                    <div className="absolute z-[2] bottom-3 left-3 bg-white/90 dark:bg-white/[0.05] backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 group-hover:opacity-0 transition-opacity duration-300">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {recipe.cook_time_minutes} мин
                    </div>
                  </div>
                    )
                  })()}
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{recipe.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mb-4 line-clamp-2">{recipe.description}</p>
                    <div className="flex items-center justify-between">
                      {recipe.relevance_score !== null && recipe.relevance_score !== undefined ? (
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-300">
                              Покрытие дефицитов
                            </span>
                            <span className="text-xs font-medium text-accent-600 dark:text-accent-400">{Math.round(recipe.relevance_score)}%</span>
                          </div>
                          <div className="h-1.5 w-28 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-accent-400 to-accent-500 rounded-full" style={{ width: `${Math.min(recipe.relevance_score, 100)}%` }} />
                          </div>
                        </div>
                      ) : <div />}
                      <Link
                        to={`/recipes/${recipe.id}`}
                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                      >
                        Подробнее
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={searchLoading}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.1] rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-all disabled:opacity-50"
                >
                  {searchLoading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-primary-500 animate-spin"></div>
                      Загрузка...
                    </>
                  ) : (
                    <>
                      Показать ещё рецепты
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
      </div>
    </PageTransition>
  )
}
