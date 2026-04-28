function getProjectConfigValue(key, fallback) {
    function normalize(value, defaultValue) {
        if (value === undefined || value === null) {
            return String(defaultValue);
        }
        if (value === true || value === "true" || value === 1 || value === "1") {
            return "1";
        }
        if (value === false || value === "false" || value === 0 || value === "0") {
            return "0";
        }
        return String(value);
    }
    if (typeof window.getProjectSettings === "function") {
        try {
            var settings = window.getProjectSettings();
            if (settings && settings[key] !== undefined) {
                return normalize(settings[key], fallback);
            }
        } catch (error) {}
    }
    try {
        var localRaw = localStorage.getItem("project_settings");
        if (localRaw) {
            var localConfig = JSON.parse(localRaw);
            if (localConfig && localConfig[key] !== undefined) {
                return normalize(localConfig[key], fallback);
            }
        }
    } catch (error) {}
    try {
        var cookieMatch = document.cookie.match(new RegExp('(?:^|; )' + encodeURIComponent("project_settings") + '=([^;]*)'));
        if (cookieMatch) {
            var cookieConfig = JSON.parse(decodeURIComponent(cookieMatch[1]));
            if (cookieConfig && cookieConfig[key] !== undefined) {
                return normalize(cookieConfig[key], fallback);
            }
        }
    } catch (error) {}
    return normalize(fallback, fallback);
}

var pageRevealed = false;
var aplayerLoaded = false;
var aplayerReady = false;
var aplayerLoading = false;
var aplayerInstance = null;
var playlistApiFallbacks = [
    "https://api.injahow.cn/meting/?server=netease&type=playlist&id=",
    "https://api.i-meto.com/meting/api?server=netease&type=playlist&id="
];

function normalizePlaylistId(value) {
    var parsed = String(value === undefined || value === null ? "" : value).trim();
    if (!/^\d+$/.test(parsed)) {
        return "2141128031";
    }
    return parsed;
}

function fetchPlaylistTracksWithFallback(playlistId) {
    var index = 0;
    function tryNext() {
        if (index >= playlistApiFallbacks.length) {
            return Promise.reject(new Error("all playlist api failed"));
        }
        var requestUrl = playlistApiFallbacks[index] + encodeURIComponent(playlistId) + "&r=" + Date.now();
        return fetch(requestUrl)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("playlist request failed");
                }
                return response.json();
            })
            .then(function (list) {
                if (!Array.isArray(list) || list.length === 0) {
                    throw new Error("playlist empty");
                }
                var tracks = list.map(function (item) {
                    var artist = item && item.artist !== undefined ? item.artist : "";
                    if (Array.isArray(artist)) {
                        artist = artist.join(" / ");
                    }
                    return {
                        name: item && item.name ? String(item.name) : "未知歌曲",
                        artist: artist ? String(artist) : "未知歌手",
                        url: item && item.url ? String(item.url) : "",
                        cover: item && item.pic ? String(item.pic) : "",
                        lrc: item && item.lrc ? String(item.lrc) : ""
                    };
                }).filter(function (track) {
                    return !!track.url;
                });
                if (!tracks.length) {
                    throw new Error("playlist has no playable urls");
                }
                return tracks;
            })
            .catch(function () {
                index += 1;
                return tryNext();
            });
    }
    return tryNext();
}

function initAPlayerWithTracks(playlistId, tracks) {
    var wrap = document.getElementById("aplayer-wrap");
    if (!wrap) {
        throw new Error("aplayer wrap missing");
    }
    if (aplayerInstance && typeof aplayerInstance.destroy === "function") {
        try {
            aplayerInstance.destroy();
        } catch (error) {}
    }
    wrap.innerHTML = "";
    var container = document.createElement("div");
    wrap.appendChild(container);
    aplayerInstance = new APlayer({
        container: container,
        fixed: true,
        mini: true,
        autoplay: false,
        volume: 0.8,
        order: "random",
        listFolded: true,
        lrcType: 3,
        audio: tracks
    });
    wrap.setAttribute("data-playlist-id", playlistId);
}

function revealPage() {
    if (pageRevealed) {
        return;
    }
    pageRevealed = true;
    $('#loading-box').attr('class', 'loaded');
    $('#bg').css("cssText", "transform: scale(1);filter: blur(0px);transition: ease 0.55s;");
    $('#section').css("cssText", "opacity: 1;transition: ease 0.45s;");
    $('.cover').css("cssText", "opacity: 1;transition: ease 0.45s;");
}

function loadScript(src) {
    return new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.src = src;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

function loadScriptWithFallback(urlList) {
    return new Promise(function (resolve, reject) {
        var index = 0;
        function tryLoad() {
            if (index >= urlList.length) {
                reject(new Error("all script sources failed"));
                return;
            }
            loadScript(urlList[index]).then(resolve).catch(function () {
                index += 1;
                tryLoad();
            });
        }
        tryLoad();
    });
}

function ensureAPlayerVisibleFallback() {
    var wrap = document.getElementById("aplayer-wrap");
    if (!wrap || aplayerReady) {
        return;
    }
    if (wrap.querySelector(".aplayer")) {
        aplayerReady = true;
        return;
    }
    if (!window.APlayer) {
        return;
    }
    wrap.innerHTML = "";
    var container = document.createElement("div");
    wrap.appendChild(container);
    try {
        if (aplayerInstance && typeof aplayerInstance.destroy === "function") {
            aplayerInstance.destroy();
        }
        new APlayer({
            container: container,
            fixed: true,
            mini: true,
            autoplay: false,
            volume: 0.6,
            listFolded: true,
            audio: [{
                name: "NOISE Radio",
                artist: "NOISE",
                url: "https://moeplayer.b0.upaiyun.com/aplayer/dario.mp3",
                cover: "https://picsum.photos/300/300?random=18"
            }]
        });
        aplayerReady = true;
        if (window.iziToast) {
            iziToast.show({
                timeout: 2500,
                message: '歌单加载失败，已启用播放器兜底音源'
            });
        }
    } catch (error) {}
}

window.loadAPlayerAssets = function (force) {
    if ((aplayerLoaded || aplayerLoading) && !force) {
        return;
    }

    var playlistId = normalizePlaylistId(getProjectConfigValue("music_playlist_id", "2141128031"));
    var wrap = document.getElementById("aplayer-wrap");
    if (!wrap) {
        return;
    }

    aplayerLoading = true;
    aplayerReady = false;
    loadScriptWithFallback([
            "https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js",
            "../assets/js/APlayer.min.js"
        ])
        .then(function () {
            return fetchPlaylistTracksWithFallback(playlistId);
        })
        .then(function (tracks) {
            initAPlayerWithTracks(playlistId, tracks);
        })
        .then(function () {
            aplayerLoading = false;
            aplayerLoaded = true;
            aplayerReady = true;
        })
        .catch(function () {
            aplayerLoading = false;
            aplayerLoaded = false;
            aplayerReady = false;
            ensureAPlayerVisibleFallback();
            if (window.iziToast) {
                iziToast.show({
                    timeout: 3500,
                    message: '网易云歌单加载失败，请检查网络后重试'
                });
            }
        });
};

//加载完成后执行
window.addEventListener('DOMContentLoaded', function () {
    // 先让页面可用，再等待其余资源
    revealPage();

    //用户欢迎
    if (window.iziToast) {
        iziToast.settings({
            timeout: 3000,
            backgroundColor: '#ffffff40',
            titleColor: '#efefef',
            messageColor: '#efefef',
            progressBar: false,
            close: false,
            closeOnEscape: true,
            position: 'topCenter',
            transitionIn: 'bounceInDown',
            transitionOut: 'flipOutX',
            displayMode: 'replace',
            layout: '1'
        });
    }
    if (window.iziToast && getProjectConfigValue("show_welcome", "1") === "1") {
        setTimeout(function () {
            iziToast.show({
                title: hello,
                message: '欢迎来到 NOISE导航'
            });
        }, 800);
    }

    //中文字体缓加载-此处写入字体源文件
    //先行加载简体中文子集，后续补全字集
    //由于压缩过后的中文字体仍旧过大，可转移至对象存储或 CDN 加载
    if ("requestIdleCallback" in window) {
        requestIdleCallback(function () {
            const font = new FontFace(
                "MiSans",
                "url(" + "./font/MiSans-Regular.woff2" + ")"
            );
            font.load().then(function (loadedFont) {
                document.fonts.add(loadedFont);
            }).catch(function () {});
        });
    }
    if (getProjectConfigValue("show_aplayer", "1") === "1") {
        setTimeout(function () {
            window.loadAPlayerAssets();
        }, 600);
        setTimeout(function () {
            window.loadAPlayerAssets();
        }, 1800);
    }
}, false)

window.addEventListener('load', revealPage, false);
setTimeout(revealPage, 1200);

//进入问候
now = new Date(), hour = now.getHours()
if (hour < 6) {
    var hello = "凌晨好";
} else if (hour < 9) {
    var hello = "早上好";
} else if (hour < 12) {
    var hello = "上午好";
} else if (hour < 14) {
    var hello = "中午好";
} else if (hour < 17) {
    var hello = "下午好";
} else if (hour < 19) {
    var hello = "傍晚好";
} else if (hour < 22) {
    var hello = "晚上好";
} else {
    var hello = "夜深了";
}

//获取时间
var t = null;
t = setTimeout(time, 1000);

function time() {
    clearTimeout(t);
    dt = new Date();
    var mm = dt.getMonth() + 1;
    var d = dt.getDate();
    var weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    var day = dt.getDay();
    var h = dt.getHours();
    var m = dt.getMinutes();
    if (h < 10) {
        h = "0" + h;
    }
    if (m < 10) {
        m = "0" + m;
    }
    $("#time_text").html(h + '<span id="point">:</span>' + m);
    $("#day").html(mm + "&nbsp;月&nbsp;" + d + "&nbsp;日&nbsp;" + weekday[day]);
    t = setTimeout(time, 1000);
}

function setWeatherDisplay(weatherText, minTemp, maxTemp) {
    $('#wea_text').text(weatherText);
    $('#tem1').text(maxTemp);
    $('#tem2').text(minTemp);
}

function loadWeatherFromYike() {
    return fetch('https://yiketianqi.com/api?unescape=1&version=v6&appid=43986679&appsecret=TksqGZT7')
        .then(function (response) {
            if (!response.ok) {
                throw new Error("yike api error");
            }
            return response.json();
        })
        .then(function (data) {
            if (!data || data.wea === undefined || data.tem1 === undefined || data.tem2 === undefined) {
                throw new Error("yike api invalid data");
            }
            setWeatherDisplay(data.wea, data.tem2, data.tem1);
        });
}

function weatherCodeToText(code) {
    var map = {
        0: "晴",
        1: "晴",
        2: "多云",
        3: "阴",
        45: "雾",
        48: "雾凇",
        51: "小雨",
        53: "中雨",
        55: "大雨",
        56: "冻雨",
        57: "冻雨",
        61: "小雨",
        63: "中雨",
        65: "大雨",
        66: "雨夹雪",
        67: "雨夹雪",
        71: "小雪",
        73: "中雪",
        75: "大雪",
        80: "阵雨",
        81: "阵雨",
        82: "暴雨",
        95: "雷阵雨",
        96: "雷雨冰雹",
        99: "雷雨冰雹"
    };
    return map[code] || "未知";
}

function loadWeatherFromOpenMeteo() {
    var weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=31.23&longitude=121.47&current=weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FShanghai";
    return fetch(weatherUrl)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("open-meteo api error");
            }
            return response.json();
        })
        .then(function (data) {
            var weatherCode = data && data.current && data.current.weather_code;
            var maxTemp = data && data.daily && data.daily.temperature_2m_max && data.daily.temperature_2m_max[0];
            var minTemp = data && data.daily && data.daily.temperature_2m_min && data.daily.temperature_2m_min[0];
            if (weatherCode === undefined || maxTemp === undefined || minTemp === undefined) {
                throw new Error("open-meteo api invalid data");
            }
            setWeatherDisplay(weatherCodeToText(weatherCode), Math.round(minTemp), Math.round(maxTemp));
        });
}

//获取天气
if (getProjectConfigValue("show_weather", "1") === "1") {
    loadWeatherFromYike()
        .catch(function () {
            return loadWeatherFromOpenMeteo();
        })
        .catch(function () {
            setWeatherDisplay("天气不可用", "--", "--");
        });
} else {
    $(".weather").hide();
}

//火狐浏览器独立样式
if (isFirefox = navigator.userAgent.indexOf("Firefox") > 0) {
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.href = './css/firefox.css';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    head.appendChild(link);
    window.addEventListener('load', function () {
        if (window.iziToast) {
            setTimeout(function () {
                iziToast.show({
                    timeout: 8000,
                    message: '您正在使用火狐浏览器，部分功能可能不支持'
                });
            }, 3800);
        }
    }, false)
}

//Tab书签页
$(function () {
    $(".mark .tab .tab-item").click(function () {
        $(this).addClass("active").siblings().removeClass("active");
        $(".products .mainCont").eq($(this).index()).css("display", "flex").siblings().css("display", "none");
    })
})

//设置
$(function () {
    $(".set .tabs .tab-items").click(function () {
        $(this).addClass("actives").siblings().removeClass("actives");
        $(".productss .mainConts").eq($(this).index()).css("display", "flex").siblings().css("display", "none");
    })
})

//输入框为空时阻止跳转
$(window).keydown(function (e) {
    var key = e.which || e.keyCode;
    if (key.toString() == "13") {
        if ($(".wd").val() == "") {
            return false;
        }
    }
});

//点击搜索按钮
$(".sou-button").click(function () {
    if ($("body").attr("class") === "onsearch") {
        if ($(".wd").val() != "") {
            $("#search-submit").click();
        }
    }
});

$(window).mousedown(function (event) {
    if (event.button == 1) {
        $("#time_text").click();
    }
});

//控制台输出
var styleTitle1 = `
font-size: 20px;
font-weight: 600;
color: rgb(244,167,89);
`
var styleTitle2 = `
font-size:12px;
color: rgb(244,167,89);
`
var styleContent = `
color: rgb(30,152,255);
`
var title1 = 'NOISE导航'
var title2 = `
 _____ __  __  _______     ____     __
|_   _|  \\/  |/ ____\\ \\   / /\\ \\   / /
  | | | \\  / | (___  \\ \\_/ /  \\ \\_/ / 
  | | | |\\/| |\\___ \\  \\   /    \\   /  
 _| |_| |  | |____) |  | |      | |   
|_____|_|  |_|_____/   |_|      |_|                                                     
`
var content = `
版 本 号：NOISE导航-轻快版
更新日期：2026-04-28

Github:  https://github.com/imsyy/Snavigation
`
console.log(`%c${title1} %c${title2}
%c${content}`, styleTitle1, styleTitle2, styleContent)
