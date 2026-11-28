/*
 * 热门站点（全站共享排序）
 * 1. 点击卡片时上报到 yaml-server 的 /api/hot-sites/click
 * 2. 首页加载时读取 /api/hot-sites?limit=100，按所有访客的累计点击量排序
 * 3. 热门站点为空时：先放 config.toml 的 defaults，再按点击量补，最后从全站随机补足
 * 4. 接口不可用时退回本机缓存/本地计数，页面不会卡住
 * 5. 配合 content_main 的折叠逻辑固定首屏数量（data-collapse-limit）
 */
(function () {
    'use strict';

    var block = document.querySelector('.category-block[data-hot-sites="true"]');
    if (!block) return;

    var grids = Array.prototype.slice.call(block.querySelectorAll('.row.card-list'));

    var limit = parseInt(block.getAttribute('data-hot-limit'), 10);
    // limit=0 或未设置时不限制榜单数量，兜底取服务端接口上限 100（服务端 MAX_LIMIT）
    if (!(limit > 0)) limit = 100;

    var storageKey = block.getAttribute('data-hot-storage-key') || 'noisedh_site_clicks_v1';
    var cacheKey = storageKey + '_server';
    var apiBase = String(block.getAttribute('data-hot-api') || '').replace(/\/+$/, '');

    var defaults = [];
    try {
        var parsedDefaults = JSON.parse(block.getAttribute('data-hot-defaults') || '[]');
        if (Array.isArray(parsedDefaults)) defaults = parsedDefaults;
    } catch (e) {}

    var counts = {};

    function readJSON(key) {
        try {
            var raw = window.localStorage.getItem(key);
            var data = raw ? JSON.parse(raw) : null;
            return data && typeof data === 'object' ? data : null;
        } catch (e) {
            return null;
        }
    }

    function writeJSON(key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {}
    }

    function getCards(grid) {
        return Array.prototype.filter.call(grid.children, function (el) {
            return el.classList && el.classList.contains('url-card');
        });
    }

    function cardUrl(card) {
        var link = card.querySelector('a.togo');
        return link ? (link.getAttribute('href') || '') : '';
    }

    // 全站候选池：除热门块以外所有分类里已渲染的卡片，按 URL 去重
    function collectPool() {
        var pool = [];
        var seen = {};
        var nodes = document.querySelectorAll('.category-block .url-card');

        Array.prototype.forEach.call(nodes, function (card) {
            if (block.contains(card)) return;
            var url = cardUrl(card);
            if (!url || seen[url]) return;
            seen[url] = 1;
            pool.push(card);
        });

        return pool;
    }

    function ensureGrid() {
        var grid = block.querySelector('.row.card-list');
        if (grid) return grid;

        grid = document.createElement('div');
        grid.className = 'row card-list';

        var title = block.querySelector('.category-title');
        if (title && title.parentNode === block) {
            block.insertBefore(grid, title.nextSibling);
        } else {
            block.appendChild(grid);
        }

        return grid;
    }

    // 热门站点没有手写 links 时，自动组一张固定数量的榜单
    function buildFromPool() {
        var current = block.querySelector('.row.card-list');
        if (current && getCards(current).length) return;

        var pool = collectPool();
        if (!pool.length) return;

        var byUrl = {};
        pool.forEach(function (card) {
            byUrl[cardUrl(card)] = card;
        });

        var picked = [];
        var used = {};

        function take(card) {
            var url = cardUrl(card);
            if (!url || used[url]) return;
            used[url] = true;
            picked.push(card);
        }

        // 1) config.toml 里指定的默认站点
        (defaults || []).forEach(function (url) {
            if (picked.length >= limit) return;
            if (typeof url !== 'string') return;
            if (byUrl[url]) take(byUrl[url]);
        });

        // 2) 服务端/本机缓存里的点击排行
        Object.keys(counts).sort(function (a, b) {
            return (Number(counts[b]) || 0) - (Number(counts[a]) || 0);
        }).forEach(function (url) {
            if (picked.length >= limit) return;
            if (byUrl[url]) take(byUrl[url]);
        });

        // 3) 不足 limit 时从全站随机补足
        if (picked.length < limit) {
            var rest = pool.slice();
            for (var i = rest.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = rest[i];
                rest[i] = rest[j];
                rest[j] = tmp;
            }
            rest.forEach(function (card) {
                if (picked.length >= limit) return;
                take(card);
            });
        }

        if (!picked.length) return;

        var grid = ensureGrid();
        grid.dataset.hotAuto = '1';
        picked.forEach(function (card) {
            var clone = card.cloneNode(true);
            clone.classList.remove('is-collapsed-item');
            clone.removeAttribute('data-hot-base-index');

            // 交给主题的懒加载/回退逻辑处理，加载失败或空白会自动回退默认 logo
            var img = clone.querySelector('img.lazy');
            if (img) img.removeAttribute('loading');

            grid.appendChild(clone);
        });

        // 首次构建时主题的加载器还没挂到 window 上，交给 DOMContentLoaded 的初始化；
        // 服务端数据返回后重建的卡片需要主动触发一次
        if (typeof window.__navLoadImage === 'function') {
            grid.querySelectorAll('img.lazy[data-src]').forEach(function (img) {
                window.__navLoadImage(img);
            });
        }
    }

    // 服务端数据回来后重新选一次人：榜单是按点击量挑选的，不能只排序不换卡片
    function rebuildAutoGrid() {
        var grid = block.querySelector('.row.card-list[data-hot-auto="1"]');
        if (!grid) return;
        grid.innerHTML = '';
        buildFromPool();
    }

    // 排序后同步折叠边界；始终保留标记，展开/收起由 .is-expanded 的 CSS 控制
    // 折叠阈值读网格自身的 data-collapse-limit（首屏展示数），与榜单总数 limit 相互独立
    function syncCollapse(grid) {
        if (!grid.dataset.collapseId) return;
        var collapseAttr = parseInt(grid.getAttribute('data-collapse-limit'), 10);
        var collapseAt = collapseAttr > 0 ? collapseAttr : limit;
        getCards(grid).forEach(function (card, index) {
            card.classList.toggle('is-collapsed-item', index >= collapseAt);
        });
    }

    function applyCounts(next) {
        if (!next || typeof next !== 'object') return;
        counts = next;
        grids.forEach(function (grid) {
            var cards = getCards(grid);
            if (!cards.length) return;

            cards.forEach(function (card, index) {
                if (card.dataset.hotBaseIndex == null) {
                    card.dataset.hotBaseIndex = String(index);
                }
            });

            var ranked = cards.slice().sort(function (a, b) {
                var diff = (Number(counts[cardUrl(b)]) || 0) - (Number(counts[cardUrl(a)]) || 0);
                if (diff) return diff;
                return Number(a.dataset.hotBaseIndex) - Number(b.dataset.hotBaseIndex);
            });

            var frag = document.createDocumentFragment();
            ranked.forEach(function (card) {
                frag.appendChild(card);
            });
            grid.appendChild(frag);
            syncCollapse(grid);
        });
    }

    function loadCache() {
        var cached = readJSON(cacheKey);
        if (cached && cached.counts && typeof cached.counts === 'object') {
            applyCounts(cached.counts);
        }
    }

    function refreshFromServer() {
        if (!apiBase || !window.fetch) return;
        var controller = window.AbortController ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, 5000) : null;

        fetch(apiBase + '/api/hot-sites?limit=100', {
            mode: 'cors',
            credentials: 'omit',
            signal: controller ? controller.signal : undefined
        }).then(function (response) {
            return response && response.ok ? response.json() : null;
        }).then(function (data) {
            if (!data || !Array.isArray(data.sites)) return;
            var next = {};
            data.sites.forEach(function (item) {
                if (item && item.url) next[String(item.url)] = Number(item.count) || 0;
            });
            writeJSON(cacheKey, { t: Date.now(), counts: next });
            counts = next;
            rebuildAutoGrid();
            applyCounts(next);
        }).catch(function () {
            // 接口不可用：保留本地缓存顺序
        }).then(function () {
            if (timer) clearTimeout(timer);
        });
    }

    function reportClick(url) {
        if (!apiBase || !window.fetch) return;
        try {
            fetch(apiBase + '/api/hot-sites/click', {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                keepalive: true,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            }).catch(function () {});
        } catch (e) {}
    }

    function handleClick(link) {
        var card = link.closest ? link.closest('.url-card') : null;
        if (!card) return;

        var url = cardUrl(card);
        if (!url || !/^https?:\/\//i.test(url)) return;

        // 本机先加一，刷新后以服务端计数为准
        counts[url] = (Number(counts[url]) || 0) + 1;
        writeJSON(cacheKey, { t: Date.now(), counts: counts });
        reportClick(url);
    }

    // 全站任意站点卡片的「主链接」和「直达」按钮都计入，热门榜才能从全站冒出来
    function onLinkClick(event) {
        var target = event.target;
        if (!target || !target.closest) return;

        var link = target.closest('a.card, a.togo');
        if (!link) return;

        handleClick(link);
    }

    document.addEventListener('click', onLinkClick, true);
    document.addEventListener('auxclick', function (event) {
        if (event.button !== 1) return;
        onLinkClick(event);
    }, true);

    loadCache();
    buildFromPool();

    // 空分类时网格由 buildFromPool 现建，这里重新取一次
    grids = Array.prototype.slice.call(block.querySelectorAll('.row.card-list'));

    refreshFromServer();
})();
