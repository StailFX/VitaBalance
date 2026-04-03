import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { TableSkeleton } from '../components/Skeleton'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import { getVitaminIcon } from '../utils/vitaminIcons'
import { getChartColors } from '../utils/chartColors'
import { VitaminAnalysisItem } from '../types'

const RADAR_CHART_MAX = 150
const MIN_BAR_WIDTH_PERCENT = 3

interface StatusConfig {
  bg: string
  text: string
  border: string
  label: string
  dot: string
  color: string
}

interface RadarDataPoint {
  vitamin: string
  value: number
  fullMark: number
}

interface BarDataPoint {
  name: string
  value: number | null
  norm_min: number
  norm_max: number
  status: string
}

export default function AnalysisResults() {
  const [analysis, setAnalysis] = useState<VitaminAnalysisItem[] | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<boolean>(false)
  const [chartType, setChartType] = useState<'radar' | 'bar'>('radar')
  const [exporting, setExporting] = useState<boolean>(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToast()
  const { dark } = useTheme()

  useEffect(() => {
    api.get('/vitamins/analysis').then((res) => {
      setAnalysis(res.data)
      setLoading(false)

      const criticalDef = res.data.filter((a: VitaminAnalysisItem) => a.status === 'deficiency' && a.severity >= 30)
      const excess = res.data.filter((a: VitaminAnalysisItem) => a.status === 'excess' && a.severity >= 20)
      if (criticalDef.length > 0) {
        const names = criticalDef.slice(0, 3).map((a: VitaminAnalysisItem) => a.vitamin_name).join(', ')
        addToast(`Критический дефицит: ${names}. Рекомендуем скорректировать рацион.`, 'error')
      } else if (excess.length > 0) {
        const names = excess.slice(0, 3).map((a: VitaminAnalysisItem) => a.vitamin_name).join(', ')
        addToast(`Повышенный уровень: ${names}. Проконсультируйтесь с врачом.`, 'info')
      } else if (res.data.every((a: VitaminAnalysisItem) => a.status === 'normal' || a.status === 'no_data') && res.data.some((a: VitaminAnalysisItem) => a.status === 'normal')) {
        addToast('Все витамины в норме!', 'success')
      }
    }).catch(() => {
      setError(true)
      setLoading(false)
    })
  }, [])

  const handleExportPDF = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      const el = reportRef.current
      if (!el) return
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: dark ? '#0d1117' : '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save('vitamin-analysis.pdf')
      addToast('PDF успешно экспортирован', 'success')
    } catch {
      addToast('Ошибка при экспорте PDF', 'error')
    } finally {
      setExporting(false)
    }
  }

  const chartColors = useMemo(() => getChartColors(dark), [dark])

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <TableSkeleton />
        </div>
      </PageTransition>
    )
  }

  if (error || !analysis || analysis.length === 0) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Данных пока нет</h1>
          <p className="text-gray-500 dark:text-gray-300 mb-8">Сначала введите результаты анализов или заполните анкету симптомов</p>
          <Link to="/data-entry" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
            Ввести данные
          </Link>
        </div>
      </PageTransition>
    )
  }

  const getStatusConfig = (status: string): StatusConfig => {
    switch (status) {
      case 'deficiency': return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800', label: 'Дефицит', dot: 'bg-red-500', color: '#ef4444' }
      case 'excess': return { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', label: 'Избыток', dot: 'bg-amber-500', color: '#f59e0b' }
      case 'normal': return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', label: 'Норма', dot: 'bg-emerald-500', color: '#10b981' }
      default: return { bg: 'bg-gray-50 dark:bg-white/[0.03]', text: 'text-gray-400', border: 'border-gray-200 dark:border-white/[0.06]', label: 'Нет данных', dot: 'bg-gray-300 dark:bg-gray-600', color: '#d1d5db' }
    }
  }

  const defCount = analysis.filter(a => a.status === 'deficiency').length
  const normalCount = analysis.filter(a => a.status === 'normal').length
  const excessCount = analysis.filter(a => a.status === 'excess').length

  // Radar chart data
  const radarData: RadarDataPoint[] = analysis.filter(a => a.value !== null).map(a => ({
    vitamin: a.vitamin_name.replace('Витамин ', '').replace('(', '\n('),
    value: a.norm_max > 0 ? Math.round(((a.value as number) / a.norm_max) * 100) : 0,
    fullMark: RADAR_CHART_MAX,
  }))

  // Bar chart data
  const barData: BarDataPoint[] = analysis.filter(a => a.value !== null).map(a => ({
    name: a.vitamin_name.replace('Витамин ', '').split(' ')[0],
    value: a.value,
    norm_min: a.norm_min,
    norm_max: a.norm_max,
    status: a.status,
  }))

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-semibold uppercase tracking-wider mb-4">
              Ваш анализ
            </span>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Результаты витаминного анализа</h1>
          </div>
          <div className="flex gap-2">
            <Link
              to="/analysis/history"
              className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/[0.03] text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/[0.06] transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              История
            </Link>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className={`px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors flex items-center gap-2 ${exporting ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {exporting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
              {exporting ? 'Экспорт...' : 'Экспорт PDF'}
            </button>
          </div>
        </div>

        <div ref={reportRef}>
          {/* Summary cards */}
          <StaggerChildren variant="fade-up" stagger={80} className="grid grid-cols-4 gap-4 mb-8">
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
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-white/[0.02] dark:to-white/[0.02] rounded-2xl p-5 border border-gray-200 dark:border-white/[0.08] shadow-sm">
              <div className="text-3xl font-bold text-gray-600 dark:text-gray-300">{analysis.filter(a => a.status === 'no_data').length}</div>
              <div className="text-sm text-gray-400 mt-1">Нет данных</div>
            </div>
          </StaggerChildren>

          {/* Priority Deficiencies */}
          {(() => {
            const topDeficiencies = analysis
              .filter(a => a.status === 'deficiency' && a.severity > 0)
              .sort((a, b) => b.severity - a.severity)
              .slice(0, 3)
            if (topDeficiencies.length === 0) return null
            return (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Приоритетные дефициты</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topDeficiencies.map((item) => {
                    const icon = getVitaminIcon(item.vitamin_code)
                    return (
                      <div key={item.vitamin_id} className="bg-white dark:bg-white/[0.03] rounded-2xl border border-red-100 dark:border-red-800/40 p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${icon.gradient} flex items-center justify-center text-lg`}>
                            {icon.emoji}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{item.vitamin_name}</h3>
                            <span className="text-xs font-semibold text-red-500 dark:text-red-400">Дефицит {item.severity}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          Увеличьте потребление продуктов с {item.vitamin_name.toLowerCase().startsWith('витамин') ? item.vitamin_name.toLowerCase().replace('витамин', 'витамином') : item.vitamin_name.toLowerCase()}
                        </p>
                        <Link
                          to={`/products?vitamin=${item.vitamin_id}`}
                          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                        >
                          Подобрать продукты
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Charts */}
          <AnimateIn variant="blur" className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Визуализация</h2>
              <div className="bg-gray-100 dark:bg-white/[0.06] rounded-xl p-1 inline-flex gap-1">
                <button
                  onClick={() => setChartType('radar')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${chartType === 'radar' ? 'bg-white dark:bg-white/[0.08] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-300'}`}
                >
                  Радар
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${chartType === 'bar' ? 'bg-white dark:bg-white/[0.08] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-300'}`}
                >
                  Столбцы
                </button>
              </div>
            </div>
            <div className="h-80">
              {chartType === 'radar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={chartColors.grid} />
                    <PolarAngleAxis dataKey="vitamin" tick={{ fontSize: 11, fill: chartColors.axis }} />
                    <PolarRadiusAxis angle={30} domain={[0, RADAR_CHART_MAX]} tick={{ fontSize: 10, fill: chartColors.axis }} />
                    <Radar name="Ваш уровень (%)" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: chartColors.axis }} stroke={chartColors.axisLine} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: chartColors.axis }} stroke={chartColors.axisLine} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        color: chartColors.tooltipText,
                      }}
                      labelStyle={{ color: chartColors.tooltipText }}
                      itemStyle={{ color: chartColors.tooltipText }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value} (норма: ${props.payload.norm_min}–${props.payload.norm_max})`,
                        'Значение'
                      ]}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={getStatusConfig(entry.status).color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </AnimateIn>

          {/* Vitamin cards */}
          <div className="space-y-3 mb-8">
            {analysis.map((item, idx) => {
              const config = getStatusConfig(item.status)
              const percentage = item.value !== null && item.norm_max > 0
                ? Math.min(((item.value as number) / item.norm_max) * 100, RADAR_CHART_MAX)
                : 0
              return (
                <div key={item.vitamin_id} className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 card-hover stagger-item" style={{ animationDelay: `${idx * 60}ms` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${config.dot}`}></div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.vitamin_name}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
                      {config.label} {item.severity > 0 ? `(${item.severity}%)` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full animate-bar-fill ${
                            item.status === 'deficiency' ? 'bg-red-400' :
                            item.status === 'excess' ? 'bg-amber-400' :
                            item.status === 'normal' ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                          style={{ width: `${Math.max(percentage, MIN_BAR_WIDTH_PERCENT)}%`, animationDelay: `${idx * 60 + 300}ms`, animationFillMode: 'both' }}
                        />
                      </div>
                    </div>
                    <div className="text-right min-w-[120px]">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.value !== null ? item.value : '—'}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                      <div className="text-[10px] text-gray-400">
                        норма: {item.norm_min}–{item.norm_max}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          {defCount > 0 && (
            <Link
              to="/recipes"
              className="btn-primary text-white px-8 py-3.5 rounded-2xl font-semibold inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Рекомендованные рецепты
            </Link>
          )}
          {defCount > 0 && (
            <Link
              to="/meal-plan"
              className="btn-secondary px-8 py-3.5 rounded-2xl font-semibold inline-flex items-center gap-2 text-gray-700 dark:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              План питания
            </Link>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
