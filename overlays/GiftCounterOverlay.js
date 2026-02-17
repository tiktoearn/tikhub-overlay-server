"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftCounterOverlay = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const defaultSettings = {
    font: 'Arial',
    fontSize: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    textColor: '#ffffff',
    borderColor: '#2196F3',
    showTotalGifts: true,
    showTotalCoins: true,
    showUniqueGifters: true,
    showTopGift: true,
    animation: 'glow',
    position: 'bottom-right',
    counterFormat: 'comma'
};
const GiftCounterOverlay = ({ editor = false, settings = defaultSettings, refreshTrigger }) => {
    const [counterData, setCounterData] = (0, react_1.useState)({
        totalGifts: 0,
        totalCoins: 0,
        uniqueGifters: 0,
        lastGiftTime: 0,
        topGift: null
    });
    const [isVisible, setIsVisible] = (0, react_1.useState)(false);
    const [currentSettings, setCurrentSettings] = (0, react_1.useState)({ ...defaultSettings, ...settings });
    const [gifters, setGifters] = (0, react_1.useState)(new Set());
    const [giftCounts, setGiftCounts] = (0, react_1.useState)(new Map());
    const wsRef = (0, react_1.useRef)(null);
    const animationTimeoutRef = (0, react_1.useRef)(null);
    // WebSocket connection for live gift events
    (0, react_1.useEffect)(() => {
        if (editor)
            return;
        console.log('[GiftCounterOverlay] WebSocket setup - editor mode:', editor);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('[GiftCounterOverlay] WebSocket already connected, skipping new connection');
            return;
        }
        if (wsRef.current) {
            wsRef.current.close();
        }
        console.log('[GiftCounterOverlay] Connecting to WebSocket for live gift events');
        const wsUrl = 'ws://localhost:3002/ws/ws/giftvsgift';
        console.log('[GiftCounterOverlay] WebSocket URL:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {
            console.log('[GiftCounterOverlay] WebSocket connected for live gift events');
        };
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[GiftCounterOverlay] Received WebSocket message:', data);
                if (data.type === 'tiktok-event' && data.event && data.event.type === 'gift') {
                    const giftData = data.event;
                    const username = giftData.nickname || giftData.username || 'Anonymous';
                    const giftName = giftData.giftName || 'Unknown Gift';
                    const giftImage = giftData.image || giftData.giftImage || '';
                    const coins = giftData.diamondCount || giftData.coins || 0;
                    const count = giftData.repeatCount || 1;
                    const now = Date.now();
                    console.log(`[GiftCounterOverlay] Gift received: ${giftName} x${count} from ${username}`);
                    // Update counter data
                    setCounterData(prev => ({
                        totalGifts: prev.totalGifts + count,
                        totalCoins: prev.totalCoins + coins,
                        uniqueGifters: prev.uniqueGifters,
                        lastGiftTime: now,
                        topGift: prev.topGift
                    }));
                    // Update unique gifters
                    setGifters(prev => {
                        const newGifters = new Set(prev);
                        newGifters.add(username);
                        setCounterData(prevData => ({
                            ...prevData,
                            uniqueGifters: newGifters.size
                        }));
                        return newGifters;
                    });
                    // Update gift counts for top gift tracking
                    setGiftCounts(prev => {
                        const newCounts = new Map(prev);
                        const currentCount = newCounts.get(giftName) || 0;
                        newCounts.set(giftName, currentCount + count);
                        // Find top gift
                        let topGift = null;
                        let maxCount = 0;
                        for (const [name, giftCount] of newCounts) {
                            if (giftCount > maxCount) {
                                maxCount = giftCount;
                                topGift = { name, image: giftImage, count: giftCount };
                            }
                        }
                        setCounterData(prevData => ({
                            ...prevData,
                            topGift
                        }));
                        return newCounts;
                    });
                    // Show animation
                    showCounterAnimation();
                }
            }
            catch (error) {
                console.error('[GiftCounterOverlay] Error processing WebSocket message:', error);
            }
        };
        ws.onclose = () => {
            console.log('[GiftCounterOverlay] WebSocket disconnected');
            wsRef.current = null;
        };
        ws.onerror = (error) => {
            console.error('[GiftCounterOverlay] WebSocket error:', error);
        };
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [editor]);
    // Load initial data for both editor and overlay modes
    (0, react_1.useEffect)(() => {
        if (editor)
            return;
        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:3002/api/giftcounter');
                const data = await res.json();
                if (data.counterData) {
                    setCounterData(data.counterData);
                }
                if (data.gifters) {
                    setGifters(new Set(data.gifters));
                }
                if (data.giftCounts) {
                    setGiftCounts(new Map(Object.entries(data.giftCounts)));
                }
            }
            catch (e) {
                console.error('[GiftCounterOverlay] Error fetching data:', e);
            }
        };
        fetchData();
        if (!editor) {
            const interval = setInterval(fetchData, 5000);
            return () => clearInterval(interval);
        }
    }, [editor]);
    // Save settings when in editor mode
    (0, react_1.useEffect)(() => {
        if (!editor)
            return;
        const timeout = setTimeout(() => {
            fetch('http://localhost:3002/api/giftcounter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings: currentSettings
                }),
            });
        }, 400);
        return () => clearTimeout(timeout);
    }, [currentSettings, editor]);
    const showCounterAnimation = () => {
        setIsVisible(true);
        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
        }
        animationTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, 2000);
    };
    const formatNumber = (num) => {
        switch (currentSettings.counterFormat) {
            case 'comma':
                return num.toLocaleString();
            case 'k-format':
                if (num >= 1000) {
                    return (num / 1000).toFixed(1) + 'k';
                }
                return num.toString();
            default:
                return num.toString();
        }
    };
    const getPositionStyles = () => {
        const baseStyles = {
            position: 'fixed',
            zIndex: 1000,
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            border: `2px solid ${currentSettings.borderColor}`,
            fontFamily: currentSettings.font,
            fontSize: `${currentSettings.fontSize}px`,
            color: currentSettings.textColor,
            background: currentSettings.backgroundColor,
            transition: 'all 0.3s ease',
            transform: isVisible ? 'scale(1.05)' : 'scale(1)',
            opacity: isVisible ? 1 : 0.9
        };
        switch (currentSettings.position) {
            case 'top-left':
                return { ...baseStyles, top: '20px', left: '20px' };
            case 'top-right':
                return { ...baseStyles, top: '20px', right: '20px' };
            case 'bottom-left':
                return { ...baseStyles, bottom: '20px', left: '20px' };
            case 'bottom-right':
                return { ...baseStyles, bottom: '20px', right: '20px' };
            case 'center':
                return { ...baseStyles, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
            default:
                return { ...baseStyles, bottom: '20px', right: '20px' };
        }
    };
    const getAnimationClass = () => {
        if (!isVisible)
            return '';
        switch (currentSettings.animation) {
            case 'glow':
                return 'gift-counter-glow';
            case 'pulse':
                return 'gift-counter-pulse';
            case 'slide':
                return 'gift-counter-slide';
            default:
                return '';
        }
    };
    if (!editor && counterData.totalGifts === 0) {
        return null;
    }
    if (!editor) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: `gift-counter-overlay ${getAnimationClass()}`, style: getPositionStyles(), children: [(0, jsx_runtime_1.jsxs)("div", { style: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                fontWeight: 'bold',
                                fontSize: '20px',
                                marginBottom: '12px',
                                textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
                            }, children: "\uD83C\uDF81 GIFT COUNTER" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: [currentSettings.showTotalGifts && ((0, jsx_runtime_1.jsxs)("div", { style: {
                                        fontSize: '18px',
                                        color: '#2196F3',
                                        fontWeight: 'bold'
                                    }, children: [formatNumber(counterData.totalGifts), " gifts"] })), currentSettings.showTotalCoins && ((0, jsx_runtime_1.jsxs)("div", { style: {
                                        fontSize: '16px',
                                        color: '#ffd700',
                                        fontWeight: 'bold'
                                    }, children: [formatNumber(counterData.totalCoins), " coins"] })), currentSettings.showUniqueGifters && ((0, jsx_runtime_1.jsxs)("div", { style: {
                                        fontSize: '14px',
                                        color: '#4CAF50',
                                        fontWeight: 'bold'
                                    }, children: [formatNumber(counterData.uniqueGifters), " gifters"] })), currentSettings.showTopGift && counterData.topGift && ((0, jsx_runtime_1.jsxs)("div", { style: {
                                        fontSize: '12px',
                                        color: '#ff9800',
                                        marginTop: '8px',
                                        padding: '4px 8px',
                                        background: 'rgba(255, 152, 0, 0.1)',
                                        borderRadius: '4px'
                                    }, children: ["Top: ", counterData.topGift.name, " (", formatNumber(counterData.topGift.count), ")"] }))] })] }), (0, jsx_runtime_1.jsx)("style", { children: `
            @keyframes giftCounterGlow {
              0% { box-shadow: 0 0 20px rgba(33, 150, 243, 0.5); }
              50% { box-shadow: 0 0 40px rgba(33, 150, 243, 0.8); }
              100% { box-shadow: 0 0 20px rgba(33, 150, 243, 0.5); }
            }
            @keyframes giftCounterPulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
            }
            @keyframes giftCounterSlide {
              0% { transform: translateY(100%); }
              100% { transform: translateY(0); }
            }
            .gift-counter-glow {
              animation: giftCounterGlow 2s ease-in-out infinite;
            }
            .gift-counter-pulse {
              animation: giftCounterPulse 1s ease-in-out infinite;
            }
            .gift-counter-slide {
              animation: giftCounterSlide 0.5s ease-out;
            }
          ` })] }));
    }
    // Editor Mode
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            background: currentSettings.backgroundColor,
            color: currentSettings.textColor,
            borderRadius: 16,
            padding: 24,
            maxWidth: 600,
            margin: '0 auto',
            boxShadow: '0 4px 32px #000a',
            fontFamily: currentSettings.font,
            position: 'relative',
            border: `2px solid ${currentSettings.borderColor}`
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { color: '#2196F3', margin: 0 }, children: "\uD83D\uDCCA Gift Counter Overlay" }), (0, jsx_runtime_1.jsx)("button", { style: {
                            background: '#23262f',
                            color: '#fff',
                            border: '1px solid #444',
                            borderRadius: 4,
                            padding: '8px 16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }, onClick: () => {
                            const newSettings = { ...currentSettings };
                            setCurrentSettings(newSettings);
                        }, children: "Customize" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 16, alignItems: 'center' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { display: 'block', marginBottom: 4, fontWeight: 500 }, children: "Font:" }), (0, jsx_runtime_1.jsxs)("select", { value: currentSettings.font, onChange: e => setCurrentSettings(s => ({ ...s, font: e.target.value })), style: { padding: 8, borderRadius: 4, background: '#23262f', color: '#fff', border: '1px solid #444' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "Arial", children: "Arial" }), (0, jsx_runtime_1.jsx)("option", { value: "Verdana", children: "Verdana" }), (0, jsx_runtime_1.jsx)("option", { value: "Tahoma", children: "Tahoma" }), (0, jsx_runtime_1.jsx)("option", { value: "Impact", children: "Impact" }), (0, jsx_runtime_1.jsx)("option", { value: "Comic Sans MS", children: "Comic Sans MS" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { display: 'block', marginBottom: 4, fontWeight: 500 }, children: "Font Size:" }), (0, jsx_runtime_1.jsx)("input", { type: "number", value: currentSettings.fontSize, onChange: e => setCurrentSettings(s => ({ ...s, fontSize: Number(e.target.value) })), style: { padding: 8, borderRadius: 4, background: '#23262f', color: '#fff', border: '1px solid #444', width: 80 } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { display: 'block', marginBottom: 4, fontWeight: 500 }, children: "Position:" }), (0, jsx_runtime_1.jsxs)("select", { value: currentSettings.position, onChange: e => setCurrentSettings(s => ({ ...s, position: e.target.value })), style: { padding: 8, borderRadius: 4, background: '#23262f', color: '#fff', border: '1px solid #444' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "top-left", children: "Top Left" }), (0, jsx_runtime_1.jsx)("option", { value: "top-right", children: "Top Right" }), (0, jsx_runtime_1.jsx)("option", { value: "bottom-left", children: "Bottom Left" }), (0, jsx_runtime_1.jsx)("option", { value: "bottom-right", children: "Bottom Right" }), (0, jsx_runtime_1.jsx)("option", { value: "center", children: "Center" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 16, alignItems: 'center' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { display: 'block', marginBottom: 4, fontWeight: 500 }, children: "Background:" }), (0, jsx_runtime_1.jsx)("input", { type: "color", value: currentSettings.backgroundColor.startsWith('#') ? currentSettings.backgroundColor : '#000000', onChange: e => setCurrentSettings(s => ({ ...s, backgroundColor: e.target.value })), style: { width: 40, height: 40, borderRadius: 4, border: '1px solid #444' } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { display: 'block', marginBottom: 4, fontWeight: 500 }, children: "Text Color:" }), (0, jsx_runtime_1.jsx)("input", { type: "color", value: currentSettings.textColor, onChange: e => setCurrentSettings(s => ({ ...s, textColor: e.target.value })), style: { width: 40, height: 40, borderRadius: 4, border: '1px solid #444' } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { display: 'block', marginBottom: 4, fontWeight: 500 }, children: "Border Color:" }), (0, jsx_runtime_1.jsx)("input", { type: "color", value: currentSettings.borderColor, onChange: e => setCurrentSettings(s => ({ ...s, borderColor: e.target.value })), style: { width: 40, height: 40, borderRadius: 4, border: '1px solid #444' } })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 16, alignItems: 'center' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { display: 'block', marginBottom: 4, fontWeight: 500 }, children: "Animation:" }), (0, jsx_runtime_1.jsxs)("select", { value: currentSettings.animation, onChange: e => setCurrentSettings(s => ({ ...s, animation: e.target.value })), style: { padding: 8, borderRadius: 4, background: '#23262f', color: '#fff', border: '1px solid #444' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "none", children: "None" }), (0, jsx_runtime_1.jsx)("option", { value: "glow", children: "Glow" }), (0, jsx_runtime_1.jsx)("option", { value: "pulse", children: "Pulse" }), (0, jsx_runtime_1.jsx)("option", { value: "slide", children: "Slide" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { display: 'block', marginBottom: 4, fontWeight: 500 }, children: "Number Format:" }), (0, jsx_runtime_1.jsxs)("select", { value: currentSettings.counterFormat, onChange: e => setCurrentSettings(s => ({ ...s, counterFormat: e.target.value })), style: { padding: 8, borderRadius: 4, background: '#23262f', color: '#fff', border: '1px solid #444' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "number", children: "1234" }), (0, jsx_runtime_1.jsx)("option", { value: "comma", children: "1,234" }), (0, jsx_runtime_1.jsx)("option", { value: "k-format", children: "1.2k" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: currentSettings.showTotalGifts, onChange: e => setCurrentSettings(s => ({ ...s, showTotalGifts: e.target.checked })) }), "Show Total Gifts"] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: currentSettings.showTotalCoins, onChange: e => setCurrentSettings(s => ({ ...s, showTotalCoins: e.target.checked })) }), "Show Total Coins"] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: currentSettings.showUniqueGifters, onChange: e => setCurrentSettings(s => ({ ...s, showUniqueGifters: e.target.checked })) }), "Show Unique Gifters"] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: currentSettings.showTopGift, onChange: e => setCurrentSettings(s => ({ ...s, showTopGift: e.target.checked })) }), "Show Top Gift"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 20, padding: 16, background: '#1a1d24', borderRadius: 8, border: '1px solid #2a2d36' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 8, fontSize: 14, color: '#ccc' }, children: "Preview:" }), (0, jsx_runtime_1.jsxs)("div", { style: {
                            textAlign: 'center',
                            padding: '12px',
                            borderRadius: '8px',
                            background: currentSettings.backgroundColor,
                            color: currentSettings.textColor,
                            border: `2px solid ${currentSettings.borderColor}`,
                            fontFamily: currentSettings.font,
                            fontSize: `${currentSettings.fontSize}px`
                        }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                    marginBottom: '8px',
                                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
                                }, children: "\uD83C\uDF81 GIFT COUNTER" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [currentSettings.showTotalGifts && ((0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '14px', color: '#2196F3', fontWeight: 'bold' }, children: [formatNumber(1234), " gifts"] })), currentSettings.showTotalCoins && ((0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '12px', color: '#ffd700', fontWeight: 'bold' }, children: [formatNumber(5678), " coins"] })), currentSettings.showUniqueGifters && ((0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '12px', color: '#4CAF50', fontWeight: 'bold' }, children: [formatNumber(42), " gifters"] })), currentSettings.showTopGift && ((0, jsx_runtime_1.jsxs)("div", { style: {
                                            fontSize: '10px',
                                            color: '#ff9800',
                                            marginTop: '4px',
                                            padding: '2px 6px',
                                            background: 'rgba(255, 152, 0, 0.1)',
                                            borderRadius: '4px'
                                        }, children: ["Top: Rose (", formatNumber(15), ")"] }))] })] })] })] }));
};
exports.GiftCounterOverlay = GiftCounterOverlay;
exports.default = exports.GiftCounterOverlay;
