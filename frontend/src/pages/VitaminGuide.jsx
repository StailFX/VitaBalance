import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { cachedGet } from '../api/cache'
import PageTransition from '../components/PageTransition'
import { ListSkeleton } from '../components/Skeleton'
import { getVitaminIcon } from '../utils/vitaminIcons'
import { useToast } from '../context/ToastContext'

// Map for keyboard layout conversion (en→ru, ru→en)
const enToRu = { q:'й',w:'ц',e:'у',r:'к',t:'е',y:'н',u:'г',i:'ш',o:'щ',p:'з','[':'х',']':'ъ',a:'ф',s:'ы',d:'в',f:'а',g:'п',h:'р',j:'о',k:'л',l:'д',';':'ж',"'":'э',z:'я',x:'ч',c:'с',v:'м',b:'и',n:'т',m:'ь',',':'б','.':'ю' }
const ruToEn = Object.fromEntries(Object.entries(enToRu).map(([k, v]) => [v, k]))

function convertLayout(str) {
  const lower = str.toLowerCase()
  let toRu = '', toEn = ''
  for (const ch of lower) {
    toRu += enToRu[ch] || ch
    toEn += ruToEn[ch] || ch
  }
  return [lower, toRu, toEn]
}

export default function VitaminGuide() {
  const [vitamins, setVitamins] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(new Set())
  const [search, setSearch] = useState('')
  const { addToast } = useToast()

  useEffect(() => {
    cachedGet(api, '/vitamins/', { ttl: 10 * 60 * 1000 }).then((res) => {
      setVitamins(res.data)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      addToast('Ошибка загрузки данных', 'error')
    })
  }, [addToast])

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const filteredVitamins = useMemo(() => {
    if (!search.trim()) return vitamins
    const variants = convertLayout(search.trim())
    return vitamins.filter((v) => {
      const fields = [v.name, v.description, v.deficiency_symptoms, v.excess_symptoms]
        .filter(Boolean).map(s => s.toLowerCase()).join(' ')
      return variants.some(q => fields.includes(q) || fields.indexOf(q) !== -1)
    })
  }, [vitamins, search])

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ListSkeleton rows={8} />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Справочник
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Витамины и минералы</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-2">Информация об основных витаминах, их функциях и симптомах дефицита</p>
        </div>

        {/* Search input */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, описанию или симптомам..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
          />
        </div>

        {filteredVitamins.length === 0 && search.trim() && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Ничего не найдено по запросу &laquo;{search}&raquo;</p>
          </div>
        )}

        <div className="space-y-4">
          {filteredVitamins.map((v) => {
            const icon = getVitaminIcon(v.code)
            const isOpen = expanded.has(v.id)
            return (
              <div
                key={v.id}
                className={`bg-white dark:bg-white/[0.03] rounded-3xl border overflow-hidden transition-all duration-300 ${
                  isOpen ? 'border-primary-200 dark:border-primary-500/30 shadow-md shadow-primary-100/50 dark:shadow-none' : 'border-gray-200 dark:border-white/[0.08] shadow-sm'
                }`}
              >
                <button
                  onClick={() => toggleExpanded(v.id)}
                  className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-gray-50/50 dark:hover:bg-white/[0.04] transition-colors"
                >
                  <div className={`w-12 h-12 rounded-2xl ${icon.bg} flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-100 dark:border-white/[0.08]`}>
                    <span className="text-2xl">{icon.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{v.name}</h3>
                    <p className="text-sm text-gray-400 truncate">{v.unit}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
                    {/* Description */}
                    <div className="bg-gray-50 dark:bg-white/[0.02] rounded-2xl p-5 mb-4">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Функции</h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{v.description}</p>
                    </div>

                    {/* Norms */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                          </svg>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Мужчины</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {v.norm_male_min}–{v.norm_male_max}
                          <span className="text-sm font-normal text-gray-400 ml-1">{v.unit}</span>
                        </div>
                      </div>
                      <div className="bg-pink-50 dark:bg-pink-900/20 rounded-2xl p-4 border border-pink-100 dark:border-pink-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                          </svg>
                          <span className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase">Женщины</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {v.norm_female_min}–{v.norm_female_max}
                          <span className="text-sm font-normal text-gray-400 ml-1">{v.unit}</span>
                        </div>
                      </div>
                    </div>

                    {/* Symptoms */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border-2 border-red-200 dark:border-red-700/50">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-800/40 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                          </div>
                          Симптомы дефицита
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{v.deficiency_symptoms}</p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border-2 border-amber-200 dark:border-amber-700/50">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                          </div>
                          Симптомы избытка
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{v.excess_symptoms}</p>
                      </div>
                    </div>

                    {/* Find products link */}
                    <Link
                      to={`/products?vitamin_id=${v.id}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-sm font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors border border-primary-100 dark:border-primary-800/50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      Найти продукты
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </PageTransition>
  )
}
