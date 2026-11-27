/*
 * 分类排序切换（正序 / 最新在前）
 * 1. data/webstack.yml 中新收录的站点追加在分类末尾，因此倒序即“最新优先”
 * 2. 点击分类标题旁的小按钮，在「收录顺序（正序）」与「最新在前（倒序）」之间切换
 * 3. 默认顺序由 config.toml [params.siteSort] defaultOrder 决定，用户手动切换后按分类记忆在本机
 * 4. 热门站点分类已按全站点击量排序，这里跳过，避免与 hot-sites.js 冲突
 */
(function () {
    'use strict';

    var DEFAULT_STORAGE_KEY = 'noisedh_latest_sort_v1';
    var storageKey = DEFAULT_STORAGE_KEY;
    var DEFAULT_LIMIT = 24;
    var modes = {};

    (function resolveStorage() {
        var holder = document.querySelector('[data-sort-storage-key]');
        var value = holder ? holder.getAttribute('data-sort-storage-key') : '';
        if (value) storageKey = value;
        try {
            var saved = window.localStorage.getItem(storageKey);
            modes = saved ? (JSON.parse(saved) || {}) : {};
        } catch (e) {
            modes = {};
        }
    })();

    function saveModes() {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(modes));
        } catch (e) {
            /* 隐私模式下写入失败时仅本次会话生效 */
        }
    }

    function gridLimit(grid) {
        var value = Number(grid.getAttribute('data-collapse-limit'));
        return value > 0 ? value : DEFAULT_LIMIT;
    }

    function getCards(grid) {
        return Array.prototype.filter.call(grid.children, function (node) {
            return node.classList && node.classList.contains('url-card');
        });
    }

    // 重排后重新标记折叠边界；始终保留标记，展开/收起由 .is-expanded 的 CSS 控制
    function syncCollapse(grid) {
        if (!grid.dataset || !grid.dataset.collapseId) return;
        var limit = gridLimit(grid);
        getCards(grid).forEach(function (card, index) {
            card.classList.toggle('is-collapsed-item', index >= limit);
        });
    }

    function sortGrid(grid, latest) {
        var cards = getCards(grid);
        if (!cards.length) return;

        // 首次排序前记录 YAML 原始顺序，之后还原都以此为准
        cards.forEach(function (card, index) {
            if (!card.hasAttribute('data-original-index')) {
                card.setAttribute('data-original-index', String(index));
            }
        });

        var ordered = cards.slice().sort(function (a, b) {
            var ai = Number(a.getAttribute('data-original-index')) || 0;
            var bi = Number(b.getAttribute('data-original-index')) || 0;
            return latest ? bi - ai : ai - bi;
        });

        var fragment = document.createDocumentFragment();
        ordered.forEach(function (card) {
            fragment.appendChild(card);
        });
        grid.appendChild(fragment);
        syncCollapse(grid);
    }

    function applyBlock(block, latest) {
        Array.prototype.forEach.call(block.querySelectorAll('.row.card-list'), function (grid) {
            sortGrid(grid, latest);
        });
    }

    function updateButton(button, latest) {
        button.classList.toggle('is-active', latest);
        button.setAttribute('aria-pressed', latest ? 'true' : 'false');
        var text = latest ? '当前：倒序（最新在前），点击恢复收录顺序' : '当前：正序（收录顺序），点击切换为最新在前';
        button.setAttribute('aria-label', text);
        // 提示气泡是按钮的相邻节点，显隐完全交给 CSS（:hover / :focus-visible）
        var tipEl = button.nextElementSibling;
        if (tipEl && tipEl.classList.contains('latest-sort-tip')) {
            tipEl.textContent = text;
        }
    }

    function init() {
        Array.prototype.forEach.call(document.querySelectorAll('.category-block'), function (block) {
            // 热门站点块由 hot-sites.js 负责排序
            if (block.classList.contains('hot-sites-block')) return;

            var button = block.querySelector('.latest-sort-btn');
            if (!button) return;
            // 友情链接等没有站点卡片的块不显示排序按钮
            if (!block.querySelector('.url-card')) return;

            var key = block.getAttribute('data-sort-key') || block.id || '';
            if (!key) return;

            var fallback = button.getAttribute('data-default-order') === 'latest' ? 'latest' : 'default';
            var stored = Object.prototype.hasOwnProperty.call(modes, key) ? modes[key] : fallback;
            var latest = stored === 'latest';
            button.hidden = false;
            updateButton(button, latest);
            if (latest) applyBlock(block, true);

            button.addEventListener('click', function () {
                var next = button.getAttribute('aria-pressed') === 'true' ? 'default' : 'latest';
                modes[key] = next;
                saveModes();
                applyBlock(block, next === 'latest');
                updateButton(button, next === 'latest');
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
