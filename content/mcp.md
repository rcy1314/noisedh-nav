---
title: "MCP / Skill / 搜索 API 使用说明"
date: 2026-05-15T00:00:00+08:00
draft: false
---

## 公开地址

- MCP 地址：https://extension.noisework.cn/mcp

本文所有示例均以官方公开服务为准。

## 一、快速开始

如果你只是想让 AI 搜索 NOISE导航，可以先尝试把下面这个地址填到支持 HTTP MCP 的 AI 客户端配置里：

- `https://extension.noisework.cn/mcp`

当前官方公开服务已开启公开访问，不需要配置 Token，也不需要额外填写请求头。

注意：

- 该地址当前提供的是基于 HTTP `/mcp` 端点的 MCP 接口
- 并不是所有 AI 客户端的 `url` 模式都兼容这种实现
- 如果你的客户端接入后工具不显示、日志持续报错，通常不是地址写错，而是客户端要求的 MCP 传输方式与当前服务不一致
- 遇到这种情况，优先改用支持该 URL 模式的客户端，或改用本地 `Node stdio` 方式接入

最简配置示例：

```json
{
  "mcpServers": {
    "NOISE导航": {
      "url": "https://extension.noisework.cn/mcp"
    }
  }
}
```

如果你使用的是 Cherry Studio，建议显式指定为 `streamableHttp`：

```json
{
  "mcpServers": {
    "NOISE导航": {
      "type": "streamableHttp",
      "url": "https://extension.noisework.cn/mcp"
    }
  }
}
```

注意：

- `url` 必须是纯 URL 字符串
- 不要写成 `" \`https://extension.noisework.cn/mcp\` "`
- 不要在 URL 前后保留空格

接入完成后，可以直接对 AI 这样说：

- “在 NOISE导航 里搜一下 AI 工具”
- “帮我找可以 AI 生成图片的网站”
- “在 NOISE导航 里搜一下 AI 绘图工具”
- “找一些支持文生图的站点”
- “搜索能生成图片的 AI 网站，优先国外热门产品”
- “帮我找 AI 图片生成工具，第 2 页”
- “在 NOISE导航 里搜一下：云盘资源库（可以命中描述）”
- “搜索：关键词=AI，页码=2，每页=20”

## 二、MCP 使用说明

### 1) 适合什么场景

MCP 适合接入支持该 HTTP MCP 接口的 AI 客户端，用自然语言完成站内搜索、筛选和翻页。

如果客户端明确支持通过 URL 接入 MCP，一般可以直接使用；如果客户端只支持 stdio，或只兼容特定流式 MCP 传输，则不能直接使用本文这个 URL。

### 2) 自检（可选）

如果你想确认服务是否可用，可以直接运行下面的命令。

列出工具：

```bash
curl -X POST "https://extension.noisework.cn/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

调用搜索（返回 markdown）：

```bash
curl -X POST "https://extension.noisework.cn/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_sites","arguments":{"query":"AI","page":1,"pageSize":20}}}'
```

如果你要返回更适合程序读取的结构化结果，可以把 `format` 改成 `json`：

```bash
curl -X POST "https://extension.noisework.cn/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_sites","arguments":{"query":"AI","page":1,"pageSize":20,"format":"json"}}}'
```

### 3) MCP 工具：search_sites

`search_sites` 是最常用的工具，用于在 NOISE导航 收录数据中搜索站点，支持分页、筛选和可点击翻页。

关键词匹配范围：

- `title`：标题
- `url`：地址
- `description`：描述
- `taxonomy`：一级分类
- `term`：二级分类

常用参数：

- `query`：关键词，可为空
- `page` / `pageSize`：分页
- `taxonomy` / `term`：一级分类 / 二级分类筛选
- `kind`：数据类型过滤，支持 `any`、`webstack`、`friendlinks`、`headers`
- `files`：限定搜索范围为指定文件
- `limit`：兼容参数，等价于 `pageSize`
- `refresh`：强制刷新索引，通常不需要
- `format`：返回格式，支持 `markdown` 或 `json`

字段映射速查：

- `一级分类` → `taxonomy`
- `二级分类` → `term`
- `地址` → `url`
- `描述` → `description`
- `页码` → `page`
- `每页` → `pageSize`
- `格式` → `format`

### 4) 给 AI 的推荐说法

自然语言示例：

- “在 NOISE导航 里搜一下 AI 工具，翻到第 2 页”
- “帮我找可以 AI 生成图片的网站”
- “在 NOISE导航 里搜一下 AI 绘图工具”
- “找一些支持文生图的站点”
- “搜索能生成图片的 AI 网站，优先国外热门产品”
- “帮我找 AI 图片生成工具，第 2 页”
- “在 NOISE导航 里搜一下：云盘资源库（可以命中描述）”
- “在 NOISE导航 里找设计分类下的图标工具”

格式化示例：

- “搜索：关键词=AI，页码=2，每页=20”
- “搜索：关键词=图标，一级分类=设计，二级分类=UI”
- “搜索：关键词=AI，格式=json”

### 5) MCP 资源页（可点击）

如果你的 AI 客户端支持 MCP Resource，可使用这些资源页：

- 起始页：`resource://noisedh/start`
- 帮助页：`resource://noisedh/help`
- 搜索页：`resource://noisedh/search?...`

说明：

- 搜索结果中的“首页 / 上一页 / 下一页 / 末页 / 页码 / 筛选项”可直接点击
- 资源 URI 的 hostname 必须是 `noisedh`

## 三、AI 客户端配置示例

### 1) URL 方式（仅适用于兼容该 HTTP MCP 的客户端）

部分 AI 客户端支持直接填写 MCP URL；如果你的客户端支持这种模式，这是最简单的接入方式：

```json
{
  "mcpServers": {
    "NOISE导航": {
      "url": "https://extension.noisework.cn/mcp"
    }
  }
}
```

Cherry Studio 推荐写法：

```json
{
  "mcpServers": {
    "NOISE导航": {
      "type": "streamableHttp",
      "url": "https://extension.noisework.cn/mcp"
    }
  }
}
```

### 2) Node stdio 方式（当客户端不支持 URL 或 URL 模式报错时）

有些 AI 客户端只能通过本地命令接入 MCP，或者虽然支持 `url` 字段，但与当前服务端实现不兼容。这两种情况下都建议改用 Node 方式。

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

这种方式主要适合本地自建、私有部署，或需要绕过客户端 URL 兼容性问题的场景。

## 四、Skill

如果你希望让 AI 自动一步步引导你完成接入，也可以直接把下面这句话发给支持 Skill 的 AI：

- “帮我接入 NOISE导航 的 MCP（https://extension.noisework.cn/mcp）。我只需要站内搜索功能。请一步步引导我配置，并在我配置缺失时提示我怎么修复。”

如果你是自己部署，也可以参考仓库中的 `extension/SKILL.md`。

## 五、一般搜索 API（非 MCP）

如果你不是接 AI 客户端，而是想写脚本或程序，也可以直接使用普通 HTTP API。

### 1) 健康检查

- `GET https://extension.noisework.cn/api/health`

### 2) 搜索接口

- `GET https://extension.noisework.cn/api/search?keyword=<关键词>&filePath=<数据文件名>`

返回值为 JSON 数组，每项通常包含：

- `title`
- `url`
- `description`
- `kind`

参数说明：

- `filePath`：必填，推荐传数据文件名，例如 `webstack.yml`
- `keyword`：可选，不传或为空时通常返回空结果

示例：

- `https://extension.noisework.cn/api/search?keyword=AI&filePath=webstack.yml`

## 六、自建部署补充说明

如果你使用的是自己部署的服务，而不是官方公开地址，是否需要 Token 取决于你的服务端配置。

常见规则如下：

- 当服务端设置 `MCP_REQUIRE_TOKEN=false` 时，MCP 可公开访问
- 当服务端开启鉴权时，需要在请求头携带 `Authorization: Bearer <Token>`
- `Token` 优先级通常为 `MCP_TOKEN`，未设置时可能复用 `API_TOKEN`

如果你是普通使用者，可以先尝试本文中的官方公开 MCP 地址；如果客户端无法显示工具或日志持续报协议错误，请改用支持该 URL 模式的客户端，或改用本地 `Node stdio` 接入。
