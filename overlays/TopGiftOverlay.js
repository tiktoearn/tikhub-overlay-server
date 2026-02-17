"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const TopGiftOverlay = ({ settings }) => {
    const [topGift, setTopGift] = (0, react_1.useState)(null);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // Connect to WebSocket for real-time gift data
        const ws = new WebSocket('ws://localhost:3002/ws/ws');
        ws.onopen = () => {
            console.log('Connected to gift overlay WebSocket');
            setIsConnected(true);
        };
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'gift' && data.giftData) {
                    const giftData = {
                        username: data.giftData.username,
                        giftName: data.giftData.giftName,
                        giftValue: data.giftData.giftValue,
                        giftImage: data.giftData.giftImage,
                        timestamp: Date.now()
                    };
                    setTopGift(prevGift => {
                        if (!prevGift || giftData.giftValue > prevGift.giftValue) {
                            return giftData;
                        }
                        return prevGift;
                    });
                }
            }
            catch (error) {
                console.error('Error parsing gift data:', error);
            }
        };
        ws.onclose = () => {
            console.log('Disconnected from gift overlay WebSocket');
            setIsConnected(false);
        };
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setIsConnected(false);
        };
        return () => {
            ws.close();
        };
    }, []);
    if (!topGift) {
        return ((0, jsx_runtime_1.jsx)("div", { style: {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#fff',
                fontFamily: settings.fontFamily,
                fontSize: settings.fontSize,
                textAlign: 'center',
                zIndex: 1000
            }, children: isConnected ? 'Waiting for gifts...' : 'Connecting to stream...' }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '300px',
            height: '200px',
            background: 'transparent',
            zIndex: 1000,
            fontFamily: settings.fontFamily,
            color: '#fff'
        }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${topGift.giftImage})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    opacity: settings.giftImageOpacity / 100,
                    zIndex: 1
                } }), (0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute',
                    top: `${settings.titleVerticalOffset}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: settings.titleSize,
                    color: settings.titleColor,
                    fontWeight: 'bold',
                    textShadow: settings.enableFontBorder ? `2px 2px 0px ${settings.borderColor}` : 'none',
                    zIndex: 2
                }, children: settings.title }), (0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute',
                    top: `${settings.usernameVerticalOffset}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: settings.usernameSize,
                    color: settings.usernameColor,
                    fontWeight: 'bold',
                    textShadow: settings.enableFontBorder ? `2px 2px 0px ${settings.borderColor}` : 'none',
                    zIndex: 2
                }, children: topGift.username }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    position: 'absolute',
                    top: `${settings.counterVerticalOffset}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: settings.fontSize,
                    color: settings.counterColor,
                    fontWeight: 'bold',
                    textShadow: settings.enableFontBorder ? `2px 2px 0px ${settings.borderColor}` : 'none',
                    zIndex: 2
                }, children: [topGift.giftValue.toLocaleString(), " coins"] })] }));
};
exports.default = TopGiftOverlay;
