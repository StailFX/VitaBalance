import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { TableSkeleton } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import { formatMoscowDateTime } from '../utils/datetime'
import { AnalysisSnapshot, HistoryVitaminEntry } from '../types'

interface TrendResult {
  arrow: string
  color: string
  label: string
  change: string
}

interface SummaryCard {
  label: string
  value: string | number
  surface: string
  valueColor: string
  labelColor: string
}

function formatSnapshotDate(value: string) {
  return formatMoscowDateTime(value, true)
}

function getPercentOfNorm(entry: HistoryVitaminEntry) {
  if (entry.norm_max <= 0) return 0
  return Math.round((entry.value / entry.norm_max) * 100)
}

function getStatusStyles(status: string) {
  switch (status) {
    case 'deficiency':
      return {
        badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-900/60',
        bar: 'bg-red-400',
        card: 'border-red-100 dark:border-red-900/50',
      }
    case 'excess':
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-900/60',
        bar: 'bg-amber-400',
        card: 'border-amber-100 dark:border-amber-900/50',
      }
    case 'normal':
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-900/60',
        bar: 'bg-emerald-400',
        card: 'border-emerald-100 dark:border-emerald-900/50',
      }
    default:
      return {
        badge: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-800',
        bar: 'bg-slate-300 dark:bg-slate-600',
        card: 'border-gray-200 dark:border-white/[0.08]',
      }
  }
}

function getTrend(current: HistoryVitaminEntry, previous?: HistoryVitaminEntry): TrendResult | null {
  if (!previous) return null

  const normMid = (current.norm_min + current.norm_max) / 2
  const previousDistance = Math.abs(previous.value - normMid)
  const currentDistance = Math.abs(current.value - normMid)
  const change = previous.value !== 0
    ? Math.round(((current.value - previous.value) / previous.value) * 100)
    : 0

  if (Math.abs(change) < 3) {
    return { arrow: '\u2192', color: 'text-slate-400', label: 'stable', change: `${change > 0 ? '+' : ''}${change}%` }
  }

  if (currentDistance < previousDistance) {
    return { arrow: '\u2191', color: 'text-emerald-500', label: 'improving', change: `${change > 0 ? '+' : ''}${change}%` }
  }

  return { arrow: '\u2193', color: 'text-red-500', label: 'worsening', change: `${change > 0 ? '+' : ''}${change}%` }
}

export default function AnalysisHistory() {
  const [history, setHistory] = useState<AnalysisSnapshot[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<boolean>(false)
  const { addToast } = useToast()

  useEffect(() => {
    api.get('/vitamins/history').then((res) => {
      const snapshots = Array.isArray(res.data) ? res.data : []
      setHistory(snapshots)
      setLoading(false)
    }).catch(() => {
      setError(true)
      setLoading(false)
      addToast('Ошибка загрузки истории', 'error')
    })
  }, [addToast])

  const latestSnapshot = history[0]
  const previousSnapshot = history[1]

  const trackedVitaminCount = useMemo(() => {
    return new Set(history.flatMap((snapshot) => snapshot.entries.map((entry) => entry.vitamin_id))).size
  }, [history])

  const latestChanges = useMemo(() => {
    if (!latestSnapshot) return []

    const previousById = new Map(previousSnapshot?.entries.map((entry) => [entry.vitamin_id, entry]) ?? [])

    return latestSnapshot.entries
      .map((entry) => ({
        entry,
        trend: getTrend(entry, previousById.get(entry.vitamin_id)),
      }))
      .sort((a, b) => {
        const score = (status: string) => {
          if (status === 'deficiency') return 0
          if (status === 'excess') return 1
          if (status === 'normal') return 2
          return 3
        }
        return score(a.entry.status) - score(b.entry.status)
      })
  }, [latestSnapshot, previousSnapshot])

  const improvedCount = useMemo(() => {
    return latestChanges.filter((item) => item.trend?.label === 'improving').length
  }, [latestChanges])

  const summaryCards: SummaryCard[] = [
    {
      label: 'Снимков',
      value: history.length,
      surface: 'bg-primary-50 border-primary-200 dark:bg-primary-950/50 dark:border-primary-900/60',
      valueColor: 'text-primary-900 dark:text-primary-100',
      labelColor: 'text-primary-700 dark:text-primary-300',
    },
    {
      label: 'Витаминов',
      value: trackedVitaminCount,
      surface: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-900/60',
      valueColor: 'text-emerald-900 dark:text-emerald-100',
      labelColor: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'Улучшилось',
      value: improvedCount,
      surface: 'bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900/60',
      valueColor: 'text-amber-900 dark:text-amber-100',
      labelColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      label: 'Последнее обновление',
      value: latestSnapshot ? formatSnapshotDate(latestSnapshot.date) : '—',
      surface: 'bg-slate-50 border-slate-200 dark:bg-slate-900/60 dark:border-slate-800',
      valueColor: 'text-slate-900 dark:text-slate-100',
      labelColor: 'text-slate-600 dark:text-slate-300',
    },
  ]

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <TableSkeleton />
        </div>
      </PageTransition>
    )
  }

  if (error) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Историю пока не удалось загрузить</h1>
          <p className="text-gray-500 dark:text-gray-300 mb-8">Попробуйте обновить страницу или вернуться к анализу.</p>
          <Link to="/analysis" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
            Вернуться к анализу
          </Link>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <span className="section-eyebrow inline-block px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            История
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">История анализов</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-2">Все сохранения по датам и динамика между последними замерами.</p>
        </div>

        {history.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Нет данных</h2>
            <p className="text-gray-500 dark:text-gray-300 mb-8">Сохраните хотя бы один замер, чтобы история начала собираться.</p>
            <Link to="/data-entry" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
              Ввести данные
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {summaryCards.map((card) => (
                <div key={card.label} className={`rounded-2xl border p-5 ${card.surface}`}>
                  <div className={`font-bold text-2xl break-words ${card.valueColor}`}>{card.value}</div>
                  <div className={`text-sm mt-1 ${card.labelColor}`}>{card.label}</div>
                </div>
              ))}
            </div>

            {history.length < 2 && (
              <div className="mb-8 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900 dark:border-primary-900/50 dark:bg-primary-950/40 dark:text-primary-100">
                Пока есть только один снимок. После следующего сохранения здесь появится динамика между разными замерами.
              </div>
            )}

            <div className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 mb-8">
              <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Последний снимок</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                    {latestSnapshot ? formatSnapshotDate(latestSnapshot.date) : '—'}
                  </p>
                </div>
                <Link to="/data-entry" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                  Добавить новый замер
                </Link>
              </div>

              <div className="space-y-3">
                {latestChanges.map(({ entry, trend }) => {
                  const styles = getStatusStyles(entry.status)
                  const percentage = Math.max(Math.min(getPercentOfNorm(entry), 150), 2)
                  return (
                    <div key={entry.vitamin_id} className={`rounded-2xl border bg-white/80 p-4 dark:bg-white/[0.02] ${styles.card}`}>
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{entry.vitamin_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {entry.value} {entry.unit} при норме {entry.norm_min}–{entry.norm_max} {entry.unit}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles.badge}`}>
                            {entry.status === 'deficiency' ? 'Дефицит' : entry.status === 'excess' ? 'Избыток' : entry.status === 'normal' ? 'Норма' : 'Нет данных'}
                          </span>
                          {trend && (
                            <span className={`text-xs font-semibold ${trend.color}`}>
                              {trend.arrow} {trend.change}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                        <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">История по сохранениям</h2>
              {history.map((record, idx) => (
                <div key={record.date} className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{formatSnapshotDate(record.date)}</div>
                      <div className="text-xs text-gray-400">{record.entries.length} показателей</div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {record.entries.map((entry) => {
                      const previousEntry = history[idx + 1]?.entries.find((item) => item.vitamin_id === entry.vitamin_id)
                      const trend = getTrend(entry, previousEntry)
                      const styles = getStatusStyles(entry.status)
                      const percentage = Math.max(Math.min(getPercentOfNorm(entry), 150), 2)

                      return (
                        <div key={`${record.date}-${entry.vitamin_id}`} className={`rounded-2xl border px-4 py-3 ${styles.card}`}>
                          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{entry.vitamin_name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {entry.value} {entry.unit} при норме {entry.norm_min}–{entry.norm_max} {entry.unit}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles.badge}`}>
                                {entry.status === 'deficiency' ? 'Дефицит' : entry.status === 'excess' ? 'Избыток' : entry.status === 'normal' ? 'Норма' : 'Нет данных'}
                              </span>
                              {trend && (
                                <span className={`text-xs font-semibold ${trend.color}`}>
                                  {trend.arrow} {trend.change}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                            <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
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
