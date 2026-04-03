import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageTransition from '../components/PageTransition'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useInView, useCountUp } from '../hooks/useAnimations'

const vitamins = [
  { name: 'Витамин A', icon: '🥕', color: 'from-orange-400 to-amber-500' },
  { name: 'Витамин C', icon: '🍊', color: 'from-yellow-400 to-orange-400' },
  { name: 'Витамин D', icon: '☀️', color: 'from-amber-300 to-yellow-400' },
  { name: 'B12', icon: '🧬', color: 'from-pink-400 to-rose-500' },
  { name: 'B6', icon: '💊', color: 'from-indigo-400 to-blue-500' },
  { name: 'Железо', icon: '💪', color: 'from-red-400 to-red-500' },
  { name: 'Кальций', icon: '🦴', color: 'from-sky-400 to-blue-500' },
  { name: 'Магний', icon: '🧠', color: 'from-purple-400 to-violet-500' },
  { name: 'Витамин E', icon: '✨', color: 'from-emerald-400 to-green-500' },
  { name: 'Фолиевая к.', icon: '🌿', color: 'from-teal-400 to-emerald-500' },
]

const features = [
  {
    title: 'Анализ витаминов',
    desc: 'Определение дефицитов и профицитов 10 ключевых витаминов и минералов по вашим данным',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50 dark:bg-blue-500/[0.08]',
  },
  {
    title: 'Умные рекомендации',
    desc: 'Алгоритм подбирает рецепты, максимально покрывающие ваши дефициты',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 dark:bg-violet-500/[0.08]',
  },
  {
    title: 'Анкета самочувствия',
    desc: 'Нет анализов? Заполните анкету симптомов — система оценит возможные дефициты',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/[0.08]',
  },
  {
    title: 'Избранные рецепты',
    desc: 'Сохраняйте понравившиеся рецепты в личную коллекцию для быстрого доступа',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50 dark:bg-rose-500/[0.08]',
  },
]

function AnimatedStat({ value, suffix = '', label, color, enabled }) {
  const count = useCountUp(parseInt(value) || 0, { enabled })
  return (
    <div>
      <div className={`text-2xl sm:text-3xl font-bold ${color}`}>{count}{suffix}</div>
      <div className="text-xs sm:text-sm text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

function StatsRow() {
  const [ref, visible] = useInView()
  const stats = [
    { value: '10', suffix: '', label: 'Витаминов', color: 'text-primary-600 dark:text-primary-400' },
    { value: '35', suffix: '+', label: 'Рецептов', color: 'text-cyan-600 dark:text-cyan-400' },
    { value: '46', suffix: '', label: 'Продуктов', color: 'text-accent-600 dark:text-accent-400' },
  ]
  return (
    <div ref={ref} className="flex items-center gap-8 sm:gap-10 pt-6 border-t border-gray-200/60 dark:border-white/[0.06]">
      {stats.map((s, i) => (
        <AnimatedStat key={i} {...s} enabled={visible} />
      ))}
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()

  return (
    <PageTransition>
      <div>
        {/* ===== HERO ===== */}
        <section className="relative flex items-center py-10 sm:py-14 lg:py-16">
          {/* Background effects — contained within hero */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-[50%] h-[50%] rounded-full bg-primary-500/[0.07] dark:bg-primary-500/[0.12] blur-3xl" />
            <div className="absolute bottom-0 right-0 w-[45%] h-[45%] rounded-full bg-cyan-500/[0.06] dark:bg-cyan-400/[0.10] blur-3xl" />
            <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-accent-500/[0.05] dark:bg-accent-400/[0.08] blur-3xl" />
            {/* Dot grid */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }} />
            {/* Floating dots */}
            <div className="hidden lg:block absolute top-[15%] right-[8%] w-3 h-3 rounded-full bg-primary-400/30 dark:bg-primary-400/50 animate-float" />
            <div className="hidden lg:block absolute top-[25%] left-[12%] w-2 h-2 rounded-full bg-cyan-400/30 dark:bg-cyan-400/50 animate-float-reverse" />
            <div className="hidden lg:block absolute bottom-[30%] right-[20%] w-2.5 h-2.5 rounded-full bg-accent-400/30 dark:bg-accent-400/50 animate-float" style={{ animationDelay: '-2s' }} />
          </div>

          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 relative z-10 w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left column — Text */}
              <div className="animate-slide-up max-w-xl lg:max-w-none">
                {/* Badge */}
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/60 dark:bg-white/[0.06] border border-primary-200/50 dark:border-primary-500/20 backdrop-blur-sm mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
                  </span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Персональный подход к здоровью</span>
                </div>

                {/* Heading */}
                <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight mb-5">
                  <span className="text-gray-900 dark:text-white block">Ваш витаминный</span>
                  <span className="gradient-text block">баланс под</span>
                  <span className="gradient-text block">контролем</span>
                </h1>

                {/* Description */}
                <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-6 max-w-md">
                  Анализируем ваши данные, находим дефициты витаминов
                  и подбираем персональные рецепты для нормализации баланса.
                </p>

                {/* CTA buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8">
                  {user ? (
                    <Link to="/data-entry" className="btn-primary text-white px-7 py-3.5 rounded-2xl text-sm sm:text-base font-semibold inline-flex items-center justify-center gap-2">
                      Ввести данные анализов
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  ) : (
                    <>
                      <Link to="/register" className="btn-primary text-white px-7 py-3.5 rounded-2xl text-sm sm:text-base font-semibold inline-flex items-center justify-center gap-2">
                        Начать бесплатно
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                      <Link to="/vitamins" className="btn-secondary text-gray-700 dark:text-gray-200 px-7 py-3.5 rounded-2xl text-sm sm:text-base font-semibold text-center">
                        Справочник витаминов
                      </Link>
                    </>
                  )}
                </div>

                {/* Stats row */}
                <StatsRow />
              </div>

              {/* Right column — Vitamin card grid */}
              <div className="hidden lg:block">
                <div className="relative">
                  {/* Glow behind the card */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-cyan-500/5 to-accent-500/10 dark:from-primary-500/20 dark:via-cyan-500/10 dark:to-accent-500/15 rounded-[2rem] blur-2xl scale-105" />

                  {/* Main card */}
                  <div className="relative bg-white dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl xl:rounded-[2rem] border border-gray-200 dark:border-white/[0.08] p-5 xl:p-6 shadow-xl shadow-gray-200/50 dark:shadow-primary-500/[0.08]">
                    {/* Card header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                          <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Витаминный профиль</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">10 показателей</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-50 dark:bg-accent-500/10 border border-accent-200 dark:border-accent-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
                        <span className="text-xs font-semibold text-accent-600 dark:text-accent-400">Онлайн</span>
                      </div>
                    </div>

                    {/* Vitamin grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {vitamins.map((v, i) => (
                        <div
                          key={v.name}
                          className="group animate-fade-in flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/[0.05] hover:border-primary-300 dark:hover:border-primary-500/20 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all duration-200 cursor-default"
                          style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'both' }}
                        >
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${v.color} flex items-center justify-center text-sm shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                            {v.icon}
                          </div>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{v.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Card footer */}
                    <div className="mt-4 pt-3 border-t border-gray-200/80 dark:border-white/[0.06] flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {['bg-primary-400', 'bg-cyan-400', 'bg-accent-400'].map((c, i) => (
                          <div key={i} className={`w-6 h-6 rounded-full ${c} border-2 border-white dark:border-[#0d1117] flex items-center justify-center`}>
                            <span className="text-[8px] font-bold text-white">{['A', 'C', 'D'][i]}</span>
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">Обновляется в реальном времени</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== DISCLAIMER ===== */}
        <section className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 mb-16 sm:mb-20">
          <div className="bg-amber-50/80 dark:bg-amber-500/[0.06] border border-amber-200/50 dark:border-amber-500/20 rounded-2xl p-5 sm:p-6 flex items-start gap-4 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200/80 leading-relaxed">
              <strong className="font-semibold">Важно:</strong> Данный сервис не заменяет консультацию врача.
              Рекомендации формируются на основе введённых данных и носят информационный характер.
            </p>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="py-16 sm:py-24 relative">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            {/* Section header */}
            <AnimateIn variant="fade-up" className="text-center mb-12 sm:mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-primary-100 dark:border-primary-500/20">
                Как это работает
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Три простых шага к{' '}
                <span className="gradient-text">здоровому рациону</span>
              </h2>
            </AnimateIn>

            {/* Steps */}
            <StaggerChildren variant="fade-up" stagger={120} className="grid sm:grid-cols-3 gap-5 sm:gap-6">
              {[
                {
                  step: '01',
                  title: 'Введите данные',
                  desc: 'Загрузите результаты лабораторных анализов или заполните анкету самочувствия',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                    </svg>
                  ),
                  gradient: 'from-primary-500 to-primary-600',
                  accent: 'primary',
                },
                {
                  step: '02',
                  title: 'Получите анализ',
                  desc: 'Система определит дефициты и профициты с учётом вашего пола и возраста',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                    </svg>
                  ),
                  gradient: 'from-cyan-500 to-primary-500',
                  accent: 'cyan',
                },
                {
                  step: '03',
                  title: 'Подберите рецепты',
                  desc: 'Получите персональную подборку рецептов, ранжированных по релевантности',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12" />
                    </svg>
                  ),
                  gradient: 'from-accent-500 to-cyan-500',
                  accent: 'accent',
                },
              ].map((item, i) => (
                <div key={i} className="group relative">
                  {/* Connector line between steps */}
                  {i < 2 && (
                    <div className="hidden sm:block absolute top-14 -right-3 sm:-right-3.5 w-6 sm:w-7 border-t-2 border-dashed border-gray-200 dark:border-white/[0.08] z-0" />
                  )}
                  <div className="relative bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-gray-100 dark:border-white/[0.06] card-hover hover-lift h-full">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {item.icon}
                    </div>
                    <span className="text-xs font-bold text-gray-300 dark:text-gray-600 uppercase tracking-wider">Шаг {item.step}</span>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1.5 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </StaggerChildren>
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section className="py-16 sm:py-24 relative">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            {/* Section header */}
            <AnimateIn variant="fade-up" className="text-center mb-12 sm:mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-accent-100 dark:border-accent-500/20">
                Возможности
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Всё для вашего{' '}
                <span className="gradient-text">витаминного здоровья</span>
              </h2>
            </AnimateIn>

            {/* Feature grid */}
            <StaggerChildren variant="scale" stagger={100} className="grid sm:grid-cols-2 gap-4 sm:gap-5">
              {features.map((f, i) => (
                <div key={i} className={`group ${f.bg} rounded-2xl sm:rounded-3xl p-6 sm:p-7 card-hover hover-lift border border-transparent dark:border-white/[0.04] relative overflow-hidden`}>
                  <div className="relative z-10">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {f.icon}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1.5">{f.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </StaggerChildren>
          </div>
        </section>

        {/* ===== MOBILE VITAMIN SHOWCASE ===== */}
        <section className="lg:hidden py-12 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Отслеживаем <span className="gradient-text">10 витаминов</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {vitamins.slice(0, 6).map((v) => (
                <div key={v.name} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] backdrop-blur-sm">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${v.color} flex items-center justify-center text-sm shadow-sm flex-shrink-0`}>
                    {v.icon}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{v.name}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">...и ещё 4 показателя</p>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-16 sm:py-24">
          <AnimateIn variant="blur" className="max-w-4xl mx-auto px-5 sm:px-8">
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-900 p-8 sm:p-12 lg:p-16 text-center">
              {/* Decorative elements */}
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/[0.05] blur-2xl" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-accent-400/10 blur-2xl" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
                  Готовы узнать свой витаминный баланс?
                </h2>
                <p className="text-primary-200/80 mb-8 sm:mb-10 max-w-lg mx-auto text-base sm:text-lg">
                  Начните прямо сейчас — это бесплатно. Введите данные и получите персональные рекомендации.
                </p>
                <Link
                  to={user ? '/data-entry' : '/register'}
                  className="inline-flex items-center gap-2 bg-white dark:!bg-white text-primary-700 dark:text-primary-700 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base hover:bg-primary-50 dark:hover:!bg-primary-50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0"
                >
                  {user ? 'Ввести данные' : 'Создать аккаунт бесплатно'}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </AnimateIn>
        </section>

      </div>
    </PageTransition>
  )
}
