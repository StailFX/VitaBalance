import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { TableSkeleton } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import { getChartColors } from '../utils/chartColors'

const VITAMIN_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'
]

const TREND_STABLE_THRESHOLD = 3

export default function AnalysisHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedVitamins, setSelectedVitamins] = useState(new Set())
  const [hoveredLine, setHoveredLine] = useState(null)
  const { addToast } = useToast()
  const { dark } = useTheme()

  useEffect(() => {
    api.get('/vitamins/history').then((res) => {
      setHistory(res.data)
      if (res.data.length > 0 && res.data[0].entries) {
        // Default: show only vitamins with deficiencies (up to 4), fallback to first 4
        const defVitamins = res.data[0].entries
          .filter(e => e.status === 'deficiency')
          .map(e => e.vitamin_name)
          .slice(0, 4)
        if (defVitamins.length > 0) {
          setSelectedVitamins(new Set(defVitamins))
        } else {
          setSelectedVitamins(new Set(res.data[0].entries.slice(0, 4).map(e => e.vitamin_name)))
        }
      }
      setLoading(false)
    }).catch(() => {
      setError(true)
      setLoading(false)
      addToast('Ошибка загрузки истории', 'error')
    })
  }, [addToast])

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <TableSkeleton />
        </div>
      </PageTransition>
    )
  }

  const toggleVitamin = (name) => {
    setSelectedVitamins(prev => {
      const s = new Set(prev)
      if (s.has(name)) s.delete(name)
      else s.add(name)
      return s
    })
  }

  const allVitaminNames = history.length > 0
    ? [...new Set(history.flatMap(h => h.entries.map(e => e.vitamin_name)))]
    : []

  const chartData = history.map(h => {
    const point = { date: new Date(h.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) }
    h.entries.forEach(e => { point[e.vitamin_name] = e.value })
    return point
  }).reverse()

  const chartColors = useMemo(() => getChartColors(dark), [dark])

  // Compute trend for an entry by comparing with the previous history record
  const getTrend = (recordIdx, entry) => {
    const nextIdx = recordIdx + 1 // history is newest-first
    if (nextIdx >= history.length) return null
    const prevRecord = history[nextIdx]
    const prevEntry = prevRecord.entries.find(e => e.vitamin_name === entry.vitamin_name)
    if (!prevEntry || prevEntry.value === null || entry.value === null) return null

    const normMid = (entry.norm_min + entry.norm_max) / 2
    const prevDist = Math.abs(prevEntry.value - normMid)
    const currDist = Math.abs(entry.value - normMid)
    const change = prevEntry.value !== 0
      ? Math.round(((entry.value - prevEntry.value) / prevEntry.value) * 100)
      : 0

    if (Math.abs(change) < TREND_STABLE_THRESHOLD) return { arrow: '\u2192', color: 'text-gray-400', label: 'stable', change: `${change > 0 ? '+' : ''}${change}%` }
    if (currDist < prevDist) return { arrow: '\u2191', color: 'text-emerald-500', label: 'improving', change: `${change > 0 ? '+' : ''}${change}%` }
    return { arrow: '\u2193', color: 'text-red-500', label: 'worsening', change: `${change > 0 ? '+' : ''}${change}%` }
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            История
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">История анализов</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-2">Отслеживайте динамику витаминного баланса</p>
        </div>

        {history.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Нет данных</h2>
            <p className="text-gray-500 dark:text-gray-300 mb-8">Сдайте анализы несколько раз, чтобы увидеть динамику</p>
            <Link to="/data-entry" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
              Ввести данные
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-100 dark:border-white/[0.06] shadow-sm p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Динамика показателей</h2>
              <div className="h-80">
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
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        padding: '12px 16px',
                        color: chartColors.tooltipText,
                      }}
                      labelStyle={{ color: chartColors.tooltipText }}
                      itemStyle={{ color: chartColors.tooltipText }}
                    />
                    <Legend
                      wrapperStyle={{ color: dark ? '#e5e7eb' : '#374151' }}
                      formatter={(value) => <span style={{ color: dark ? '#e5e7eb' : '#374151' }}>{value}</span>}
                    />
                    {allVitaminNames.filter(n => selectedVitamins.has(n)).map((name, i) => {
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
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
                {allVitaminNames.map((name, i) => (
                  <button
                    key={name}
                    onClick={() => toggleVitamin(name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      selectedVitamins.has(name)
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-gray-50 dark:bg-white/[0.06] text-gray-400 border-gray-200 dark:border-white/[0.1]'
                    }`}
                    style={selectedVitamins.has(name) ? { backgroundColor: VITAMIN_COLORS[i % VITAMIN_COLORS.length] } : {}}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Записи</h2>
              {history.map((record, idx) => (
                <div key={idx} className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.06] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {new Date(record.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-gray-400">{record.entries.length} показателей</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {record.entries.map((e, j) => {
                      const statusColors = {
                        deficiency: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
                        excess: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                        normal: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
                      }
                      const trend = getTrend(idx, e)
                      return (
                        <span key={j} className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${statusColors[e.status] || 'bg-gray-50 dark:bg-white/[0.06] text-gray-400 border-gray-200 dark:border-white/[0.1]'}`}>
                          {e.vitamin_name}: {e.value} {e.unit}
                          {trend && (
                            <span className={`${trend.color} font-semibold ml-1`}>
                              {trend.arrow} {trend.change}
                            </span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  )
}
