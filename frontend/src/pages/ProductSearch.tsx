import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { ListSkeleton } from '../components/Skeleton'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useToast } from '../context/ToastContext'
import { getVitaminIcon } from '../utils/vitaminIcons'
import type { Vitamin, ProductSearchResult, ProductVitaminContent } from '../types'

const categoryEmoji: Record<string, string> = {
  'Фрукты и ягоды': '🍎',
  'Овощи': '🥦',
  'Мясо и птица': '🥩',
  'Рыба и морепродукты': '🐟',
  'Молочные продукты': '🥛',
  'Крупы и злаки': '🌾',
  'Орехи и семена': '🥜',
  'Яйца': '🥚',
  'Бобовые': '🫘',
  'Зелень': '🌿',
}

interface SummaryCard {
  label: string
  value: string
  description: string
  accent: string
  surface: string
  border: string
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value)
}

function sortVitaminContent(content: ProductVitaminContent[], activeVitaminId: number | null): ProductVitaminContent[] {
  return [...content].sort((a, b) => {
    if (activeVitaminId !== null) {
      if (a.vitamin_id === activeVitaminId && b.vitamin_id !== activeVitaminId) return -1
      if (b.vitamin_id === activeVitaminId && a.vitamin_id !== activeVitaminId) return 1
    }
    return b.amount_per_100g - a.amount_per_100g
  })
}

function trimText(value: string, maxLength = 150): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trimEnd()}...`
}

export default function ProductSearch() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<ProductSearchResult[]>([])
  const [vitamins, setVitamins] = useState<Vitamin[]>([])
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [vitaminFilter, setVitaminFilter] = useState(searchParams.get('vitamin_id') ?? '')
  const [loading, setLoading] = useState(true)
  const [resultsLoading, setResultsLoading] = useState(true)
  const [resultsError, setResultsError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { addToast } = useToast()

  const searchParamValue = searchParams.get('search') ?? ''
  const vitaminParamValue = searchParams.get('vitamin_id') ?? ''

  useEffect(() => {
    setSearch((prev) => (prev === searchParamValue ? prev : searchParamValue))
    setVitaminFilter((prev) => (prev === vitaminParamValue ? prev : vitaminParamValue))
  }, [searchParamValue, vitaminParamValue])

  useEffect(() => {
    let mounted = true

    api.get<Vitamin[]>('/vitamins/').then((res) => {
      if (!mounted) return
      setVitamins(res.data)
      setLoading(false)
    }).catch(() => {
      if (!mounted) return
      setLoading(false)
      addToast('Ошибка загрузки витаминов', 'error')
    })

    return () => {
      mounted = false
    }
  }, [addToast])

  useEffect(() => {
    let mounted = true

    if (debounceRef.current) clearTimeout(debounceRef.current)
    setResultsLoading(true)
    setResultsError(false)

    debounceRef.current = setTimeout(() => {
      api.get<ProductSearchResult[]>('/vitamins/products', {
        params: {
          search: search.trim() || undefined,
          vitamin_id: vitaminFilter || undefined,
        },
      }).then((res) => {
        if (!mounted) return
        setProducts(res.data)
      }).catch(() => {
        if (!mounted) return
        setProducts([])
        setResultsError(true)
      }).finally(() => {
        if (!mounted) return
        setResultsLoading(false)
      })
    }, 260)

    return () => {
      mounted = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, vitaminFilter])

  const activeVitaminId = vitaminFilter ? Number(vitaminFilter) : null
  const selectedVitamin = useMemo(
    () => vitamins.find((vitamin) => vitamin.id === activeVitaminId) ?? null,
    [activeVitaminId, vitamins],
  )
  const selectedVitaminIcon = selectedVitamin ? getVitaminIcon(selectedVitamin.code) : null

  const categorySummary = useMemo(() => {
    const counts = new Map<string, number>()
    products.forEach((product) => {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
  }, [products])

  const productCount = products.length
  const categoryCount = new Set(products.map((product) => product.category)).size
  const vitaminRichCount = products.filter((product) => product.vitamin_content.length > 0).length
  const hasSearch = search.trim().length > 0
  const hasActiveFilter = vitaminFilter.length > 0
  const showingInitialSlice = !hasSearch && !hasActiveFilter && productCount === 50

  const heroTitle = selectedVitamin
    ? `Подберите продукты с фокусом на ${selectedVitamin.name}`
    : hasSearch
      ? 'Поиск уже сузил базу под ваш запрос'
      : 'Соберите продуктовую подборку под нужные витамины'

  const heroText = selectedVitamin
    ? 'Фильтр уже привязан к конкретному витамину, поэтому страница помогает быстро собрать релевантные продукты без ручного перебора.'
    : hasSearch
      ? 'Используйте строку поиска и витаминный фильтр вместе, чтобы быстрее находить полезные продукты и не теряться в длинном списке.'
      : 'Начните с названия продукта или с нужного витамина, а дальше переходите в справочник, если хотите уточнить контекст и нормы.'

  const summaryCards: SummaryCard[] = [
    {
      label: 'Результаты',
      value: `${productCount}`,
      description: resultsLoading ? 'Список обновляется под текущие фильтры.' : 'Столько продуктов сейчас показано на странице.',
      accent: 'text-primary-600 dark:text-primary-300',
      surface: 'from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-primary-100 dark:border-primary-500/20',
    },
    {
      label: 'Категории',
      value: `${categoryCount}`,
      description: 'Столько продуктовых категорий присутствует в текущей выдаче.',
      accent: 'text-cyan-600 dark:text-cyan-300',
      surface: 'from-cyan-50 via-white to-white dark:from-cyan-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-cyan-100 dark:border-cyan-500/20',
    },
    {
      label: 'С составом',
      value: `${vitaminRichCount}`,
      description: 'У этих продуктов есть заполненный витаминный профиль на карточке.',
      accent: 'text-emerald-600 dark:text-emerald-300',
      surface: 'from-emerald-50 via-white to-white dark:from-emerald-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-emerald-100 dark:border-emerald-500/20',
    },
    {
      label: 'Фильтр',
      value: selectedVitamin ? selectedVitamin.name : 'Без фильтра',
      description: selectedVitamin ? 'Выдача уже сфокусирована на конкретном витамине.' : 'Сейчас поиск открыт по всей базе продуктов.',
      accent: 'text-rose-600 dark:text-rose-300',
      surface: 'from-rose-50 via-white to-white dark:from-rose-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-rose-100 dark:border-rose-500/20',
    },
  ]

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <ListSkeleton rows={6} />
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
            <div className="absolute top-1/3 right-0 h-56 w-56 rounded-full bg-cyan-500/[0.08] dark:bg-cyan-500/[0.12] blur-3xl" />
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
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Поиск продуктов</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                {heroTitle}
              </h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-gray-300 leading-relaxed max-w-xl mb-6">
                {heroText}
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <Link
                  to="/vitamins"
                  className="btn-primary text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
                >
                  Открыть справочник
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  to="/"
                  className="px-6 py-3 rounded-2xl bg-gray-100/90 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08] hover:bg-white dark:hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2"
                >
                  На главную
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776L12 3l8.25 6.776v10.099A1.125 1.125 0 0119.125 21H4.875a1.125 1.125 0 01-1.125-1.125V9.776z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
                  </svg>
                </Link>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {hasSearch ? `Поиск: ${search}` : 'Поиск по всей базе'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {selectedVitamin ? `Фокус: ${selectedVitamin.name}` : 'Фильтр по витамину не выбран'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {resultsLoading ? 'Обновляем выдачу...' : `Найдено ${productCount} продуктов`}
                </span>
              </div>
            </div>

            <StaggerChildren variant="fade-up" stagger={70} className="grid grid-cols-2 gap-3 self-start">
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Настройте поиск под текущий сценарий</h2>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  Можно искать по названию, а можно сразу сузить список под конкретный витамин из анализа или справочника.
                </p>
              </div>
              {(hasSearch || hasActiveFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setVitaminFilter('')
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/[0.08] text-sm font-semibold"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-5">
              <label>
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Название продукта</span>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    placeholder="Например, лосось, шпинат, гречка"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              </label>

              <label>
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Фокус по витамину</span>
                <select
                  value={vitaminFilter}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setVitaminFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white"
                >
                  <option value="">Все витамины</option>
                  {vitamins.map((vitamin) => (
                    <option key={vitamin.id} value={vitamin.id}>{vitamin.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-[1.6rem] border border-gray-200 dark:border-white/[0.08] bg-gradient-to-r from-primary-50 via-white to-cyan-50 dark:from-primary-500/10 dark:via-white/[0.03] dark:to-cyan-500/8 p-5 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {resultsLoading ? 'Подбираем продукты под фильтры' : 'Статус текущей выдачи'}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                    {resultsLoading
                      ? 'Список обновится автоматически через долю секунды после изменения поиска.'
                      : selectedVitamin
                        ? `Сейчас выдача ориентирована на ${selectedVitamin.name} и показывает ${productCount} подходящих продуктов.`
                        : `Сейчас показано ${productCount} продуктов без жесткой привязки к одному витамину.`}
                  </p>
                </div>
                {showingInitialSlice && (
                  <span className="px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Показаны первые 50 результатов
                  </span>
                )}
              </div>
            </div>

            {resultsLoading ? (
              <ListSkeleton rows={5} />
            ) : resultsError ? (
              <div className="rounded-[1.7rem] border border-rose-100 dark:border-rose-500/20 bg-rose-50/80 dark:bg-rose-500/10 px-6 py-10 text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Не удалось загрузить продукты</h3>
                <p className="text-sm text-gray-500 dark:text-gray-300 mb-5">
                  Попробуйте изменить фильтры или обновить страницу чуть позже.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="btn-primary text-white px-6 py-3 rounded-2xl font-semibold"
                >
                  Обновить страницу
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-[1.7rem] border border-dashed border-gray-300 dark:border-white/[0.12] px-6 py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ничего не найдено</h3>
                <p className="text-sm text-gray-500 dark:text-gray-300 max-w-md mx-auto">
                  Попробуйте изменить запрос, снять фильтр по витамину или начать поиск с более общего названия продукта.
                </p>
              </div>
            ) : (
              <StaggerChildren variant="fade-up" stagger={50} className="grid md:grid-cols-2 gap-4">
                {products.map((product) => {
                  const orderedContent = sortVitaminContent(product.vitamin_content, activeVitaminId)
                  const leadVitamin = orderedContent[0] ?? null

                  return (
                    <div
                      key={product.id}
                      className="relative overflow-hidden rounded-[1.7rem] border border-gray-200 dark:border-white/[0.08] bg-gradient-to-br from-white to-gray-50 dark:from-white/[0.03] dark:to-white/[0.02] p-5 shadow-sm"
                    >
                      <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-white/50 dark:bg-white/[0.03] blur-2xl" />
                      <div className="relative">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/15 dark:to-orange-500/15 flex items-center justify-center flex-shrink-0 text-xl shadow-sm border border-amber-100 dark:border-amber-500/15">
                              {categoryEmoji[product.category] || '🍽️'}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-white leading-snug">{product.name}</h3>
                              <div className="text-sm text-gray-400 truncate">{product.category}</div>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-300 border-gray-200 dark:border-white/[0.08] whitespace-nowrap">
                            {product.vitamin_content.length} показ.
                          </span>
                        </div>

                        {leadVitamin ? (
                          <div className="rounded-2xl bg-gray-50/90 dark:bg-white/[0.04] border border-gray-200/80 dark:border-white/[0.06] px-4 py-3 mb-4">
                            <div className="text-xs uppercase tracking-[0.16em] text-gray-400 font-semibold mb-1">
                              Ведущий акцент
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {leadVitamin.vitamin_name}: {formatAmount(leadVitamin.amount_per_100g)} {leadVitamin.unit}/100г
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl bg-gray-50/90 dark:bg-white/[0.04] border border-gray-200/80 dark:border-white/[0.06] px-4 py-3 mb-4 text-sm text-gray-500 dark:text-gray-300">
                            Для этого продукта пока не заполнен детальный витаминный состав.
                          </div>
                        )}

                        {orderedContent.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {orderedContent.map((item) => {
                              const isActiveVitamin = activeVitaminId !== null && item.vitamin_id === activeVitaminId
                              const itemIcon = vitamins.find((vitamin) => vitamin.id === item.vitamin_id)
                              const icon = itemIcon ? getVitaminIcon(itemIcon.code) : null

                              return (
                                <span
                                  key={`${product.id}-${item.vitamin_id}`}
                                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border ${
                                    isActiveVitamin
                                      ? 'bg-primary-50 dark:bg-primary-500/12 text-primary-700 dark:text-primary-200 border-primary-100 dark:border-primary-500/20'
                                      : 'bg-white dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/[0.08]'
                                  }`}
                                >
                                  {icon ? <span>{icon.emoji}</span> : null}
                                  <span>{item.vitamin_name}</span>
                                  <span className="text-gray-400 dark:text-gray-400">
                                    {formatAmount(item.amount_per_100g)} {item.unit}
                                  </span>
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </StaggerChildren>
            )}
          </AnimateIn>

          <StaggerChildren variant="fade-up" stagger={60} className="space-y-4">
            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Активный фокус
              </span>
              {selectedVitamin && selectedVitaminIcon ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${selectedVitaminIcon.gradient} text-white flex items-center justify-center text-xl shadow-lg flex-shrink-0`}>
                      {selectedVitaminIcon.emoji}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedVitamin.name}</h3>
                      <p className="text-sm text-gray-400">{selectedVitamin.code}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed mb-4">
                    {trimText(selectedVitamin.description)}
                  </p>
                  <Link
                    to="/vitamins"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08]"
                  >
                    Открыть справочник
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Как быстрее находить полезные продукты</h3>
                  <div className="space-y-3 text-sm text-gray-500 dark:text-gray-300">
                    <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                      Начните с общего поиска по продукту, если уже знаете, что хотите добавить в рацион.
                    </div>
                    <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                      Добавьте фильтр по витамину, если пришли сюда после анализа и хотите быстро собрать продукты под конкретный дефицит.
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Категории
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Что сейчас видно в выдаче</h3>
              {categorySummary.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {categorySummary.map(([category, count]) => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300"
                    >
                      <span>{categoryEmoji[category] || '🍽️'}</span>
                      <span>{category}</span>
                      <span className="text-gray-400">{count}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  После загрузки результатов здесь появятся основные категории продуктов из текущей подборки.
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Сценарии
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Как связать поиск с остальными разделами</h3>
              <div className="space-y-3 text-sm text-gray-500 dark:text-gray-300">
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  1. Сначала смотрите дефицит на странице анализа, а потом переходите сюда по кнопке на нужном витамине.
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  2. Если нужен контекст по функциям и симптомам, откройте справочник и вернитесь сюда уже с понятным фокусом.
                </div>
                {showingInitialSlice && (
                  <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-4 py-3 text-amber-700 dark:text-amber-200">
                    Без фильтров страница показывает первые 50 результатов. Поиск или фильтр по витамину помогут сделать список точнее.
                  </div>
                )}
              </div>
            </div>
          </StaggerChildren>
        </div>
      </div>
    </PageTransition>
  )
}
