document.addEventListener('DOMContentLoaded', function() {
    // 欢迎弹窗逻辑
    var popup = document.getElementById('welcome-popup');
    var hasSeenPopup = false;
    try {
        hasSeenPopup = localStorage.getItem('hasSeenPopup');
    } catch (e) {
        // localStorage 不可用时，降级处理
        hasSeenPopup = false;
    }
    if (!hasSeenPopup && popup) {
        popup.style.display = 'block';
        setTimeout(function() {
            popup.style.display = 'none';
        }, 5400);
        try {
            localStorage.setItem('hasSeenPopup', 'true');
        } catch (e) {
            // localStorage 不可用时忽略
        }
    }

    // 二级分类切换逻辑
    document.querySelectorAll('.subcat-tabs').forEach(function(tabBar){
        tabBar.querySelectorAll('.subcat-tab').forEach(function(tab){
            tab.addEventListener('click', function(){
                tabBar.querySelectorAll('.subcat-tab').forEach(t=>t.classList.remove('active'));
                tab.classList.add('active');
                const subcat = tab.getAttribute('data-subcat');
                const parent = tab.closest('.category-block');
                parent.querySelectorAll('.row.card-list[data-subcat]').forEach(list=>{
                    list.style.display = (list.getAttribute('data-subcat') === subcat) ? '' : 'none';
                });
            });
        });
    });

    // hash切换二级分类
    function showSubcatByHash() {
        var hash = window.location.hash.replace('#', '');
        if (!hash) return;
        var btn = document.querySelector('.subcat-tab[id="' + hash + '"]');
        if (btn) btn.click();
        var block = document.getElementById(hash);
        if (block) block.scrollIntoView({behavior: "smooth"});
    }
    window.addEventListener('hashchange', showSubcatByHash);
    showSubcatByHash();

    // 处理侧边栏点击
    window.handleSidebarClick = function(hash) {
        document.querySelectorAll('.subcat-tab').forEach(tab => tab.classList.remove('active'));
        const targetTab = document.querySelector(`.subcat-tab[id="${hash}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
            const subcat = targetTab.getAttribute('data-subcat');
            const parent = targetTab.closest('.category-block');
            parent.querySelectorAll('.row.card-list[data-subcat]').forEach(list => {
                list.style.display = (list.getAttribute('data-subcat') === subcat) ? '' : 'none';
            });
        }
        const targetBlock = document.getElementById(hash);
        if (targetBlock) {
            targetBlock.scrollIntoView({ behavior: "smooth" });
        }
    };

    // 锚点平滑滚动，考虑头部高度
    const header = document.getElementById('header');
    const headerHeight = header ? header.offsetHeight : 0;
    document.body.addEventListener('click', function(event) {
        let targetLink = event.target.closest('a[href^="#"]');
        if (targetLink && targetLink.getAttribute('href').length > 1) {
            const hash = targetLink.getAttribute('href');
            const targetElement = document.getElementById(hash.substring(1));
            if (targetElement) {
                event.preventDefault();
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 15;
                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        }
    });

    // 多级回退处理器
    // 判断图片是否为全透明
    function isTransparentImage(img) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 3; i < imageData.length; i += 4) {
                if (imageData[i] !== 0) return false; // 有非透明像素
            }
            return true; // 全透明
        } catch (e) {
            return false; // 出错时默认不是透明图
        }
    }
    
    const LOGO_SUCCESS_TTL = 7 * 24 * 60 * 60 * 1000;
    const LOGO_FAILED_URL_TTL = 5 * 60 * 1000;
    const LOGO_DOMAIN_BLOCK_TTL = 15 * 60 * 1000;
    const LOGO_DOMAIN_FAIL_THRESHOLD = 2;
    const LOGO_DOMAIN_FAIL_WINDOW = 3 * 60 * 1000;
    const LOGO_SUCCESS_PREFIX = 'logo_success_v3_';
    const LOGO_FAILED_URL_KEY = 'logo_failed_url_v3';
    const LOGO_BLOCKED_DOMAIN_KEY = 'logo_blocked_domain_v3';

    const inflightLogoLoads = new Map();
    const runtimeLogoResolveCache = new Map();
    const failedUrlCache = new Map();
    const blockedDomainCache = new Map();
    const domainFailStats = new Map();

    function normalizeUrl(rawUrl) {
        if (!rawUrl) return '';
        try {
            return new URL(rawUrl.trim(), window.location.href).href;
        } catch (e) {
            return '';
        }
    }

    function getDomain(rawUrl) {
        const normalized = normalizeUrl(rawUrl);
        if (!normalized) return '';
        try {
            return new URL(normalized).hostname.toLowerCase();
        } catch (e) {
            return '';
        }
    }

    function readStorageJSON(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function writeStorageJSON(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {}
    }

    function hydrateExpireMap(key, targetMap) {
        const now = Date.now();
        const data = readStorageJSON(key);
        Object.entries(data).forEach(([k, expiresAt]) => {
            if (Number(expiresAt) > now) {
                targetMap.set(k, Number(expiresAt));
            }
        });
    }

    function persistExpireMap(key, sourceMap) {
        const now = Date.now();
        const data = {};
        sourceMap.forEach((expiresAt, value) => {
            if (expiresAt > now) {
                data[value] = expiresAt;
            }
        });
        writeStorageJSON(key, data);
    }

    function pruneExpireMap(expireMap) {
        const now = Date.now();
        expireMap.forEach((expiresAt, value) => {
            if (expiresAt <= now) {
                expireMap.delete(value);
            }
        });
    }

    hydrateExpireMap(LOGO_FAILED_URL_KEY, failedUrlCache);
    hydrateExpireMap(LOGO_BLOCKED_DOMAIN_KEY, blockedDomainCache);
    pruneExpireMap(failedUrlCache);
    pruneExpireMap(blockedDomainCache);
    persistExpireMap(LOGO_FAILED_URL_KEY, failedUrlCache);
    persistExpireMap(LOGO_BLOCKED_DOMAIN_KEY, blockedDomainCache);

    function getSuccessCacheKey(url) {
        return `${LOGO_SUCCESS_PREFIX}${encodeURIComponent(url)}`;
    }

    function writeSuccessCache(requestUrl, resolvedUrl) {
        const normalizedRequest = normalizeUrl(requestUrl);
        const normalizedResolved = normalizeUrl(resolvedUrl);
        if (!normalizedRequest || !normalizedResolved) return;
        runtimeLogoResolveCache.set(normalizedRequest, normalizedResolved);
        try {
            localStorage.setItem(
                getSuccessCacheKey(normalizedRequest),
                JSON.stringify({
                    resolvedUrl: normalizedResolved,
                    expiresAt: Date.now() + LOGO_SUCCESS_TTL
                })
            );
        } catch (e) {}
    }

    function readSuccessCache(requestUrl) {
        const normalizedRequest = normalizeUrl(requestUrl);
        if (!normalizedRequest) return '';
        if (runtimeLogoResolveCache.has(normalizedRequest)) {
            return runtimeLogoResolveCache.get(normalizedRequest);
        }
        try {
            const raw = localStorage.getItem(getSuccessCacheKey(normalizedRequest));
            if (!raw) return '';
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.resolvedUrl || Number(parsed.expiresAt) <= Date.now()) {
                localStorage.removeItem(getSuccessCacheKey(normalizedRequest));
                return '';
            }
            const normalizedResolved = normalizeUrl(parsed.resolvedUrl);
            if (!normalizedResolved) return '';
            runtimeLogoResolveCache.set(normalizedRequest, normalizedResolved);
            return normalizedResolved;
        } catch (e) {
            return '';
        }
    }

    function isUrlFailed(url) {
        pruneExpireMap(failedUrlCache);
        const normalized = normalizeUrl(url);
        if (!normalized) return true;
        return failedUrlCache.has(normalized);
    }

    function isDomainBlocked(url) {
        pruneExpireMap(blockedDomainCache);
        const domain = getDomain(url);
        if (!domain) return false;
        return blockedDomainCache.has(domain);
    }

    function markFailure(url) {
        const normalized = normalizeUrl(url);
        if (!normalized) return;
        failedUrlCache.set(normalized, Date.now() + LOGO_FAILED_URL_TTL);
        persistExpireMap(LOGO_FAILED_URL_KEY, failedUrlCache);

        const domain = getDomain(normalized);
        if (!domain) return;
        const now = Date.now();
        const current = domainFailStats.get(domain);
        if (!current || now - current.windowStart > LOGO_DOMAIN_FAIL_WINDOW) {
            domainFailStats.set(domain, { count: 1, windowStart: now });
            return;
        }
        current.count += 1;
        if (current.count >= LOGO_DOMAIN_FAIL_THRESHOLD) {
            blockedDomainCache.set(domain, now + LOGO_DOMAIN_BLOCK_TTL);
            persistExpireMap(LOGO_BLOCKED_DOMAIN_KEY, blockedDomainCache);
            domainFailStats.delete(domain);
        } else {
            domainFailStats.set(domain, current);
        }
    }

    function clearFailure(url) {
        const normalized = normalizeUrl(url);
        if (!normalized) return;
        if (failedUrlCache.delete(normalized)) {
            persistExpireMap(LOGO_FAILED_URL_KEY, failedUrlCache);
        }
        const domain = getDomain(normalized);
        if (!domain) return;
        let changed = false;
        if (domainFailStats.has(domain)) {
            domainFailStats.delete(domain);
        }
        if (blockedDomainCache.has(domain)) {
            blockedDomainCache.delete(domain);
            changed = true;
        }
        if (changed) {
            persistExpireMap(LOGO_BLOCKED_DOMAIN_KEY, blockedDomainCache);
        }
    }

    function buildCandidateList(img) {
        const primary = normalizeUrl(img.dataset.src || '');
        let fallbacks = img.dataset.fallback ? img.dataset.fallback.split('||').map(s => normalizeUrl(s.trim())).filter(Boolean) : [];
        const yandex = [];
        const google = [];
        const others = [];
        fallbacks.forEach(item => {
            if (item.includes('favicon.yandex.net')) {
                yandex.push(item);
            } else if (item.includes('www.google.com/s2/favicons')) {
                google.push(item);
            } else {
                others.push(item);
            }
        });
        fallbacks = yandex.concat(google, others);
        const merged = [];
        const seen = new Set();
        const cachedPrimary = readSuccessCache(primary);
        [cachedPrimary, primary, ...fallbacks].forEach(item => {
            const normalized = normalizeUrl(item);
            if (!normalized || seen.has(normalized)) return;
            seen.add(normalized);
            merged.push(normalized);
        });
        return merged;
    }

    function probeImage(url) {
        const normalized = normalizeUrl(url);
        if (!normalized) return Promise.reject(new Error('invalid_url'));
        if (inflightLogoLoads.has(normalized)) {
            return inflightLogoLoads.get(normalized);
        }
        const requestPromise = new Promise((resolve, reject) => {
            const temp = new Image();
            temp.decoding = 'async';
            temp.onload = () => {
                if (isTransparentImage(temp)) {
                    reject(new Error('transparent'));
                    return;
                }
                resolve(normalized);
            };
            temp.onerror = () => reject(new Error('load_failed'));
            temp.src = normalized;
        });
        const wrapped = requestPromise.finally(() => {
            inflightLogoLoads.delete(normalized);
        });
        inflightLogoLoads.set(normalized, wrapped);
        return wrapped;
    }

    async function resolveLogoUrl(img) {
        const src = normalizeUrl(img.dataset.src || '');
        const candidates = buildCandidateList(img);
        for (const candidate of candidates) {
            if (isUrlFailed(candidate) || isDomainBlocked(candidate)) {
                continue;
            }
            const candidateResolved = readSuccessCache(candidate);
            const target = normalizeUrl(candidateResolved || candidate);
            if (!target || isUrlFailed(target) || isDomainBlocked(target)) {
                continue;
            }
            try {
                const okUrl = await probeImage(target);
                writeSuccessCache(candidate, okUrl);
                if (src) {
                    writeSuccessCache(src, okUrl);
                }
                clearFailure(candidate);
                clearFailure(okUrl);
                return okUrl;
            } catch (e) {
                markFailure(target);
            }
        }
        return '';
    }

    function ensureDefaultLogoForImage(img) {
        const defaultLogo = img.dataset.default || window.DEFAULT_LOGO;
        if (!img.src || img.src === '' || img.src.endsWith('/') || img.src.endsWith('about:blank')) {
            img.src = defaultLogo;
        }
    }

    function loadImage(img) {
        if (img._loaded || img._loading) return;
        ensureDefaultLogoForImage(img);
        const src = normalizeUrl(img.dataset.src || '');
        if (!src) {
            img._loaded = true;
            return;
        }
        const cachedResolved = readSuccessCache(src);
        if (cachedResolved && !isUrlFailed(cachedResolved) && !isDomainBlocked(cachedResolved)) {
            img.src = cachedResolved;
            img._loaded = true;
            img.removeAttribute('data-src');
            return;
        }
        img._loading = true;
        resolveLogoUrl(img).then((resolved) => {
            if (resolved) {
                img.src = resolved;
            } else {
                img.src = window.DEFAULT_LOGO;
                img.classList.add('img-placeholder');
            }
            img._loaded = true;
            img.removeAttribute('data-src');
        }).finally(() => {
            img._loading = false;
        });
    }

    const lazyObserver = ('IntersectionObserver' in window) ? new window.IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            ensureDefaultLogoForImage(entry.target);
            loadImage(entry.target);
            obs.unobserve(entry.target);
        });
    }, { rootMargin: '180px 0px' }) : null;

    function observeLazyImage(img) {
        if (img.classList.contains('_observed')) return;
        ensureDefaultLogoForImage(img);
        if (lazyObserver) {
            lazyObserver.observe(img);
            img.classList.add('_observed');
            return;
        }
        img.classList.add('_observed');
    }

    function scanVisibleLazyImages() {
        const trigger = window.innerHeight + 180;
        document.querySelectorAll('.lazy[data-src]').forEach(img => {
            if (img._loaded) return;
            if (img.getBoundingClientRect().top < trigger) {
                loadImage(img);
            }
        });
    }

    let lazyScanScheduled = false;
    function scheduleLazyScan() {
        if (lazyObserver) return;
        if (lazyScanScheduled) return;
        lazyScanScheduled = true;
        window.requestAnimationFrame(() => {
            lazyScanScheduled = false;
            scanVisibleLazyImages();
        });
    }

    const lazyLoadImages = () => {
        const lazyImages = document.querySelectorAll('.lazy[data-src]:not(._observed)');
        lazyImages.forEach(observeLazyImage);
        scheduleLazyScan();
    };

    // 展开所有页面块
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'block';
    });

    // 初始懒加载
    lazyLoadImages();
    window.addEventListener('scroll', lazyLoadImages);
    window.addEventListener('resize', lazyLoadImages);
});
