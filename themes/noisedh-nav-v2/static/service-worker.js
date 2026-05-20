var cacheName = 'Noise导航-2.6-20260518-optim';
var VERSION_KEY = 'site_version';
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

// 检查是否有新版本
function checkForUpdate() {
  return caches.open(cacheName).then(function(cache) {
    return fetch('/').then(function(response) {
      if (!response.ok) return null;
      return response.text().then(function(html) {
        var match = html.match(/name="site-version" content="([^"]+)"/);
        var newVersion = match ? match[1] : null;
        if (!newVersion) return null;
        
        return new Promise(function(resolve) {
          // 从缓存中获取旧版本
          caches.match('/').then(function(cachedResponse) {
            if (!cachedResponse) {
              resolve(newVersion);
              return;
            }
            cachedResponse.text().then(function(cachedHtml) {
              var cachedMatch = cachedHtml.match(/name="site-version" content="([^"]+)"/);
              var oldVersion = cachedMatch ? cachedMatch[1] : null;
              resolve(oldVersion !== newVersion ? newVersion : null);
            }).catch(function() {
              resolve(newVersion);
            });
          }).catch(function() {
            resolve(newVersion);
          });
        });
      });
    }).catch(function() {
      return null;
    });
  });
}

// 通知所有客户端有新版本
function notifyClientsOfUpdate() {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
    clients.forEach(function(client) {
      // 直接发送刷新指令
      client.postMessage({ type: 'refresh' });
    });
  });
}

// 监听页面消息
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // 页面确认刷新
  if (event.data && event.data.type === 'REFRESH_PAGE') {
    notifyAllClients({ type: 'refresh' });
  }
});

function notifyAllClients(data) {
  self.clients.matchAll({ type: 'window' }).then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage(data);
    });
  });
}

self.addEventListener('fetch', function(event) {
  var request = event.request;

  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  if (isHtmlRequest(request)) {
    // 优化：先返回缓存，后台更新（实现秒开）
    event.respondWith(staleWhileRevalidateWithVersionCheck(request));
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

// 增强版 stale-while-revalidate：检测版本更新并自动刷新
function staleWhileRevalidateWithVersionCheck(request) {
  var cacheKey = normalizedCacheKey(request);
  return caches.match(cacheKey).then(function(cachedResponse) {
    // 先返回缓存
    var cachedClone = cachedResponse ? cachedResponse.clone() : null;
    
    // 后台更新
    fetch(request).then(function(networkResponse) {
      if (networkResponse.ok) {
        caches.open(cacheName).then(function(cache) {
          cache.put(cacheKey, networkResponse.clone());
          
          // 检查版本更新
          networkResponse.text().then(function(html) {
            var match = html.match(/name="site-version" content="([^"]+)"/);
            var newVersion = match ? match[1] : null;
            
            if (cachedClone && newVersion) {
              cachedResponse.text().then(function(cachedHtml) {
                var cachedMatch = cachedHtml.match(/name="site-version" content="([^"]+)"/);
                var oldVersion = cachedMatch ? cachedMatch[1] : null;
                
                // 版本不同，自动刷新页面
                if (oldVersion && oldVersion !== newVersion) {
                  // 自动刷新获取最新内容
                  notifyAllClients({ type: 'refresh' });
                }
              });
            }
          });
        });
      }
    }).catch(function() {});
    
    // 立即返回缓存
    return cachedClone;
  }).catch(function() {
    return fetch(request);
  });
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
