var cacheName = 'Noise导航-2.7-20260520';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll([
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
      ]);
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

  // HTML页面：网络优先，确保显示最新内容
  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 静态资源：缓存优先，加速加载
  if (isStaticAssetRequest(request)) {
    event.respondWith(cacheFirst(request));
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

// 网络优先：优先获取最新内容，失败时使用缓存
function networkFirst(request) {
  return fetch(request).then(function(networkResponse) {
    if (networkResponse && networkResponse.ok) {
      caches.open(cacheName).then(function(cache) {
        cache.put(request, networkResponse.clone());
      });
    }
    return networkResponse;
  }).catch(function() {
    return caches.match(request);
  });
}

// 缓存优先：立即返回缓存，不等待网络
function cacheFirst(request) {
  return caches.match(request).then(function(cachedResponse) {
    if (cachedResponse) return cachedResponse;
    return fetch(request).then(function(networkResponse) {
      if (networkResponse && networkResponse.ok) {
        caches.open(cacheName).then(function(cache) {
          cache.put(request, networkResponse.clone());
        });
      }
      return networkResponse;
    }).catch(function() {
      return cachedResponse;
    });
  });
}
