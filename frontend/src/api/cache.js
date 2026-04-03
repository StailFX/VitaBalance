/**
 * Simple in-memory cache for API responses.
 * Caches GET requests to avoid redundant network calls during navigation.
 */
const cache = new Map()
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

export function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > entry.ttl) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function setCache(key, data, ttl = DEFAULT_TTL) {
  cache.set(key, { data, ts: Date.now(), ttl })
}

export function invalidateCache(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

/**
 * Cached GET request wrapper.
 * Usage: const data = await cachedGet(api, '/vitamins/', { ttl: 60000 })
 */
export async function cachedGet(apiInstance, url, { ttl = DEFAULT_TTL, params } = {}) {
  const cacheKey = url + (params ? '?' + new URLSearchParams(params).toString() : '')
  const cached = getCached(cacheKey)
  if (cached) return { data: cached, fromCache: true }

  const res = await apiInstance.get(url, { params })
  setCache(cacheKey, res.data, ttl)
  return res
}
