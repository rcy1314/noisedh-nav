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
git clone https://github.com/rcy1314/noisedh.git .
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
      - MCP_TOKEN=change_me_to_a_mcp_token
      - MCP_REQUIRE_TOKEN=true
      - MCP_RATE_LIMIT_MAX=120
      - MCP_RATE_LIMIT_WINDOW_MS=60000
      - ENABLE_HUGO=true
      - REMOTE_UPDATE_WEBHOOK=
      - INVALID_404_THRESHOLD=3
      - INVALID_CHECK_TIMEOUT_MS=8000
      - INVALID_LINKS_MD=/app/hugo/content/invalidlinks.md
      - INVALID_LINKS_COUNTS=/app/server/invalidlink_counts.json
      - MCP_HTTP=true
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

## MCP（可选）

如果你希望把站内收录数据接入 AI 客户端做自然语言搜索（支持可点击翻页/筛选），可在上面的 `yaml-server` 服务中启用 HTTP MCP：

- `MCP_HTTP=true`

AI 客户端接入（URL 方式）：

```json
{
  "mcpServers": {
    "NOISE导航": {
      "url": "http://你的服务器IP:8990/mcp",
      "headers": {
        "Authorization": "Bearer <Token>"
      }
    }
  }
}
```

鉴权说明（/mcp）：

- 默认需要鉴权：`Authorization: Bearer <Token>`
- `Token` 的取值优先级：`MCP_TOKEN`（若设置）→ 否则复用 `API_TOKEN`
- 若希望公开给所有人使用：设置 `MCP_REQUIRE_TOKEN=false`

访问频率限制（/mcp，按 IP 计数）：

- `MCP_RATE_LIMIT_MAX`：窗口内最大请求数（默认 120）
- `MCP_RATE_LIMIT_WINDOW_MS`：窗口毫秒数（默认 60000）
- `MCP_RATE_LIMIT_DISABLED=true`：关闭限制

使用示例（自然语言 / 格式化）：

- 自然语言： “在 NOISE导航 里搜索：设计 图标，翻到第 3 页”
- 自然语言： “帮我找可以 AI 生成图片的网站”
- 自然语言： “在 NOISE导航 里搜一下 AI 绘图工具”
- 自然语言： “找一些支持文生图的站点”
- 自然语言： “搜索能生成图片的 AI 网站，优先国外热门产品”
- 自然语言： “帮我找 AI 图片生成工具，第 2 页”
- 自然语言： “在 NOISE导航 里搜一下：云盘资源库（可以命中描述）”
- 格式化： “搜索：关键词=设计 图标，页码=3，每页=20”
- 带筛选： “搜索：关键词=图标，一级分类=设计，二级分类=UI”
- 结构化： “搜索：关键词=图标，格式=json”（需要完整字段时用）

字段映射（数据文件真实字段；其中 taxonomy/term 可作为筛选参数）：

- `一级分类` → `taxonomy`
- `二级分类` → `term`
- `地址` → `url`
- `描述` → `description`

更多 MCP 说明见：`extension/yaml-server/DEPLOYMENT.md`

## 与其他文档的关系

- 后端参数/API 细节：`extension/yaml-server/DEPLOYMENT.md`
- 扩展配置细节：`extension/Nav-manage-extension/USAGE.md`
- 扩展与后端总览：`extension/README.md`
