export default function LayoutFooter() {
  return (
    <footer className="content-auto border-t border-gray-200 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">VitaBalance</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Персонализированный подбор рациона питания на основе анализа витаминного баланса.
            </p>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-gray-700 dark:text-gray-200">Навигация</div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <a href="/vitamins" className="block hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Справочник витаминов</a>
              <a href="/products" className="block hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Поиск продуктов</a>
              <a href="/recipes" className="block hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Рецепты</a>
              <a href="/register" className="block hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Регистрация</a>
            </div>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-gray-700 dark:text-gray-200">Важно</div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Сервис не заменяет консультацию врача. Рекомендации носят информационный характер. Для точной диагностики обратитесь к специалисту.
            </p>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-500 dark:border-white/[0.06] dark:text-gray-400">
          &copy; 2026 VitaBalance. Все права защищены.
        </div>
      </div>
    </footer>
  )
}
