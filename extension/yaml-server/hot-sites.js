'use strict';

/**
 * 热门站点点击计数（全站共享）
 *
 * GET  /api/hot-sites?limit=12   读取点击排行
 * POST /api/hot-sites/click      上报一次点击（公开，无需 Token）
 *
 * 计数保存在本模块同目录的 hot_site_clicks.json（可用 HOT_SITES_DATA_FILE 覆盖），
 * 内存累加 + 1 秒防抖落盘，重启后恢复。
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const MAX_URL_LENGTH = 2048;
const MAX_TRACKED_URLS = 2000;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;
const FLUSH_DELAY_MS = 1000;
const DEDUPE_MS = 3000;
const WINDOW_MS = 60000;
const MAX_CLICKS_PER_WINDOW = 120;

function normalizeSiteUrl(raw) {
    const value = String(raw == null ? '' : raw).trim();
    if (!value || value.length > MAX_URL_LENGTH) return '';
    let parsed;
    try {
        parsed = new URL(value);
    } catch (error) {
        return '';
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    if (!parsed.hostname) return '';
    if (parsed.username || parsed.password) return '';
    return value;
}

function createHotSitesRouter(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const dataFile = path.resolve(
        opts.dataFile || process.env.HOT_SITES_DATA_FILE || path.join(__dirname, 'hot_site_clicks.json')
    );

    let counts = Object.create(null);
    let updatedAt = null;
    let dirty = false;
    let flushTimer = null;
    let flushing = false;
    const recentClicks = new Map();
    const buckets = new Map();

    function load() {
        try {
            const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
            const source = parsed && parsed.counts && typeof parsed.counts === 'object' ? parsed.counts : parsed;
            if (source && typeof source === 'object') {
                Object.keys(source).forEach(function (url) {
                    const value = Number(source[url]);
                    if (Number.isFinite(value) && value > 0 && normalizeSiteUrl(url)) {
                        counts[url] = Math.floor(value);
                    }
                });
            }
            if (parsed && parsed.updatedAt) updatedAt = String(parsed.updatedAt);
        } catch (error) {
            // 首次运行没有计数文件，忽略
        }
    }

    function pruneCounts() {
        const urls = Object.keys(counts);
        if (urls.length <= MAX_TRACKED_URLS) return;
        urls.sort(function (a, b) {
            return (counts[a] || 0) - (counts[b] || 0);
        });
        urls.slice(0, urls.length - MAX_TRACKED_URLS).forEach(function (url) {
            delete counts[url];
        });
    }

    function flush() {
        if (flushing) {
            dirty = true;
            return;
        }
        if (!dirty) return;
        flushing = true;
        dirty = false;
        try {
            pruneCounts();
            updatedAt = new Date().toISOString();
            fs.mkdirSync(path.dirname(dataFile), { recursive: true });
            const tmpFile = dataFile + '.tmp';
            fs.writeFileSync(tmpFile, JSON.stringify({ updatedAt: updatedAt, counts: counts }, null, 2));
            fs.renameSync(tmpFile, dataFile);
        } catch (error) {
            dirty = true;
        } finally {
            flushing = false;
        }
    }

    function scheduleFlush() {
        if (flushTimer) return;
        flushTimer = setTimeout(function () {
            flushTimer = null;
            flush();
        }, FLUSH_DELAY_MS);
        if (flushTimer.unref) flushTimer.unref();
    }

    function clientKey(req) {
        const forwarded = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim();
        if (forwarded) return forwarded;
        const socket = req.socket || req.connection || {};
        return String(socket.remoteAddress || 'unknown');
    }

    function allowClick(ip, url) {
        const now = Date.now();
        const recentKey = ip + '|' + url;
        const last = recentClicks.get(recentKey) || 0;
        if (now - last < DEDUPE_MS) return false;

        let bucket = buckets.get(ip);
        if (!bucket || now >= bucket.reset) {
            bucket = { count: 0, reset: now + WINDOW_MS };
            buckets.set(ip, bucket);
        }
        if (bucket.count >= MAX_CLICKS_PER_WINDOW) return false;

        recentClicks.set(recentKey, now);
        bucket.count += 1;

        if (recentClicks.size > 5000) {
            recentClicks.forEach(function (timestamp, key) {
                if (now - timestamp > WINDOW_MS) recentClicks.delete(key);
            });
        }
        if (buckets.size > 5000) {
            buckets.forEach(function (item, key) {
                if (now >= item.reset) buckets.delete(key);
            });
        }
        return true;
    }

    load();

    const router = express.Router();

    router.get('/', function (req, res) {
        const rawLimit = parseInt(req.query.limit, 10);
        const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT));
        const sites = Object.keys(counts)
            .map(function (url) {
                return { url: url, count: counts[url] || 0 };
            })
            .sort(function (a, b) {
                return (b.count - a.count) || a.url.localeCompare(b.url);
            })
            .slice(0, limit);
        res.set('Cache-Control', 'public, max-age=20');
        res.json({
            updatedAt: updatedAt,
            total: Object.keys(counts).length,
            sites: sites
        });
    });

    router.post('/click', function (req, res) {
        const url = normalizeSiteUrl(req.body && req.body.url);
        if (!url) return res.status(400).json({ error: 'invalid_url' });
        if (!allowClick(clientKey(req), url)) return res.status(429).json({ error: 'too_many_requests' });

        counts[url] = (counts[url] || 0) + 1;
        dirty = true;
        scheduleFlush();
        res.status(204).end();
    });

    return router;
}

const router = createHotSitesRouter();
router.createHotSitesRouter = createHotSitesRouter;

module.exports = router;

