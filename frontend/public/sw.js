const ASSET_CACHE = 'vitabalance-assets-v4'
const PAGE_CACHE = 'vitabalance-pages-v4'
const STATIC_ASSETS = ['/favicon.svg', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ASSET_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== ASSET_CACHE && key !== PAGE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(PAGE_CACHE).then((cache) => cache.put('/', clone))
          }

          return response
        })
        .catch(async () => {
          return (await caches.match('/')) || Response.error()
        })
    )
    return
  }

  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/manifest.json' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image'

  if (!isStaticAsset) {
    return
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) {
        return cached
      }

      const response = await fetch(request)

      if (response.ok) {
        const clone = response.clone()
        caches.open(ASSET_CACHE).then((cache) => {
          cache.put(request, clone)
        })
      }

      return response
    }).catch(async () => {
      if (request.destination === 'image') {
        return new Response('', { status: 504, statusText: 'Offline' })
      }

      const cached = await caches.match(request)
      if (cached) {
        return cached
      }

      return Response.error()
    })
  )
})
