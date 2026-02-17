"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const TopStreakOverlay = ({ settings }) => {
    const [topStreak, setTopStreak] = (0, react_1.useState)(null);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [displayCount, setDisplayCount] = (0, react_1.useState)(0);
    const [isAnimating, setIsAnimating] = (0, react_1.useState)(false);
    const animationRef = (0, react_1.useRef)(null);
    // Animation function for counting up
    const animateCount = (from, to) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        setIsAnimating(true);
        const duration = 800; // Animation duration in ms
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing function for smooth animation
            const easeOutBounce = (t) => {
                if (t < 1 / 2.75) {
                    return 7.5625 * t * t;
                }
                else if (t < 2 / 2.75) {
                    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
                }
                else if (t < 2.5 / 2.75) {
                    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
                }
                else {
                    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
                }
            };
            const easedProgress = easeOutBounce(progress);
            const currentCount = Math.round(from + (to - from) * easedProgress);
            setDisplayCount(currentCount);
            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
            else {
                setIsAnimating(false);
                setDisplayCount(to);
            }
        };
        animationRef.current = requestAnimationFrame(animate);
    };
    (0, react_1.useEffect)(() => {
        // Connect to WebSocket for real-time gift data
        const ws = new WebSocket('ws://localhost:3002/ws/ws');
        ws.onopen = () => {
            console.log('Connected to streak overlay WebSocket');
            setIsConnected(true);
        };
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'gift' && data.giftData) {
                    const giftData = data.giftData;
                    setTopStreak(prevStreak => {
                        // Check if this is a streak continuation or new streak
                        if (prevStreak &&
                            prevStreak.username === giftData.username &&
                            prevStreak.giftName === giftData.giftName &&
                            Date.now() - prevStreak.timestamp < 5000) { // 5 second window for streak
                            const newStreak = {
                                username: giftData.username,
                                giftName: giftData.giftName,
                                streakCount: prevStreak.streakCount + 1,
                                giftImage: giftData.giftImage,
                                timestamp: Date.now()
                            };
                            // Animate the count increase
                            animateCount(prevStreak.streakCount, newStreak.streakCount);
                            return newStreak;
                        }
                        else {
                            // New streak
                            const newStreak = {
                                username: giftData.username,
                                giftName: giftData.giftName,
                                streakCount: 1,
                                giftImage: giftData.giftImage,
                                timestamp: Date.now()
                            };
                            // Animate from 0 to 1 for new streak
                            animateCount(0, 1);
                            return newStreak;
                        }
                    });
                }
            }
            catch (error) {
                console.error('Error parsing streak data:', error);
            }
        };
        ws.onclose = () => {
            console.log('Disconnected from streak overlay WebSocket');
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
    // Default streak data when no streaks received yet
    const defaultStreak = {
        username: 'TikHub',
        giftName: 'Gift',
        streakCount: 0,
        giftImage: 'https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/b342e28d73dac6547e0b3e2ad57f6597.png~tplv-obj.webp',
        timestamp: Date.now()
    };
    const displayStreak = topStreak || defaultStreak;
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            position: 'fixed',
            top: '20px',
            left: '20px',
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
                    backgroundImage: `url(${displayStreak.giftImage})`,
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
                }, children: displayStreak.username }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    position: 'absolute',
                    top: `${settings.counterVerticalOffset}px`,
                    left: '50%',
                    transform: `translateX(-50%) ${isAnimating ? 'scale(1.2)' : 'scale(1)'}`,
                    fontSize: settings.fontSize,
                    color: settings.counterColor,
                    fontWeight: 'bold',
                    textShadow: settings.enableFontBorder ? `2px 2px 0px ${settings.borderColor}` : 'none',
                    zIndex: 2,
                    transition: 'transform 0.3s ease-out',
                    filter: isAnimating ? 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))' : 'none'
                }, children: ["X ", displayStreak.streakCount] })] }));
};
exports.default = TopStreakOverlay;
