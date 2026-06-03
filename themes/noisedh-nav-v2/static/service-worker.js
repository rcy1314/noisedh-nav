var cacheName = 'Noise导航-2.7-20260603';

function withScope(path) {
  return new URL(path, self.registration.scope).toString();
}

function normalizeRequest(request) {
  try {
    var url = new URL(request.url);
    url.search = '';
    url.hash = '';
    return new Request(url.toString(), {
      method: 'GET',
      mode: request.mode,
      credentials: request.credentials,
      redirect: request.redirect
    });
  } catch (e) {
    return request;
  }
}

var precacheList = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/iconfont-3.03029.1.css',
  './assets/css/bootstrap.min-4.3.1.css',
  './assets/css/styles.css',
  './assets/css/loading.css',
  './assets/css/custom-style.css',
  './assets/css/sticker-theme.css',
  './assets/css/APlayer.min.css',
  './assets/css/hot.css',
  './assets/fontawesome-5.15.4/css/all.min.css',
  './assets/fontawesome-5.15.4/css/v4-shims.min.css',
  './assets/js/jquery.min.js',
  './assets/js/jquery.ui.touch-punch.min-0.2.2.js',
  './assets/js/tooltip-extend.js',
  './assets/js/bootstrap.min-4.3.1.js',
  './assets/js/theia-sticky-sidebar-1.5.0.js',
  './assets/js/APlayer.min.js',
  './assets/js/Meting.min.js',
  './assets/js/app-mini.js',
  './assets/js/hot.js',
  './assets/images/favicon.png',
  './assets/images/favicon4.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return Promise.all(
        precacheList.map(function(path) {
          return cache.add(withScope(path)).catch(function() {
          });
        })
      );
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
  if (destination === 'script' || destination === 'style' || destination === 'worker' || destination === 'image' || destination === 'font') {
    return true;
  }
  try {
    var pathname = new URL(request.url).pathname || '';
    return /\.(css|js|mjs|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|otf|eot)$/.test(pathname);
  } catch (e) {
    return false;
  }
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
  var normalizedRequest = normalizeRequest(request);
  return caches.match(normalizedRequest).then(function(cachedResponse) {
    if (cachedResponse) {
      fetch(request).then(function(networkResponse) {
        if (networkResponse && networkResponse.ok) {
          caches.open(cacheName).then(function(cache) {
            cache.put(normalizedRequest, networkResponse.clone());
          });
        }
      }).catch(function() {
      });
      return cachedResponse;
    }
    return fetch(request).then(function(networkResponse) {
      if (networkResponse && networkResponse.ok) {
        caches.open(cacheName).then(function(cache) {
          cache.put(normalizedRequest, networkResponse.clone());
        });
      }
      return networkResponse;
    }).catch(function() {
      return caches.match(normalizedRequest);
    });
  });
}
