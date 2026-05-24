// 网站问候与统计
document.addEventListener("DOMContentLoaded", function () {
    // 网站问候
    const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const today = new Date();
    const hrs = today.getHours();
    const date = `${today.getFullYear()}年${(today.getMonth() + 1).toString().padStart(2, '0')}月${today.getDate().toString().padStart(2, '0')}日`;
    const siteName = window.CONFIG && window.CONFIG.siteName ? window.CONFIG.siteName : "NOISE导航";
    const greet = hrs < 5 ? `凌晨好,欢迎访问 ${siteName}` :
        hrs < 9 ? `早上好,欢迎访问 ${siteName}` :
            hrs < 11 ? `上午好,欢迎访问 ${siteName}` :
                hrs < 13 ? `中午好,欢迎访问 ${siteName}` :
                    hrs < 17 ? `下午好,欢迎访问 ${siteName}` :
                        hrs < 19 ? `傍晚好,欢迎访问 ${siteName}` :
                            hrs < 22 ? `晚上好,欢迎访问 ${siteName}` : `${siteName}提醒您，夜深了，早点休息哦😯`;
    const lbl = document.getElementById('lbl');
    if (lbl) {
        lbl.textContent = '';
        lbl.appendChild(document.createTextNode(greet));
        const dateDiv = document.createElement('div');
        dateDiv.id = 'date';
        dateDiv.textContent = '今天是:' + date;
        lbl.appendChild(dateDiv);
    }

    // 网站统计API软编码
    const statisticsApi = window.CONFIG && window.CONFIG.statisticsApi ? window.CONFIG.statisticsApi : "";
    const statisticsMode = window.CONFIG && window.CONFIG.statisticsMode ? window.CONFIG.statisticsMode : "";
    const localCountRaw = window.CONFIG && window.CONFIG.statisticsLocalUrlCount !== undefined ? window.CONFIG.statisticsLocalUrlCount : null;
    const localCount = typeof localCountRaw === 'number' ? localCountRaw : Number(localCountRaw);
    if (statisticsMode === 'local') {
        const dateDiv = document.getElementById('date');
        if (Number.isFinite(localCount) && localCount > 0) {
            if (dateDiv && !dateDiv.innerHTML.includes('本站已收录')) {
                dateDiv.innerHTML += ` 本站已收录:${localCount}个网站`;
            }
        } else {
            resolveLocalStatisticsCount()
                .then(function (count) {
                    if (dateDiv && Number.isFinite(count) && count > 0 && !dateDiv.innerHTML.includes('本站已收录')) {
                        dateDiv.innerHTML += ` 本站已收录:${count}个网站`;
                    }
                })
                .catch(function () {
                    // Ignore local count fetch errors and keep header usable.
                });
        }
    } else if (statisticsApi) {
        fetch(statisticsApi)
            .then(response => response.json())
            .then(data => {
                const urlCount = data.urlCount;
                const dateDiv = document.getElementById('date');
                if (dateDiv) {
                    if (!dateDiv.innerHTML.includes('本站已收录')) {
                        dateDiv.innerHTML += ` 本站已收录:${urlCount}个网站`;
                    }
                }
            })
            .catch(error => {
                const dateDiv = document.getElementById('date');
                if (dateDiv) dateDiv.innerHTML += ` 无法获取网站数量`;
            });
    }

    // 最近收录网站功能
    fetchRecentSites();

    // 搜索模块事件绑定
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    const overlay = document.getElementById('overlay');
    let resultsHeader = null;
    if (searchResults) {
        resultsHeader = searchResults.querySelector('.results-header');
    }

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    if (overlay && searchResults) {
        overlay.addEventListener('click', function () {
            searchResults.style.display = 'none';
            overlay.style.display = 'none';
        });
    }

    // 近期收录弹窗
    fetchAndShowLatestNotification();
    setInterval(function () {
        if (document.visibilityState === 'visible') {
            fetchAndShowLatestNotification();
        }
    }, 60000);
});

// --- 最近收录网站相关 ---
function buildNoCacheUrl(rawUrl) {
    try {
        var url = new URL(rawUrl, window.location.href);
        url.searchParams.set('_t', Date.now().toString());
        return url.toString();
    } catch (e) {
        var sep = rawUrl.indexOf('?') >= 0 ? '&' : '?';
        return rawUrl + sep + '_t=' + Date.now();
    }
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function safeExternalHref(rawUrl) {
    const value = String(rawUrl == null ? '' : rawUrl).trim();
    if (!value) return '#';
    if (value.startsWith('#')) return value;
    try {
        const u = new URL(value, window.location.href);
        const protocol = (u.protocol || '').toLowerCase();
        if (protocol === 'http:' || protocol === 'https:') return u.toString();
        return '#';
    } catch (e) {
        if (value.startsWith('/')) return value;
        return '#';
    }
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const ms = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 1500;
    const timer = setTimeout(function () {
        try { controller.abort(); } catch (e) {}
    }, ms);
    try {
        const opts = Object.assign({}, options || {}, { signal: controller.signal });
        return await fetch(url, opts);
    } finally {
        clearTimeout(timer);
    }
}

function normalizeSiteUrl(url) {
    return String(url == null ? '' : url)
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '');
}

async function resolveLocalStatisticsCount() {
    const items = await ensureLocalSearchIndex();
    if (!Array.isArray(items) || !items.length) {
        return null;
    }

    const uniqueUrls = new Set();
    for (let j = 0; j < items.length; j++) {
        const item = items[j] || {};
        if (String(item.taxonomy || '') === '友情链接') continue;
        const normalizedUrl = normalizeSiteUrl(item.url);
        if (normalizedUrl) uniqueUrls.add(normalizedUrl);
    }

    return uniqueUrls.size || null;
}

async function fetchRecentSites() {
    const siteListElement = document.getElementById('site-list');
    const titleElement = document.getElementById('recent-sites-title');
    const recentSitesElement = document.getElementById('recent-sites');
    if (!siteListElement || !titleElement || !recentSitesElement) return;

    const cachedData = localStorage.getItem('recentSites');
    const cachedTime = localStorage.getItem('recentSitesTimestamp');
    let hasRenderedCache = false;
    if (cachedData && cachedTime) {
        try {
            displaySites(JSON.parse(cachedData));
            hasRenderedCache = true;
        } catch (e) {
            hasRenderedCache = false;
        }
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const recentSitesApi = window.CONFIG && window.CONFIG.recentSitesApi ? window.CONFIG.recentSitesApi : 'https://extension.noisework.cn/api/notifications';
        const response = await fetch(buildNoCacheUrl(recentSitesApi), {
            signal: controller.signal,
            cache: 'no-store'
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('网络响应不正常: ' + response.status);
        }

        const data = await response.json();
        const nextCache = JSON.stringify(data);
        if (!cachedData || cachedData !== nextCache) {
            displaySites(data);
        }
        localStorage.setItem('recentSites', nextCache);
        localStorage.setItem('recentSitesTimestamp', Date.now());
    } catch (error) {
        if (!hasRenderedCache) {
            if (titleElement) titleElement.style.display = 'none';
            if (recentSitesElement) recentSitesElement.style.display = 'none';
        }
    }
}

function displaySites(data) {
    const siteListElement = document.getElementById('site-list');
    const titleElement = document.getElementById('recent-sites-title');
    const recentSitesElement = document.getElementById('recent-sites');
    if (!siteListElement || !titleElement || !recentSitesElement) return;
    siteListElement.innerHTML = '';
    siteListElement.dataset.scrolling = '';
    siteListElement.scrollTop = 0;

    if (data.message) {
        const messageItem = document.createElement('li');
        messageItem.textContent = data.message;
        siteListElement.appendChild(messageItem);
        titleElement.style.display = '';
        recentSitesElement.style.display = '';
        return;
    }

    data.forEach(site => {
        const listItem = document.createElement('li');
        const title = document.createElement('strong');
        title.className = 'title';
        title.textContent = String((site && site.title) ? site.title : '') + '：';

        const link = document.createElement('a');
        link.className = 'url';
        link.href = safeExternalHref(site && site.url);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = String((site && site.url) ? site.url : '');

        const sep = document.createTextNode('：');

        const desc = document.createElement('span');
        desc.className = 'description';
        desc.textContent = String((site && site.description) ? site.description : '无描述');

        listItem.appendChild(title);
        listItem.appendChild(link);
        listItem.appendChild(sep);
        listItem.appendChild(desc);
        siteListElement.appendChild(listItem);
    });

    titleElement.style.display = '';
    recentSitesElement.style.display = '';
    startScrolling(siteListElement);
}

function startScrolling(element) {
    if (!element || element.dataset.scrolling === 'true') return;
    const scrollHeight = element.scrollHeight;
    const visibleHeight = element.clientHeight;
    const maxScrollTop = Math.max(0, scrollHeight - visibleHeight);
    let scrollTop = 0;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || scrollHeight <= visibleHeight + 4) return;
    element.dataset.scrolling = 'true';
    let lastFrameTime = 0;
    function scroll(now) {
        if (document.visibilityState !== 'visible') {
            requestAnimationFrame(scroll);
            return;
        }
        if (now - lastFrameTime < 42) {
            requestAnimationFrame(scroll);
            return;
        }
        lastFrameTime = now;
        scrollTop += 0.3;
        if (scrollTop >= maxScrollTop) {
            scrollTop = 0;
        }
        element.scrollTop = scrollTop;
        requestAnimationFrame(scroll);
    }
    requestAnimationFrame(scroll);
}

// --- 本地搜索相关 ---
let _localSearchIndex = null;
let _localSearchIndexLoaded = false;
let _localSearchIndexLoadPromise = null;
let _localSearchIndexScriptPromise = null;

function coerceSearchIndexPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.results)) return payload.results;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (typeof payload === 'string') {
        try {
            return coerceSearchIndexPayload(JSON.parse(payload));
        } catch (e) {
            return null;
        }
    }
    return null;
}

function readLocalSearchIndexFromDom() {
    if (typeof window !== 'undefined' && window.__HEADER_SEARCH_INDEX__) {
        const fromWindow = coerceSearchIndexPayload(window.__HEADER_SEARCH_INDEX__);
        if (Array.isArray(fromWindow)) return fromWindow;
    }
    try {
        var el = document.getElementById('header-search-index');
        var raw = el ? (el.textContent || el.innerText || '') : '';
        return coerceSearchIndexPayload(raw ? JSON.parse(raw) : []);
    } catch (e) {
        return null;
    }
}

async function fetchLocalSearchIndexFromFiles() {
    if (window.location.protocol === 'file:') {
        return [];
    }
    const configSearchIndexUrl = window.CONFIG && window.CONFIG.searchIndexUrl ? String(window.CONFIG.searchIndexUrl) : '';
    const origin = window.location.origin || '';
    const pathname = window.location.pathname || '/';
    const baseDir = pathname.replace(/\/[^/]*$/, '/') || '/';
    const candidates = [
        configSearchIndexUrl,
        origin + '/search-index.json',
        origin + '/index.searchindex.json',
        '/search-index.json',
        '/index.searchindex.json',
        'search-index.json',
        '../search-index.json',
        '../../search-index.json',
        baseDir + 'search-index.json',
        baseDir + 'index.searchindex.json'
    ];
    const seen = new Set();

    for (let i = 0; i < candidates.length; i++) {
        const url = candidates[i];
        if (!url || seen.has(url)) continue;
        seen.add(url);
        try {
            const resp = await fetch(url, { cache: 'no-store' });
            if (!resp.ok) continue;
            const parsed = coerceSearchIndexPayload(await resp.json());
            if (Array.isArray(parsed) && parsed.length) {
                return parsed;
            }
        } catch (e) {
            // Try the next generated Hugo index path.
        }
    }

    return [];
}

function ensureLocalSearchIndexScript() {
    const existingIndex = readLocalSearchIndexFromDom();
    if (Array.isArray(existingIndex) && existingIndex.length) {
        return Promise.resolve(existingIndex);
    }

    if (_localSearchIndexScriptPromise) {
        return _localSearchIndexScriptPromise;
    }

    _localSearchIndexScriptPromise = new Promise(function (resolve) {
        const scriptUrl = window.CONFIG && window.CONFIG.searchIndexScriptUrl ? String(window.CONFIG.searchIndexScriptUrl) : 'search-index.js';
        const existingScript = document.getElementById('header-search-index-js');

        function finish() {
            const loadedIndex = readLocalSearchIndexFromDom();
            resolve(Array.isArray(loadedIndex) ? loadedIndex : []);
        }

        if (existingScript) {
            if (Array.isArray(window.__HEADER_SEARCH_INDEX__) && window.__HEADER_SEARCH_INDEX__.length) {
                finish();
                return;
            }
            existingScript.addEventListener('load', finish, { once: true });
            existingScript.addEventListener('error', function () {
                resolve([]);
            }, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.id = 'header-search-index-js';
        script.src = scriptUrl;
        script.async = false;
        script.onload = finish;
        script.onerror = function () {
            resolve([]);
        };
        document.head.appendChild(script);
    }).finally(function () {
        _localSearchIndexScriptPromise = null;
    });

    return _localSearchIndexScriptPromise;
}

async function ensureLocalSearchIndex() {
    if (_localSearchIndexLoaded) return _localSearchIndex || [];
    if (_localSearchIndexLoadPromise) return _localSearchIndexLoadPromise;
    _localSearchIndexLoadPromise = (async function () {
        var index = readLocalSearchIndexFromDom();
        if (!Array.isArray(index) || !index.length) {
            index = await ensureLocalSearchIndexScript();
        }
        if (!Array.isArray(index) || !index.length) {
            index = await fetchLocalSearchIndexFromFiles();
        }

        _localSearchIndex = Array.isArray(index) ? index : [];
        _localSearchIndexLoaded = true;
        _localSearchIndexLoadPromise = null;
        return _localSearchIndex;
    })();
    return _localSearchIndexLoadPromise;
}

function escapeHeaderHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function normalizeSearchField(value) {
    return value == null ? '' : String(value);
}

function normalizeSearchQuery(keyword) {
    let query = String(keyword || '')
        .toLowerCase()
        .replace(/[，,。.;；、/|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!query) return '';
    query = query
        .replace(/^(有没有|有什么|有哪些|请|帮我|推荐|搜索|搜一下|找一下|找找|我想|请问|能不能|可以|怎么样|如何|怎么)\s*/g, '')
        .replace(/\s*(呢|吗|吧|啊|呀|嘛|么)$/g, '')
        .trim();
    return query;
}

function extractSearchTerms(keyword) {
    const normalized = normalizeSearchQuery(keyword);
    if (!normalized) return [];

    const terms = new Set();
    normalized.split(/\s+/).filter(Boolean).forEach(function (part) {
        terms.add(part);

        const cjkSegments = part.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g) || [];
        cjkSegments.forEach(function (seg) {
            if (seg.length === 1) {
                terms.add(seg);
                return;
            }
            if (seg.length <= 4) terms.add(seg);
            for (let i = 0; i < seg.length - 1; i++) {
                terms.add(seg.slice(i, i + 2));
            }
        });

        const latinWords = part.match(/[a-z0-9]+/g) || [];
        latinWords.forEach(function (word) {
            if (word) terms.add(word);
        });
    });

    return Array.from(terms).filter(Boolean);
}

function doLocalSearch(keyword) {
    if (!_localSearchIndex || !_localSearchIndex.length) return [];

    const terms = extractSearchTerms(keyword);
    if (!terms.length) return [];

    const results = [];

    for (let i = 0; i < _localSearchIndex.length; i++) {
        const item = _localSearchIndex[i];
        const titleValue = normalizeSearchField(item.title);
        const descValue = normalizeSearchField(item.description);
        const taxonomyValue = normalizeSearchField(item.taxonomy);
        const termValue = normalizeSearchField(item.term);
        const urlValue = normalizeSearchField(item.url);
        const title = titleValue.toLowerCase();
        const desc = descValue.toLowerCase();
        const taxonomy = taxonomyValue.toLowerCase();
        const term = termValue.toLowerCase();
        const url = urlValue.toLowerCase();
        
        let score = 0;
        for (let t = 0; t < terms.length; t++) {
            const q = terms[t];
            if (!q) continue;
            let matched = false;
            if (title.includes(q)) {
                score += title === q ? 18 : 10;
                matched = true;
            }
            if (term.includes(q)) {
                score += term === q ? 10 : 6;
                matched = true;
            }
            if (taxonomy.includes(q)) {
                score += taxonomy === q ? 9 : 5;
                matched = true;
            }
            if (desc.includes(q)) {
                score += 3;
                matched = true;
            }
            if (url.includes(q)) {
                score += 1;
                matched = true;
            }
            if (!matched) score -= 1;
        }

        if (score > 0) {
            results.push({
                _score: score,
                title: titleValue,
                url: urlValue,
                description: descValue,
                taxonomy: taxonomyValue,
                term: termValue
            });
        }
    }

    results.sort((a, b) => b._score - a._score);
    return results;
}

// --- 搜索相关 ---
async function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const overlay = document.getElementById('overlay');
    const resultsHeader = searchResults ? searchResults.querySelector('.results-header') : null;
    if (!searchInput || !searchResults) return;
    
    await ensureLocalSearchIndex();
    
    const keyword = searchInput.value.trim();
    if (keyword) {
        // 使用本地搜索
        const results = doLocalSearch(keyword);
        displaySearchResults(results, searchResults, overlay, resultsHeader);
    } else {
        displaySearchResults([], searchResults, overlay, resultsHeader);
    }
}

if (typeof window !== 'undefined') {
    window.performSearch = performSearch;
}

function displaySearchResults(results, searchResults, overlay, resultsHeader) {
    if (!searchResults) return;
    searchResults.innerHTML = '';
    if (resultsHeader) {
        if (Array.isArray(results)) {
            resultsHeader.textContent = results.length ? ('当前搜索结果如下（' + results.length + '）') : '当前搜索结果如下：';
        }
        resultsHeader.style.display = "block";
        searchResults.appendChild(resultsHeader);
    }
    if (Array.isArray(results) && results.length > 0) {
        results.forEach(result => {
            const div = document.createElement('div');
            div.classList.add('result-item');
            const meta = [result.taxonomy, result.term].filter(Boolean).join(' / ');
            div.innerHTML = `
                <div class="result-title">${escapeHeaderHtml(result.title || '未命名')}${meta ? `<span style="font-size:11px;opacity:0.65;margin-left:6px;">${escapeHeaderHtml(meta)}</span>` : ''}</div>
                <div class="result-url"><a href="${escapeHeaderHtml(safeExternalHref(result.url || '#'))}" target="_blank" rel="noopener noreferrer">${escapeHeaderHtml(result.url || '#')}</a></div>
                <div class="result-description">${escapeHeaderHtml(result.description || '无描述')}</div>
            `;
            searchResults.appendChild(div);
        });
    } else {
        const div = document.createElement('div');
        div.textContent = "未找到相关结果";
        searchResults.appendChild(div);
    }
    searchResults.style.display = "flex";
    if (overlay) overlay.style.display = "block";
}

// --- 近期收录弹窗（只保留右上角iziToast）---
let shownNotifications = [];
try {
    shownNotifications = JSON.parse(localStorage.getItem('shownNotifications')) || [];
} catch (e) {
    shownNotifications = [];
}

async function fetchAndShowLatestNotification() {
    try {
        const recentSitesApi = window.CONFIG && window.CONFIG.recentSitesApi ? window.CONFIG.recentSitesApi : 'https://extension.noisework.cn/api/notifications';
        const response = await fetchWithTimeout(buildNoCacheUrl(recentSitesApi), { cache: 'no-store' }, 1500);
        if (!response || !response.ok) return;
        const notifications = await response.json();

        const bellIcon = document.getElementById('noisenotification-icon');
        let hasNewNotification = false;

        if (Array.isArray(notifications) && notifications.length > 0) {
            const latestNotification = notifications.reduce((latest, current) => {
                const currentTime = new Date(current.timestamp || current.date || 0);
                const latestTime = new Date(latest.timestamp || latest.date || 0);
                return currentTime > latestTime ? current : latest;
            });

            const safeTitle = escapeHtml(latestNotification && latestNotification.title);
            const safeDesc = escapeHtml((latestNotification && latestNotification.description) ? latestNotification.description : (latestNotification && latestNotification.url));
            const safeHref = safeExternalHref(latestNotification && latestNotification.url);
            const notificationContent = '🎉站点收录更新通知：<strong>' + safeTitle + '</strong><br><a href="' + escapeHtml(safeHref) + '" target="_blank" rel="noopener noreferrer" style="color:#ff9800;text-decoration:underline;">' + safeDesc + '</a>';

            // 首次访问 shownNotifications 为空，必弹
            if (!shownNotifications.includes(notificationContent)) {
                shownNotifications.push(notificationContent);
                // 限制缓存长度，防止无限增长
                if (shownNotifications.length > 20) shownNotifications.shift();
                localStorage.setItem('shownNotifications', JSON.stringify(shownNotifications));
                if (window.iziToast) {
                    iziToast.show({
                        title: false,
                        message: notificationContent,
                        position: 'topRight',
                        timeout: 5000,
                        messageColor: '#222',
                        backgroundColor: '#fff',
                        icon: 'icon-star'
                    });
                }
                hasNewNotification = true;
            }
        }
        // 控制铃铛图标颜色
        if (bellIcon) {
            if (hasNewNotification) {
                bellIcon.classList.add('active');
                // 标记有新通知
                localStorage.setItem('hasNewNotification', '1');
            } else if (localStorage.getItem('hasNewNotification') === '1') {
                // 只要本地有未读通知，也保持变色
                bellIcon.classList.add('active');
            } else {
                bellIcon.classList.remove('active');
            }
        }
        // 可选：监听用户点击铃铛，清除未读标记
        if (bellIcon) {
            bellIcon.onclick = function() {
                bellIcon.classList.remove('active');
                localStorage.removeItem('hasNewNotification');
            };
        }
    } catch (error) {
        console.error('获取通知失败:', error);
    }
}

function syncHeaderPageMode(activeKey) {
    var headerTop = document.querySelector('.header-top');
    if (!headerTop) return;
    var isDefault = !activeKey || activeKey === 'default';
    headerTop.classList.toggle('is-default-page', isDefault);
    headerTop.classList.toggle('is-page-active', !isDefault);
    queueSyncHeaderColumnHeights();
}

var headerHeightResizeObserver = null;
var headerHeightMutationObserver = null;
var cachedDefaultSideHeight = 0;
var cachedDefaultHeaderTopHeight = 0;
var headerHeightSyncRafId = 0;
var headerHeightSyncTimerId = 0;
var archiveScrollLockUntil = 0;
var archiveScrollProgrammaticUntil = 0;
var headerHeightMode = '';

function clearHeaderPageHeightStyles(side) {
    if (!side) return;
    var region = side.querySelector('.header-page-region');
    if (region) {
        region.style.height = '';
        region.style.maxHeight = '';
    }
    side.querySelectorAll('.page, .page-shell, .archive-scroll, .hot-page-shell, .hot-page-panels, .hot-page-panel, .hot-page-panel-body').forEach(function (node) {
        node.style.height = '';
        node.style.maxHeight = '';
    });
}

function syncHeaderColumnHeights() {
    var headerTop = document.querySelector('.header-top');
    if (!headerTop) return;
    var main = headerTop.querySelector('.header-top-main');
    var side = headerTop.querySelector('.header-top-side');
    if (!main || !side) return;

    if (window.innerWidth <= 1024) {
        if (headerHeightMode !== 'mobile') {
            headerHeightMode = 'mobile';
            headerTop.style.height = '';
            headerTop.style.minHeight = '';
            headerTop.style.maxHeight = '';
            main.style.minHeight = '';
            side.style.minHeight = '';
            main.style.height = '';
            side.style.height = '';
            clearHeaderPageHeightStyles(side);
        }
        return;
    }

    headerHeightMode = 'desktop';

    var activePageBefore = side.querySelector('.page.active');
    var activePageIdBefore = activePageBefore && activePageBefore.id ? activePageBefore.id : '';
    var archiveScrollBefore = null;
    var archiveScrollTopBefore = 0;
    if (activePageIdBefore === 'guidang' && activePageBefore) {
        archiveScrollBefore = activePageBefore.querySelector('.archive-scroll');
        if (archiveScrollBefore) {
            archiveScrollTopBefore = archiveScrollBefore.scrollTop || 0;
        }
    }

    if (Date.now() < archiveScrollLockUntil) {
        if (activePageIdBefore === 'guidang') {
            return;
        }
    }

    // 重置所有内联样式以获取自然高度
    headerTop.style.height = '';
    headerTop.style.minHeight = '';
    headerTop.style.maxHeight = '';
    main.style.minHeight = '';
    side.style.minHeight = '';
    main.style.height = '';
    side.style.height = '';
    clearHeaderPageHeightStyles(side);

    void headerTop.offsetHeight;

    // 获取当前状态
    var isPageActive = headerTop.classList.contains('is-page-active');
    
    // 获取左侧栏的自然高度（作为基准）
    var mainRect = main.getBoundingClientRect();
    var mainHeight = mainRect.height;

    // 获取/更新默认右侧内容的自然高度
    var defaultSide = side.querySelector('.header-side-default');
    if (defaultSide) {
        if (!isPageActive) {
            cachedDefaultSideHeight = defaultSide.getBoundingClientRect().height;
            cachedDefaultHeaderTopHeight = headerTop.getBoundingClientRect().height;
        } else if (cachedDefaultSideHeight === 0) {
            // 如果初始加载就是分页状态，尝试获取一次
            var originalDisplay = defaultSide.style.display;
            defaultSide.style.display = 'flex';
            cachedDefaultSideHeight = defaultSide.getBoundingClientRect().height;
            defaultSide.style.display = originalDisplay;
        }
    }

    // 计算目标高度
    // 分页激活时，锁定为默认状态下的整体高度，避免热榜/iframe 内容变化导致整体高度被“撑爆”
    // 默认状态时，以左右栏更高的一侧作为基准
    var targetHeight = isPageActive && cachedDefaultHeaderTopHeight > 0
        ? cachedDefaultHeaderTopHeight
        : Math.max(mainHeight, cachedDefaultSideHeight);

    if (targetHeight > 0) {
        var headerStyles = window.getComputedStyle(headerTop);
        var headerPaddingTop = parseFloat(headerStyles.paddingTop || '0') || 0;
        var headerPaddingBottom = parseFloat(headerStyles.paddingBottom || '0') || 0;
        var innerColumnHeight = Math.max(0, targetHeight - headerPaddingTop - headerPaddingBottom);

        // 应用高度锁定，确保左右栏等高且不因内容加载而闪烁
        headerTop.style.height = targetHeight + 'px';
        headerTop.style.minHeight = targetHeight + 'px';
        headerTop.style.maxHeight = targetHeight + 'px';
        main.style.height = innerColumnHeight + 'px';
        side.style.height = innerColumnHeight + 'px';
        // 同时设置 min-height 增强稳定性
        main.style.minHeight = innerColumnHeight + 'px';
        side.style.minHeight = innerColumnHeight + 'px';

        // 如果分页处于激活状态，需要精确计算内部滚动区域的高度
        if (isPageActive) {
            var region = side.querySelector('.header-page-region');
            var activePageNode = side.querySelector('.page.active');
            
            if (region && activePageNode) {
                // 计算分页区域在右侧栏中的可用空间
                var sideRect = side.getBoundingClientRect();
                var regionRect = region.getBoundingClientRect();
                var regionTopOffset = regionRect.top - sideRect.top;
                var availableHeight = Math.max(0, innerColumnHeight - regionTopOffset);

                region.style.height = availableHeight + 'px';
                region.style.maxHeight = availableHeight + 'px';
                var regionStyles = window.getComputedStyle(region);
                var regionPaddingTop = parseFloat(regionStyles.paddingTop || '0') || 0;
                var regionPaddingBottom = parseFloat(regionStyles.paddingBottom || '0') || 0;
                var regionBorderTop = parseFloat(regionStyles.borderTopWidth || '0') || 0;
                var regionBorderBottom = parseFloat(regionStyles.borderBottomWidth || '0') || 0;
                var innerAvailableHeight = Math.max(0, availableHeight - regionPaddingTop - regionPaddingBottom - regionBorderTop - regionBorderBottom);

                activePageNode.style.height = innerAvailableHeight + 'px';
                activePageNode.style.maxHeight = innerAvailableHeight + 'px';

                var shell = activePageNode.querySelector('.page-shell');
                if (shell) {
                    shell.style.height = innerAvailableHeight + 'px';
                    shell.style.maxHeight = innerAvailableHeight + 'px';
                }

                if (activePageNode.id === 'guidang' && shell) {
                    var archiveShell = shell.classList && shell.classList.contains('archive-page-shell') ? shell : shell.querySelector('.archive-page-shell');
                    if (archiveShell) {
                        var archiveHeader = archiveShell.querySelector('.archive-header');
                        var archiveScroll = archiveShell.querySelector('.archive-scroll');
                        if (archiveHeader && archiveScroll) {
                            var headerHeight = archiveHeader.getBoundingClientRect().height;
                            var scrollHeight = Math.max(0, archiveShell.clientHeight - headerHeight);
                            archiveScroll.style.height = scrollHeight + 'px';
                            archiveScroll.style.maxHeight = scrollHeight + 'px';
                        }
                    }
                }

                // 针对热榜页面的特殊精确计算
                var hotShell = activePageNode.querySelector('.hot-page-shell');
                if (hotShell) {
                    hotShell.style.height = innerAvailableHeight + 'px';
                    hotShell.style.maxHeight = innerAvailableHeight + 'px';
                    
                    var intro = hotShell.querySelector('.hot-page-intro');
                    var tabs = hotShell.querySelector('.hot-page-tabs');
                    var panels = hotShell.querySelector('.hot-page-panels');
                    
                    if (panels) {
                        var introHeight = intro ? intro.getBoundingClientRect().height : 0;
                        var tabsHeight = tabs ? tabs.getBoundingClientRect().height : 0;
                        var hotShellStyles = window.getComputedStyle(hotShell);
                        var rowGap = parseFloat(hotShellStyles.rowGap || hotShellStyles.gap || '0') || 0;
                        
                        // 计算面板容器高度：总高度 - 说明区 - 切换标签 - 间距
                        var panelsHeight = Math.max(0, innerAvailableHeight - introHeight - tabsHeight - (rowGap * 2));
                        panels.style.height = panelsHeight + 'px';
                        panels.style.maxHeight = panelsHeight + 'px';
                        
                        panels.querySelectorAll('.hot-page-panel').forEach(function (panel) {
                            panel.style.height = panelsHeight + 'px';
                            panel.style.maxHeight = panelsHeight + 'px';
                            
                            var head = panel.querySelector('.hot-page-panel-head');
                            var updateTime = panel.querySelector('.update-time');
                            var body = panel.querySelector('.hot-page-panel-body');
                            
                            if (body) {
                                var panelStyles = window.getComputedStyle(panel);
                                var panelGap = parseFloat(panelStyles.rowGap || panelStyles.gap || '0') || 0;
                                var panelPadding = parseFloat(panelStyles.paddingTop || '0') + parseFloat(panelStyles.paddingBottom || '0');
                                
                                var headHeight = head ? head.getBoundingClientRect().height : 0;
                                var timeHeight = updateTime ? updateTime.getBoundingClientRect().height : 0;
                                
                                // 计算列表主体高度
                                var bodyHeight = Math.max(0, panelsHeight - headHeight - timeHeight - (panelGap * 2) - panelPadding);
                                body.style.height = bodyHeight + 'px';
                                body.style.maxHeight = bodyHeight + 'px';
                                var list = body.querySelector('ol');
                                if (list) {
                                    list.style.height = bodyHeight + 'px';
                                    list.style.maxHeight = bodyHeight + 'px';
                                    list.style.overflowY = 'auto';
                                    list.style.overflowX = 'hidden';
                                }
                            }
                        });
                    }
                }
            }
        }
    }

    if (archiveScrollBefore && archiveScrollTopBefore > 0) {
        requestAnimationFrame(function () {
            try {
                var nowTop = archiveScrollBefore.scrollTop || 0;
                if (Math.abs(nowTop - archiveScrollTopBefore) <= 1) return;
                archiveScrollProgrammaticUntil = Date.now() + 220;
                archiveScrollBefore.scrollTop = archiveScrollTopBefore;
                requestAnimationFrame(function () {
                    var afterTop = archiveScrollBefore.scrollTop || 0;
                    if (Math.abs(afterTop - archiveScrollTopBefore) <= 1) return;
                    archiveScrollProgrammaticUntil = Date.now() + 220;
                    archiveScrollBefore.scrollTop = archiveScrollTopBefore;
                });
            } catch (e) {
            }
        });
    }
}

function queueSyncHeaderColumnHeights() {
    if (Date.now() < archiveScrollLockUntil) {
        var headerTop = document.querySelector('.header-top');
        if (headerTop && headerTop.classList.contains('is-page-active')) {
            var activePage = headerTop.querySelector('.header-top-side .page.active');
            if (activePage && activePage.id === 'guidang') {
                return;
            }
        }
    }
    if (!headerHeightSyncRafId) {
        headerHeightSyncRafId = requestAnimationFrame(function () {
            headerHeightSyncRafId = 0;
            syncHeaderColumnHeights();
        });
    }
    clearTimeout(headerHeightSyncTimerId);
    headerHeightSyncTimerId = setTimeout(syncHeaderColumnHeights, 180);
}

function observeHeaderColumnChanges() {
    var headerTop = document.querySelector('.header-top');
    if (headerHeightResizeObserver) {
        headerHeightResizeObserver.disconnect();
        headerHeightResizeObserver = null;
    }
    if (headerHeightMutationObserver) {
        headerHeightMutationObserver.disconnect();
        headerHeightMutationObserver = null;
    }
    if (!headerTop || window.innerWidth <= 1024) return;
    var main = headerTop.querySelector('.header-top-main');
    var side = headerTop.querySelector('.header-top-side');
    if (!main || !side) return;

    if ('ResizeObserver' in window) {
        headerHeightResizeObserver = new ResizeObserver(function () {
            try {
                if (headerTop && headerTop.classList && headerTop.classList.contains('is-page-active')) return;
            } catch (e) {
            }
            queueSyncHeaderColumnHeights();
        });
        headerHeightResizeObserver.observe(main);
        headerHeightResizeObserver.observe(side);
        var activePage = side.querySelector('.page.active');
        var defaultSide = side.querySelector('.header-side-default');
        if (activePage) {
            headerHeightResizeObserver.observe(activePage);
        }
        if (defaultSide) {
            headerHeightResizeObserver.observe(defaultSide);
        }
    }

    headerHeightMutationObserver = new MutationObserver(function () {
        try {
            if (headerTop && headerTop.classList && headerTop.classList.contains('is-page-active')) return;
        } catch (e) {
        }
        queueSyncHeaderColumnHeights();
    });
    headerHeightMutationObserver.observe(side, {
        childList: true,
        subtree: true
    });
}

function switchHotPanel(target) {
    var hotShell = document.querySelector('.hot-page-shell');
    if (!hotShell) return;

    hotShell.querySelectorAll('.hot-page-tab').forEach(function (tab) {
        var isActive = tab.getAttribute('data-hot-target') === target;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    hotShell.querySelectorAll('.hot-page-panel').forEach(function (panel) {
        var isActive = panel.getAttribute('data-hot-panel') === target;
        panel.classList.toggle('active', isActive);
    });

    queueSyncHeaderColumnHeights();
}

function ensureHotPanelSelection() {
    var hotShell = document.querySelector('.hot-page-shell');
    if (!hotShell) return;
    var activeTab = hotShell.querySelector('.hot-page-tab.active');
    if (activeTab) {
        switchHotPanel(activeTab.getAttribute('data-hot-target'));
        return;
    }
    var firstTab = hotShell.querySelector('.hot-page-tab');
    if (firstTab) {
        switchHotPanel(firstTab.getAttribute('data-hot-target'));
    }
}

function enhanceArchiveArticleRoot(root) {
    if (!root) return;
    try {
        root.querySelectorAll('a[href]').forEach(function (a) {
            var href = a.getAttribute('href') || '';
            if (!href || href.startsWith('#')) return;
            a.setAttribute('target', '_blank');
            var rel = (a.getAttribute('rel') || '').toLowerCase();
            var relParts = rel.split(/\s+/).filter(Boolean);
            if (relParts.indexOf('noopener') === -1) relParts.push('noopener');
            if (relParts.indexOf('noreferrer') === -1) relParts.push('noreferrer');
            a.setAttribute('rel', relParts.join(' '));
        });
    } catch (e) {
    }

    try {
        root.querySelectorAll('pre > code').forEach(function (code) {
            var pre = code && code.parentElement ? code.parentElement : null;
            if (!pre) return;
            if (pre.getAttribute('data-ndh-copy-ready') === '1') return;
            pre.setAttribute('data-ndh-copy-ready', '1');
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ndh-code-copy';
            btn.setAttribute('aria-label', '复制代码');
            btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16h-9V7h9v14z"></path></svg>';
            btn.addEventListener('click', function (ev) {
                try {
                    ev.preventDefault();
                    ev.stopPropagation();
                } catch (err) {
                }
                var text = '';
                try {
                    text = code.textContent || '';
                } catch (err) {
                    text = '';
                }
                function markCopied(ok) {
                    try {
                        btn.classList.toggle('copied', !!ok);
                        clearTimeout(btn._ndhCopyTimer);
                        btn._ndhCopyTimer = setTimeout(function () {
                            try { btn.classList.remove('copied'); } catch (e2) {}
                        }, 1100);
                    } catch (e2) {
                    }
                }
                try {
                    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function' && window.isSecureContext) {
                        navigator.clipboard.writeText(text).then(function () {
                            markCopied(true);
                        }).catch(function () {
                            markCopied(false);
                        });
                        return;
                    }
                } catch (err) {
                }
                try {
                    var ta = document.createElement('textarea');
                    ta.value = text;
                    ta.setAttribute('readonly', 'readonly');
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    var ok = false;
                    try {
                        ok = document.execCommand('copy');
                    } catch (err) {
                        ok = false;
                    }
                    document.body.removeChild(ta);
                    markCopied(ok);
                } catch (err) {
                    markCopied(false);
                }
            }, { passive: false });
            pre.appendChild(btn);
        });
    } catch (e) {
    }
}

function initArchivePanel() {
    var page = document.getElementById('guidang');
    if (!page) return;
    var shell = page.querySelector('.archive-page-shell');
    if (!shell) return;
    var indexEl = page.querySelector('[data-archive-index]');
    var articleView = page.querySelector('[data-archive-article-view]');
    var titleEl = page.querySelector('[data-archive-article-title]');
    var backBtn = page.querySelector('.archive-back');
    var scrollEl = page.querySelector('.archive-scroll');
    if (!indexEl || !articleView || !scrollEl) return;
    var suppressClickUntil = 0;

    function markArchiveScrollActive() {
        archiveScrollLockUntil = Date.now() + 1400;
    }

    var touchStartX = 0;
    var touchStartY = 0;
    var touchTracking = false;
    function onTouchStart(e) {
        try {
            if (!e || !e.touches || e.touches.length !== 1) return;
            var t = e.touches[0];
            touchStartX = t.clientX;
            touchStartY = t.clientY;
            touchTracking = true;
        } catch (err) {
        }
    }
    function onTouchEnd() {
        touchTracking = false;
    }
    function onTouchMove(e) {
        try {
            if (!touchTracking || !e || !e.touches || e.touches.length !== 1) return;
            var t = e.touches[0];
            var dx = t.clientX - touchStartX;
            var dy = t.clientY - touchStartY;
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
            if (Math.abs(dy) >= Math.abs(dx) + 3) {
                markArchiveScrollActive();
            }
        } catch (err) {
        }
    }

    scrollEl.addEventListener('touchstart', onTouchStart, { passive: true });
    scrollEl.addEventListener('touchmove', onTouchMove, { passive: true });
    scrollEl.addEventListener('touchend', onTouchEnd, { passive: true });
    scrollEl.addEventListener('touchcancel', onTouchEnd, { passive: true });
    scrollEl.addEventListener('wheel', markArchiveScrollActive, { passive: true });

    scrollEl.addEventListener('scroll', function () {
        if (Date.now() < archiveScrollProgrammaticUntil) return;
        suppressClickUntil = Date.now() + 260;
        markArchiveScrollActive();
    }, { passive: true });

    function setView(mode) {
        shell.setAttribute('data-archive-view', mode);
    }

    function clearArticle() {
        while (articleView.firstChild) {
            articleView.removeChild(articleView.firstChild);
        }
        if (titleEl) titleEl.textContent = '';
    }

    function normalizeRel(href) {
        try {
            return new URL(href, window.location.href).pathname.replace(/\/+$/, '/') || '/';
        } catch (e) {
            return '';
        }
    }

    var templateById = new Map();
    var templateByPath = new Map();
    page.querySelectorAll('template[data-archive-id]').forEach(function (tpl) {
        var id = tpl.getAttribute('data-archive-id') || '';
        if (id) templateById.set(id, tpl);
        var url = tpl.getAttribute('data-archive-url') || '';
        if (url) {
            var path = normalizeRel(url);
            if (path) templateByPath.set(path, tpl);
        }
    });

    function renderTemplate(tpl) {
        if (!tpl) return false;
        clearArticle();
        try {
            var frag = tpl.content ? tpl.content.cloneNode(true) : null;
            if (!frag) return false;
            articleView.appendChild(frag);
            enhanceArchiveArticleRoot(articleView);
            var articleTitle = articleView.querySelector('.archive-article-title');
            if (titleEl && articleTitle) {
                titleEl.textContent = articleTitle.textContent || '';
            }
            setView('article');
            scrollEl.scrollTop = 0;
            return true;
        } catch (e) {
            return false;
        }
    }

    function openById(id) {
        return renderTemplate(templateById.get(id));
    }

    function openByHref(href) {
        var path = normalizeRel(href);
        if (!path) return false;
        return renderTemplate(templateByPath.get(path));
    }

    page.addEventListener('click', function (e) {
        if (Date.now() < suppressClickUntil) {
            e.preventDefault();
            return;
        }
        var link = e.target && e.target.closest ? e.target.closest('a.archive-item[data-archive-id]') : null;
        if (!link || !page.contains(link)) return;
        var id = link.getAttribute('data-archive-id') || '';
        var href = link.getAttribute('href') || '';
        e.preventDefault();
        if (id && openById(id)) return;
        if (href) openByHref(href);
    });

    if (backBtn) {
        backBtn.addEventListener('click', function () {
            clearArticle();
            setView('index');
            scrollEl.scrollTop = 0;
        });
    }

    articleView.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a || !articleView.contains(a)) return;
        var href = a.getAttribute('href') || '';
        if (!href || href.startsWith('#')) return;
        var target = (a.getAttribute('target') || '').toLowerCase();
        if (target === '_blank') return;
        a.setAttribute('target', '_blank');
    });
}

document.addEventListener("DOMContentLoaded", function () {
    var currentPage = document.querySelector('.page.active');
    syncHeaderPageMode(currentPage ? currentPage.id : 'default');
    ensureHotPanelSelection();
    initArchivePanel();
    window.addEventListener('resize', queueSyncHeaderColumnHeights);
    window.addEventListener('load', queueSyncHeaderColumnHeights);
    window.addEventListener('resize', observeHeaderColumnChanges);
    document.addEventListener('hotlist:updated', function () {
        queueSyncHeaderColumnHeights();
        observeHeaderColumnChanges();
    });
    observeHeaderColumnChanges();
});

function broadcastEmbeddedTheme() {
    try {
        var isNight = document.body && document.body.classList && document.body.classList.contains('io-black-mode');
        document.querySelectorAll('iframe.embedded-page-frame').forEach(function (frame) {
            if (!frame || !frame.contentWindow) return;
            frame.contentWindow.postMessage({ type: 'ndh:theme', night: isNight ? '1' : '0' }, window.location.origin);
        });
    } catch (e) {
    }
}

// Tab 切换功能
function showPage(key) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(function(page) {
        page.classList.remove('active');
    });
    // 显示当前页面
    var current = document.getElementById(key);
    if (current) {
        current.classList.add('active');
    }
    // 切换按钮高亮
    document.querySelectorAll('.nav-button').forEach(function(btn) {
        btn.classList.remove('active');
    });
    // 高亮当前按钮
    var btns = document.querySelectorAll('.nav-button');
    btns.forEach(function(btn) {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(key)) {
            btn.classList.add('active');
        }
    });
    syncHeaderPageMode(key);
    if (key === 'waline') {
        ensureHotPanelSelection();
    }
    broadcastEmbeddedTheme();
    observeHeaderColumnChanges();
}
