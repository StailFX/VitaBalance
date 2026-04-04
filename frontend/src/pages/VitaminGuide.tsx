import { useState, useEffect, useMemo, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { cachedGet } from '../api/cache'
import PageTransition from '../components/PageTransition'
import { ListSkeleton } from '../components/Skeleton'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { getVitaminIcon } from '../utils/vitaminIcons'
import { useToast } from '../context/ToastContext'
import type { Vitamin } from '../types'

const enToRu: Record<string, string> = {
  q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з', '[': 'х', ']': 'ъ',
  a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л', l: 'д', ';': 'ж', "'": 'э',
  z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь', ',': 'б', '.': 'ю',
}

const ruToEn: Record<string, string> = Object.fromEntries(Object.entries(enToRu).map(([key, value]) => [value, key]))

interface SummaryCard {
  label: string
  value: string
  description: string
  accent: string
  surface: string
  border: string
}

function convertLayout(value: string): [string, string, string] {
  const lower = value.toLowerCase()
  let toRu = ''
  let toEn = ''

  for (const char of lower) {
    toRu += enToRu[char] || char
    toEn += ruToEn[char] || char
  }

  return [lower, toRu, toEn]
}

function trimText(value: string, maxLength = 140): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trimEnd()}...`
}

function withFallback(value: string): string {
  return value.trim() || 'Информация пока не заполнена.'
}

export default function VitaminGuide() {
  const [vitamins, setVitamins] = useState<Vitamin[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<boolean>(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState<string>('')
  const { addToast } = useToast()

  useEffect(() => {
    let mounted = true

    cachedGet<Vitamin[]>(api, '/vitamins/', { ttl: 10 * 60 * 1000 }).then((res) => {
      if (!mounted) return
      setVitamins(res.data)
      setLoading(false)
    }).catch(() => {
      if (!mounted) return
      setLoading(false)
      setError(true)
      addToast('Ошибка загрузки данных', 'error')
    })

    return () => {
      mounted = false
    }
  }, [addToast])

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredVitamins = useMemo(() => {
    if (!search.trim()) return vitamins

    const variants = convertLayout(search.trim())
    return vitamins.filter((vitamin) => {
      const fields = [
        vitamin.name,
        vitamin.code,
        vitamin.description,
        vitamin.deficiency_symptoms,
        vitamin.excess_symptoms,
      ]
        .filter(Boolean)
        .map((item) => item.toLowerCase())
        .join(' ')

      return variants.some((query) => fields.includes(query) || fields.indexOf(query) !== -1)
    })
  }, [search, vitamins])

  const visibleIds = useMemo(() => filteredVitamins.map((vitamin) => vitamin.id), [filteredVitamins])
  const expandedVisibleCount = visibleIds.filter((id) => expanded.has(id)).length
  const hasSearch = search.trim().length > 0

  const heroTitle = hasSearch
    ? (filteredVitamins.length === 1
      ? `Справочник уже вывел ${filteredVitamins[0].name}`
      : 'Справочник сузился под ваш запрос')
    : 'Держите под рукой справочник витаминов и минералов'

  const heroText = hasSearch
    ? 'Поиск работает по названию, описанию и симптомам, а еще пытается понять ошибочную раскладку, чтобы вы не теряли время на повторный ввод.'
    : 'Здесь удобно быстро сверять функции витаминов, диапазоны нормы и симптомы дефицита или избытка, а потом переходить к продуктам.'

  const summaryCards: SummaryCard[] = [
    {
      label: 'В базе',
      value: `${vitamins.length}`,
      description: 'Столько карточек витаминов и минералов доступно в справочнике.',
      accent: 'text-primary-600 dark:text-primary-300',
      surface: 'from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-primary-100 dark:border-primary-500/20',
    },
    {
      label: 'Найдено',
      value: `${filteredVitamins.length}`,
      description: hasSearch ? 'Столько карточек совпало с текущим поиском.' : 'Сейчас открыт весь справочник без ограничений.',
      accent: 'text-cyan-600 dark:text-cyan-300',
      surface: 'from-cyan-50 via-white to-white dark:from-cyan-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-cyan-100 dark:border-cyan-500/20',
    },
    {
      label: 'Открыто',
      value: `${expandedVisibleCount}`,
      description: 'Столько карточек сейчас развернуто внутри текущей выдачи.',
      accent: 'text-emerald-600 dark:text-emerald-300',
      surface: 'from-emerald-50 via-white to-white dark:from-emerald-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-emerald-100 dark:border-emerald-500/20',
    },
    {
      label: 'Поиск',
      value: hasSearch ? 'Активен' : 'Свободный',
      description: hasSearch ? 'Поиск работает и учитывает даже ошибочную раскладку.' : 'Можно искать по названию, функциям и симптомам.',
      accent: 'text-rose-600 dark:text-rose-300',
      surface: 'from-rose-50 via-white to-white dark:from-rose-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-rose-100 dark:border-rose-500/20',
    },
  ]

  const expandVisible = () => {
    setExpanded((prev) => {
      const next = new Set(prev)
      visibleIds.forEach((id) => next.add(id))
      return next
    })
  }

  const collapseVisible = () => {
    setExpanded((prev) => {
      const next = new Set(prev)
      visibleIds.forEach((id) => next.delete(id))
      return next
    })
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <ListSkeleton rows={8} />
        </div>
      </PageTransition>
    )
  }

  if (error && vitamins.length === 0) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.401 3.003c1.155-2 4.043-2 5.198 0l6.125 10.607c1.154 1.999-.289 4.498-2.599 4.498H5.875c-2.31 0-3.753-2.499-2.599-4.498L9.401 3.003z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Справочник сейчас недоступен</h1>
          <p className="text-gray-500 dark:text-gray-300 mb-8">Попробуйте обновить страницу чуть позже. Данные по витаминам временно не загрузились.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold"
          >
            Обновить страницу
          </button>
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
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Справочник витаминов</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                {heroTitle}
              </h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-gray-300 leading-relaxed max-w-xl mb-6">
                {heroText}
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <Link
                  to="/products"
                  className="btn-primary text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
                >
                  Искать продукты
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
                  {hasSearch ? `Поиск: ${search}` : 'Поиск по всему справочнику'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {filteredVitamins.length} карточек в выдаче
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  Поиск понимает раскладку
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
                  Поиск и карточки
                </span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Найдите нужный витамин и раскройте детали</h2>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  Поиск работает по названиям, функциям и симптомам, а раскрытые карточки сразу показывают нормы и важные сигналы.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={expandVisible}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/[0.08] text-sm font-semibold"
                >
                  Раскрыть видимые
                </button>
                <button
                  type="button"
                  onClick={collapseVisible}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/[0.08] text-sm font-semibold"
                >
                  Свернуть видимые
                </button>
              </div>
            </div>

            <div className="relative mb-5">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Например, витамин D, иммунитет, судороги"
                className="w-full pl-12 pr-14 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
              />
              {hasSearch && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 dark:bg-white/[0.1] text-gray-500 hover:bg-gray-300 dark:hover:bg-white/[0.15] transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="rounded-[1.6rem] border border-gray-200 dark:border-white/[0.08] bg-gradient-to-r from-primary-50 via-white to-cyan-50 dark:from-primary-500/10 dark:via-white/[0.03] dark:to-cyan-500/8 p-5 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Состояние выдачи</div>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                    {hasSearch
                      ? `По запросу найдено ${filteredVitamins.length} карточек. Раскрыто ${expandedVisibleCount} из них.`
                      : `Сейчас открыт весь справочник: ${filteredVitamins.length} карточек, из них раскрыто ${expandedVisibleCount}.`}
                  </p>
                </div>
                {hasSearch && (
                  <span className="px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Раскладка учитывается автоматически
                  </span>
                )}
              </div>
            </div>

            {filteredVitamins.length === 0 ? (
              <div className="rounded-[1.7rem] border border-dashed border-gray-300 dark:border-white/[0.12] px-6 py-12 text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Совпадений не найдено</h3>
                <p className="text-sm text-gray-500 dark:text-gray-300 max-w-md mx-auto">
                  Попробуйте более общее слово, название витамина или симптом. Поиск также умеет исправлять раскладку, так что можно просто перепечатать запрос.
                </p>
              </div>
            ) : (
              <StaggerChildren variant="fade-up" stagger={45} className="space-y-4">
                {filteredVitamins.map((vitamin) => {
                  const icon = getVitaminIcon(vitamin.code)
                  const isOpen = expanded.has(vitamin.id)

                  return (
                    <div
                      key={vitamin.id}
                      className={`overflow-hidden rounded-[1.8rem] border transition-all duration-300 ${
                        isOpen
                          ? 'border-primary-200 dark:border-primary-500/25 bg-white dark:bg-white/[0.03] shadow-md shadow-primary-100/40 dark:shadow-none'
                          : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpanded(vitamin.id)}
                        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-gray-50/60 dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <div className={`w-[3.25rem] h-[3.25rem] rounded-[1.1rem] bg-gradient-to-br ${icon.gradient} text-white flex items-center justify-center flex-shrink-0 text-2xl shadow-lg`}>
                          {icon.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-300">
                              {vitamin.code}
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-[11px] font-semibold text-gray-500 dark:text-gray-300">
                              {vitamin.unit}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{vitamin.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">
                            {trimText(vitamin.description)}
                          </p>
                        </div>

                        <div className={`w-9 h-9 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                          <svg className="w-4 h-4 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
                          <div className="rounded-[1.5rem] bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] p-5 mb-4">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-[0.18em] mb-2">Функции</div>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              {withFallback(vitamin.description)}
                            </p>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3 mb-4">
                            <div className="rounded-[1.4rem] border border-blue-100 dark:border-blue-500/20 bg-gradient-to-br from-blue-50 via-white to-white dark:from-blue-500/10 dark:via-white/[0.03] dark:to-white/[0.02] p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                                </svg>
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase tracking-[0.16em]">Мужчины</span>
                              </div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {vitamin.norm_male_min}-{vitamin.norm_male_max}
                                <span className="text-sm font-normal text-gray-400 ml-1">{vitamin.unit}</span>
                              </div>
                            </div>

                            <div className="rounded-[1.4rem] border border-rose-100 dark:border-rose-500/20 bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-500/10 dark:via-white/[0.03] dark:to-white/[0.02] p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                                </svg>
                                <span className="text-xs font-semibold text-rose-600 dark:text-rose-300 uppercase tracking-[0.16em]">Женщины</span>
                              </div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {vitamin.norm_female_min}-{vitamin.norm_female_max}
                                <span className="text-sm font-normal text-gray-400 ml-1">{vitamin.unit}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3 mb-4">
                            <div className="rounded-[1.4rem] border border-red-100 dark:border-red-500/20 bg-gradient-to-br from-red-50 via-white to-white dark:from-red-500/10 dark:via-white/[0.03] dark:to-white/[0.02] p-5">
                              <h4 className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-300 mb-3">
                                <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-500/15 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007v.008H12v-.008z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a8.966 8.966 0 01-4.258-1.065M12 21a8.966 8.966 0 004.258-1.065M12 21V3m0 0a8.966 8.966 0 014.258 1.065M12 3a8.966 8.966 0 00-4.258 1.065" />
                                  </svg>
                                </div>
                                Симптомы дефицита
                              </h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {withFallback(vitamin.deficiency_symptoms)}
                              </p>
                            </div>

                            <div className="rounded-[1.4rem] border border-amber-100 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 via-white to-white dark:from-amber-500/10 dark:via-white/[0.03] dark:to-white/[0.02] p-5">
                              <h4 className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-300 mb-3">
                                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007v.008H12v-.008z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a8.966 8.966 0 01-4.258-1.065M12 21a8.966 8.966 0 004.258-1.065M12 21V3m0 0a8.966 8.966 0 014.258 1.065M12 3a8.966 8.966 0 00-4.258 1.065" />
                                  </svg>
                                </div>
                                Симптомы избытка
                              </h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {withFallback(vitamin.excess_symptoms)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <Link
                              to={`/products?vitamin_id=${vitamin.id}`}
                              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary-50 dark:bg-primary-500/12 text-primary-700 dark:text-primary-200 text-sm font-semibold border border-primary-100 dark:border-primary-500/20"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                              </svg>
                              Найти продукты
                            </Link>
                            <button
                              type="button"
                              onClick={() => toggleExpanded(vitamin.id)}
                              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 text-sm font-semibold border border-gray-200 dark:border-white/[0.08]"
                            >
                              Свернуть карточку
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </StaggerChildren>
            )}
          </AnimateIn>

          <StaggerChildren variant="fade-up" stagger={60} className="space-y-4">
            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Поиск
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Поиск понимает ошибочную раскладку</h3>
              <div className="space-y-3 text-sm text-gray-500 dark:text-gray-300">
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  Можно искать не только по названию, но и по словам из описания, симптомам дефицита и симптомам избытка.
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  Если вы случайно набрали запрос в другой раскладке, страница попробует сопоставить его автоматически.
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Как читать
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Что есть в каждой карточке</h3>
              <div className="space-y-3 text-sm text-gray-500 dark:text-gray-300">
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  1. Функции витамина помогают быстро понять, зачем он нужен и в чем его роль.
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  2. Нормы разделены по полу, чтобы было проще сопоставлять их с персональными данными.
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  3. Снизу можно сразу перейти к продуктам и продолжить сценарий без лишних шагов.
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Быстрый переход
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">С чего удобно начать</h3>
              <div className="space-y-3">
                {filteredVitamins.slice(0, 4).map((vitamin) => {
                  const icon = getVitaminIcon(vitamin.code)
                  return (
                    <Link
                      key={vitamin.id}
                      to={`/products?vitamin_id=${vitamin.id}`}
                      className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3 hover:border-primary-200 dark:hover:border-primary-500/20 transition-colors"
                    >
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${icon.gradient} text-white flex items-center justify-center text-xl shadow-lg flex-shrink-0`}>
                        {icon.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">{vitamin.name}</div>
                        <div className="text-xs text-gray-400">{trimText(vitamin.description, 72)}</div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  )
                })}
              </div>
            </div>
          </StaggerChildren>
        </div>
      </div>
    </PageTransition>
  )
}
