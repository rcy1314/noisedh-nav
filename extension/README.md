# Nav-Manage（扩展 + 后端 API）

Nav-Manage 由两部分组成：

- 浏览器扩展（前端）：[Nav-manage-extension](file:///Library/Github/noisedh/extension/Nav-manage-extension)
- 后端 API（Node + Express）：[yaml-server](file:///Library/Github/noisedh/extension/yaml-server)

用于给 Hugo 静态导航站提供“收录/删除/搜索/失效检测/导出书签/通知推送”等管理能力。

演示站点：[NOISE导航](https://www.noisedh.link)

## 快速开始（仅部署后端）

说明：本节是“仅后端 API”部署，不包含 Hugo 主题网站的静态服务。  
如果你需要“一次性部署 Hugo 主题网站 + Docker 运行教程”，请先看：

- [DOCKER_HUGO.md](../../DOCKER_HUGO.md)

已发布镜像：`noise233/nav-manage`（默认端口 `8990`）。

示例（按实际路径修改）：

```bash
docker run -d \
  --name nav-manage \
  -p 8990:8990 \
  -e PORT=8990 \
  -e BASE_DIR=/app/hugo \
  -e API_TOKEN=change_me_to_a_strong_token \
  -e ENABLE_HUGO=false \
  -e REMOTE_UPDATE_WEBHOOK= \
  -v /path/to/your/hugo-site:/app/hugo \
  --restart=always \
  noise233/nav-manage:latest
```

说明：

- `BASE_DIR`：站点根目录，容器会读写 `${BASE_DIR}/data/*.yml`，并可能写入 `${BASE_DIR}/content/invalidlinks.md`
- `API_TOKEN`：写入/删除/失效检测等接口鉴权 Token（扩展设置里要一致）
- `ENABLE_HUGO=true`：收录/删除后在容器内执行 `hugo`（需要挂载完整 Hugo 源码目录）
- `ENABLE_HUGO=false`：不在容器内编译 Hugo，建议配合 `REMOTE_UPDATE_WEBHOOK` 触发远程更新

如果你只想公开提供 MCP 搜索（`/mcp`）而不提供写入类接口：

- 可以不设置 `API_TOKEN`
- 设置 `MCP_HTTP=true`，并选择：
  - `MCP_REQUIRE_TOKEN=false`（公开）
  - 或设置 `MCP_TOKEN=<公开用Token>` 并保持 `MCP_REQUIRE_TOKEN=true`

完整参数说明与 API 列表见：[DEPLOYMENT.md](./yaml-server/DEPLOYMENT.md)

## MCP（供 AI 客户端接入）

后端支持通过 HTTP 提供 MCP（统一使用 `/mcp` 端点），便于接入不同 AI 客户端进行自然语言站内搜索（支持可点击翻页/筛选）。如你的 AI 客户端只支持 stdio，也可使用本地 Node stdio 方式接入。

## 一句话安装/接入（Skill）

使用者 Skill 文档见：[SKILL.md](SKILL.md)

两种常见启动方式：

1) HTTP API + MCP（HTTP 接入，推荐：AI 客户端只填 URL 即可）：

```bash
docker run -d \
  --name nav-manage \
  -p 8990:8990 \
  -e PORT=8990 \
  -e BASE_DIR=/app/hugo \
  -e API_TOKEN=change_me_to_a_strong_token \
  -e MCP_TOKEN=change_me_to_a_mcp_token \
  -e MCP_REQUIRE_TOKEN=true \
  -e MCP_RATE_LIMIT_MAX=120 \
  -e MCP_RATE_LIMIT_WINDOW_MS=60000 \
  -e ENABLE_HUGO=false \
  -e MCP_HTTP=true \
  -v /path/to/your/hugo-site:/app/hugo \
  --restart=always \
  noise233/nav-manage:latest
```

2) 仅 MCP（stdio，不启动 HTTP，适合由 AI 客户端托管本地进程）：

```bash
BASE_DIR=/path/to/hugo SEARCH_DATA_DIRS=/path/to/hugo/data \
  node /absolute/path/to/noisedh/extension/yaml-server/server.js --mcp --no-http
```

仅当你的 AI 客户端所在机器本机已安装 Docker，才考虑用镜像方式托管 MCP：

```bash
docker run --rm -i -v /path/to/your/hugo-site/data:/app/data noise233/nav-manage:latest --mcp --no-http
```

### AI 客户端配置（URL / stdio）

不少 AI 客户端支持直接填写 `url` 的方式接入 MCP（推荐）。本服务在 HTTP 模式下统一使用 `/mcp` 端点。

补充说明：

- `/mcp` 支持标准 MCP HTTP 的 `GET` / `POST` / `DELETE`
- 服务端可能返回单次 JSON，也可能返回 `text/event-stream`
- 初始化后，服务端可能返回 `Mcp-Session-Id`，客户端后续请求应继续携带

URL 方式示例（按实际地址修改）：

```json
{
  "mcpServers": {
    "NOISE导航": {
      "url": "https://api.example.com/mcp",
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

公开模式示例（不需要 Token，但保留访问频率限制）：

```bash
docker run -d \
  --name nav-manage \
  -p 8990:8990 \
  -e PORT=8990 \
  -e BASE_DIR=/app/hugo \
  -e API_TOKEN=change_me_to_a_strong_token \
  -e ENABLE_HUGO=false \
  -e MCP_HTTP=true \
  -e MCP_REQUIRE_TOKEN=false \
  -e MCP_RATE_LIMIT_MAX=120 \
  -e MCP_RATE_LIMIT_WINDOW_MS=60000 \
  -v /path/to/your/hugo-site:/app/hugo \
  --restart=always \
  noise233/nav-manage:latest
```

使用示例（自然语言 / 格式化）：

- 自然语言： “在 NOISE导航 里搜索 AI 工具，翻到第 2 页”
- 自然语言： “帮我找可以 AI 生成图片的网站”
- 自然语言： “在 NOISE导航 里搜一下 AI 绘图工具”
- 自然语言： “找一些支持文生图的站点”
- 自然语言： “搜索能生成图片的 AI 网站，优先国外热门产品”
- 自然语言： “帮我找 AI 图片生成工具，第 2 页”
- 自然语言： “在 NOISE导航 里搜一下：云盘资源库（可以命中描述）”
- 格式化： “搜索：关键词=AI，页码=2，每页=20”
- 带筛选： “搜索：关键词=AI，一级分类=设计，二级分类=图标”
- 结构化： “搜索：关键词=AI，格式=json”（需要完整字段时用）

字段映射（数据文件真实字段；其中 taxonomy/term 可作为筛选参数）：

- `一级分类` → `taxonomy`
- `二级分类` → `term`
- `地址` → `url`
- `描述` → `description`

前提（Node stdio 方式）：

- AI 客户端所在机器需要能访问到站点的数据目录（通常是本机/本服务器的 `data/` 目录）
- 本机需要有 `extension/yaml-server` 目录并安装依赖：在 `extension/yaml-server` 执行 `npm ci`（或 `npm i --production`）

示例（按实际路径修改）：

```json
{
  "mcpServers": {
    "NOISE导航": {
      "command": "node",
      "args": [
        "/absolute/path/to/noisedh/extension/yaml-server/server.js",
        "--mcp",
        "--no-http"
      ],
      "env": {
        "BASE_DIR": "/path/to/hugo",
        "SEARCH_DATA_DIRS": "/path/to/hugo/data"
      }
    }
  }
}
```

### MCP 接入参数说明（最全）

你只用“站内搜索”时，优先用上面的 `url: https://.../mcp` 方式，参数最少；只有当你的 AI 客户端不支持 `url` 时，才使用 Node stdio 方式。

#### AI 客户端配置字段

- `mcpServers."NOISE导航"`：你自定义的服务名（可改）
- `url`：MCP 服务地址（推荐），例如 `https://api.example.com/mcp`
- `headers`：可选请求头（默认建议填 `Authorization: Bearer <API_TOKEN>`）
- `command` / `args` / `env`：当客户端只支持 stdio 时使用（见下文 Node 启动）

#### Node 启动（推荐）

等价命令：

```bash
BASE_DIR=/path/to/hugo SEARCH_DATA_DIRS=/path/to/hugo/data \
  node /absolute/path/to/noisedh/extension/yaml-server/server.js --mcp --no-http
```

- `SEARCH_DATA_DIRS`：指向你的 `data/` 目录
- `--mcp`：开启 MCP
- `--no-http`：关闭 HTTP（避免输出干扰；只搜索时建议一直关）

#### Docker（可选，仅当本机已安装 Docker）

等价命令：

```bash
docker run --rm -i -v /path/to/your/hugo-site/data:/app/data noise233/nav-manage:latest --mcp --no-http
```

- `--rm`：退出后自动清理容器
- `-v <data目录>:/app/data`：把站点数据挂进来，否则容器内搜不到任何条目

#### MCP 相关开关（启动参数 / 环境变量）

- `MCP_HTTP=true`：开启 MCP 的 HTTP 接入（统一使用 `/mcp` 端点，推荐用于 URL 接入）
- `MCP_REQUIRE_TOKEN=true|false`：`/mcp` 是否必须携带鉴权 Token（默认 true，使用 `API_TOKEN`）
- `MCP_TOKEN`：`/mcp` 的鉴权 Token（可选；不填则复用 `API_TOKEN`）
- `MCP_RATE_LIMIT_MAX` / `MCP_RATE_LIMIT_WINDOW_MS`：`/mcp` 访问频率限制（按 IP 计数）
- `MCP_RATE_LIMIT_DISABLED=true|false`：关闭 `/mcp` 访问频率限制
- `--mcp` 或 `MCP_ENABLED=true`：开启 MCP（stdio）
- `MCP_WITH_HTTP=true`：stdio MCP 启用时是否同时保留 HTTP（仅 stdio 场景使用）
- `--no-http` 或 `HTTP_DISABLED=true`：关闭 HTTP
- `MCP_SCAN_INTERVAL_MS` / `MCP_SCAN_MAX_DEPTH` / `MCP_SCAN_MAX_FILES`：扫描性能相关参数

配置落地方式：

- 在你的 AI 客户端中找到 MCP 配置入口（通常在“Developer/MCP/Tools”等设置里会有“Edit Config”或“Open Config”按钮）
- 将上面的 `mcpServers` 片段复制进去即可

MCP 能力与环境变量说明见：[DEPLOYMENT.md](./yaml-server/DEPLOYMENT.md)

## 前后端分离部署（推荐）

典型方式：

- Hugo 导航站（前端）：静态发布在 Nginx / CDN / GitHub Pages
- yaml-server（后端）：部署在云服务器，仅负责写入数据与触发更新

有两种常见更新策略：

### 策略 A：后端同机编译 Hugo

- 把 Hugo 源码目录挂载到容器（包含 `config.toml`、`themes/`、`content/`、`data/`）
- `ENABLE_HUGO=true`
- Web 服务指向 Hugo 的输出目录（例如 `publishDir=docs` 则为 `docs/`）

### 策略 B：Webhook 触发远程构建（更通用）

- `ENABLE_HUGO=false`
- 配置 `REMOTE_UPDATE_WEBHOOK` 指向你的构建/发布入口（例如：拉取仓库、执行 hugo、同步到站点）
- 后端写入数据完成后会自动 POST 该 webhook 触发更新

## 浏览器扩展使用

扩展安装后，在设置页填写并保存：

- `serverUrl`：后端 API 地址（例如 `https://api.example.com`）
- `serverToken`：与后端 `API_TOKEN` 一致
- 推送通知参数：`webhookUrl`、`telegramChatId`、`telegramBotToken`
- RSS 自定义参数：`rssChannelTitle`、`rssChannelLink`、`rssChannelDescription`、`rssImageUrl`、`rssImageTitle`、`rssImageLink`
- Telegram 文案参数：`telegramMessageTitle`、`telegramNavText`

并在“写入同步”里勾选：

- 云服务器（写入到 yaml-server）
- GitHub（写入到仓库 data/ 目录）

两者可以同时勾选：一次收录会同时写入两端，并分别提示成功/失败原因。

说明：以上推送/RSS/文案参数会随“保存”同步到后端 `/api/server-settings`，服务端会持久化并直接用于 RSS 生成与 Telegram 推送。

扩展完整说明见：[USAGE.md](file:///Library/Github/noisedh/extension/Nav-manage-extension/USAGE.md)

## 常用 API（示例）

写入类接口需携带：

```text
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
```

示例：

```bash
curl "http://localhost:8990/data"

curl -X POST "http://localhost:8990/api/yaml" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"filename":"webstack.yml","newDataEntry":{"title":"Example","url":"https://example.com","logo":"https://example.com/favicon.ico","description":"desc","taxonomy":"一级分类名","term":"二级分类名"}}'

curl -X DELETE "http://localhost:8990/api/delete" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"filename":"webstack.yml","title":"Example"}'

curl -X POST "http://localhost:8990/api/invalid-links/check" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"filename":"webstack.yml","limit":40,"offset":0}'

curl -O "http://localhost:8990/api/export-bookmarks"
```

完整接口与参数请以 [DEPLOYMENT.md](./yaml-server/DEPLOYMENT.md) 为准。

## GitHub action 工作流运行

构建页面工作流将在您点击 “Start Workflow” 按钮后立即运行，并且在每次 `main` 分支有变动时也会自动运行

自动检测失效链接工作流将在您点击 “Start Workflow” 按钮后立即运行，需要定时运行时取消cron前的#符号即可

> 如果你觉得本项目对你有所帮助，请[赞赏支持](https://www.noisework.cn/e/zhichi)它！
