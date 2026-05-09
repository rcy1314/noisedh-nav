# Docker 部署 Hugo 主题网站（含 noisedh-nav 主题）教程

本文是“整站部署”教程，目标是把本仓库 Hugo 主题站点完整跑起来，并可选联动 `yaml-server` 后端实现“扩展收录后自动更新”。

## 适用场景

- 只部署 Hugo 静态网站（不需要后端写入）
- 部署 Hugo + Nginx（容器内构建静态文件并发布）
- 部署 Hugo + Nginx + yaml-server（扩展可写入 `data/*.yml` 并触发更新）

## 目录准备

假设你在服务器目录 `/srv/noisedh` 里操作：

```bash
mkdir -p /srv/noisedh
cd /srv/noisedh
git clone https://github.com/rcy1314/noisedh-nav.git .
```

建议检查 `config.toml`：

- `baseURL` 改为你的正式域名
- `publishDir` 建议保持 `docs`（与下方示例一致）

## 方案一：仅 Hugo + Nginx（最简单）

### 1) 创建 Compose 文件

在仓库根目录创建 `docker-compose.site.yml`：

```yaml
services:
  hugo-builder:
    image: klakegg/hugo:0.128.2-ext
    working_dir: /src
    volumes:
      - ./:/src
    command: >
      sh -c "hugo --minify &&
             chown -R 101:101 /src/docs"

  nginx:
    image: nginx:alpine
    depends_on:
      hugo-builder:
        condition: service_completed_successfully
    ports:
      - "80:80"
    volumes:
      - ./docs:/usr/share/nginx/html:ro
    restart: always
```

### 2) 构建并启动

```bash
docker compose -f docker-compose.site.yml up -d
```

访问：

- `http://服务器IP`（或你的域名）

更新内容后重新构建：

```bash
docker compose -f docker-compose.site.yml run --rm hugo-builder
docker compose -f docker-compose.site.yml restart nginx
```

## 方案二：整站联动（Hugo + Nginx + yaml-server）

此方案适用于浏览器扩展写入后端，后端写入 `data/*.yml` 后触发重建。

### 1) 创建 Compose 文件

在仓库根目录创建 `docker-compose.full.yml`：

```yaml
services:
  yaml-server:
    image: noise233/nav-manage:latest
    container_name: nav-manage
    ports:
      - "8990:8990"
    environment:
      - PORT=8990
      - BASE_DIR=/app/hugo
      - API_TOKEN=change_me_to_a_strong_token
      - ENABLE_HUGO=true
      - REMOTE_UPDATE_WEBHOOK=
      - INVALID_404_THRESHOLD=3
      - INVALID_CHECK_TIMEOUT_MS=8000
      - INVALID_LINKS_MD=/app/hugo/content/invalidlinks.md
      - INVALID_LINKS_COUNTS=/app/server/invalidlink_counts.json
    volumes:
      - ./:/app/hugo
      - ./extension/yaml-server/notifications.json:/app/server/notifications.json
      - ./extension/yaml-server/invalidlink_counts.json:/app/server/invalidlink_counts.json
    restart: always

  hugo-builder:
    image: klakegg/hugo:0.128.2-ext
    working_dir: /src
    volumes:
      - ./:/src
    command: >
      sh -c "hugo --minify &&
             chown -R 101:101 /src/docs"

  nginx:
    image: nginx:alpine
    depends_on:
      - hugo-builder
    ports:
      - "80:80"
    volumes:
      - ./docs:/usr/share/nginx/html:ro
    restart: always
```

### 2) 首次启动

```bash
docker compose -f docker-compose.full.yml up -d
```

### 3) 扩展配置

- `serverUrl` 填写 `http://你的服务器IP:8990`（生产环境建议走 HTTPS 反代）
- `serverToken` 必须与 `API_TOKEN` 一致
- 打开“云服务器写入”

收录后如果你启用了 `ENABLE_HUGO=true`，后端会在写入完成后尝试执行 `hugo`。

## 生产建议

- 强制使用 HTTPS（Nginx/Caddy 反向代理）
- `API_TOKEN` 使用高强度随机串
- 限制后端接口来源 IP 或增加网关鉴权
- 备份 `data/` 与 `content/invalidlinks.md`
- 如果并发较高，建议改为 `ENABLE_HUGO=false` + `REMOTE_UPDATE_WEBHOOK` 异步构建

## 快速排错

查看容器状态：

```bash
docker compose -f docker-compose.full.yml ps
```

查看后端日志：

```bash
docker compose -f docker-compose.full.yml logs -f yaml-server
```

查看站点服务日志：

```bash
docker compose -f docker-compose.full.yml logs -f nginx
```

API 健康检查：

```bash
curl http://127.0.0.1:8990/data
```

## 与其他文档的关系

- 后端参数/API 细节：`extension/yaml-server/DEPLOYMENT.md`
- 扩展配置细节：`extension/Nav-manage-extension/USAGE.md`
- 扩展与后端总览：`extension/README.md`
