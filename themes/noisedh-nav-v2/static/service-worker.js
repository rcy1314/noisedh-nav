var cacheName = 'Noise导航-2.9-20261128';
var IMAGE_CACHE_MAX_ENTRIES = 2000;

function withScope(path) {
  return new URL(path, self.registration.scope).toString();
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
  './assets/js/hot-sites.js',
  './assets/images/favicon.png',
  './assets/images/favicon4.png',
  // 站点自有图片：卡片默认 logo 与侧栏 logo（页面不带版本号引用，预缓存可直接命中）
  './assets/images/favicon5.png',
  './assets/images/logo-collapse-light.png',
  './assets/images/logo-collapse-dark.png',
  './assets/images/bioitee-expand-light.png',
  './assets/images/bioitee-expand-dark.png'
];

// 预缓存条目的绝对 URL 集合：容量清理时跳过，保证基础资源不被逐出
var precacheUrls = precacheList.map(withScope);

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

  // 接口请求：网络优先，保证热门排行等数据实时（失败时回退缓存）
  if (isApiRequest(request)) {
    event.respondWith(
      fetch(request).catch(function() {
        return matchCache(request).then(function(cached) {
          return cached || Response.error();
        });
      })
    );
    return;
  }

  // HTML页面：网络优先，离线时回退缓存
  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 静态资源（含跨域图片）：缓存优先，加速加载与图片显示
  event.respondWith(cacheFirst(request));
});

function isApiRequest(request) {
  try {
    return new URL(request.url).pathname.indexOf('/api/') !== -1;
  } catch (e) {
    return false;
  }
}

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

// 安全读取缓存：caches.match 对 cache:'no-store' 等特殊请求会抛 TypeError，
// 统一兜底为 undefined，保证 respondWith 的 Promise 在任何请求形态下都必然 settle
function matchCache(request) {
  try {
    return caches.match(request).catch(function() {
      return undefined;
    });
  } catch (e) {
    return Promise.resolve(undefined);
  }
}

// 安全写入缓存：同步 clone 必须在调用方完成；此处仅兜底吞掉所有写入异常
function cacheWrite(request, clonedResponse) {
  try {
    caches.open(cacheName).then(function(cache) {
      cache.put(request, clonedResponse).catch(function() {
      });
      trimImageCache();
    }).catch(function() {
    });
  } catch (e) {
  }
}

// 允许入缓存的响应：常规成功响应 + 跨域不透明响应（卡片 logo 大多为外部 favicon，
// 属 no-cors 不透明响应 status=0，之前因 ok=false 被拒之门外，导致重复访问反复慢速重拉）
function isCacheableResponse(response) {
  if (!response) return false;
  return response.ok || response.type === 'opaque';
}

// HTML：网络优先，离线/断网时回退缓存页面
function networkFirst(request) {
  return fetch(request).then(function(response) {
    if (response && response.ok) {
      // 关键：必须在返回响应给页面的同一同步帧内完成 clone，
      // 一旦返回，页面会立刻消费 body，之后再 clone 会抛 "body is already used"
      var freshClone = response.clone();
      cacheWrite(request, freshClone);
    }
    return response;
  }, function() {
    return matchCache(request).then(function(cached) {
      return cached || Response.error();
    });
  });
}

// 缓存优先：立即返回缓存，后台静默刷新缓存供下次访问使用
// 注意：按完整 URL（含 ?v= 版本参数）匹配，构建更新版本号后旧缓存自然失效
function cacheFirst(request) {
  return matchCache(request).then(function(cachedResponse) {
    if (cachedResponse) {
      fetch(request).then(function(networkResponse) {
        if (isCacheableResponse(networkResponse)) {
          // 同步帧内 clone（原因同 networkFirst）
          var staleClone = networkResponse.clone();
          cacheWrite(request, staleClone);
        }
      }).catch(function() {
      });
      return cachedResponse;
    }
    return fetch(request).then(function(networkResponse) {
      if (isCacheableResponse(networkResponse)) {
        // 关键：必须在返回响应给页面的同一同步帧内完成 clone，
        // 一旦返回，页面会立刻消费 body，之后再 clone 会抛 "body is already used"
        var cloned = networkResponse.clone();
        cacheWrite(request, cloned);
      }
      return networkResponse;
    }, function() {
      return matchCache(request).then(function(cached) {
        return cached || Response.error();
      });
    });
  });
}

// 缓存容量保护：条目数超上限时按先入先出清理（预缓存的基础资源跳过），
// 防止长期累积的外部 logo 占满存储配额
var trimScheduled = false;
function trimImageCache() {
  if (trimScheduled) return;
  trimScheduled = true;
  setTimeout(function() {
    trimScheduled = false;
    caches.open(cacheName).then(function(cache) {
      return cache.keys().then(function(keys) {
        if (keys.length <= IMAGE_CACHE_MAX_ENTRIES) return;
        var toDelete = [];
        for (var i = 0; i < keys.length && keys.length - toDelete.length > IMAGE_CACHE_MAX_ENTRIES; i++) {
          if (precacheUrls.indexOf(keys[i].url) === -1) {
            toDelete.push(keys[i]);
          }
        }
        return Promise.all(toDelete.map(function(req) {
          return cache.delete(req);
        }));
      });
    }).catch(function() {
    });
  }, 3000);
}
