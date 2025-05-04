var cacheName = 'Noise导航-2.5-20250430-1200';
var assetsToCache = [
  'https://s2.loli.net/2024/12/01/VoIlv7M6HX8hyfR.png',
  'https://s2.loli.net/2024/12/01/d3H2LvkizVxyqUC.png',
  'https://s2.loli.net/2024/12/01/yH6TBgWY73h2xN9.png',
  'https://s2.loli.net/2024/12/01/Pw8mSDcXvea51iN.png',
  'https://s2.loli.net/2024/12/01/KP91mWiBe8qRjHt.png',
  'https://s2.loli.net/2024/12/01/RLFobE2ych9B64D.png',
  'https://s2.loli.net/2024/12/01/qvBA9W17UzixnsF.png',
  'https://s2.loli.net/2024/12/01/2Ye6tPILnjmuzhN.png',
 
  // 添加您需要缓存的其他静态资源
];
// 安装阶段：缓存静态资源
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(assetsToCache);
    })
  );
  self.skipWaiting();
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(name) {
          if (name !== cacheName) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// fetch 阶段：缓存优先，网络兜底，自动缓存新资源
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        return response; // 命中缓存，直接返回
      }
      // 未命中缓存，走网络并自动缓存
      return fetch(event.request).then(function(networkResponse) {
        if (
          !networkResponse || 
          networkResponse.status !== 200 || 
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }
        // 克隆响应流，缓存副本
        var responseToCache = networkResponse.clone();
        caches.open(cacheName).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
// 可选：缓存清理和性能监控（开发调试时用）
// function cleanUpCache() { ... }
// function monitorPerformance() { ... }
// cleanUpCache();
// monitorPerformance();
