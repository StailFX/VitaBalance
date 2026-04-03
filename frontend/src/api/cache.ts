import type { AxiosInstance, AxiosResponse } from 'axios'

interface CacheEntry<T = unknown> {
  data: T
  ts: number
  ttl: number
}

interface CachedResponse<T = unknown> {
  data: T
  fromCache?: boolean
}

const cache = new Map<string, CacheEntry>()
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

export function getCached<T = unknown>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.ts > entry.ttl) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function setCache<T = unknown>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  cache.set(key, { data, ts: Date.now(), ttl })
}

export function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

interface CachedGetOptions {
  ttl?: number
  params?: Record<string, string | number | boolean>
}

/**
 * Cached GET request wrapper.
 * Usage: const res = await cachedGet(api, '/vitamins/', { ttl: 60000 })
 */
export async function cachedGet<T = unknown>(
  apiInstance: AxiosInstance,
  url: string,
  { ttl = DEFAULT_TTL, params }: CachedGetOptions = {}
): Promise<CachedResponse<T>> {
  const cacheKey = url + (params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '')
  const cached = getCached<T>(cacheKey)
  if (cached) return { data: cached, fromCache: true }

  const res: AxiosResponse<T> = await apiInstance.get(url, { params })
  setCache(cacheKey, res.data, ttl)
  return res
}
