interface CountsData {
  vitamins: number
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

function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return many
  if (last > 1 && last < 5) return few
  if (last === 1) return one
  return many
}

export default function HomeHeroVisual({ counts }: { counts: CountsData }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-cyan-500/5 to-accent-500/10 dark:from-primary-500/20 dark:via-cyan-500/10 dark:to-accent-500/15 rounded-[2rem] blur-2xl scale-105" />

      <div className="relative bg-white dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl xl:rounded-[2rem] border border-gray-200 dark:border-white/[0.08] p-5 xl:p-6 shadow-xl shadow-gray-200/50 dark:shadow-primary-500/[0.08]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Витаминный профиль</div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {counts.vitamins} {plural(counts.vitamins, 'показатель', 'показателя', 'показателей')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-50 dark:bg-accent-500/10 border border-accent-200 dark:border-accent-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
            <span className="text-xs font-semibold text-accent-600 dark:text-accent-400">Онлайн</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {vitamins.map((vitamin, index) => (
            <div
              key={vitamin.name}
              className="group animate-fade-in flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/[0.05] hover:border-primary-300 dark:hover:border-primary-500/20 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all duration-200 cursor-default"
              style={{ animationDelay: `${index * 0.04}s`, animationFillMode: 'both' }}
            >
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${vitamin.color} flex items-center justify-center text-xs shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                {vitamin.icon}
              </div>
              <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight truncate w-full">
                {vitamin.name}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200/80 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex -space-x-2">
            {['bg-primary-400', 'bg-cyan-400', 'bg-accent-400'].map((colorClass, index) => (
              <div key={colorClass} className={`w-6 h-6 rounded-full ${colorClass} border-2 border-white dark:border-[#0d1117] flex items-center justify-center`}>
                <span className="text-[8px] font-bold text-white">{['A', 'C', 'D'][index]}</span>
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Обновляется в реальном времени</span>
        </div>
      </div>
    </div>
  )
}
