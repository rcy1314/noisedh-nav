// Note Widget Configuration and Implementation
document.addEventListener('DOMContentLoaded', function() {
    // Default configuration
    const config = window.note || {
        host: 'https://note.noisework.cn', //修改为你的域名
        limit: '10',
        domId: '#note',
        authorId: '',
        username: ''
    };
    
    const container = document.querySelector('#note .note-container');
    const searchInput = document.querySelector('#tag-search');
    const searchBtn = document.querySelector('#search-btn');
    
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    let currentTag = '';
    
    // 清理可能错误的配置格式（去掉反引号与多余空格）
    const clean = (s) => typeof s === 'string' ? s.replace(/`/g, '').trim() : s;
    config.host = clean(config.host);
    config.domId = clean(config.domId);
    config.commentServer = clean(config.commentServer);
    config.authorId = clean(config.authorId);
    config.username = clean(config.username);

    // Create UI elements
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'load-more-note';
    loadMoreBtn.className = 'load-more';
    loadMoreBtn.textContent = '加载更多';
    loadMoreBtn.style.display = 'none';
    
    const loadedAll = document.createElement('div');
    loadedAll.id = 'loaded-all-note';
    loadedAll.className = 'loaded-all';
    loadedAll.textContent = '已加载全部';
    loadedAll.style.display = 'none';
    
    // 在文件开头的 UI 元素创建部分添加
    const backToListBtn = document.createElement('button');
    backToListBtn.id = 'back-to-list';
    backToListBtn.className = 'back-to-list';
    backToListBtn.textContent = '返回列表';
    backToListBtn.style.display = 'none';
    
    container.appendChild(loadMoreBtn);
    container.appendChild(loadedAll);
    container.appendChild(backToListBtn);

    // 修改 handleSearch 函数
    function handleSearch() {
        const searchValue = searchInput.value.trim();
        currentTag = searchValue.startsWith('#') ? searchValue.substring(1) : '';
        resetState();
        // 确保在搜索时显示加载状态
        container.querySelector('.loading-wrapper').style.display = 'block';
        loadInitialContent();
        if (searchValue !== '') {
            backToListBtn.style.display = 'block';
        } else {
            backToListBtn.style.display = 'none';
        }
    }

    // 修改 resetState 函数
    function resetState() {
        currentPage = 1;
        hasMore = true;
        isLoading = false;
        loadMoreBtn.style.display = 'none';
        loadedAll.style.display = 'none';
        clearMessages();
        // 重置时显示加载状态
        container.querySelector('.loading-wrapper').style.display = 'block';
    }

    // 修改 loadInitialContent 函数中的错误处理
    async function loadInitialContent() {
        try {
            const url = buildApiUrl();
            console.log('请求URL:', url);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('API响应数据:', result);
            
            if (result && result.code === 1 && result.data) {
                // 修改这里以适应新的响应格式
                const items = Array.isArray(result.data) ? result.data : (result.data.items || []);
                const sortedData = items.sort((a, b) => 
                    new Date(b.created_at) - new Date(a.created_at)
                );
                renderMessages(sortedData);
                
                updateLoadMoreState(items.length);
            } else {
                console.error('API返回数据格式不符:', result);
                showNoContent();
            }
        } catch (error) {
            console.error('加载内容失败:', error);
            showLoadError();
        } finally {
            // 确保无论成功失败都隐藏加载状态
            container.querySelector('.loading-wrapper').style.display = 'none';
        }
    }

    // 添加返回列表的处理函数
    // Event listeners
    loadMoreBtn.addEventListener('click', loadMoreContent);
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    backToListBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentTag = '';
        backToListBtn.style.display = 'none';
        resetState();
        loadInitialContent();
    });
    
    // Initial load
    loadInitialContent();
    
    function handleSearch() {
        const searchValue = searchInput.value.trim();
        currentTag = searchValue.startsWith('#') ? searchValue.substring(1) : '';
        resetState();
        loadInitialContent();
        if (searchValue !== '') {
            backToListBtn.style.display = 'block';
        } else {
            backToListBtn.style.display = 'none';
        }
    }
    
    function filterByTag(tag) {
        searchInput.value = `#${tag}`;
        currentTag = tag;
        backToListBtn.style.display = 'block';
        resetState();
        loadInitialContent();
    }
    
    function resetState() {
        currentPage = 1;
        hasMore = true;
        isLoading = false;
        loadMoreBtn.style.display = 'none';
        loadedAll.style.display = 'none';
        clearMessages();
        const loadingWrapper = container.querySelector('.loading-wrapper');
        if (loadingWrapper) {
            loadingWrapper.style.display = 'block';
        }
    }
    
    function clearMessages() {
        const messages = container.querySelectorAll('.notecard');
        messages.forEach(msg => msg.remove());
    }
    
    function buildApiUrl() {
        let url;
        if (currentTag) {
            // 使用标签搜索路由
            url = `${config.host}/api/messages/tags/${encodeURIComponent(currentTag)}?page=${currentPage}&pageSize=${config.limit}`;
        } else if (searchInput.value.trim() !== '') {
            // 使用普通搜索路由
            url = `${config.host}/api/messages/search?keyword=${encodeURIComponent(searchInput.value.trim())}&page=${currentPage}&pageSize=${config.limit}`;
        } else {
            // 无搜索词时使用普通分页路由
            url = `${config.host}/api/messages/page?page=${currentPage}&pageSize=${config.limit}`;
        }
        // 附加作者筛选参数（可选）
        const params = [];
        if (config.authorId) params.push(`authorId=${encodeURIComponent(config.authorId)}`);
        if (config.username) params.push(`username=${encodeURIComponent(config.username)}`);
        if (params.length > 0) {
            url += (url.includes('?') ? '&' : '?') + params.join('&');
        }
        return url;
    }

    async function loadInitialContent() {
        try {
            const url = buildApiUrl();
            console.log('请求URL:', url);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('API响应数据:', result);
            
            if (result && result.code === 1 && result.data) {
                // 修改这里以适应新的响应格式
                const items = Array.isArray(result.data) ? result.data : (result.data.items || []);
                const sortedData = items.sort((a, b) => 
                    new Date(b.created_at) - new Date(a.created_at)
                );
                renderMessages(sortedData);
                
                updateLoadMoreState(items.length);
            } else {
                console.error('API返回数据格式不符:', result);
                showNoContent();
            }
        } catch (error) {
            console.error('加载内容失败:', error);
            showLoadError();
        } finally {
            container.querySelector('.loading-wrapper').style.display = 'none';
        }
    }

    async function loadMoreContent() {
        if (isLoading || !hasMore) return;
        
        isLoading = true;
        loadMoreBtn.textContent = '加载中...';
        currentPage++;
        
        try {
            const url = buildApiUrl();
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result && result.code === 1 && result.data) {
                const items = Array.isArray(result.data) ? result.data : (result.data.items || []);
                const sortedData = items.sort((a, b) => 
                    new Date(b.created_at) - new Date(a.created_at)
                );
                renderMessages(sortedData);
                
                updateLoadMoreState(items.length);
            }
        } catch (error) {
            console.error('加载更多内容失败:', error);
            currentPage--;
        } finally {
            isLoading = false;
            loadMoreBtn.textContent = '加载更多';
        }
    }

    // 首先引入 marked 库
    const marked = window.marked || {
        parse: (text) => text
    };

    function parseContent(content) {
        // 先解析 Markdown
        content = marked.parse(content);

        // 为所有图片添加 zoom-image 类
        content = content.replace(/<img/g, '<img class="zoom-image"');

        // 定义媒体平台的正则表达式
        const BILIBILI_REG = /<a href="https:\/\/www\.bilibili\.com\/video\/((av[\d]{1,10})|(BV([\w]{10})))\/?">.*?<\/a>/g;
        const QQMUSIC_REG = /<a href="https:\/\/y\.qq\.com\/.*(\/[0-9a-zA-Z]+)(\.html)?">.*?<\/a>/g;
        const QQVIDEO_REG = /<a href="https:\/\/v\.qq\.com\/.*\/([a-zA-Z0-9]+)\.html">.*?<\/a>/g;
        const SPOTIFY_REG = /<a href="https:\/\/open\.spotify\.com\/(track|album)\/([\s\S]+)">.*?<\/a>/g;
        const YOUKU_REG = /<a href="https:\/\/v\.youku\.com\/.*\/id_([a-zA-Z0-9=]+)\.html">.*?<\/a>/g;
        const YOUTUBE_REG = /<a href="https:\/\/(www\.youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})">.*?<\/a>/g;
        const NETEASE_MUSIC_REG = /<a href="https:\/\/music\.163\.com\/.*?id=(\d+)">.*?<\/a>/g;
        // 修改正则，避免匹配图片链接
        const GITHUB_REPO_REG = /<a href="https:\/\/github\.com\/([\w-]+)\/([\w.-]+)(?:\/[^\s"]*)?"[^>]*>(?!<img)[\s\S]*?<\/a>/g;

        // 处理标签（在 Markdown 解析后）
        content = content.replace(/<p>(.*?)<\/p>/g, (match, p) => {
            return '<p>' + p.replace(/#([^\s#<>]+)/g, '<span class="tag" onclick="filterByTag(\'$1\')">#$1</span>') + '</p>';
        });

        // 处理各种媒体链接
        content = content
        .replace(BILIBILI_REG, "<div class='video-wrapper'><iframe src='https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=$1&as_wide=1&high_quality=1&danmaku=0' scrolling='no' border='0' frameborder='no' framespacing='0' allowfullscreen='true' style='position:absolute;height:100%;width:100%;'></iframe></div>")
        .replace(YOUTUBE_REG, "<div class='video-wrapper'><iframe src='https://www.youtube.com/embed/$2' title='YouTube video player' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen></iframe></div>")
        .replace(NETEASE_MUSIC_REG, "<div class='music-wrapper'><meting-js auto='https://music.163.com/#/song?id=$1'></meting-js></div>")
        .replace(QQMUSIC_REG, "<div class='music-wrapper'><meting-js auto='https://y.qq.com/n/yqq/song$1.html'></meting-js></div>")
        .replace(QQVIDEO_REG, "<div class='video-wrapper'><iframe src='//v.qq.com/iframe/player.html?vid=$1' allowFullScreen='true' frameborder='no'></iframe></div>")
        .replace(SPOTIFY_REG, "<div class='spotify-wrapper'><iframe style='border-radius:12px' src='https://open.spotify.com/embed/$1/$2?utm_source=generator&theme=0' width='100%' frameBorder='0' allowfullscreen='' allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture' loading='lazy'></iframe></div>")
        .replace(YOUKU_REG, "<div class='video-wrapper'><iframe src='https://player.youku.com/embed/$1' frameborder=0 'allowfullscreen'></iframe></div>")
        .replace(GITHUB_REPO_REG, (match, owner, repo) => {
            const cardId = `github-card-${owner}-${repo}-${Math.random().toString(36).slice(2, 8)}`;
            setTimeout(() => fetchGitHubRepoInfo(owner, repo, cardId), 0);
            return `<div class="github-card" id="${cardId}" data-owner="${owner}" data-repo="${repo}">
                <div class="github-card-loading">Loading GitHub Repo...</div>
            </div>`;
        });

    return content;
}
    
    function updateLoadMoreState(itemCount) {
        if (itemCount >= config.limit) {
            loadMoreBtn.style.display = 'block';
            loadedAll.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'none';
            loadedAll.style.display = 'block';
            hasMore = false;
        }
    }
    
    function showNoContent() {
        container.querySelector('.loading-wrapper').textContent = '暂无内容';
        hasMore = false;
    }
    
    function showLoadError() {
        container.querySelector('.loading-wrapper').textContent = '加载失败，请刷新重试';
    }
    
    function renderMessages(messages) {
        const loadingWrapper = container.querySelector('.loading-wrapper');
        if (loadingWrapper) {
            loadingWrapper.style.display = 'none';
        }
        
        messages.forEach(message => {
            const messageElement = createMessageElement(message);
            container.insertBefore(messageElement, loadMoreBtn);
        });
    }
    
    // 将 toggleCommentBox 和 initWaline 函数暴露到全局作用域
    window.toggleCommentBox = function(host) {
        const commentBox = document.getElementById(`comment-box-${host}`);
        if (commentBox) {
            if (commentBox.style.display === "none") {
                commentBox.style.display = "block";
                initWaline(commentBox, host);
            } else {
                commentBox.style.display = "none";
            }
        }
    };

    window.initWaline = function(container, host) {
        const commentId = `waline-${host}`;
        container.innerHTML = `<div id="${commentId}"></div>`;
        import('https://unpkg.com/@waline/client@v3/dist/waline.js').then(({ init }) => {
            const uid = host.split('-').pop();
            init({
                el: `#${commentId}`,
                serverURL: window.note.commentServer || 'https://ment.noisework.cn', // 使用配置中的评论服务器地址
                reaction: 'true',
                meta: ['nick', 'mail', 'link'],
                requiredMeta: ['mail', 'nick'],
                pageview: true,
                search: false,
                wordLimit: 200,
                pageSize: 5,
                avatar: 'monsterid',
                emoji: [
                    'https://unpkg.com/@waline/emojis@1.2.0/tieba',
                ],
                imageUploader: false,
                copyright: false,
                path: `${config.host}/#/messages/${uid}`,
            });
        });
    };
    
    function createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'notecard';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'notecard-content';
        
        const title = document.createElement('h3');
        title.className = 'notecard-title';
        title.innerHTML = `${message.username || '匿名用户'}<i class="fas fa-certificate" style="color: rgb(26, 81, 232) font-size: 0.8em;"></i>`;
        
        const description = document.createElement('div');
        description.className = 'notecard-description';
        
        let processedContent = message.content || '无内容';
        processedContent = parseContent(processedContent);
        description.innerHTML = processedContent;

        buildImageGrids(description);

        const zoomImages = description.querySelectorAll('.zoom-image');
        mediumZoom(zoomImages, {
            margin: 24,
            background: 'rgba(0, 0, 0, 0.9)',
            scrollOffset: 0,
        });

        // 添加渐变遮罩
        const contentMask = document.createElement('div');
        contentMask.className = 'content-mask';
        description.appendChild(contentMask);
        
        // 添加展开按钮
        const expandBtn = document.createElement('button');
        expandBtn.className = 'expand-btn';
        expandBtn.textContent = '展开全文';
        
        // 修改展开按钮的检测逻辑
        const checkHeight = () => {
            const images = description.getElementsByTagName('img');
            const allImagesLoaded = Array.from(images).every(img => img.complete);
            
            if (allImagesLoaded) {
                const actualHeight = description.scrollHeight;
                if (actualHeight > 680) {
                    description.style.maxHeight = '680px';  // 添加这行
                    contentMask.style.display = 'block';
                    expandBtn.style.display = 'block';
                } else {
                    description.style.maxHeight = 'none';   // 添加这行
                    contentMask.style.display = 'none';
                    expandBtn.style.display = 'none';
                }
            } else {
                // 如果图片未加载完，等待所有图片加载完成后再次检查
                Promise.all(Array.from(images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                })).then(checkHeight);
            }
        };

        // 初始检查（处理无图片的情况）
        setTimeout(checkHeight, 100);
        
        // 展开按钮点击事件
        expandBtn.addEventListener('click', () => {
            if (description.classList.contains('expanded')) {
                description.classList.remove('expanded');
                description.style.maxHeight = '680px';      // 添加这行
                expandBtn.textContent = '展开全文';
                contentMask.style.display = 'block';
                // 滚动到卡片顶部
                messageDiv.scrollIntoView({ behavior: 'smooth' });
            } else {
                description.classList.add('expanded');
                description.style.maxHeight = 'none';       // 添加这行
                expandBtn.textContent = '收起全文';
                contentMask.style.display = 'none';
            }
        });
        
        if (message.image_url) {
            const img = document.createElement('img');
            img.src = message.image_url.startsWith('http') ? 
                message.image_url : 
                config.host + message.image_url;
            img.style.maxWidth = '100%';
            img.style.borderRadius = '2px';
            img.style.marginTop = '2px';
            description.appendChild(img);
        }
        
        contentDiv.appendChild(title);
        contentDiv.appendChild(description);
        contentDiv.appendChild(expandBtn);

        // 添加底部分割线和信息
        const footerDiv = document.createElement('div');
        footerDiv.className = 'note-footer';
        
        // 左侧时间和来源
        const timeDiv = document.createElement('small');
        timeDiv.className = 'post-time';
        const date = new Date(message.created_at);
        timeDiv.textContent = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')} · 来自 `;
        
        // 修改链接生成逻辑
        const sourceLink = document.createElement('a');
        sourceLink.href = `${config.host}/#/messages/${message.id}`;
        sourceLink.textContent = config.sourceName || '「说说笔记」';
        sourceLink.className = 'source-link';
        sourceLink.target = '_blank'; // 修改为在新标签页打开
        timeDiv.appendChild(sourceLink);
        
        // 右侧评论按钮
        const commentDiv = document.createElement('small');
        commentDiv.className = 'comment-button';
        commentDiv.dataset.host = `note-${message.id}`;
        commentDiv.innerHTML = '📮 评论';
        commentDiv.onclick = function() {
            window.toggleCommentBox(`note-${message.id}`);
        };
        
        footerDiv.appendChild(timeDiv);
        footerDiv.appendChild(commentDiv);
        
        // 添加评论框容器
        const commentBoxDiv = document.createElement('div');
        commentBoxDiv.id = `comment-box-note-${message.id}`;
        commentBoxDiv.className = 'comment-box';
        commentBoxDiv.style.display = 'none';
        
        contentDiv.appendChild(footerDiv);
        contentDiv.appendChild(commentBoxDiv);
        messageDiv.appendChild(contentDiv);
        
        return messageDiv;
    }
    
    function buildImageGrids(root) {
        try {
            const blocks = Array.from(root.children);
            let run = [];
            const flush = () => {
                if (run.length < 2) { run = []; return; }
                const grid = document.createElement('div');
                const count = run.length;
                const cols = (count === 2 || count === 4) ? 2 : Math.min(3, count);
                grid.className = `image-grid cols-${cols}`;
                for (const p of run) {
                    const img = p.querySelector('img');
                    const a = p.querySelector('a');
                    if (!img && !a) continue;
                    const item = document.createElement('div');
                    item.className = 'image-grid-item';
                    let node;
                    if (a && a.querySelector('img')) {
                        node = a;
                    } else if (img) {
                        node = img;
                    } else {
                        continue;
                    }
                    item.appendChild(node);
                    grid.appendChild(item);
                }

                grid.querySelectorAll('img').forEach((imgEl) => {
                    const img = imgEl;
                    const item = img.closest('.image-grid-item');
                    const setAR = () => {
                        if (!item) return;
                        const w = img.naturalWidth;
                        const h = img.naturalHeight;
                        item.classList.remove('ar-169','ar-34','ar-11');
                        if (w > h) item.classList.add('ar-169');
                        else if (h > w) item.classList.add('ar-34');
                        else item.classList.add('ar-11');
                    };
                    if (img.complete && img.naturalWidth && img.naturalHeight) setAR();
                    else img.addEventListener('load', setAR, { once: true });
                });

                const first = run[0];
                first.replaceWith(grid);
                for (let i = 1; i < run.length; i++) run[i].remove();
                run = [];
            };

            for (const el of blocks) {
                const hasImg = !!el.querySelector('img');
                const hasLinkImg = !!el.querySelector('a img');
                if (el.tagName.toLowerCase() === 'p' && (hasImg || hasLinkImg)) {
                    run.push(el);
                } else {
                    flush();
                }
            }
            flush();
        } catch (e) {
            console.warn('image-grid build failed:', e);
        }
    }
    
    // 将filterByTag函数暴露到全局作用域
    window.filterByTag = filterByTag;
});

// 新增：异步拉取GitHub仓库信息并填充卡片
function fetchGitHubRepoInfo(owner, repo, cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;

    const svgStar = '<svg class="gh-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 .25l2.317 4.7 5.183.754-3.75 3.654.885 5.167L8 12.347l-4.635 2.178.885-5.167-3.75-3.654 5.183-.754L8 .25z"></path></svg>';
    const svgFork = '<svg class="gh-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="4" cy="3" r="1.5" fill="currentColor"></circle><circle cx="12" cy="3" r="1.5" fill="currentColor"></circle><circle cx="8" cy="13" r="1.5" fill="currentColor"></circle><path d="M4 4.5v2a4 4 0 004 4h0a4 4 0 004-4v-2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
    const svgLang = '<svg class="gh-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M5 5 L2 8 L5 11" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M11 5 L14 8 L11 11" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M7 12 L9 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
    const svgMark = '<svg class="gh-badge" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 012 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>';

    const skeleton = () => {
        card.innerHTML = `
          <div class="github-card-header">
            <div class="gh-avatar-slot"><div class="github-card-avatar"></div>${svgMark}</div>
            <div>
              <a href="https://github.com/${owner}/${repo}" target="_blank" class="github-card-title">${owner}/${repo}</a>
            </div>
        </div>
        `;
      };
      skeleton();

      const cacheKey = `gh_repo_cache_${owner}_${repo}`;
      const ttlMs = 6 * 60 * 60 * 1000; // 6h
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const obj = JSON.parse(cached);
          if (obj && obj.ts && Date.now() - obj.ts < ttlMs && obj.data) {
            const d = obj.data;
            card.innerHTML = `
              <div class="github-card-header">
                <div class="gh-avatar-slot">
                  <img src="${d.owner.avatar_url}" class="github-card-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"/>
                  <div class="avatar-fallback" style="display:none;">${owner.charAt(0).toUpperCase()}</div>
                  ${svgMark}
                </div>
                <div>
                  <a href="https://github.com/${owner}/${repo}" target="_blank" class="github-card-title">${d.full_name || owner + '/' + repo}</a>
                </div>
              </div>
            `;
            return;
          }
        }
      } catch {}

      const tryFetch = async (url, timeoutMs = 6000) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const r = await fetch(url, { signal: ctrl.signal });
          if (!r.ok) throw new Error(String(r.status));
          const j = await r.json();
          return j;
        } finally { clearTimeout(t); }
      };

      (async () => {
        let data = null;
        try {
          data = await tryFetch(`https://api.github.com/repos/${owner}/${repo}`);
        } catch {
          try {
            data = await tryFetch(`https://ghproxy.com/https://api.github.com/repos/${owner}/${repo}`);
          } catch {}
        }

        if (data) {
          try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data })); } catch {}
          card.innerHTML = `
            <div class="github-card-header">
              <div class="gh-avatar-slot">
                <img src="${data.owner && data.owner.avatar_url || ''}" class="github-card-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"/>
                <div class="avatar-fallback" style="display:none;">${owner.charAt(0).toUpperCase()}</div>
                ${svgMark}
              </div>
              <div>
                <a href="${data.html_url || `https://github.com/${owner}/${repo}`}" target="_blank" class="github-card-title">${data.full_name || owner + '/' + repo}</a>
              </div>
            </div>
          `;
          return;
        }

        card.innerHTML = `
          <div class="github-card-header">
            <div class="gh-avatar-slot"><div class="avatar-fallback" style="display:flex;">${owner.charAt(0).toUpperCase()}</div>${svgMark}</div>
            <div>
              <a href="https://github.com/${owner}/${repo}" target="_blank" class="github-card-title">${owner}/${repo}</a>
            </div>
          </div>
        `;
      })();
}
