import type { ReactNode } from 'react'
import AnimateIn, { StaggerChildren } from '../AnimateIn'

interface CountsData {
  vitamins: number
}

interface FeatureInfo {
  title: string
  desc: string
  icon: ReactNode
  gradient: string
  bg: string
}

interface VitaminInfo {
  name: string
  icon: string
  color: string
}

const vitamins: VitaminInfo[] = [
  { name: 'Витамин A', icon: '\u{1F955}', color: 'from-orange-400 to-amber-500' },
  { name: 'B1 Тиамин', icon: '\u{1F33E}', color: 'from-yellow-500 to-amber-600' },
  { name: 'B2 Рибофлав.', icon: '\u{1F95B}', color: 'from-amber-400 to-orange-400' },
  { name: 'B3 Ниацин', icon: '\u{1F525}', color: 'from-red-400 to-orange-500' },
  { name: 'B5 Пантотен.', icon: '\u{26A1}', color: 'from-cyan-400 to-teal-500' },
  { name: 'B6 Пиридокс.', icon: '\u{1F9EC}', color: 'from-indigo-400 to-blue-500' },
  { name: 'B9 Фолиевая', icon: '\u{1F96C}', color: 'from-emerald-400 to-green-500' },
  { name: 'B12 Кобалам.', icon: '\u{1F534}', color: 'from-pink-400 to-rose-500' },
  { name: 'Витамин C', icon: '\u{1F34A}', color: 'from-yellow-400 to-orange-400' },
  { name: 'Витамин D', icon: '\u{2600}\u{FE0F}', color: 'from-amber-300 to-yellow-400' },
  { name: 'Витамин E', icon: '\u{2728}', color: 'from-green-400 to-emerald-500' },
  { name: 'Витамин K', icon: '\u{1FA78}', color: 'from-lime-400 to-green-500' },
  { name: 'Железо', icon: '\u{1F4AA}', color: 'from-red-400 to-red-500' },
  { name: 'Кальций', icon: '\u{1F9B4}', color: 'from-sky-400 to-blue-500' },
  { name: 'Магний', icon: '\u{1F9E0}', color: 'from-purple-400 to-violet-500' },
  { name: 'Цинк', icon: '\u{1F6E1}\u{FE0F}', color: 'from-sky-300 to-slate-400' },
  { name: 'Селен', icon: '\u{1F33F}', color: 'from-teal-400 to-emerald-500' },
  { name: 'Фосфор', icon: '\u{1F9EA}', color: 'from-blue-400 to-indigo-500' },
  { name: 'Калий', icon: '\u{1F34C}', color: 'from-yellow-400 to-lime-500' },
  { name: 'Омега-3', icon: '\u{1F41F}', color: 'from-sky-400 to-cyan-500' },
]

const features: FeatureInfo[] = [
  {
    title: 'Анализ витаминов',
    desc: 'Определение дефицитов и профицитов ключевых витаминов и минералов по вашим данным',
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

function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return many
  if (last > 1 && last < 5) return few
  if (last === 1) return one
  return many
}

function SectionSkeleton() {
  return (
    <section className="content-auto py-12 sm:py-20">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 space-y-4">
        <div className="skeleton h-6 w-32 mx-auto" />
        <div className="skeleton h-10 w-3/4 mx-auto rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="skeleton h-44 rounded-3xl" />
          <div className="skeleton h-44 rounded-3xl" />
          <div className="skeleton h-44 rounded-3xl" />
        </div>
      </div>
    </section>
  )
}

export default function HomeSecondarySections({
  counts,
  user,
  isDesktop,
}: {
  counts: CountsData
  user: boolean
  isDesktop: boolean
}) {
  return (
    <>
      <section className="content-auto py-16 sm:py-24 relative">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <AnimateIn variant="fade-up" className="text-center mb-12 sm:mb-16">
            <span className="section-eyebrow inline-block px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-primary-100 dark:border-primary-500/20">
              Как это работает
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Три простых шага к <span className="gradient-text">здоровому рациону</span>
            </h2>
          </AnimateIn>

          <StaggerChildren variant="fade-up" stagger={120} className="grid sm:grid-cols-3 gap-5 sm:gap-6">
            {[
              {
                step: 1,
                title: 'Введите данные',
                desc: 'Загрузите результаты лабораторных анализов или заполните анкету самочувствия',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                  </svg>
                ),
                gradient: 'from-primary-500 to-primary-600',
              },
              {
                step: 2,
                title: 'Получите анализ',
                desc: 'Система определит дефициты и профициты с учётом вашего пола и возраста',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                  </svg>
                ),
                gradient: 'from-cyan-500 to-primary-500',
              },
              {
                step: 3,
                title: 'Подберите рецепты',
                desc: 'Получите персональную подборку рецептов, ранжированных по релевантности',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12" />
                  </svg>
                ),
                gradient: 'from-accent-500 to-cyan-500',
              },
            ].map((item, index) => (
              <div key={item.step} className="group relative">
                {index < 2 && (
                  <div className="hidden sm:block absolute top-14 -right-3 sm:-right-3.5 w-6 sm:w-7 border-t-2 border-dashed border-gray-200 dark:border-white/[0.08] z-0" />
                )}
                <div className="relative bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-gray-200 dark:border-white/[0.08] shadow-sm card-hover hover-lift h-full min-h-[250px] flex flex-col items-start">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Шаг {item.step}</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1.5 mb-2">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{item.desc}</p>
                </div>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <section className="content-auto py-16 sm:py-24 relative">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <AnimateIn variant="fade-up" className="text-center mb-12 sm:mb-16">
            <span className="section-eyebrow inline-block px-4 py-1.5 rounded-full bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-accent-100 dark:border-accent-500/20">
              Возможности
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Всё для вашего <span className="gradient-text">витаминного здоровья</span>
            </h2>
          </AnimateIn>

          <StaggerChildren variant="scale" stagger={100} className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            {features.map((feature) => (
              <div key={feature.title} className={`${feature.bg} surface-tint-card rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-slate-200/70 dark:border-white/[0.04] relative overflow-hidden`}>
                <div className="relative z-10">
                  <div className={`surface-icon w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-4 shadow-lg`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1.5">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{feature.desc}</p>
                </div>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {!isDesktop && (
        <section className="content-auto py-12 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Отслеживаем <span className="gradient-text">{counts.vitamins} витаминов</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {vitamins.slice(0, 6).map((vitamin) => (
                <div key={vitamin.name} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] shadow-sm">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${vitamin.color} flex items-center justify-center text-sm shadow-sm flex-shrink-0`}>
                    {vitamin.icon}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{vitamin.name}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs font-medium text-gray-600 dark:text-gray-300">
              ...и ещё {counts.vitamins - 6} {plural(counts.vitamins - 6, 'показатель', 'показателя', 'показателей')}
            </p>
          </div>
        </section>
      )}

      <section className="content-auto py-16 sm:py-24">
        <AnimateIn variant="blur" className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-900 p-8 sm:p-12 lg:p-16 text-center">
            <div className="hidden sm:block absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/[0.05] blur-2xl" />
            <div className="hidden sm:block absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-accent-400/10 blur-2xl" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
                Готовы узнать свой витаминный баланс?
              </h2>
              <p className="mb-8 max-w-lg mx-auto text-base text-primary-100/90 sm:mb-10 sm:text-lg">
                Начните прямо сейчас — это бесплатно. Введите данные и получите персональные рекомендации.
              </p>
              <a
                href={user ? '/data-entry' : '/register'}
                className="inline-flex items-center gap-2 bg-white dark:!bg-white text-primary-700 dark:text-primary-700 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base hover:bg-primary-50 dark:hover:!bg-primary-50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0"
              >
                {user ? 'Ввести данные' : 'Создать аккаунт бесплатно'}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        </AnimateIn>
      </section>
    </>
  )
}

export { SectionSkeleton as HomeSecondarySectionsSkeleton }
