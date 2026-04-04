import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { TableSkeleton } from '../components/Skeleton'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import { getChartColors } from '../utils/chartColors'
import { getVitaminIcon } from '../utils/vitaminIcons'
import type { AnalysisSnapshot, HistoryVitaminEntry } from '../types'

const VITAMIN_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
]

const TREND_STABLE_THRESHOLD = 3

interface TrendResult {
  arrow: string
  color: string
  label: 'stable' | 'improving' | 'worsening'
  change: string
}

interface ChartDataPoint {
  date: string
  [vitamin: string]: string | number | null
}

function getStatusChip(status: string): string {
  if (status === 'deficiency') return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800/60'
  if (status === 'excess') return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
  if (status === 'normal') return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
  return 'bg-gray-50 dark:bg-white/[0.05] text-gray-500 dark:text-gray-300 border-gray-200 dark:border-white/[0.08]'
}

export default function AnalysisHistory() {
  const [history, setHistory] = useState<AnalysisSnapshot[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<boolean>(false)
  const [selectedVitamins, setSelectedVitamins] = useState<Set<string>>(new Set())
  const [hoveredLine, setHoveredLine] = useState<string | null>(null)
  const { addToast } = useToast()
  const { dark } = useTheme()

  useEffect(() => {
    api.get('/vitamins/history').then((res) => {
      const data: AnalysisSnapshot[] = res.data
      setHistory(data)
      if (data.length > 0 && data[0].entries) {
        const defVitamins = data[0].entries
          .filter((entry: HistoryVitaminEntry) => entry.status === 'deficiency')
          .map((entry: HistoryVitaminEntry) => entry.vitamin_name)
          .slice(0, 4)
        if (defVitamins.length > 0) {
          setSelectedVitamins(new Set(defVitamins))
        } else {
          setSelectedVitamins(new Set(data[0].entries.slice(0, 4).map((entry: HistoryVitaminEntry) => entry.vitamin_name)))
        }
      }
      setLoading(false)
    }).catch(() => {
      setError(true)
      setLoading(false)
      addToast('Ошибка загрузки истории', 'error')
    })
  }, [addToast])

  const toggleVitamin = (name: string) => {
    setSelectedVitamins((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const allVitaminNames: string[] = history.length > 0
    ? [...new Set(history.flatMap((record) => record.entries.map((entry) => entry.vitamin_name)))]
    : []

  const chartData: ChartDataPoint[] = history.map((record) => {
    const point: ChartDataPoint = {
      date: new Date(record.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
    }
    record.entries.forEach((entry) => { point[entry.vitamin_name] = entry.value })
    return point
  }).reverse()

  const chartColors = useMemo(() => getChartColors(dark), [dark])

  const getTrend = (recordIdx: number, entry: HistoryVitaminEntry): TrendResult | null => {
    const nextIdx = recordIdx + 1
    if (nextIdx >= history.length) return null
    const previousRecord = history[nextIdx]
    const previousEntry = previousRecord.entries.find((candidate) => candidate.vitamin_name === entry.vitamin_name)
    if (!previousEntry) return null

    const normMid = (entry.norm_min + entry.norm_max) / 2
    const previousDistance = Math.abs(previousEntry.value - normMid)
    const currentDistance = Math.abs(entry.value - normMid)
    const change = previousEntry.value !== 0
      ? Math.round(((entry.value - previousEntry.value) / previousEntry.value) * 100)
      : 0

    if (Math.abs(change) < TREND_STABLE_THRESHOLD) {
      return { arrow: '\u2192', color: 'text-gray-400', label: 'stable', change: `${change > 0 ? '+' : ''}${change}%` }
    }
    if (currentDistance < previousDistance) {
      return { arrow: '\u2191', color: 'text-emerald-500', label: 'improving', change: `${change > 0 ? '+' : ''}${change}%` }
    }
    return { arrow: '\u2193', color: 'text-red-500', label: 'worsening', change: `${change > 0 ? '+' : ''}${change}%` }
  }

  const latestRecord = history[0] ?? null
  const lastDateLabel = latestRecord
    ? new Date(latestRecord.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Данных пока нет'
  const selectedVitaminCount = selectedVitamins.size
  const trendOverview = latestRecord
    ? latestRecord.entries.reduce(
      (acc, entry) => {
        const trend = getTrend(0, entry)
        if (!trend) return acc
        if (trend.label === 'improving') acc.improving += 1
        else if (trend.label === 'worsening') acc.worsening += 1
        else acc.stable += 1
        return acc
      },
      { improving: 0, worsening: 0, stable: 0 },
    )
    : { improving: 0, worsening: 0, stable: 0 }
  const visibleVitaminNames = allVitaminNames.filter((name) => selectedVitamins.has(name))
  const heroTitle = history.length > 1
    ? 'История показывает, куда движется витаминный баланс'
    : 'У вас уже есть первая контрольная точка'
  const heroText = history.length > 1
    ? 'Сравнивайте записи между собой, отслеживайте тренды и быстрее замечайте, когда показатели начинают выходить из комфортной зоны.'
    : 'После следующего ввода данных здесь появятся полноценные тренды, а пока страницу можно использовать как первую зафиксированную точку.'

  const selectSuggestedVitamins = () => {
    if (!latestRecord) return
    const suggested = latestRecord.entries
      .filter((entry) => entry.status === 'deficiency')
      .slice(0, 4)
      .map((entry) => entry.vitamin_name)
    const fallback = latestRecord.entries.slice(0, 4).map((entry) => entry.vitamin_name)
    setSelectedVitamins(new Set(suggested.length > 0 ? suggested : fallback))
  }

  const selectAllVitamins = () => {
    setSelectedVitamins(new Set(allVitaminNames))
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <TableSkeleton />
        </div>
      </PageTransition>
    )
  }

  if (error && history.length === 0) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.401 3.003c1.155-2 4.043-2 5.198 0l6.125 10.607c1.154 1.999-.289 4.498-2.599 4.498H5.875c-2.31 0-3.753-2.499-2.599-4.498L9.401 3.003z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Не удалось загрузить историю</h1>
          <p className="text-gray-500 dark:text-gray-300 mb-8">Попробуйте открыть анализ ещё раз чуть позже или вернитесь после нового ввода данных.</p>
          <Link to="/analysis" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
            Вернуться к анализу
          </Link>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {history.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">История пока не сформирована</h2>
            <p className="text-gray-500 dark:text-gray-300 mb-8">Сделайте несколько вводов данных, чтобы отслеживать динамику показателей во времени.</p>
            <Link to="/data-entry" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
              Ввести данные
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-xl shadow-gray-200/40 dark:shadow-primary-500/[0.05]">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-10 left-0 h-44 w-44 rounded-full bg-primary-500/[0.08] dark:bg-primary-500/[0.14] blur-3xl" />
                <div className="absolute top-1/3 right-0 h-52 w-52 rounded-full bg-cyan-500/[0.08] dark:bg-cyan-500/[0.14] blur-3xl" />
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
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">История анализов</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                    {heroTitle}
                  </h1>
                  <p className="text-base sm:text-lg text-gray-500 dark:text-gray-300 leading-relaxed mb-6 max-w-xl">
                    {heroText}
                  </p>

                  <div className="flex flex-wrap gap-3 mb-6">
                    <Link
                      to="/analysis"
                      className="btn-primary text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
                    >
                      Вернуться к анализу
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                    <Link
                      to="/data-entry"
                      className="px-6 py-3 rounded-2xl bg-gray-100/90 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08] hover:bg-white dark:hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2"
                    >
                      Добавить новую запись
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                      Последняя запись: {lastDateLabel}
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                      Снимков истории: {history.length}
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                      Отслеживаемых показателей: {allVitaminNames.length}
                    </span>
                  </div>
                </div>

                <StaggerChildren variant="fade-up" stagger={70} className="grid grid-cols-2 gap-3 self-start">
                  <div className="rounded-[1.5rem] border border-primary-100 dark:border-primary-500/20 bg-gradient-to-br from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.04] dark:to-white/[0.02] p-4 sm:p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-primary-500 dark:text-primary-300 mb-2">История</div>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{history.length}</div>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
                      {history.length > 1 ? 'Можно уже сравнивать тренды между записями.' : 'Нужна ещё хотя бы одна запись для полноценной динамики.'}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-cyan-100 dark:border-cyan-500/20 bg-gradient-to-br from-cyan-50 via-white to-white dark:from-cyan-500/12 dark:via-white/[0.04] dark:to-white/[0.02] p-4 sm:p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300 mb-2">На графике</div>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{selectedVitaminCount}</div>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
                      Выбрано показателей для визуального сравнения во времени.
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-emerald-100 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-500/12 dark:via-white/[0.04] dark:to-white/[0.02] p-4 sm:p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300 mb-2">Улучшаются</div>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{trendOverview.improving}</div>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
                      Показатели, которые приблизились к диапазону нормы по сравнению с предыдущей записью.
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-rose-100 dark:border-rose-500/20 bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-500/12 dark:via-white/[0.04] dark:to-white/[0.02] p-4 sm:p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300 mb-2">Требуют внимания</div>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{trendOverview.worsening}</div>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
                      Показатели, которые ушли дальше от комфортного диапазона.
                    </p>
                  </div>
                </StaggerChildren>
              </div>
            </section>

            <AnimateIn variant="blur" className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
                <div>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">
                    Визуализация
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Динамика показателей</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                    Показывайте только нужные линии, чтобы не теряться в шуме и быстрее замечать важные изменения.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectSuggestedVitamins}
                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/[0.08] text-sm font-semibold"
                  >
                    Показать ключевые
                  </button>
                  <button
                    type="button"
                    onClick={selectAllVitamins}
                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/[0.08] text-sm font-semibold"
                  >
                    Показать все
                  </button>
                </div>
              </div>

              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} onMouseLeave={() => setHoveredLine(null)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: chartColors.axis }} stroke={chartColors.axisLine} />
                    <YAxis tick={{ fontSize: 12, fill: chartColors.axis }} stroke={chartColors.axisLine} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius: '16px',
                        boxShadow: '0 10px 25px -15px rgb(0 0 0 / 0.35)',
                        padding: '12px 16px',
                        color: chartColors.tooltipText,
                      }}
                      labelStyle={{ color: chartColors.tooltipText }}
                      itemStyle={{ color: chartColors.tooltipText }}
                    />
                    <Legend
                      wrapperStyle={{ color: dark ? '#e5e7eb' : '#374151' }}
                      formatter={(value: string) => <span style={{ color: dark ? '#e5e7eb' : '#374151' }}>{value}</span>}
                    />
                    {visibleVitaminNames.map((name, i) => {
                      const isHovered = hoveredLine === name
                      const isDimmed = hoveredLine !== null && hoveredLine !== name
                      return (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={VITAMIN_COLORS[i % VITAMIN_COLORS.length]}
                          strokeWidth={isHovered ? 3 : 2}
                          strokeOpacity={isDimmed ? 0.2 : 1}
                          dot={{ r: isHovered ? 5 : 4, fill: VITAMIN_COLORS[i % VITAMIN_COLORS.length], strokeOpacity: isDimmed ? 0.2 : 1 }}
                          activeDot={{ r: 6, onMouseOver: () => setHoveredLine(name) }}
                          onMouseOver={() => setHoveredLine(name)}
                        />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-100 dark:border-white/[0.06]">
                {allVitaminNames.map((name, i) => (
                  <button
                    key={name}
                    onClick={() => toggleVitamin(name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      selectedVitamins.has(name)
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-gray-50 dark:bg-white/[0.06] text-gray-500 dark:text-gray-300 border-gray-200 dark:border-white/[0.1]'
                    }`}
                    style={selectedVitamins.has(name) ? { backgroundColor: VITAMIN_COLORS[i % VITAMIN_COLORS.length] } : {}}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {selectedVitaminCount === 0 && (
                <div className="mt-4 rounded-2xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/80 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
                  Ни одна линия не выбрана. Включите хотя бы один показатель, чтобы увидеть график.
                </div>
              )}
            </AnimateIn>

            <section>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
                <div>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">
                    Детализация
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Записи по датам</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                    Каждая запись показывает статус каждого показателя, его значение и направление движения относительно предыдущего ввода.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {history.map((record, idx) => (
                  <AnimateIn key={record.date} variant="fade-up" className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
                    <div className="px-6 sm:px-7 py-5 border-b border-gray-100 dark:border-white/[0.06] bg-gradient-to-r from-white via-primary-50/60 to-cyan-50/60 dark:from-white/[0.02] dark:via-primary-500/[0.08] dark:to-cyan-500/[0.05]">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/20">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              {new Date(record.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-300">
                              {record.entries.length} показателей в снимке
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-xs font-medium text-gray-600 dark:text-gray-300">
                            Улучшаются: {record.entries.filter((entry) => getTrend(idx, entry)?.label === 'improving').length}
                          </span>
                          <span className="px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-xs font-medium text-gray-600 dark:text-gray-300">
                            Требуют внимания: {record.entries.filter((entry) => getTrend(idx, entry)?.label === 'worsening').length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 sm:p-7">
                      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {record.entries.map((entry) => {
                          const trend = getTrend(idx, entry)
                          const icon = getVitaminIcon(entry.vitamin_code)
                          return (
                            <div
                              key={`${record.date}-${entry.vitamin_id}`}
                              className="relative overflow-hidden rounded-[1.6rem] border border-gray-200 dark:border-white/[0.06] bg-gradient-to-br from-white to-gray-50 dark:from-white/[0.03] dark:to-white/[0.02] p-4"
                            >
                              <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/40 dark:bg-white/[0.03] blur-2xl" />
                              <div className="relative">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${icon.gradient} flex items-center justify-center text-xl text-white shadow-lg flex-shrink-0`}>
                                      {icon.emoji}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-semibold mb-1">
                                        {entry.vitamin_code}
                                      </div>
                                      <h3 className="font-semibold text-gray-900 dark:text-white leading-snug">{entry.vitamin_name}</h3>
                                    </div>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusChip(entry.status)}`}>
                                    {entry.status === 'deficiency' ? 'Дефицит' : entry.status === 'excess' ? 'Избыток' : 'Норма'}
                                  </span>
                                </div>

                                <div className="flex items-end justify-between gap-3 mb-3">
                                  <div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{entry.value}</div>
                                    <div className="text-xs text-gray-400">{entry.unit}</div>
                                  </div>
                                  {trend ? (
                                    <div className={`text-sm font-semibold ${trend.color}`}>
                                      {trend.arrow} {trend.change}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-400">Базовая точка</div>
                                  )}
                                </div>

                                <div className="text-xs text-gray-400">
                                  Норма: {entry.norm_min}–{entry.norm_max} {entry.unit}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
