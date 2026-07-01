/* 4X4 COUKOO offline shell. Runtime files are cached after first successful load. */
const CACHE_VERSION = '4x4-coukoo-v1.13.1'
const CORE_CACHE = `${CACHE_VERSION}-core`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const CORE_FILES = [
    './',
    './index.html',
    './offline.html',
    './manifest.webmanifest',
    './favicons/favicon.svg',
    './favicons/web-app-manifest-192x192.png',
    './favicons/web-app-manifest-512x512.png',
]
const CACHEABLE_TYPES = /\.(?:js|css|woff2?|ttf|eot|svg|png|jpe?g|webp|ico|webmanifest|glb|ktx|wasm|mp3|wav)$/i

const isCacheable = (request, url) =>
    request.method === 'GET'
    && url.origin === self.location.origin
    && CACHEABLE_TYPES.test(url.pathname)

const cachePut = async (cache, request, response) =>
{
    if(!response || !response.ok || response.type === 'opaque')
        return response

    try
    {
        await cache.put(request, response.clone())
    }
    catch(error)
    {
        // Storage quota is device-controlled. The online game still works if a
        // browser declines a large offline asset.
        console.warn('4X4 COUKOO cache write skipped.', error)
    }

    return response
}

self.addEventListener('install', (event) =>
{
    event.waitUntil(
        caches.open(CORE_CACHE)
            .then((cache) => cache.addAll(CORE_FILES))
    )
})

self.addEventListener('activate', (event) =>
{
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.startsWith('4x4-coukoo-') && !key.startsWith(CACHE_VERSION))
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    )
})

self.addEventListener('message', (event) =>
{
    if(event.data?.type === 'SKIP_WAITING')
        self.skipWaiting()
})

self.addEventListener('fetch', (event) =>
{
    const { request } = event
    const url = new URL(request.url)

    if(request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.endsWith('/sw.js'))
        return

    if(request.mode === 'navigate')
    {
        event.respondWith(
            fetch(request)
                .then(async (response) =>
                {
                    const cache = await caches.open(CORE_CACHE)
                    return cachePut(cache, request, response)
                })
                .catch(async () =>
                {
                    const cache = await caches.open(CORE_CACHE)
                    return (await cache.match(request))
                        || (await cache.match('./index.html'))
                        || (await cache.match('./offline.html'))
                })
        )
        return
    }

    if(!isCacheable(request, url))
        return

    event.respondWith(
        caches.open(RUNTIME_CACHE).then(async (cache) =>
        {
            const cached = await cache.match(request)
            if(cached)
            {
                event.waitUntil(
                    fetch(request)
                        .then((response) => cachePut(cache, request, response))
                        .catch(() => undefined)
                )
                return cached
            }

            const response = await fetch(request)
            return cachePut(cache, request, response)
        })
    )
})
