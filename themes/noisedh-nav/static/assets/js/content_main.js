document.addEventListener('DOMContentLoaded', function() {
    // 欢迎弹窗逻辑
    var popup = document.getElementById('welcome-popup');
    var hasSeenPopup = localStorage.getItem('hasSeenPopup');
    if (!hasSeenPopup && popup) {
        popup.style.display = 'block';
        setTimeout(function() {
            popup.style.display = 'none';
        }, 5400);
        localStorage.setItem('hasSeenPopup', 'true');
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
    
    // 多级回退处理器
    function multiFallback(img) {
        // 优先保证 yandex 和 google favicon 顺序
        let fallbacks = img.dataset.fallback ? img.dataset.fallback.split('||').map(s => s.trim()) : [];
        const yandexIdx = fallbacks.findIndex(url => url.includes('favicon.yandex.net'));
        const googleIdx = fallbacks.findIndex(url => url.includes('www.google.com/s2/favicons'));
        let ordered = [];
        if (yandexIdx !== -1) {
            ordered.push(fallbacks[yandexIdx]);
            fallbacks.splice(yandexIdx, 1);
        }
        if (googleIdx !== -1) {
            const newGoogleIdx = fallbacks.findIndex(url => url.includes('www.google.com/s2/favicons'));
            if (newGoogleIdx !== -1) {
                ordered.push(fallbacks[newGoogleIdx]);
                fallbacks.splice(newGoogleIdx, 1);
            }
        }
        fallbacks = ordered.concat(fallbacks);
    
        let currentIndex = 0;
        const tryNext = () => {
            if (currentIndex < fallbacks.length) {
                img.onerror = tryNext;
                img.onload = () => {
                    if (isTransparentImage(img)) {
                        tryNext();
                    }
                };
                img.src = fallbacks[currentIndex++].trim();
            } else {
                img.onerror = function() {
                    img.onerror = null;
                    img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn8B9kQn2wAAAABJRU5ErkJggg==";
                };
                img.src = window.DEFAULT_LOGO;
                img.classList.add('img-placeholder');
            }
        };
        tryNext();
    }

    // 图片缓存与懒加载（优化版）
    const cacheImage = (url, data) => {
        try {
            localStorage.setItem(url, data);
        } catch (e) {
            // localStorage 空间不足时忽略
        }
    };
    const getCachedImage = (url) => {
        return localStorage.getItem(url);
    };
    const loadImage = (img) => {
        const src = img.dataset.src;
        if (!src) return;
        const cachedImage = getCachedImage(src);
        if (cachedImage) {
            img.src = cachedImage;
            img.removeAttribute('data-src');
        } else {
            img.src = src;
            img.onload = () => {
                // 不再限制图片格式，所有图片都缓存
                try {
                    cacheImage(src, img.src);
                } catch (e) {
                    // localStorage 空间不足时忽略
                }
                img.removeAttribute('data-src');
            };
            img.addEventListener('error', function() {
                // 回退时也尝试缓存 fallback 图片
                multiFallbackWithCache(this);
            });
        }
    };

    // 回退机制优化：回退图片也尝试缓存
    function multiFallbackWithCache(img) {
        let fallbacks = img.dataset.fallback ? img.dataset.fallback.split('||').map(s => s.trim()) : [];
        const yandexIdx = fallbacks.findIndex(url => url.includes('favicon.yandex.net'));
        const googleIdx = fallbacks.findIndex(url => url.includes('www.google.com/s2/favicons'));
        let ordered = [];
        if (yandexIdx !== -1) {
            ordered.push(fallbacks[yandexIdx]);
            fallbacks.splice(yandexIdx, 1);
        }
        if (googleIdx !== -1) {
            const newGoogleIdx = fallbacks.findIndex(url => url.includes('www.google.com/s2/favicons'));
            if (newGoogleIdx !== -1) {
                ordered.push(fallbacks[newGoogleIdx]);
                fallbacks.splice(newGoogleIdx, 1);
            }
        }
        fallbacks = ordered.concat(fallbacks);
    
        let currentIndex = 0;
        const tryNext = () => {
            if (currentIndex < fallbacks.length) {
                const fallbackSrc = fallbacks[currentIndex++].trim();
                img.onerror = tryNext;
                img.onload = () => {
                    try {
                        cacheImage(fallbackSrc, img.src);
                    } catch (e) {}
                    img.removeAttribute('data-src');
                    if (isTransparentImage(img)) {
                        tryNext();
                    }
                };
                img.src = fallbackSrc;
            } else {
                img.onerror = function() {
                    img.onerror = null;
                    img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn8B9kQn2wAAAABJRU5ErkJggg==";
                };
                img.src = window.DEFAULT_LOGO;
                img.classList.add('img-placeholder');
            }
        };
        tryNext();
    }

    // IntersectionObserver 懒加载
    const lazyLoadImages = () => {
        const lazyImages = document.querySelectorAll('.lazy[data-src]');
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        loadImage(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '100px' });
            lazyImages.forEach(img => observer.observe(img));
        } else {
            // 不支持 IntersectionObserver 时降级为原有方式
            lazyImages.forEach(img => {
                if (img.getBoundingClientRect().top < window.innerHeight + 100 && img.dataset.src) {
                    loadImage(img);
                }
            });
        }
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