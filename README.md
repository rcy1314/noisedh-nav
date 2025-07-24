## Noisedh-Nav

## 一个hugo导航，可以通过简单配置配合不同的组件效果打造专属的导航网站

![预览](https://s2.loli.net/2025/05/05/BQaNdGi8u1CDjJM.png)

## 特征

全新的loading载入效果，带有自定义文本果冻动画

支持更多自定义头部导航页的内置组件

友好的seo及meta配置

支持外部API及扩展的结合使用

带有二级分类横向标签的展示

更多组件...

------

![截图1](https://s2.loli.net/2025/07/21/8HwXBNfmVshqWzb.png)

![截图2](https://s2.loli.net/2025/07/21/o5ahZ1STbWg7HGd.png)

它是在WebStack-Hugo二次开发下的软编码改造实现，可以纯静态化部署，使用前请查看如下说明：

仓库给出的是直接hugo整站的代码，包含主题文件，所以你可以直接使用hugo命令来生成导航网站（前提是已安装过hugo）

安装Hugo：https://hugo.opendocs.io/installation/

## 测试安装 

在安装Hugo之后，通过以下命令来测试安装是否成功：

```sh
hugo version
```

你应该能看到类似如下的输出：

```text
hugo v0.105.0-0e3b42b4a9bdeb4d866210819fc6ddcf51582ffa+extended linux/amd64 BuildDate=2022-10-28T12:29:05Z VendorInfo=snap:0.105.0
```

## 显示可用命令 

要查看可用命令和标志的列表：

```sh
hugo help
```

要获取关于子命令的帮助，请使用`--help`标志。例如：

```sh
hugo server --help
```

## 构建站点 

要构建站点，请进入项目目录并运行以下命令：

```sh
hugo
```

## 更新

- 优化图标加载逻辑，同时增加了https://favicon.im/zh/ 自动读取网站图标
- 增加页面强制刷新的提示弹窗和相关按钮

## 配置

在config.toml设置（先查看带有#的注释说明）

默认tag页面、音乐组件、广告位组件、seo设置、右下角折叠菜单、头部导航tag页自定义、公告组件、热榜组件、b站视频收藏组件

示例数据：请自行修改

```
baseURL = "https://www.noisedh.cn"
languageCode = "zh-CN"
title = "Noise导航 & 收录值得珍藏的网站"
theme = "noisedh-nav"
preserveTaxonomyNames = true
disablePathToLower = true
hasCJKLanguage = true
publishDir = "docs"
relativeURLs = true

# 启用 HTML 压缩
[minify]
  disableHTML = false  # 启用 HTML 压缩（即不禁用，等于开启）
  disableCSS = false   # 启用 CSS 压缩
  disableJS = false    # 启用 JS 压缩
  minifyOutput = true  # 压缩输出

# 网站参数配置
[params]
  author        = "Noise导航"
  siteurl       = "./"
  about         = "./about"  # 左侧导航栏的"关于导航"页面(./about)
  repository    = "https://noisedh.cn"

  # 音乐 配置
  musicServer = "netease"
  musicId = "128460001"
  
  # SEO meta 标签
  description = "NOISE导航是一个综合类导航网站，提供AI、新媒体、影视、设计、编程等行业分类导航，发现值得珍藏的网站。"
  keywords = "NOISE导航, 综合导航, AI导航, 新媒体导航, 影视导航, 设计导航, 编程导航"
  og_title = "NOISE导航 - 发现值得珍藏的网站"
  og_description = "NOISE导航是一个综合类导航网站，提供AI、新媒体、影视、设计、编程等行业分类导航，发现值得珍藏的网站。"
  og_image = "https://s2.loli.net/2024/11/23/E1o8prY4H9vU3tL.png"
  og_url = "https://www.noisedh.cn"
  twitter_title = "NOISE导航 - 发现值得珍藏的网站"
  twitter_description = "NOISE导航是一个综合类导航网站，提供AI、新媒体、影视、设计、编程等行业分类导航，发现值得珍藏的网站。"
  twitter_image = "https://s2.loli.net/2024/11/23/E1o8prY4H9vU3tL.png"

  enablePreLoad = true      # 网站完全打开前预加载的动画
  textPreLoad   = "Noise导航 & 收录珍藏的网站"  # 预加载的动画文字, 只有当enablePreLoad=true时生效
  logosPath     = "assets/images/logos"  # 网站每个导航地址logo存放地址
  defaultLogo   = "assets/images/favicon5.png"  # logo图片资源不存在或者错误时, 默认显示的logo; 该参数如为空,将会一直加载对应的logo,直至成功
  nightMode     = false  # 默认站点为深色(夜间)模式



# SEO 配置
[params.seo]
  baiduhmid     = '009396af5ea4d210f55b120d1f1465d8'  # 百度统计 hm.src 的 ID
  baiduSiteVer  = 'codeva-cCAOSG8MBO'  # 百度HTML标签验证(baidu-site-verification)
  tj51laid      = '3KPnWbkdUF6PmFfg'  # 51.LA 网站统计
  tj51lack      = '3KPnWbkdUF6PmFfg'

# CDN 配置
[params.cdn]
  fontawesome = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"

# 图片配置
[params.images]
  favicon           = "assets/images/favicon4.png"
  componentImageL   = "assets/images/wkz.webp"  # 头部部分浅色背景图
  componentImageD   = "assets/images/wkz.webp"  # 头部部分深色背景图
  logoExpandLight   = "assets/images/bioitee-expand-light.png"
  logoExpandDark    = "assets/images/bioitee-expand-dark.png"
  logoCollapseLight = "assets/images/logo-collapse-light.png"
  logoCollapseDark  = "assets/images/logo-collapse-dark.png"

# Markup 配置
[markup.goldmark.renderer]
  unsafe = true  # 允许渲染不安全的 HTML

# 页脚配置
[params.footer]
  copyright = '<p> 2019 - {year} | 本站收录值得珍藏的网站，欢迎访问使用</p>©<a href="https://noisedh.cn" target="_blank"><strong>NOISE导航</strong></a> '
  busuanzi  = true  # 启用不蒜子统计

# 右下角折叠菜单
  toggleMenu = [
  { url = "https://www.noisework.cn/lianxi/weixin.png", icon = "far fa-comment-dots", title = "联系我", target = "_blank" },
  { url = "./invalidlinks/", icon = "fa fa-question-circle", title = "失效检测记录", target = "_blank" },
  { url = "https://example.com/api/export-bookmarks", icon = "fa fa-download", title = "导出为书签文件", target = "_blank" }
]
# 头部tab导航配置
[params.header]
enableTabs = true
tabs = [
  { key = "default", icon = "fa-compass", label = "默认" },
  { key = "time", icon = "fa-clock-o", label = "时间" },
  { key = "talk", icon = "fa-commenting-o", label = "说说" },
  { key = "waline", icon = "waline", label = "热榜" },
  { key = "game", icon = "game", label = "休闲" },
  { key = "rssmerge", icon = "rss", label = "信息流" },

  # 自定义页，除了默认页面和热榜页面，其它所有 tab 都可以通过下面示例增加
  # { key = "mab", icon = "fa-star", label = "主页", iframeHeight = "400px", iframeWidth = "100%",iframeUrl = "https://www.noisework.cn" },
  # { key = "custom", icon = "fa-code", label = "自定义", html = "<div style=\"color:white; text-align:center;\">这里是自定义HTML内容</div>" },
]

# 导航内页tab地址配置
rssmergeUrl = "rssfollow.html"
talkUrl = "./talk/note.html"
timeUrl = "https://www.noisework.cn/widgets/clock2/index.html"
gameUrl = "https://www.noisework.cn/e/fcgame/index.html"


# 头部收录通知路由recentSitesApi、网址统计路由statisticsApi、后端服务地址serverUrl、数据文件路径filePath
recentSitesApi = "https://example.com/api/notifications"
statisticsApi = "https://example.com/api/statistics"
serverUrl = "https://example.com"
filePath = "/www/wwwroot/www.noisedh.cn/data/webstack.yml"

# 广告位配置
enableAd = true
adList = [
  { img = "assets/images/noisedh.webp", url = "#", desc = "一键式导航" },
  { img = "assets/images/gw2.webp", url = "#", desc = "广告位+" },
  { img = "assets/images/gw1.webp", url = "https://simhaoka.com/phone/index?id=A7BA17EFD6DC47F6826F0C67B898725A", desc = "超大流量性价比手机卡渠道1" },
  { img = "assets/images/nsfmusic.webp", url = "https://nsf.nesbbs.com", desc = "在线经典复古游戏8bit音乐" },
  { img = "assets/images/天空之城.webp", url = "https://www.skypixel.com", desc = "航拍摄影师、拍手叫绝的航拍作品与独具价值的航拍攻略" },
  { img = "assets/images/证书1.webp", url = "#", desc = "优惠秒出一年苹果个人专业证书+V定制" },
  { img = "assets/images/gw3.webp", url = "https://hk.yunhaoka.cn/#/pages/micro_store/index?agent_id=422648", desc = "超大流量性价比手机卡渠道2" },
  { img = "assets/images/mh1.webp", url = "https://app.xkcc.vip/invitation_register?invitation_code=KIklg4ZV", desc = "专业破解软件下载商店" },
  { img = "assets/images/cher.webp", url = "https://cherry-ai.com", desc = "强大的多模型 AI 助手，支持 iOS、macOS 和 Windows 平台" }
]

# 站内搜索开关
enableSearch = true
searchPlaceholder = "站内搜索..."
# 最近收录开关
enableRecentSites = true
recentSitesTitle = "最近收录的站点（欢迎投稿）"

# 公告配置
enableAnnouncements = true
announcements = [
  { url = "https://www.noisedh.link", color = "#FF0000", text = "👏欢迎访问，本站域名:www.noisedh.cn 🧐 www.noisedh.link 👉" },
  { url = "https://www.noisedh.link/invalidlinks", color = "#e56f39", text = "站点新增分类备用访问地址，支持一键导出书签👉" },
  { url = "https://www.noisedh.link/invalidlinks", color = "#39a4e5", text = "查看链接检测记录，如有误删可联系😄" },
  { url = "", color = "#566cd7", text = "已更新站点收录信息，收录请投稿，广告Loading..." },
  { url = "https://hk.yunhaoka.cn/#/pages/micro_store/index?agent_id=422648", color = "#e56e33", text = "📢：全国正规流量手机卡优惠渠道二" },
  { url = "", color = "#b333e5ce", text = "📢：已优化站点，如您发现域名访问受限，请尝试访问其它域名，本站可永久持续访问" },
  { url = "https://www.noisedh.link", color = "#FFFFFF", text = "公告已更新，欢迎随时回来👏" }
]

# 热榜卡片配置
[params.hotApi]
endpoints = ["https://hot.noisework.cn", "https://example.com"]
[params.header.hotlist]
  [[params.header.hotlist.items]]
    id = "zhihu"
    title = "知乎"
    icon = "https://static.zhihu.com/heifetz/favicon.ico"
    color = "bg-blue-500"
  [[params.header.hotlist.items]]
    id = "weibo"
    title = "微博"
    icon = "https://sina.com.cn/favicon.ico"
    color = "bg-red-500"
  [[params.header.hotlist.items]]
    id = "bilibili"
    title = "哔哩哔哩"
    icon = "https://www.bilibili.com/favicon.ico"
    color = "bg-green-500"
  [[params.header.hotlist.items]]
    id = "douyin"
    title = "抖音"
    icon = "https://www.douyin.com/favicon.ico"
    color = "bg-orange-500"
  [[params.header.hotlist.items]]
    id = "baidu"
    title = "百度贴吧"
    icon = "https://www.baidu.com/favicon.ico"
    color = "bg-purple-500"
  [[params.header.hotlist.items]]
    id = "toutiao"
    title = "今日头条"
    icon = "https://www.toutiao.com/favicon.ico"
    color = "bg-yellow-500"
  [[params.header.hotlist.items]]
    id = "v2ex"
    title = "V2EX"
    icon = "https://s2.loli.net/2024/12/12/kz5t8fuXBLl6cFi.jpg"
    color = "bg-teal-500"
  [[params.header.hotlist.items]]
    id = "hellogithub"
    title = "HelloGitHub"
    icon = "https://hellogithub.com/favicon/android-icon-192x192.png"
    color = "bg-indigo-500"

# B站收藏视频配置
[params.bilibili]
  enable = true
  iframeUrl = "https://www.noisework.cn/e/bili/index.html?id=3271958393"
  width = "98%"
  height = "25vh"
  iframeWidth = "95%"
  iframeHeight = "100%"
  iframeStyle = "border: none;"
  iframeLoading = "lazy"
```

网站分类及数据文件-位于data文件夹下

```
data
├── friendlinks.yml # 友情链接
├── headers.yml     # 顶部导航
└── webstack.yml    # 网址列表
```

格式请直接打开文件查看

content文件夹为页面文档夹，默认样式文件为`themes/noisedh-nav/layouts/_default/single.html`

链接跳转页为`themes/noisedh-nav/themes/noisedh-nav/static/redirect.html`

可在186行加入可跳转的网址白名单和黑名单

## 后端API

配置请访问：https://github.com/rcy1314/nav-manage

浏览器扩展插件：

Gooogle chrome：[点击安装](https://chrome.google.com/webstore/detail/ajoeaonfioiahhhhccafflalopoolbop)

Microsoft Edge：[点击安装](https://microsoftedge.microsoft.com/addons/detail/pogpiicgclbpchehmdgdeianhgpnjanl)

## 自定义魔改

主题文件夹：layouts为所有模版文件夹，_default为hugo渲染的md文章页样式模版，partials为主题样式模版

partials主模版：component_header为头部组件模版，content_footer为网址模块子级页脚模版，content_header为网址模块子级头部模版，content_main为网址模块父级模版，sidebar为侧边栏模版，notification_component为通知组件模版，footer及header为父级页脚及头部

## 组件配置

### 说说页面

配置：https://github.com/rcy1314/echo-noise

### 热榜组件

配置：hot.css+hot.js 配置可在config.toml设置api，如果你想要更多热榜，请在hot.js增加相关热榜接口，参考：https://docs.noisework.cn/guide/index/hotlist

### 头部自定义页

除了默认页面和热榜页面，其它所有 tab 都可以通过下面示例增加（支持内嵌及写入html）

```
{ key = "mab", icon = "fa-star", label = "主页", iframeHeight = "400px", iframeWidth = "100%",iframeUrl = "https://www.noisework.cn" },
```



```
{ key = "custom", icon = "fa-code", label = "自定义", html = "<div style=\"color:white; text-align:center;\">这里是自定义HTML内容</div>" },
```

### rss聚合阅读组件

仓库地址：https://github.com/rcy1314/rss-server-ag

- 支持docker一键部署，支持fly.io等平台部署

```
docker run -d \
  --name rss-server-ag \
  -p 3000:3000 \
  -e PORT=3000 \
  -e RSS_URLS="https://example.com/rss1.xml,https://example.com/rss2.xml" \
  -e ADMIN_API_KEY=your_admin_key \
  noise233/rss-server-ag
```

部署成功后请在主题文件夹noisedh-nav下static文件夹的rssfollow.html中填入你的路由地址

281行处

```
const response = await fetch('https://example.com/rss', {
                    cache: 'force-cache'
                });
```
