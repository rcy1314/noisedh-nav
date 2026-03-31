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
        lbl.innerHTML = `${greet}<div id="date">今天是:${date}</div>`;
    }

    // 网站统计API软编码
    const statisticsApi = window.CONFIG && window.CONFIG.statisticsApi ? window.CONFIG.statisticsApi : "";
    if (statisticsApi) {
        fetch(statisticsApi)
            .then(response => response.json())
            .then(data => {
                const urlCount = data.urlCount;
                const dateDiv = document.getElementById('date');
                if (dateDiv) {
                    // 检查是否已经插入过“本站已收录”，避免重复
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
async function fetchRecentSites() {
    const siteListElement = document.getElementById('site-list');
    const titleElement = document.getElementById('recent-sites-title');
    const recentSitesElement = document.getElementById('recent-sites');
    if (!siteListElement || !titleElement || !recentSitesElement) return;

    const cachedData = localStorage.getItem('recentSites');
    const cachedTime = localStorage.getItem('recentSitesTimestamp');
    if (cachedData && cachedTime) {
        const currentTime = Date.now();
        const timeDiff = currentTime - cachedTime;
        if (timeDiff < 3600000) {
            displaySites(JSON.parse(cachedData));
            return;
        }
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        // 修改为软编码 recentSitesApi
        const recentSitesApi = window.CONFIG && window.CONFIG.recentSitesApi ? window.CONFIG.recentSitesApi : 'https://extension.noisework.cn/api/notifications';
        const response = await fetch(recentSitesApi, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('网络响应不正常: ' + response.status);
        }

        const data = await response.json();
        localStorage.setItem('recentSites', JSON.stringify(data));
        localStorage.setItem('recentSitesTimestamp', Date.now());
        displaySites(data);
    } catch (error) {
        if (titleElement) titleElement.style.display = 'none';
        if (recentSitesElement) recentSitesElement.style.display = 'none';
    }
}

function displaySites(data) {
    const siteListElement = document.getElementById('site-list');
    const titleElement = document.getElementById('recent-sites-title');
    const recentSitesElement = document.getElementById('recent-sites');
    if (!siteListElement || !titleElement || !recentSitesElement) return;
    siteListElement.innerHTML = '';

    if (data.message) {
        const messageItem = document.createElement('li');
        messageItem.textContent = data.message;
        siteListElement.appendChild(messageItem);
        titleElement.style.display = 'block';
        recentSitesElement.style.display = 'block';
        return;
    }

    data.forEach(site => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<strong class="title">${site.title}：</strong><a class="url" href="${site.url}" target="_blank">${site.url}</a>：<span class="description">${site.description || '无描述'}</span>`;
        siteListElement.appendChild(listItem);
    });

    titleElement.style.display = 'block';
    recentSitesElement.style.display = 'block';
    startScrolling(siteListElement);
}

function startScrolling(element) {
    let scrollHeight = element.scrollHeight;
    let scrollTop = 0;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    function scroll() {
        if (document.visibilityState !== 'visible') {
            requestAnimationFrame(scroll);
            return;
        }
        scrollTop += 0.3;
        if (scrollTop >= scrollHeight) {
            scrollTop = 0;
        }
        element.scrollTop = scrollTop;
        requestAnimationFrame(scroll);
    }
    scroll();
}

// --- 搜索相关 ---
const serverUrl = window.CONFIG && window.CONFIG.serverUrl ? window.CONFIG.serverUrl : '';
const filePath = window.CONFIG && window.CONFIG.filePath ? window.CONFIG.filePath : '';

async function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const overlay = document.getElementById('overlay');
    const resultsHeader = searchResults ? searchResults.querySelector('.results-header') : null;
    if (!searchInput || !searchResults) return;
    const keyword = searchInput.value.trim();
    if (keyword) {
        try {
            const response = await fetch(`${serverUrl}/api/search?keyword=${encodeURIComponent(keyword)}&filePath=${encodeURIComponent(filePath)}`);
            if (!response.ok) {
                const errorText = await response.text();
                alert(`搜索请求失败: ${response.status} - ${errorText}`);
                return;
            }
            const results = await response.json();
            displaySearchResults(results, searchResults, overlay, resultsHeader);
        } catch (error) {
            alert('网络请求失败，请检查网络连接');
        }
    } else {
        alert('请输入搜索关键词');
    }
}

function displaySearchResults(results, searchResults, overlay, resultsHeader) {
    if (!searchResults) return;
    searchResults.innerHTML = '';
    if (resultsHeader) {
        resultsHeader.style.display = "block";
        searchResults.appendChild(resultsHeader);
    }
    if (Array.isArray(results) && results.length > 0) {
        results.forEach(result => {
            const div = document.createElement('div');
            div.classList.add('result-item');
            div.innerHTML = `
                <div class="result-title">${result.title}</div>
                <div class="result-url"><a href="${result.url}" target="_blank">${result.url}</a></div>
                <div class="result-description">${result.description || '无描述'}</div>
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
        const response = await fetch(recentSitesApi);
        const notifications = await response.json();

        const bellIcon = document.getElementById('noisenotification-icon');
        let hasNewNotification = false;

        if (Array.isArray(notifications) && notifications.length > 0) {
            const latestNotification = notifications.reduce((latest, current) => {
                return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
            });

            const notificationContent = `🎉站点收录更新通知：<strong>${latestNotification.title}</strong><br><a href="${latestNotification.url}" target="_blank" style="color:#ff9800;text-decoration:underline;">${latestNotification.description}</a>`;

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
}
