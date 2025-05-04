## Nav-Manage

本说明是为[Nav Manage扩展](https://github.com/rcy1314/nav-manage)的进一步说明

Nav-Manage由后端API+前端扩展组成，后端支持一键部署到 Railway和Zeabur

开发分为三个组成部分，目前前端扩展满足基本需求的情况下暂不会更新

API部分开发分为云服务器环境及github环境，目前云服务器环境的开发版功能会更多，但测试下github环境的部署更稳定

云服务器环境下部署的文件还在测试阶段，可能会和github环境端代码合并保持一致，也可能会一直使用硬编码形式…

## 更新

- 调整解决前端扩展因点击搜索时整体界面未铺满的问题
- 10月7日-本地及云服务器部署文件增加导入导出浏览器格式文件，导出导航站yml文件时为浏览器书签格式html文件，带有导航站本身的一级目录标题及二级目录标题并设置输出路径下生成的文件自动3分钟删除
- 12月1日添加Docker部署运行方式
- 12月7日增加github环境下可生成rss文件及导出为浏览器格式书签文件，请自行修改变量，否则会有默认变量输出
- **书签文件下载的路由**：
  - 新增了 `/api/export-bookmarks` 路由，生成书签文件并允许用户下载。
  - 使用 `generateBookmarksHtml` 函数生成书签 HTML，并使用环境变量 `BOOKMARKS_TITLE` 和 `BOOKMARKS_H1` 配置标题和 H1。
- 12月16日增加统计收录网站的路由`/api/statistics`统计 URL 数量
- 12月16日增加聚合多个rss订阅生成聚合订阅文件的路由，默认每1小时更新1次，如果请求该路由会立即更新所有rss链接并生成新合并后的rss文件（一个xml及一个json文件），所以本地域名下请求合并文件时最好请求你的域名加路径文件
- 增加跨域请求下对聚合rss文件的代理路由：`/api/corsmergerss`，通过访问 `/api/corsmergerss` 路由来获取新生成的 RSS 文件内容。

## 本地开发测试部分更新

- 硬编码下支持写入RSS文件更新
- 硬编码下指定路径运行命令及存储文件
- 软编码下支持docker

## 安装扩展

Gooogle chrome：[点击安装](https://chrome.google.com/webstore/detail/ajoeaonfioiahhhhccafflalopoolbop)

Microsoft Edge：[点击安装](https://microsoftedge.microsoft.com/addons/detail/pogpiicgclbpchehmdgdeianhgpnjanl)

# 一键部署（github环境）

## 使用 Railway 部署

点击下面的按钮，快速将应用部署到 Railway：

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/DUKGIQ?referralCode=aPt4gm)

部署成功后确保项目设置中开启网络选项，默认开启http，该链接为服务端地址

<img src="https://jsd.cdn.noisework.cn/gh/rcy1314/tuchuang@main/uPic/1726090548735.png" style="zoom:50%;" />

## 使用 Zeabur 部署

点击下面的按钮，快速将应用部署到 Zeabur：

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/MFNZYE)

点击模版后输入环境变量点击部署，确保项目设置中开启网络选项，该链接为服务端地址

![](https://s2.loli.net/2024/12/02/jsqnIoyEPx7T9Zu.png)

### 云端环境变量说明

在 Railway 或 Zeabur 上，你需要设置以下环境变量：

- `PORT`: 服务器监听的端口（可选，默认是 8980）。
- `DATA_DIR`: 存储 数据 文件的目录（如果没有设置 `DATA_DIR`，则默认使用 `/data/` 作为文件路径）
- `GITHUB_TOKEN`: [GitHub 访问令牌](https://github.com/settings/apps)，用于认证 API 请求。（**GitHub API 限制**：如果你在短时间内发送了太多请求，GitHub API 可能会限制你的请求。确保在调用 API 时遵循 GitHub 的速率限制。）
- `GITHUB_REPO`: GitHub 仓库（格式：`username/repo`）。
- `GITHUB_BRANCH`: 默认分支（可选，默认是 `main`）。
- **`TELEGRAM_BOT_TOKEN`**：**可选**：用于发送 Telegram 消息的机器人令牌。你需要在 Telegram 中创建一个机器人并获取此令牌。
- **`TELEGRAM_CHAT_ID`**：**可选**：指定接收 Telegram 消息的聊天 ID。可以是个人聊天 ID 或群组 ID。
- **`NAVIGATION_URL`**：**可选**：指定导航站的 URL，用于在 Telegram 消息中提供链接。
- `WEBHOOK_URL` ：可选：**Webhook 通知**，可联动自动化集成推送到其它平台
- `STORAGE_FILE_PATH`：可选：持久化存储更新数据，用于嵌入网站等，示例·：`/data.json` 必须是完整文件路径哦！
- `BOOKMARKS_TITLE` ：可选：此为导出浏览器书签文件时书签的文件meta 标题默认为：Noise导航-Bookmarks
-  `BOOKMARKS_H1`：可选：此为导出浏览器书签文件时书签的h1标题，默认：Noise导航-Bookmarks
- `BOOKMARKS_OUTPUT_DIR`可选：此为导出浏览器书签文件时存储文件的路径，默认：/themes/WebStack-Hugo/static/bookmarks/
- `RSS_TITLE`：可选：变量为生成的rss文件标题，默认：NOISE导航收录更新
- `RSS_LINK`：可选：变量为生成的rss文件中的站点链接，默认：http://www.noisedh.cn
- `RSS_DESCRIPTION`：可选：变量为生成的rss文件中的描述信息，默认：最新更新通知
- `RSS_FILE_PATH` 可选：变量为生成的rss文件时的存储路径，默认为/themes/WebStack-Hugo/static/rss.xml
- `MERGED_RSS_FILE_PATH`   可选：变量为聚合订阅rss存储文件的路径，默认：/themes/WebStack-Hugo/static/
- `RSS_LINKS`  可选：变量为聚合订阅rss链接数组,多个链接用,隔开
- `MAX_STORAGE_ITEMS`  可选：变量为聚合订阅rss链接文件最大存储数量,默认200条

## 使用Github仓库时Docker部署说明

将仓库文件下载后，首先确定哪一种方式构建运行，然后修改你的<u>环境变量</u>，修改后再往下查看

### 1、使用 Docker Compose

将.env.example重命名为.env 并设置好你的环境变量

然后使用以下命令来启动应用：



```
docker-compose up -d
```

运行后会运行在8980端口

![1733145429000](https://s2.loli.net/2024/12/02/b6tkeYpBclRLaFq.png)



### 2、通过Dockerfile构建 Docker 镜像

执行以下命令来构建 Docker 镜像：



```
docker build -t nav-manage-api .
docker run -p 8980:8980 -e GITHUB_TOKEN=your-github-token \
           -e GITHUB_REPO=username/repo \
           -e GITHUB_BRANCH=main \
           -e TELEGRAM_BOT_TOKEN=your-telegram-bot-token \
           -e TELEGRAM_CHAT_ID=your-telegram-chat-id \
           -e NAVIGATION_URL=https://your-navigation-url \
           -e WEBHOOK_URL=https://your-webhook-url \
           -e STORAGE_FILE_PATH=/data/data.json \
           -e BOOKMARKS_TITLE=BOOKMARKS_TITLE \
           -e BOOKMARKS_H1=BOOKMARKS_H1 \
           -e RSS_TITLE=RSS_TITLE \
           -e RSS_LINK=RSS_LINK \
           -e RSS_DESCRIPTION=RSS_DESCRIPTION \
           -e RSS_FILE_PATH=RSS_FILE_PATH \
           -e BOOKMARKS_OUTPUT_DIR=BOOKMARKS_OUTPUT_DIR \
           -e MERGED_RSS_FILE_PATH=MERGED_RSS_FILE_PATH \
           -e RSS_LINKS=RSS_LINKS \
           -e MAX_STORAGE_ITEMS=MAX_STORAGE_ITEMS \
           nav-manage-api
```

这里 `nav-manage-api` 是镜像的名称。构建过程会根据 Dockerfile 中的指令逐步执行，

### 运行 Docker 容器

构建完成后，你可以通过以下命令启动一个容器：



```
docker run -d -p 8980:8980 nav-manage-api
```

- `-d` 表示在后台运行容器。
- `-p 8980:8980` 将宿主机的 8980 端口映射到容器的 8980 端口。这样你就可以通过 `http://localhost:8980` 访问你的服务端口了。



## API请求示例

### 添加数据到文件

```javascript
fetch('http://你部署的域名/api/yaml', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        filePath: 'path/to/file.yaml',
        newData: { key: 'value' }
    })
})
.then(response => response.json())
.then(data => {
    console.log('添加数据响应:', data);
})
.catch(error => console.error('添加数据时出错:', error));
```

### 删除条目

```javascript
fetch('http://你部署的域名/api/delete', {
    method: 'DELETE',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        filePath: 'path/to/file.yaml',
        entryToDelete: { key: 'value' }
    })
})
.then(response => response.json())
.then(data => {
    console.log('删除条目响应:', data);
})
.catch(error => console.error('删除条目时出错:', error));
```

### 更新条目

```javascript
fetch('http://你部署的域名/api/update', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        filePath: 'path/to/file.yaml',
        entryToUpdate: { key: 'oldValue' },
        newData: { key: 'newValue' }
    })
})
.then(response => response.json())
.then(data => {
    console.log('更新条目响应:', data);
})
.catch(error => console.error('更新条目时出错:', error));
```

请确保将 `'http://你部署的域名'` 替换为实际的域名，并根据需要调整路径和参数。

### 获取更新通知

```javascript
fetch('http://你部署的域名/api/notifications')
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            console.log(data.message);
        } else {
            data.forEach(update => {
                console.log(`标题: ${update.title}`);
                console.log(`Logo: ${update.logo}`);
                console.log(`URL: ${update.url}`);
                console.log(`描述: ${update.description}`);
            });
        }
    })
    .catch(error => console.error('获取更新通知时出错:', error));
```

### 搜索请求

```javascript
const keyword = '示例关键词';
const filePath = 'path/to/file.yaml';

fetch(`http://你部署的域名/api/search?keyword=${encodeURIComponent(keyword)}&filePath=${encodeURIComponent(filePath)}`)
    .then(response => response.json())
    .then(results => {
        results.forEach(link => {
            console.log(`标题: ${link.title}`);
            console.log(`描述: ${link.description}`);
            console.log(`URL: ${link.url}`);
        });
    })
    .catch(error => console.error('搜索请求失败:', error));
```

### Webhook 触发

```javascript
fetch('http://你部署的域名/api/webhook', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        event: 'exampleEvent',
        data: { key: 'value' }
    })
})
.then(response => response.json())
.then(data => {
    console.log('Webhook 响应:', data);
})
.catch(error => console.error('Webhook 请求失败:', error));
```

### 获取文件

```javascript
fetch('http://你部署的域名/api/files?filePath=path/to/file.yaml')
    .then(response => response.json())
    .then(data => {
        console.log('文件内容:', data);
    })
    .catch(error => console.error('获取文件时出错:', error));
```

### 获取书签文件

```
curl -O "http://localhost:8980/api/export-bookmarks"
```

你还可以直接在浏览器中访问运行的端口地址 来下载书签文件：



```
http://localhost:8980/api/export-bookmarks
```



## 请求聚合RSS路由

```
// 使用 fetch 请求合并后的 RSS 文件
fetch('http://your-server-address/api/rss-merge')
    .then(response => {
        if (!response.ok) {
            throw new Error('网络响应不是 OK');
        }
        return response.text(); // 或者 response.json()，根据返回的数据类型
    })
    .then(data => {
        console.log('获取的 RSS 数据:', data);
    })
    .catch(error => {
        console.error('获取 RSS 时出错:', error);
    });
```



如果您在命令行中使用 `curl`，可以使用以下命令：

```bash
curl -X GET http://your-server-address/api/rss-merge
```

如果你有其它域名网页对该文件的请求还支持代理路由：`/api/corsmergerss`，通过访问 `/api/corsmergerss` 路由来获取新生成的 RSS 文件内容

### 删除文件

```javascript
fetch('http://你部署的域名/api/files', {
    method: 'DELETE',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        filePath: 'path/to/file.yaml'
    })
})
.then(response => response.json())
.then(data => {
    console.log('删除文件响应:', data);
})
.catch(error => console.error('删除文件时出错:', error));
```

⚠️

示例为 `'http://你部署的域名/API'`

### 功能说明

1. **获取文件列表**：`GET /data` - 返回 `/data` 文件夹中的数据 文件列表。
2. **获取特定文件内容**：`GET /data/:filename` - 返回指定数据文件的内容。
3. **添加数据到 文件**：`POST /api/yaml` - 向指定的 数据 文件添加新数据条目。
4. **搜索条目**：`GET /api/search` - 在指定数据 文件中搜索条目。
5. **删除条目**：`DELETE /api/delete` - 从指定的数据文件中删除条目。
6. **更新条目**：`PUT /api/update` - 更新指定数据文件中的条目。
7. 获取更新数据：`GET /api/notifications` - 获取最新更新站点的数据。
8. **Webhook 通知**：通过环境变量 `WEBHOOK_URL` 发送 Webhook 通知。可选设置
9. **持久化存储**：通过 `STORAGE_FILE_PATH` 环境变量指定仓库路径json文件来存储更新数据，已设置限制为最大存储40条
10. 生成RSS文件：和json文件路径一致，可配置rss文件的标题等信息，同时带有收录更新时间（上海时区）
11. 生成聚合多个rss并定时更新的rss文件，可选配置，用于前端组件等途径

## 本地及云服务器运行使用

## 硬编码版本

前提，本地或云服务器有安装node.js，版本兼容16及以上

下载安装：https://nodejs.org/zh-cn/download/package-manager

仓库中的next-local文件夹中的文件为运行文件，你可以下载到本地使用

注意！本地的代码和一键部署的不同，需要你手动修改代码中文件路径然后启动服务！

- 修改用于存储网站更新数据的json文件为你自己的实际文件路径（必须设置）
- 修改所有标注”请修改你的文件实际路径“为你的文件路径，比如我把server放入根目录，则数据文件路径为/data/ （此项必须设置）
- 修改你的wenhook地址为实际使用地址（可忽略保持空字符）
- 修改telegram bot token及你的tg频道（可为空）
- 361行中添加了运行hugo的命令，如果你没有想让网站自动更新可删除该命令代码

修改后，运行安装依赖

```
npm install express js-yaml cors axios
```

如果你的云服务器已安装好node.js和依赖，可以使用进程管理器一键启动

启动命令为`npm start`

### 服务器运行优势

没有GitHub api限制，可以随时添加修改，当然放本地效果也是一样

![1727601511008](https://s2.loli.net/2024/12/02/dFT9BWRpa2h7vgy.png)

## 软编码带环境变量版本

目前测试版支持docker部署运行，但不兼容github环境，待更新测试…

