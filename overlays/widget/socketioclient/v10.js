// ======= Error Logging ===========
window.onerror = function (message, file, line, column, errorObj) {
    console.error('[WidgetIO] Window error:', message, file, line, column);
}

let loggedErrors = [];

function logError(obj) {
    console.log('[WidgetIO] Error logged:', JSON.stringify(obj));
}
// ==================================


var channelId = 0;
var screenId = 1;
var settings = JSON.parse(localStorage.getItem("cachedSettings"));
var widgetId = document.location.pathname.split("/")[2];
var lastFontType = null;

// DEBUG: 打印 URL 解析结果
console.log('[WidgetIO] URL Info:', {
    pathname: document.location.pathname,
    pathnameParts: document.location.pathname.split("/"),
    widgetId: widgetId,
    href: location.href
});

var urlParams = new URLSearchParams(location.search);

channelId = urlParams.get("cid") ? urlParams.get("cid") : 0;
screenId = urlParams.get("screen") ? parseInt(urlParams.get("screen")) : 0;
const previewValue = urlParams.get("preview") || '0';
// 提取 metric（goal widget）和 x（lastx widget）参数
const metricValue = urlParams.get("metric") || '';
const xValue = urlParams.get("x") || '';

// DEBUG
console.log('[WidgetIO] Initial values:', { channelId, screenId, widgetId, preview: previewValue, metric: metricValue, x: xValue });


if (typeof SharedIO === "function" && typeof SharedWorker === "function" && urlParams.get("disableSharedIO") !== "1") {
    console.info("[SOCKET] Using SharedIO connection");

    try {
        window.io = new SharedIO();

        if (window.location.href.includes('preview=1') && widgetId === "activity-feed") {
            // do not use sharedIO in preview mode for activity feed
            // Because the activity-feed iframe is always loaded
        } else {
            // 传递 widgetId、screenId、preview、metric、x 用于 session 追踪
            window.io.connect(channelId, {
                widgetId: widgetId,
                screenId: screenId,
                preview: previewValue,
                metric: metricValue,
                x: xValue,
                onTimeout: () => {
                    logError({ component: "WidgetIO", message: "SharedIO timeout" });
                }
            });
        }
    } catch (err) {
        logError({ component: "WidgetIO", message: "SharedIO exception", err: err.toString(), stack: (err ? err.stack : null) });
    }

} else {
    console.info("[SOCKET] Using native SocketIO connection");

    logError({ component: "WidgetIO", message: "SharedIO not supported", sharedWorkerSupported: typeof SharedWorker === "function" });

    let ioConfig = {
        transports: ["websocket"],
        upgrade: false,
        query: {
            appType: "widget",
            shared: false,
            preview: urlParams.get('preview') || '0',
            metric: urlParams.get('metric') || '',
            x: urlParams.get('x') || ''
        }
    };

    if (urlParams.get('ioHost')) {
        window.io = new io(urlParams.get('ioHost'), ioConfig);
    } else {
        window.io = new io(ioConfig);
    }

    function login() {
        console.log('[WidgetIO] Emitting login event:', { channelId, widgetId, screenId, preview: previewValue, metric: metricValue, x: xValue });
        io.emit("login", {
            channelId,
            appType: "widget",
            widgetId: widgetId,  // 传递 widgetId 用于 session 追踪
            screenId: screenId,   // 传递 screenId
            preview: previewValue,
            metric: metricValue,
            x: xValue,
            receiveChat: window.location.href.includes('chat') || window.location.href.includes('emoji') || window.location.href.includes('streambuddies'),
            receiveGift: window.location.href.includes('gift') || window.location.href.includes('firework') || window.location.href.includes('cannon'),
        })
    }

    io.on("connect", login);
    io.on("reconnect", login);
}


function reportState(stateData) {
    if (channelId === 0) return;
    io.emit("reportWidgetState", {
        widgetId,
        screenId,
        state: stateData,
        isHidden: document.hidden,
        isPreview: location.href.includes('preview=1')
    });
}

io.on("widgetSettings", function (data) {
    // 始终信任服务端推送的最新设置，避免缓存阻塞样式更新
    console.log("widget settings received");
    reportState({ event: "widgetSettingsAck" });
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(data);
    settings = data;
    localStorage.setItem("cachedSettings", JSON.stringify(data));
    if (typeof updateSettings === "function") updateSettings(hasChanges);
    setFontSettings();
});

setInterval(() => {
    reportState({ event: "alive" });
}, 120 * 1000)

function setFontSettings() {
    if (!settings) return;

    var fontType = settings[widgetId + "_fontType"];
    var fontSize = settings[widgetId + "_fontSize"];
    var fontLineSpacing = settings[widgetId + "_fontLineSpacing"];
    var fontLetterSpacing = settings[widgetId + "_fontLetterSpacing"];
    var rtlEnabled = settings[widgetId + "_rightToLeft"];

    if (typeof rtlEnabled === 'boolean') {
        $('body').css('direction', rtlEnabled ? 'rtl' : 'initial');
    }

    if (widgetId === "goal") {
        let metric = (new URLSearchParams(location.search)).get('metric');
        fontType = settings[widgetId + metric + "_fontType"];
        fontSize = settings[widgetId + metric + "_fontSize"];
        fontLineSpacing = settings[widgetId + metric + "_fontLineSpacing"];
        fontLetterSpacing = settings[widgetId + metric + "_fontLetterSpacing"];
    }

    if (widgetId === "gcounter") {
        let counterId = (new URLSearchParams(location.search)).get('c');
        fontType = settings[widgetId + counterId + "_fontType"];
        fontSize = settings[widgetId + counterId + "_fontSize"];
        fontLineSpacing = settings[widgetId + counterId + "_fontLineSpacing"];
        fontLetterSpacing = settings[widgetId + counterId + "_fontLetterSpacing"];
    }

    if (widgetId === "lastx") {
        let x = (new URLSearchParams(location.search)).get('x');
        fontType = settings[widgetId + x + "_fontType"];
        fontSize = settings[widgetId + x + "_fontSize"];
        fontLineSpacing = settings[widgetId + x + "_fontLineSpacing"];
        fontLetterSpacing = settings[widgetId + x + "_fontLetterSpacing"];
    }


    if (fontType && fontType !== "default" && lastFontType !== fontType) {
        $(".customFont").remove();
        $("head").append($('<link rel="stylesheet">').attr("class", "customFont").attr("href", "https://fonts.googleapis.com/css2?family=" + fontType.replace(" ", "+") + "&display=swap"));
        lastFontType = fontType;

        $("body").css("font-family", "'" + fontType + "'");
    }

    if (fontType === "default") {
        lastFontType = null;

        $(".customFont").remove();

        $("body").css("font-family", "");
    }

    if (fontSize && fontSize != 50) {
        if (widgetId === "myactions") {
            let percent = 100 + ((fontSize - 50) * 3);
            $("text").css("zoom", percent + "%");
            console.log(widgetId, "zoom", percent);
        } else {
            let em = 1 + ((fontSize - 50) * 0.01);
            $("html").css("font-size", em + "em");
            console.log(widgetId, "em", em);
        }

    } else {
        $("body").css("zoom", "");
        $("text").css("zoom", "");
        $("html").css("font-size", "");
        console.log(widgetId, "default size");
    }

    if (fontLineSpacing) {
        if (fontLineSpacing != 50) {
            let em = 1 + ((fontLineSpacing - 50) * 0.03);
            console.log("fontLineSpacing em", em)
            $("body").css("line-height", em + "em");
        } else {
            $("body").css("line-height", "");
        }
    }

    if (fontLetterSpacing) {
        if (fontLetterSpacing != 50) {
            let em = 0 + ((fontLetterSpacing - 50) * 0.01);
            console.log("fontLetterSpacing em", em);
            $("body").css("letter-spacing", em + "em");
        } else {
            $("body").css("letter-spacing", "");
        }
    }
}

function getUserThumbnailUrlFromUserId(userId) {
    let channelId = new URLSearchParams(location.search).get('cid');
    if (userId && channelId) {
        return "/img/user/" + channelId + "/" + userId;
    } else {
        return "/img/nothumb.webp";
    }
}

$(window).on("load", setFontSettings);
addEventListener('load', () => {
    setFontSettings();
});


try {
    if (location.href.includes('preview=1')) {
        let nativeIoOn = io.on;
        let callbacks = {};

        io.on = function (event, callback) {
            callbacks[event] = callback;
            nativeIoOn.call(io, event, callback);
        }

        io.fakeEmit = function (event, data) {
            if (callbacks[event]) {
                callbacks[event](data);
            }
        }

        window.addEventListener('message', function (e) {
            if (e.data && typeof e.data === 'object' && e.data.type === "framePreviewPing") {
                if (typeof window.preview === 'function') window.preview();
            }
        });

        if (["myactions"].includes(widgetId) && !location.href.includes("onStartPage=1")) {
            window.addEventListener('load', function (e) {
                $('body').append($('<div>').text('Example Data')
                    .css('position', 'absolute')
                    .css('top', '5px')
                    .css('right', '15px')
                    .css('font-size', '20px')
                    .css('font-family', 'Arial')
                    .css('color', '#3f3f3f')
                    .css('font-weight', 'bold'));
            });
        }

    }

} catch (err) {

}

function logUsage() {

}

if (!location.href.includes('preview=1')) {
    setInterval(logUsage, 30 * 60 * 1000);
}