const CACHE_NAME = 'qlhs-v14';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/storage.js',
    './js/classroom.js',
    './js/grades.js',
    './js/reports.js',
    './js/classroom_transfer.js',
    // External libs (keep cached for performance)
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// 1. Install Event: Cache static assets properly
self.addEventListener('install', (e) => {
    // Force SW to active immediately
    self.skipWaiting();

    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching assets');
            return cache.addAll(ASSETS);
        })
    );
});

// 2. Activate Event: Clean up old caches & Claim clients
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Clearing old cache', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Clients claimed');
            return self.clients.claim();
        })
    );
});

// 3. Fetch Event: Network First strategy for local files
self.addEventListener('fetch', (e) => {
    // Identify if request is for our own app files
    const isAppFile = e.request.url.includes(self.location.origin);

    if (isAppFile) {
        // NETWORK FIRST: Try to fetch from server to get latest version
        e.respondWith(
            fetch(e.request)
                .then((networkResponse) => {
                    // If successful, update the cache with new version
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // If offline/network fails, fall back to cache
                    return caches.match(e.request);
                })
        );
    } else {
        // CACHE FIRST: For external libraries (CDN), performance priority
        e.respondWith(
            caches.match(e.request).then((response) => response || fetch(e.request))
        );
    }
});
