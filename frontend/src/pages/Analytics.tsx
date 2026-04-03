import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { TableSkeleton } from '../components/Skeleton'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useInView, useCountUp } from '../hooks/useAnimations'
import { useTheme } from '../context/ThemeContext'
import { getChartColors } from '../utils/chartColors'
import type { VitaminAnalysisItem, AnalysisSnapshot, ComparisonItem, VitaminStatus } from '../types'

interface StatusColorEntry {
  bg: string
  text: string
  label: string
  hex: string
}

const STATUS_COLORS: Record<VitaminStatus, StatusColorEntry> = {
  deficiency: { bg: 'bg-red-400', text: 'text-red-600 dark:text-red-400', label: 'Дефицит', hex: '#ef4444' },
  normal: { bg: 'bg-emerald-400', text: 'text-emerald-600 dark:text-emerald-400', label: 'Норма', hex: '#10b981' },
  excess: { bg: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400', label: 'Избыток', hex: '#f59e0b' },
  no_data: { bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-400', label: 'Нет данных', hex: '#d1d5db' },
}

interface HeatmapCell {
  date: string
  status: VitaminStatus
  value: number | null
  unit: string
}

interface HeatmapRow {
  vitamin: string
  cells: HeatmapCell[]
}

export default function Analytics() {
  const [history, setHistory] = useState<AnalysisSnapshot[]>([])
  const [analysis, setAnalysis] = useState<VitaminAnalysisItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'heatmap' | 'compare' | 'overview'>('heatmap')
  const [compDate1, setCompDate1] = useState('')
  const [compDate2, setCompDate2] = useState('')
  const [comparison, setComparison] = useState<ComparisonItem[] | null>(null)
  const [compLoading, setCompLoading] = useState(false)
  const { dark } = useTheme()
  const chartColors = useMemo(() => getChartColors(dark), [dark])

  useEffect(() => {
    Promise.allSettled([
      api.get('/vitamins/history'),
      api.get('/vitamins/analysis'),
    ]).then(([histRes, analRes]) => {
      if (histRes.status === 'fulfilled') {
        setHistory(histRes.value.data)
        const dates = (histRes.value.data as AnalysisSnapshot[]).map(h => h.date)
        if (dates.length >= 2) {
          setCompDate1(dates[dates.length - 1])
          setCompDate2(dates[0])
        } else if (dates.length === 1) {
          setCompDate1(dates[0])
          setCompDate2(dates[0])
        }
      }
      if (analRes.status === 'fulfilled') setAnalysis(analRes.value.data)
      setLoading(false)
    })
  }, [])

  const availableDates = useMemo(() => history.map(h => h.date), [history])

  const allVitamins = useMemo(() => {
    if (history.length === 0) return []
    const names = new Set<string>()
    history.forEach(h => h.entries.forEach(e => names.add(e.vitamin_name)))
    return [...names]
  }, [history])

  // Heatmap: vitamins (rows) x dates (columns)
  const heatmapData: HeatmapRow[] = useMemo(() => {
    const reversed = [...history].reverse()
    return allVitamins.map(name => ({
      vitamin: name,
      cells: reversed.map(h => {
        const entry = h.entries.find(e => e.vitamin_name === name)
        return {
          date: h.date,
          status: (entry?.status || 'no_data') as VitaminStatus,
          value: entry?.value ?? null,
          unit: entry?.unit || '',
        }
      }),
    }))
  }, [history, allVitamins])

  const fetchComparison = async () => {
    if (!compDate1 || !compDate2) return
    setCompLoading(true)
    try {
      const res = await api.get('/vitamins/analysis/compare', {
        params: { date1: compDate1, date2: compDate2 },
      })
      setComparison(res.data)
    } catch {
      setComparison(null)
    }
    setCompLoading(false)
  }

  useEffect(() => {
    if (compDate1 && compDate2 && tab === 'compare') fetchComparison()
  }, [compDate1, compDate2, tab])

  // Summary stats
  const defCount = analysis.filter(a => a.status === 'deficiency').length
  const normalCount = analysis.filter(a => a.status === 'normal').length
  const excessCount = analysis.filter(a => a.status === 'excess').length
  const avgSeverity = analysis.length > 0
    ? Math.round(analysis.reduce((sum, a) => sum + a.severity, 0) / analysis.length)
    : 0

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-8"><TableSkeleton /></div>
      </PageTransition>
    )
  }

  if (history.length === 0 && analysis.length === 0) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Данных для аналитики пока нет</h1>
          <p className="text-gray-500 dark:text-gray-300 mb-8">Введите результаты анализов, чтобы увидеть аналитику</p>
          <Link to="/data-entry" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
            Ввести данные
          </Link>
        </div>
      </PageTransition>
    )
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  const formatDateFull = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Аналитика
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Витаминная аналитика</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-1">Heatmap, сравнение и обзор вашего баланса</p>
        </div>

        {/* Summary cards */}
        <StaggerChildren variant="fade-up" stagger={80} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-2xl p-5 border border-red-100 dark:border-red-800/50">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{defCount}</div>
            <div className="text-sm text-red-400 mt-1">Дефицитов</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800/50">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{normalCount}</div>
            <div className="text-sm text-emerald-400 mt-1">В норме</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-5 border border-amber-100 dark:border-amber-800/50">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{excessCount}</div>
            <div className="text-sm text-amber-400 mt-1">Избыток</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-800/50">
            <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{history.length}</div>
            <div className="text-sm text-primary-400 mt-1">Записей</div>
          </div>
        </StaggerChildren>

        {/* Tab switcher */}
        <div className="bg-gray-100 dark:bg-white/[0.06] rounded-2xl p-1.5 inline-flex gap-1 mb-8">
          {([
            { key: 'heatmap' as const, label: 'Heatmap' },
            { key: 'compare' as const, label: 'Сравнение' },
            { key: 'overview' as const, label: 'Обзор' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-white dark:bg-white/[0.08] text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Heatmap Tab */}
        {tab === 'heatmap' && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Статус витаминов по датам</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Каждая ячейка показывает статус витамина на определённую дату</p>

            {heatmapData.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Недостаточно данных для heatmap</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3 pr-4 sticky left-0 bg-white dark:bg-[#161b22] z-10 min-w-[140px]">
                        Витамин
                      </th>
                      {([...history].reverse()).map(h => (
                        <th key={h.date} className="text-center text-[10px] font-medium text-gray-400 pb-3 px-1 min-w-[44px]">
                          {formatDate(h.date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.map(row => (
                      <tr key={row.vitamin} className="group">
                        <td className="text-sm font-medium text-gray-700 dark:text-gray-300 py-1.5 pr-4 sticky left-0 bg-white dark:bg-[#161b22] z-10">
                          {row.vitamin.replace('Витамин ', '')}
                        </td>
                        {row.cells.map((cell, i) => {
                          const sc = STATUS_COLORS[cell.status]
                          return (
                            <td key={i} className="px-1 py-1.5">
                              <div
                                className={`w-8 h-8 rounded-lg ${sc.bg} mx-auto relative cursor-default transition-transform hover:scale-125`}
                                style={{ opacity: cell.status === 'no_data' ? 0.3 : (cell.status === 'deficiency' ? 1 : 0.8) }}
                                title={`${row.vitamin}: ${cell.value !== null ? `${cell.value} ${cell.unit}` : 'нет данных'} (${formatDateFull(cell.date)})`}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
              {(Object.entries(STATUS_COLORS) as [VitaminStatus, StatusColorEntry][]).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${val.bg}`} style={{ opacity: key === 'no_data' ? 0.3 : 0.8 }} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{val.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comparison Tab */}
        {tab === 'compare' && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Сравнение периодов</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Выберите две даты для сравнения витаминных показателей</p>

            <div className="flex flex-wrap items-end gap-4 mb-8">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Дата 1</label>
                <select
                  value={compDate1}
                  onChange={(e) => setCompDate1(e.target.value)}
                  className="px-4 py-2.5 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {availableDates.map(d => (
                    <option key={d} value={d}>{formatDateFull(d)}</option>
                  ))}
                </select>
              </div>
              <div className="text-gray-400 pb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Дата 2</label>
                <select
                  value={compDate2}
                  onChange={(e) => setCompDate2(e.target.value)}
                  className="px-4 py-2.5 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {availableDates.map(d => (
                    <option key={d} value={d}>{formatDateFull(d)}</option>
                  ))}
                </select>
              </div>
            </div>

            {compLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : comparison && comparison.length > 0 ? (
              <>
                {/* Visual bars comparison */}
                <div className="space-y-4 mb-8">
                  {comparison.map((item) => {
                    const sc1 = STATUS_COLORS[item.status1 as VitaminStatus]
                    const sc2 = STATUS_COLORS[item.status2 as VitaminStatus]
                    const improved = item.change_percent !== null && (
                      (item.status1 === 'deficiency' && item.change_percent > 0) ||
                      (item.status1 === 'excess' && item.change_percent < 0) ||
                      (item.status2 === 'normal' && item.status1 !== 'normal')
                    )
                    const worsened = item.change_percent !== null && (
                      (item.status1 === 'normal' && item.status2 !== 'normal') ||
                      (item.status2 === 'deficiency' && item.status1 !== 'deficiency')
                    )

                    return (
                      <div key={item.vitamin_name} className="bg-gray-50 dark:bg-white/[0.02] rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{item.vitamin_name}</h3>
                          {item.change_percent !== null && (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              improved ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                              worsened ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}>
                              {item.change_percent > 0 ? '+' : ''}{item.change_percent}%
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{formatDate(compDate1)}</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: item.date1_value !== null ? `${Math.min(100, Math.max(5, (item.date1_value / 100) * 50))}%` : '0%',
                                    backgroundColor: sc1.hex,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[50px] text-right">
                                {item.date1_value !== null ? item.date1_value : '—'}
                              </span>
                            </div>
                            <span className={`text-[10px] font-medium ${sc1.text}`}>{sc1.label}</span>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{formatDate(compDate2)}</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: item.date2_value !== null ? `${Math.min(100, Math.max(5, (item.date2_value / 100) * 50))}%` : '0%',
                                    backgroundColor: sc2.hex,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[50px] text-right">
                                {item.date2_value !== null ? item.date2_value : '—'}
                              </span>
                            </div>
                            <span className={`text-[10px] font-medium ${sc2.text}`}>{sc2.label}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Radar overlay comparison */}
                {(() => {
                  const radarData = comparison
                    .filter(c => c.date1_value !== null || c.date2_value !== null)
                    .map(c => ({
                      vitamin: c.vitamin_name.replace('Витамин ', ''),
                      date1: c.date1_value || 0,
                      date2: c.date2_value || 0,
                    }))
                  if (radarData.length < 3) return null
                  return (
                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-6">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Радарное сравнение</h3>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid stroke={chartColors.grid} />
                            <PolarAngleAxis dataKey="vitamin" tick={{ fontSize: 11, fill: chartColors.axis }} />
                            <PolarRadiusAxis tick={{ fontSize: 9, fill: chartColors.axis }} />
                            <Radar name={formatDate(compDate1)} dataKey="date1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                            <Radar name={formatDate(compDate2)} dataKey="date2" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: chartColors.tooltipBg,
                                border: `1px solid ${chartColors.tooltipBorder}`,
                                borderRadius: '12px',
                                color: chartColors.tooltipText,
                              }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-center gap-6 mt-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#6366f1]" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateFull(compDate1)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateFull(compDate2)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </>
            ) : comparison && comparison.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Нет данных для сравнения за выбранные даты</p>
            ) : availableDates.length < 2 ? (
              <p className="text-gray-400 text-center py-8">Нужно минимум 2 записи для сравнения</p>
            ) : null}
          </div>
        )}

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Current status horizontal bar chart */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Текущие показатели</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Процент от нормы по каждому витамину</p>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analysis.filter(a => a.value !== null).map(a => ({
                      name: a.vitamin_name.replace('Витамин ', '').split(' ')[0],
                      percent: a.norm_max > 0 ? Math.round((a.value! / a.norm_max) * 100) : 0,
                      status: a.status,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: chartColors.axis }} stroke={chartColors.axisLine} domain={[0, 'auto']} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: chartColors.axis }} stroke={chartColors.axisLine} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius: '12px',
                        color: chartColors.tooltipText,
                      }}
                      formatter={(value: number) => [`${value}%`, '% от нормы']}
                    />
                    <Bar dataKey="percent" radius={[0, 8, 8, 0]}>
                      {analysis.filter(a => a.value !== null).map((a, i) => (
                        <Cell key={i} fill={STATUS_COLORS[a.status]?.hex || '#d1d5db'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Deficiency severity ranking */}
            {defCount > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Рейтинг дефицитов по серьёзности</h2>
                <div className="space-y-3">
                  {analysis
                    .filter(a => a.status === 'deficiency')
                    .sort((a, b) => b.severity - a.severity)
                    .map((item, i) => (
                      <div key={item.vitamin_id} className="flex items-center gap-4">
                        <span className="text-lg font-bold text-gray-300 dark:text-gray-600 w-8 text-right">#{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.vitamin_name}</span>
                            <span className="text-sm font-bold text-red-500">{item.severity}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(100, item.severity)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
