var nothumb = "/img/nothumb.webp";
var chatContainer = null;
var template = null;
var userIdColorMappings = {};
var previewIndex = 0;
var previewEnabled = true;

// Default settings for test mode
var settings = {
    gifts_minValue: 0,
    gifts_showPictures: true,
    gifts_mini: false,
    gifts_usernameRgb: true,
    gifts_slideEffect: true,
    gifts_hideAfter: 0,
    gifts_commentColor: '#ffffff',
    gifts_backgroundColor: 'transparent'
};

function rndColorPart(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function cloneTemplate() {
    chatContainer = $("#chatContainer");
    template = $(".chatMessage").first().clone();
    template.css("display", "block");
    $(".chatMessage").remove();
}

function enforceMessageLimit() {
    const messages = $(".chatMessage");
    if (messages.length > 100) {
        messages.slice(0, 50).remove();
    }
}

function shouldSkipGift(giftInfo) {
    const repeatCount = giftInfo.repeatCount > 0 ? giftInfo.repeatCount : 0;
    const giftValue = giftInfo.diamondCount * (repeatCount || 1);
    if (settings.gifts_minValue && giftValue < settings.gifts_minValue) {
        return true;
    }
    return false;
}

function prepareStreakItem(giftInfo, thisItem) {
    let item = thisItem;
    let isNewItem = true;

    if (giftInfo.giftType === 1) {
        const streakKey = `streak_${giftInfo.userId}_${giftInfo.giftType}_${giftInfo.giftId}`;
        const existingStreaks = $(`.${streakKey}`);
        if (existingStreaks.length > 0) {
            item = existingStreaks.last();
            isNewItem = false;
        } else {
            item.addClass(streakKey);
        }

        if (giftInfo.repeatEnd) {
            item.removeClass(streakKey);
        }
    }

    return { item, isNewItem };
}

function updateRepeatCountDisplay(item, giftInfo) {
    if (giftInfo.repeatCount > 1) {
        const repeatText = `${giftInfo.repeatCount} x`;
        if (item.find(".repeatCount b").text() !== repeatText) {
            const repeatCountElem = item.find(".repeatCount");
            repeatCountElem.removeClass("repeatRefresh");
            setTimeout(() => {
                repeatCountElem.find("b").text(repeatText);
                repeatCountElem.addClass("repeatRefresh");
            }, 100);
        }
    }
}

function applyMiniMode(item) {
    item.find("img").css({ height: "25px", width: "25px", "margin-bottom": "-5px" });
    const usernameElem = item.find(".username");
    usernameElem.text(`${usernameElem.text()}:`);
    usernameElem.css("display", "inline");
    item.find(".comment").css("display", "inline");
    item.css("padding-bottom", "5px");
}

function applyStandardMode(item) {
    item.find(".repeatCount")
        .css("font-size", "1.5em")
        .css("margin-bottom", "4px")
        .css("-webkit-text-stroke", "#393939");
}

function ensureRgbColor(userId) {
    if (!userIdColorMappings[userId]) {
        userIdColorMappings[userId] = `rgba(${rndColorPart(100, 240)},${rndColorPart(100, 240)},${rndColorPart(100, 240)}, 1)`;
    }
    return userIdColorMappings[userId];
}

function applyUsernameEffects(item, giftInfo) {
    if (!window.TextEffects) return;
    const $username = item.find(".username");
    TextEffects.applyComprehensiveEffects($username, {
        effect: settings.gifts_usernameEffect || "none",
        wave: settings.gifts_usernameWave === "true" || settings.gifts_usernameWave === true,
        waveSpeed: settings.gifts_usernameWaveSpeed || "normal",
        glow: settings.gifts_usernameGlow === "true" || settings.gifts_usernameGlow === true,
        glowColor: settings.gifts_usernameGlowColor || "#ffffff",
        isRgbColor: settings.gifts_usernameRgb,
        rgbColor: userIdColorMappings[giftInfo.userId],
        defaultColor: settings.gifts_usernameColor
    });
}

function appendGift(item, isNewItem) {
    if (!isNewItem) return;
    chatContainer.append(item);
    chatContainer.stop().animate({ scrollTop: chatContainer.prop("scrollHeight") }, 600);
}

function handleGift(giftInfo) {
    if (!template || !chatContainer) return;
    enforceMessageLimit();
    if (shouldSkipGift(giftInfo)) return;

    // 🔍 调试gift图片URL问题
    console.log('[GIFT DEBUG] Frontend received giftInfo:');
    console.log('[GIFT DEBUG] giftInfo.giftPictureUrl:', giftInfo.giftPictureUrl);
    console.log('[GIFT DEBUG] giftInfo.giftId:', giftInfo.giftId);
    console.log('[GIFT DEBUG] giftInfo.describe:', giftInfo.describe);

    let thisItem = template.clone();
    let isNewItem = true;

    const streakResult = prepareStreakItem(giftInfo, thisItem);
    thisItem = streakResult.item;
    isNewItem = streakResult.isNewItem;

    thisItem.find(".profileImage").attr("src", giftInfo.profilePictureUrl || nothumb);
    thisItem.find(".giftImage").attr("src", giftInfo.giftPictureUrl);
    thisItem.find(".username").text(giftInfo.nickname || giftInfo.uniqueId);
    thisItem.find(".comment").text(giftInfo.describe);
    thisItem.attr("data-ts", new Date().getTime());

    thisItem.find(".comment").css("color", settings.gifts_commentColor);
    thisItem.find(".giftRight").css("color", settings.gifts_commentColor);
    thisItem.css("background-color", settings.gifts_backgroundColor);

    updateRepeatCountDisplay(thisItem, giftInfo);

    if (settings.gifts_showPictures === false) {
        thisItem.find(".profileImage").css("display", "none");
    }

    if (settings.gifts_mini) {
        applyMiniMode(thisItem);
    } else {
        applyStandardMode(thisItem);
    }

    if (settings.gifts_usernameRgb) {
        ensureRgbColor(giftInfo.userId);
    }

    applyUsernameEffects(thisItem, giftInfo);

    if (settings.gifts_slideEffect !== false) {
        thisItem.addClass("slideIn");
    }

    appendGift(thisItem, isNewItem);
}

function setupGiftListener() {
    $(window).on("load", () => {
        cloneTemplate();
        // Support both Socket.IO and direct function calls (for testing)
        if (typeof io !== 'undefined' && io.on) {
            io.on("gift", handleGift);
        }
        // Expose handleGift globally for test mode
        window.handleGiftEvent = handleGift;
        console.log('[Gift Feed] Ready to receive gifts');
    });
}

function setupHideInterval() {
    setInterval(() => {
        if (settings && settings.gifts_hideAfter && settings.gifts_hideAfter > 0) {
            $(".chatMessage").each((i, elem) => {
                const elemTs = elem.getAttribute("data-ts");
                if (!elemTs) return;
                if (elemTs < (new Date().getTime() - (settings.gifts_hideAfter * 1000))) {
                    $(elem).removeAttr("data-ts").removeClass("slideIn").addClass("fadeOut");
                }
            });
        }
    }, 100);
}

let giftsPreviewCount = 0;

function preview() {
    if (!previewEnabled) return;

    giftsPreviewCount = 0; // 重置计数器

    // 每隔1秒触发一次，总共5次
    const intervalId = setInterval(() => {
        giftsPreviewCount++;

        switch (giftsPreviewCount) {
            case 1:
                io.fakeEmit("gift", {
                    uniqueId: "ExampleUser1",
                    profilePictureUrl: "https://p16-useast2a.tiktokcdn.com/tos-useast2a-avt-0068-giso/4ec174248f94de26938f73874962469b~c5_100x100.jpeg",
                    giftId: 5655,
                    repeatCount: 1,
                    repeatEnd: false,
                    describe: "Sent Rose",
                    giftType: 1,
                    giftPictureUrl: "https://p19-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.png",
                    diamondCount: 1,
                    isTest: true
                });
                break;

            case 2:
                io.fakeEmit("gift", {
                    uniqueId: "ExampleUser2",
                    profilePictureUrl: "https://p16-useast2a.tiktokcdn.com/tos-useast2a-avt-0068-giso/4ec174248f94de26938f73874962469b~c5_100x100.jpeg",
                    giftId: 5655,
                    repeatCount: 2,
                    repeatEnd: false,
                    describe: "Sent Rose",
                    giftType: 1,
                    giftPictureUrl: "https://p19-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.png",
                    diamondCount: 1,
                    isTest: true
                });
                break;

            case 3:
                io.fakeEmit("gift", {
                    uniqueId: "ExampleUser1",
                    profilePictureUrl: "https://p16-useast2a.tiktokcdn.com/tos-useast2a-avt-0068-giso/4ec174248f94de26938f73874962469b~c5_100x100.jpeg",
                    giftId: 5655,
                    repeatCount: 1,
                    repeatEnd: false,
                    describe: "Sent Doughnut",
                    giftType: 2,
                    giftPictureUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/4e7ad6bdf0a1d860c538f38026d4e812~tplv-obj.webp",
                    diamondCount: 30,
                    isTest: true
                });
                break;

            case 4:
                io.fakeEmit("gift", {
                    uniqueId: "ExampleUser2",
                    profilePictureUrl: "https://p16-useast2a.tiktokcdn.com/tos-useast2a-avt-0068-giso/4ec174248f94de26938f73874962469b~c5_100x100.jpeg",
                    giftId: 5655,
                    repeatCount: 1,
                    repeatEnd: false,
                    describe: "Sent Finger Heart",
                    giftType: 2,
                    giftPictureUrl: "https://p19-webcast.tiktokcdn.com/img/maliva/webcast-va/a4c4dc437fd3a6632aba149769491f49.png~tplv-obj.png",
                    diamondCount: 1,
                    isTest: true
                });
                break;

            case 5:
                io.fakeEmit("gift", {
                    uniqueId: "ExampleUser1",
                    profilePictureUrl: "https://p16-useast2a.tiktokcdn.com/tos-useast2a-avt-0068-giso/4ec174248f94de26938f73874962469b~c5_100x100.jpeg",
                    giftId: 5655,
                    repeatCount: 1,
                    repeatEnd: false,
                    describe: "Sent GG",
                    giftType: 2,
                    giftPictureUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/3f02fa9594bd1495ff4e8aa5ae265eef~tplv-obj.webp",
                    diamondCount: 1,
                    isTest: true
                });
                clearInterval(intervalId); // 停止定时器
                break;
        }
    }, 1000); // 每隔1秒触发一次
}

setupGiftListener();
setupHideInterval();

// 添加message监听器来响应前端的preview触发请求
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'framePreviewPing') {
        if (typeof window.preview === 'function') {
            window.preview();
        }
    }
});

window.preview = preview;
