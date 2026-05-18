var cacheName = 'Noise导航-2.6-20260518-optim';
var assetsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/styles.css',
  '/assets/css/custom-style.css',
  '/assets/css/loading.css',
  '/assets/css/sticker-theme.css',
  '/assets/fontawesome-5.15.4/css/all.min.css',
  '/assets/js/app-mini.js',
  '/assets/js/tooltip-extend.js',
  '/assets/js/bootstrap.min-4.3.1.js',
  '/assets/js/hot.js',
  '/assets/images/favicon.png',
  '/assets/images/favicon4.png'
];
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(assetsToCache);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== cacheName;
        }).map(function(name) {
          return caches.delete(name);
        })
      ).then(function() {
        return self.clients.claim();
      });
    })
  );
});
self.addEventListener('fetch', function(event) {
  var request = event.request;

  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAssetRequest(request)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

function isHtmlRequest(request) {
  if (request.mode === 'navigate') return true;
  var accept = request.headers.get('accept') || '';
  return accept.indexOf('text/html') !== -1;
}

function isStaticAssetRequest(request) {
  var destination = request.destination || '';
  return destination === 'script' || destination === 'style' || destination === 'worker' || destination === 'image' || destination === 'font';
}

function normalizedCacheKey(request) {
  try {
    var url = new URL(request.url);
    if (url.origin !== self.location.origin) return request;
    if (url.pathname.indexOf('/assets/') !== 0 && url.pathname !== '/manifest.json') return request;
    if (!url.search && !url.hash) return request;
    url.search = '';
    url.hash = '';
    return new Request(url.toString(), { method: 'GET' });
  } catch (e) {
    return request;
  }
}

function networkFirst(request) {
  return fetch(request).then(function(networkResponse) {
    return caches.open(cacheName).then(function(cache) {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    });
  }).catch(function() {
    return caches.match(request).then(function(cached) {
      return cached || caches.match('/index.html');
    });
  });
}

function staleWhileRevalidate(request) {
  var cacheKey = normalizedCacheKey(request);
  return caches.match(cacheKey).then(function(cachedResponse) {
    var networkPromise = fetch(request).then(function(networkResponse) {
      return caches.open(cacheName).then(function(cache) {
        cache.put(cacheKey, networkResponse.clone());
        return networkResponse;
      });
    }).catch(function() {
      return null;
    });

    if (cachedResponse) {
      return cachedResponse;
    }

    return networkPromise.then(function(networkResponse) {
      return networkResponse || fetch(request);
    });
  });
}

function cacheFirst(request) {
  var cacheKey = normalizedCacheKey(request);
  return caches.match(cacheKey).then(function(cachedResponse) {
    if (cachedResponse) return cachedResponse;
    return fetch(request).then(function(networkResponse) {
      return caches.open(cacheName).then(function(cache) {
        cache.put(cacheKey, networkResponse.clone());
        return networkResponse;
      });
    }).catch(function() {
      return cachedResponse;
    });
  });
}
