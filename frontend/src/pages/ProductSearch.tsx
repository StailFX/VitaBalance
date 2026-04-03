import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { ListSkeleton } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import type { Vitamin, ProductSearchResult } from '../types'

const categoryEmoji: Record<string, string> = {
  'Фрукты и ягоды': '🍎',
  'Овощи': '🥦',
  'Мясо и птица': '🥩',
  'Рыба и морепродукты': '🐟',
  'Молочные продукты': '🥛',
  'Крупы и злаки': '🌾',
  'Орехи и семена': '🥜',
  'Яйца': '🥚',
  'Бобовые': '🫘',
  'Зелень': '🌿',
}

export default function ProductSearch() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<ProductSearchResult[]>([])
  const [vitamins, setVitamins] = useState<Vitamin[]>([])
  const [search, setSearch] = useState('')
  const [vitaminFilter, setVitaminFilter] = useState(searchParams.get('vitamin_id') || '')
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get('/vitamins/').then(res => {
      setVitamins(res.data)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      addToast('Ошибка загрузки витаминов', 'error')
    })
  }, [addToast])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (vitaminFilter) params.set('vitamin_id', vitaminFilter)
      api.get(`/vitamins/products?${params.toString()}`).then(res => {
        setProducts(res.data)
      }).catch(() => setProducts([]))
    }, 300)
    return () => clearTimeout(debounceRef.current!)
  }, [search, vitaminFilter])

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <ListSkeleton rows={6} />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Поиск
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Поиск продуктов</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-2">Найдите продукты по названию или содержанию витаминов</p>
        </div>

        <div className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Название продукта</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  placeholder="Введите название..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Фильтр по витамину</label>
              <select
                value={vitaminFilter}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setVitaminFilter(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white"
              >
                <option value="">Все витамины</option>
                {vitamins.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-300">Ничего не найдено</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 card-hover">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/15 dark:to-orange-500/15 flex items-center justify-center flex-shrink-0 text-xl">
                    {categoryEmoji[product.category] || '🍽️'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{product.name}</h3>
                    <span className="text-xs text-gray-400">{product.category}</span>
                  </div>
                </div>
                {product.vitamin_content && product.vitamin_content.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {product.vitamin_content.map((v, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-200 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-primary-100 dark:border-primary-500/20">
                        {v.vitamin_name}: {v.amount_per_100g} {v.unit}/100г
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
