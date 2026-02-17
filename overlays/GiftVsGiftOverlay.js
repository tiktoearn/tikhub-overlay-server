"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftVsGiftOverlay = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const availableGifts_generated_1 = require("../availableGifts.generated");
const vsImage = require('../assets/vs.png');
const fonts = ['Arial', 'Verdana', 'Tahoma', 'Impact', 'Comic Sans MS'];
const defaultSettings = {
    font: 'Arial',
    fontSize: 50,
    fontSpacing: 50,
    backgroundColor: '#090909',
    enableFontBorder: true,
    borderColor: '#000000',
    counterColor: '#ffffff',
    gift1Bg: 'rgba(255,255,255,0.2)', // semi-transparent white
    gift2Bg: 'rgba(255,255,255,0.2)', // semi-transparent white
    showBottomText: false,
    teamLeftText: 'en contra!!!',
    teamRightText: 'a favor!!!',
};
const goalBehaviors = [
    { value: 'keep', label: 'Keep Goal' },
    { value: 'increase', label: 'Increase the Goal' },
    { value: 'double', label: 'Double the Goal' },
    { value: 'hide', label: 'Hide the Goal' },
];
const GiftVsGiftOverlay = ({ editor = false, actions = [], triggerAction, refreshTrigger }) => {
    const useLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const OVERLAY_SERVER = useLocal ? 'http://localhost:3002' : 'https://overlay.tikhub.site';
    const WS_PROTOCOL = useLocal ? 'ws' : 'wss';
    const WS_SERVER = useLocal ? '//localhost:3002' : '//overlay.tikhub.site';
    const [leftGift, setLeftGift] = (0, react_1.useState)(availableGifts_generated_1.availableGifts[0]);
    const [rightGift, setRightGift] = (0, react_1.useState)(availableGifts_generated_1.availableGifts[1]);
    const [leftPoints, setLeftPoints] = (0, react_1.useState)(0);
    const [rightPoints, setRightPoints] = (0, react_1.useState)(0);
    const [goal, setGoal] = (0, react_1.useState)(500);
    const [showCustomize, setShowCustomize] = (0, react_1.useState)(false);
    const [settings, setSettings] = (0, react_1.useState)(defaultSettings);
    const [tempSettings, setTempSettings] = (0, react_1.useState)(settings);
    const [vsIcon, setVsIcon] = (0, react_1.useState)(undefined);
    // New state for dropdowns
    const [goalBehavior, setGoalBehavior] = (0, react_1.useState)('keep');
    const [actionWinLeft, setActionWinLeft] = (0, react_1.useState)('none');
    const [actionWinRight, setActionWinRight] = (0, react_1.useState)('none');
    // Store original goal for linear increase behavior
    const originalGoalRef = (0, react_1.useRef)(500);
    // Refresh configuration when actions are deleted
    (0, react_1.useEffect)(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            // Reload configuration from localStorage to get updated action references
            try {
                const saved = localStorage.getItem('giftvsgift_config');
                if (saved) {
                    const config = JSON.parse(saved);
                    setActionWinLeft(config.actionWinLeft || 'none');
                    setActionWinRight(config.actionWinRight || 'none');
                }
            }
            catch (e) {
                console.error('Failed to refresh gift overlay config:', e);
            }
        }
    }, [refreshTrigger]);
    const isFirstRender = (0, react_1.useRef)(true);
    (0, react_1.useEffect)(() => {
        if (!editor)
            return;
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timeout = setTimeout(() => {
            fetch(`${OVERLAY_SERVER}/api/giftvsgift`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    left: leftGift,
                    right: rightGift,
                    leftPoints,
                    rightPoints,
                    settings,
                    goal,
                    goalBehavior,
                    actionWinLeft,
                    actionWinRight
                }),
            });
        }, 400);
        return () => clearTimeout(timeout);
    }, [leftGift, rightGift, leftPoints, rightPoints, settings, goal, goalBehavior, actionWinLeft, actionWinRight, editor]);
    // WebSocket connection for live gift events
    const wsRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        console.log('[GiftVsGift] WebSocket setup - editor mode:', editor);
        // Prevent multiple connections
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('[GiftVsGift] WebSocket already connected, skipping new connection');
            return;
        }
        // Close existing connection if any
        if (wsRef.current) {
            wsRef.current.close();
        }
        console.log('[GiftVsGift] Connecting to WebSocket for live gift events');
        // Force explicit localhost URL to avoid CSP issues
        const wsUrl = `${WS_PROTOCOL}:${WS_SERVER}/ws/giftvsgift`;
        console.log('[GiftVsGift] WebSocket URL:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {
            console.log('[GiftVsGift] WebSocket connected for live gift events');
        };
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[GiftVsGift] Received WebSocket message:', data);
                // Handle TikTok gift events
                if (data.type === 'tiktok-event' && data.event && data.event.type === 'gift') {
                    const giftName = data.event.giftName;
                    const giftCount = data.event.repeatCount || 1;
                    console.log(`[GiftVsGift] Received gift: ${giftName} x${giftCount}`);
                    // Get current gift names from state for comparison
                    const currentLeftGift = leftGift.name.toLowerCase();
                    const currentRightGift = rightGift.name.toLowerCase();
                    const receivedGift = giftName.toLowerCase();
                    console.log(`[GiftVsGift] Comparing: received="${receivedGift}" vs left="${currentLeftGift}" vs right="${currentRightGift}"`);
                    // More flexible gift matching - check for partial matches and common variations
                    const normalizeGiftName = (name) => name.replace(/[^a-z0-9]/g, ' ').trim();
                    const aliasMatches = (target, ...aliases) => {
                        const normalizedTarget = normalizeGiftName(target);
                        return aliases.some(alias => normalizedTarget === normalizeGiftName(alias));
                    };
                    const matchesLeft = receivedGift === currentLeftGift ||
                        currentLeftGift.includes(receivedGift) ||
                        receivedGift.includes(currentLeftGift) ||
                        aliasMatches(receivedGift, currentLeftGift, 'tt', 'tik tok', 'tiktok') && aliasMatches(currentLeftGift, 'tt', 'tik tok', 'tiktok') ||
                        aliasMatches(receivedGift, 'rose', 'roses') && aliasMatches(currentLeftGift, 'rose', 'roses') ||
                        receivedGift === 'rose' && currentLeftGift === 'go popular' ||
                        receivedGift === 'doughnut' && currentLeftGift === 'pegasus';
                    const matchesRight = receivedGift === currentRightGift ||
                        currentRightGift.includes(receivedGift) ||
                        receivedGift.includes(currentRightGift) ||
                        aliasMatches(receivedGift, currentRightGift, 'tt', 'tik tok', 'tiktok') && aliasMatches(currentRightGift, 'tt', 'tik tok', 'tiktok') ||
                        aliasMatches(receivedGift, 'rose', 'roses') && aliasMatches(currentRightGift, 'rose', 'roses') ||
                        receivedGift === 'rose' && currentRightGift === 'go popular' ||
                        receivedGift === 'doughnut' && currentRightGift === 'pegasus';
                    // Check if gift matches left team
                    if (matchesLeft) {
                        setLeftPoints(prevLeft => {
                            const newCount = prevLeft + giftCount;
                            console.log(`[GiftVsGift] Left team (${leftGift.name}) count: ${prevLeft} → ${newCount} - matched gift: ${giftName}`);
                            // Save updated count to server
                            saveCountsToServer(newCount, rightPoints);
                            return newCount;
                        });
                    }
                    // Check if gift matches right team
                    if (matchesRight) {
                        setRightPoints(prevRight => {
                            const newCount = prevRight + giftCount;
                            console.log(`[GiftVsGift] Right team (${rightGift.name}) count: ${prevRight} → ${newCount} - matched gift: ${giftName}`);
                            // Save updated count to server
                            saveCountsToServer(leftPoints, newCount);
                            return newCount;
                        });
                    }
                    // Log if no match found
                    if (!matchesLeft && !matchesRight) {
                        console.log(`[GiftVsGift] No match found for gift: ${giftName}`);
                    }
                }
                // Handle gift-vs-gift update/config messages
                else if (data.type === 'gift-vs-gift-update' || data.type === 'gift-vs-gift-config') {
                    console.log(`🔔 [GiftVsGift Browser Overlay] Received ${data.type} from server:`, data);
                    // Update goal if present
                    if (data.goal !== undefined) {
                        console.log(`🎯 [GiftVsGift Browser Overlay] RECEIVED GOAL UPDATE via WebSocket!`);
                        console.log(`🎯 [GiftVsGift Browser Overlay] Old goal: ${goal}`);
                        setGoal(data.goal);
                    }
                    // Update goal behavior if present
                    if (data.goalBehavior) {
                        console.log(`[GiftVsGift] ✅ Updating goal behavior from WebSocket: ${data.goalBehavior}`);
                        setGoalBehavior(data.goalBehavior);
                    }
                    // Update left gift if present
                    if (data.left) {
                        const leftGiftObj = availableGifts_generated_1.availableGifts.find(g => g.name.toLowerCase() === (data.left.name || '').toLowerCase());
                        setLeftGift(leftGiftObj || {
                            id: data.left.id || data.left.name,
                            name: data.left.name,
                            image: data.left.image,
                            coins: data.left.coins || 0
                        });
                    }
                    // Update right gift if present
                    if (data.right) {
                        const rightGiftObj = availableGifts_generated_1.availableGifts.find(g => g.name.toLowerCase() === (data.right.name || '').toLowerCase());
                        setRightGift(rightGiftObj || {
                            id: data.right.id || data.right.name,
                            name: data.right.name,
                            image: data.right.image,
                            coins: data.right.coins || 0
                        });
                    }
                }
            }
            catch (error) {
                console.error('[GiftVsGift] Error processing WebSocket message:', error);
            }
        };
        ws.onclose = () => {
            console.log('[GiftVsGift] WebSocket disconnected');
            wsRef.current = null;
        };
        ws.onerror = (error) => {
            console.error('[GiftVsGift] WebSocket error:', error);
        };
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []); // No dependencies - only run once on mount
    // Load initial data for both editor and overlay modes
    (0, react_1.useEffect)(() => {
        let fetchTimeout = null;
        const fetchData = async () => {
            try {
                const res = await fetch(`${OVERLAY_SERVER}/api/giftvsgift`);
                const data = await res.json();
                if (data.left) {
                    const leftGiftObj = availableGifts_generated_1.availableGifts.find(g => g.name === data.left.name);
                    setLeftGift({
                        id: leftGiftObj?.id || data.left.name,
                        name: data.left.name,
                        image: data.left.image,
                        coins: data.left.coins,
                    });
                    // Only set points if they're not already set (preserve live counts)
                    if (leftPoints === 0) {
                        setLeftPoints(data.leftPoints ?? data.left.count ?? 0);
                    }
                }
                if (data.right) {
                    const rightGiftObj = availableGifts_generated_1.availableGifts.find(g => g.name === data.right.name);
                    setRightGift({
                        id: rightGiftObj?.id || data.right.name,
                        name: data.right.name,
                        image: data.right.image,
                        coins: data.right.coins,
                    });
                    // Only set points if they're not already set (preserve live counts)
                    if (rightPoints === 0) {
                        setRightPoints(data.rightPoints ?? data.right.count ?? 0);
                    }
                }
                if (data.settings) {
                    setSettings(data.settings);
                }
                if (data.vsIcon) {
                    setVsIcon(data.vsIcon);
                }
                else {
                    setVsIcon(undefined);
                }
                // Restore goal and action settings
                if (data.goal !== undefined) {
                    setGoal(data.goal);
                    // Store original goal for linear increase behavior
                    if (originalGoalRef.current === 500) { // Only set if it's still the default
                        originalGoalRef.current = data.goal;
                    }
                }
                if (data.goalBehavior !== undefined) {
                    setGoalBehavior(data.goalBehavior);
                }
                if (data.actionWinLeft !== undefined) {
                    setActionWinLeft(data.actionWinLeft);
                }
                if (data.actionWinRight !== undefined) {
                    setActionWinRight(data.actionWinRight);
                }
            }
            catch (e) {
                // Optionally handle error
            }
        };
        // Load data immediately
        fetchData();
        // Only set up polling for overlay mode (not editor mode) with throttling
        if (!editor) {
            const interval = setInterval(() => {
                // Clear any pending fetch
                if (fetchTimeout) {
                    clearTimeout(fetchTimeout);
                }
                // Throttle to prevent too many requests
                fetchTimeout = setTimeout(fetchData, 1000);
            }, 2000);
            return () => {
                clearInterval(interval);
                if (fetchTimeout) {
                    clearTimeout(fetchTimeout);
                }
            };
        }
    }, [editor]);
    const handleOpenCustomize = () => {
        setTempSettings(settings);
        setShowCustomize(true);
    };
    const handleSaveCustomize = () => {
        setSettings(tempSettings);
        setShowCustomize(false);
    };
    const handleCancelCustomize = () => {
        setShowCustomize(false);
    };
    const setGift1Transparent = () => setTempSettings(s => ({ ...s, gift1Bg: 'rgba(0,0,0,0)' }));
    const setGift2Transparent = () => setTempSettings(s => ({ ...s, gift2Bg: 'rgba(0,0,0,0)' }));
    const setOverlayTransparent = () => setTempSettings(s => ({ ...s, backgroundColor: 'rgba(0,0,0,0)' }));
    // Save counts to server to persist across reconnections
    const saveCountsToServer = async (leftCount, rightCount) => {
        try {
            const response = await fetch(`${OVERLAY_SERVER}/overlay/giftvsgift/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    leftPoints: leftCount,
                    rightPoints: rightCount,
                }),
            });
        }
        catch (error) {
            console.error('[GiftVsGift] Error saving counts to server:', error);
        }
    };
    // --- REAL OVERLAY MODE ---
    const prevLeftPoints = (0, react_1.useRef)(leftPoints);
    const prevRightPoints = (0, react_1.useRef)(rightPoints);
    const goalReachedRef = (0, react_1.useRef)(false);
    const [showWinner, setShowWinner] = (0, react_1.useState)(false);
    const [winner, setWinner] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (editor)
            return;
        // Check if either team reaches the goal
        const leftReached = leftPoints >= goal && prevLeftPoints.current < goal;
        const rightReached = rightPoints >= goal && prevRightPoints.current < goal;
        if ((leftReached || rightReached) && !goalReachedRef.current) {
            goalReachedRef.current = true;
            // Set winner for visual feedback
            if (leftReached) {
                setWinner('left');
                setShowWinner(true);
            }
            else if (rightReached) {
                setWinner('right');
                setShowWinner(true);
            }
            // Trigger actions
            if (leftReached && actionWinLeft !== 'none' && triggerAction) {
                triggerAction(actionWinLeft);
            }
            if (rightReached && actionWinRight !== 'none' && triggerAction) {
                triggerAction(actionWinRight);
            }
            // Handle goal behavior with celebration delay
            setTimeout(() => {
                if (goalBehavior === 'increase') {
                    setGoal(prev => {
                        const newGoal = prev + originalGoalRef.current;
                        console.log(`🎯 Increasing gift vs gift goal: ${prev} → ${newGoal} - adding original goal: ${originalGoalRef.current}`);
                        return newGoal;
                    });
                }
                else if (goalBehavior === 'double') {
                    setGoal(prev => {
                        const newGoal = prev * 2;
                        console.log(`🎯 Doubling gift vs gift goal: ${prev} → ${newGoal} - current goal doubled`);
                        return newGoal;
                    });
                }
                else if (goalBehavior === 'hide') {
                    // Hide the overlay by setting a very high goal
                    setGoal(999999);
                    console.log('🎯 Hiding gift vs gift overlay');
                }
                // For 'keep', do nothing - goal stays the same
                // Reset goal reached flag and winner display after a delay
                setTimeout(() => {
                    goalReachedRef.current = false;
                    setShowWinner(false);
                    setWinner(null);
                }, 2000);
            }, 1500); // Longer celebration time like interactiveapp.live
        }
        prevLeftPoints.current = leftPoints;
        prevRightPoints.current = rightPoints;
    }, [leftPoints, rightPoints, goal, actionWinLeft, actionWinRight, goalBehavior, triggerAction, editor]);
    if (!editor) {
        const leftProgress = Math.min((leftPoints / goal) * 100, 100);
        const rightProgress = Math.min((rightPoints / goal) * 100, 100);
        const leftWinning = leftPoints > rightPoints;
        const rightWinning = rightPoints > leftPoints;
        return ((0, jsx_runtime_1.jsxs)("div", { className: "gift-vs-gift-overlay", style: {
                background: settings.backgroundColor,
                color: settings.counterColor,
                borderRadius: 20,
                padding: 32,
                maxWidth: 1000,
                margin: '0 auto',
                boxShadow: '0 8px 48px rgba(0,0,0,0.3)',
                fontFamily: settings.font,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 400,
                border: '2px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)'
            }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, textAlign: 'center', position: 'relative' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                margin: '16px 0',
                                position: 'relative',
                                transform: leftWinning ? 'scale(1.05)' : 'scale(1)',
                                transition: 'transform 0.3s ease'
                            }, children: [(0, jsx_runtime_1.jsx)("img", { src: leftGift.image, alt: leftGift.name, style: {
                                        width: 140,
                                        height: 140,
                                        objectFit: 'contain',
                                        borderRadius: 16,
                                        background: settings.gift1Bg,
                                        border: leftWinning ? '3px solid #4CAF50' : '2px solid rgba(255,255,255,0.2)',
                                        boxShadow: leftWinning ? '0 0 20px rgba(76, 175, 80, 0.5)' : '0 4px 16px rgba(0,0,0,0.2)',
                                        transition: 'all 0.3s ease'
                                    } }), leftWinning && ((0, jsx_runtime_1.jsx)("div", { style: {
                                        position: 'absolute',
                                        top: -10,
                                        right: -10,
                                        background: '#4CAF50',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: 30,
                                        height: 30,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        animation: 'pulse 1s infinite'
                                    }, children: "\uD83D\uDC51" }))] }), (0, jsx_runtime_1.jsx)("div", { style: {
                                fontWeight: 'bold',
                                fontSize: 28,
                                marginTop: 12,
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }, children: leftGift.name }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                color: '#b6ffb6',
                                fontSize: 20,
                                marginBottom: 12,
                                opacity: 0.8
                            }, children: [leftGift.coins, " Coins"] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: 10,
                                height: 20,
                                margin: '8px 0',
                                overflow: 'hidden',
                                position: 'relative'
                            }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                        background: 'linear-gradient(90deg, #4CAF50, #45a049)',
                                        height: '100%',
                                        width: `${leftProgress}%`,
                                        borderRadius: 10,
                                        transition: 'width 0.5s ease',
                                        boxShadow: '0 0 10px rgba(76, 175, 80, 0.3)'
                                    } }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: 12,
                                        textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                                    }, children: [Math.round(leftProgress), "%"] })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                                fontWeight: 'bold',
                                fontSize: 56,
                                marginTop: 16,
                                textShadow: '0 4px 8px rgba(0,0,0,0.5)',
                                color: leftWinning ? '#4CAF50' : settings.counterColor
                            }, children: leftPoints }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                fontSize: 16,
                                opacity: 0.7,
                                marginTop: 8
                            }, children: ["Goal: ", goal] })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                        flex: '0 0 140px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                    }, children: [(0, jsx_runtime_1.jsx)("img", { src: vsIcon || vsImage, alt: "VS", style: {
                                width: 120,
                                height: 120,
                                objectFit: 'contain',
                                margin: '0 auto',
                                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                            } }), (0, jsx_runtime_1.jsx)("div", { style: {
                                fontSize: 18,
                                fontWeight: 'bold',
                                marginTop: 8,
                                color: '#FFD700',
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }, children: "BATTLE" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, textAlign: 'center', position: 'relative' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                margin: '16px 0',
                                position: 'relative',
                                transform: rightWinning ? 'scale(1.05)' : 'scale(1)',
                                transition: 'transform 0.3s ease'
                            }, children: [(0, jsx_runtime_1.jsx)("img", { src: rightGift.image, alt: rightGift.name, style: {
                                        width: 140,
                                        height: 140,
                                        objectFit: 'contain',
                                        borderRadius: 16,
                                        background: settings.gift2Bg,
                                        border: rightWinning ? '3px solid #FF5722' : '2px solid rgba(255,255,255,0.2)',
                                        boxShadow: rightWinning ? '0 0 20px rgba(255, 87, 34, 0.5)' : '0 4px 16px rgba(0,0,0,0.2)',
                                        transition: 'all 0.3s ease'
                                    } }), rightWinning && ((0, jsx_runtime_1.jsx)("div", { style: {
                                        position: 'absolute',
                                        top: -10,
                                        left: -10,
                                        background: '#FF5722',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: 30,
                                        height: 30,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        animation: 'pulse 1s infinite'
                                    }, children: "\uD83D\uDC51" }))] }), (0, jsx_runtime_1.jsx)("div", { style: {
                                fontWeight: 'bold',
                                fontSize: 28,
                                marginTop: 12,
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }, children: rightGift.name }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                color: '#b6ffb6',
                                fontSize: 20,
                                marginBottom: 12,
                                opacity: 0.8
                            }, children: [rightGift.coins, " Coins"] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: 10,
                                height: 20,
                                margin: '8px 0',
                                overflow: 'hidden',
                                position: 'relative'
                            }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                        background: 'linear-gradient(90deg, #FF5722, #E64A19)',
                                        height: '100%',
                                        width: `${rightProgress}%`,
                                        borderRadius: 10,
                                        transition: 'width 0.5s ease',
                                        boxShadow: '0 0 10px rgba(255, 87, 34, 0.3)'
                                    } }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: 12,
                                        textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                                    }, children: [Math.round(rightProgress), "%"] })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                                fontWeight: 'bold',
                                fontSize: 56,
                                marginTop: 16,
                                textShadow: '0 4px 8px rgba(0,0,0,0.5)',
                                color: rightWinning ? '#FF5722' : settings.counterColor
                            }, children: rightPoints }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                fontSize: 16,
                                opacity: 0.7,
                                marginTop: 8
                            }, children: ["Goal: ", goal] })] }), (0, jsx_runtime_1.jsx)("style", { children: `
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            @keyframes winnerGlow {
              0% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
              50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.8); }
              100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
            }
            @keyframes confetti {
              0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
          ` }), showWinner && winner && ((0, jsx_runtime_1.jsxs)("div", { style: {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        animation: 'winnerGlow 2s ease-in-out'
                    }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                textAlign: 'center',
                                color: '#FFD700',
                                textShadow: '0 4px 8px rgba(0,0,0,0.8)'
                            }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                        fontSize: 72,
                                        fontWeight: 'bold',
                                        marginBottom: 16,
                                        animation: 'pulse 0.5s infinite'
                                    }, children: "\uD83C\uDF89" }), (0, jsx_runtime_1.jsx)("div", { style: {
                                        fontSize: 48,
                                        fontWeight: 'bold',
                                        marginBottom: 8
                                    }, children: winner === 'left' ? leftGift.name : rightGift.name }), (0, jsx_runtime_1.jsx)("div", { style: {
                                        fontSize: 24,
                                        opacity: 0.9
                                    }, children: "WINS THE BATTLE!" })] }), [...Array(20)].map((_, i) => ((0, jsx_runtime_1.jsx)("div", { style: {
                                position: 'absolute',
                                width: 10,
                                height: 10,
                                background: ['#FFD700', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0'][i % 5],
                                borderRadius: '50%',
                                left: `${Math.random() * 100}%`,
                                animation: `confetti ${2 + Math.random() * 2}s linear infinite`,
                                animationDelay: `${Math.random() * 2}s`
                            } }, i)))] }))] }));
    }
    // --- EDITOR MODE ---
    return ((0, jsx_runtime_1.jsxs)("div", { className: "gift-vs-gift-overlay", style: { background: settings.backgroundColor, color: settings.counterColor, borderRadius: 16, padding: 24, maxWidth: 900, margin: '0 auto', boxShadow: '0 4px 32px #000a', fontFamily: settings.font, position: 'relative' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 24, marginBottom: 20, alignItems: 'center' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontWeight: 500, marginRight: 6 }, children: "When Reached:" }), (0, jsx_runtime_1.jsx)("select", { value: goalBehavior, onChange: e => setGoalBehavior(e.target.value), style: { padding: 6, borderRadius: 4, minWidth: 120 }, children: goalBehaviors.map(opt => ((0, jsx_runtime_1.jsx)("option", { value: opt.value, children: opt.label }, opt.value))) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontWeight: 500, marginRight: 6 }, children: "Action Win Left:" }), (0, jsx_runtime_1.jsxs)("select", { value: actionWinLeft, onChange: e => setActionWinLeft(e.target.value), style: { padding: 6, borderRadius: 4, minWidth: 140 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "none", children: "None" }), actions
                                        .filter(action => action.miniGame) // Only show minigame actions
                                        .map(action => {
                                        const actionAny = action; // Type assertion for dynamic properties
                                        let displayName = action.name;
                                        // Add minigame type and specific command info
                                        if (action.miniGame) {
                                            if (action.miniGame === 'pvz' && actionAny.pvzCommand) {
                                                displayName += ` (${actionAny.pvzCommand})`;
                                            }
                                            else if (action.miniGame === 'pvz_hybrid' && actionAny.pvzCommand) {
                                                displayName += ` (${actionAny.pvzCommand})`;
                                            }
                                            else if (action.miniGame === 'peak' && actionAny.peakCommand) {
                                                displayName += ` (${actionAny.peakCommand})`;
                                            }
                                            else if (action.miniGame === 'sandbox' && actionAny.miniGameAction) {
                                                displayName += ` (${actionAny.miniGameAction})`;
                                            }
                                            else if (action.miniGame === 'l4d2' && actionAny.miniGameAction) {
                                                displayName += ` (${actionAny.miniGameAction})`;
                                            }
                                            else if (action.miniGame === 'cubo' && actionAny.miniGameAction) {
                                                displayName += ` (${actionAny.miniGameAction})`;
                                            }
                                            else {
                                                displayName += ` (${action.miniGame})`;
                                            }
                                        }
                                        return ((0, jsx_runtime_1.jsx)("option", { value: action.id, children: displayName }, action.id));
                                    })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontWeight: 500, marginRight: 6 }, children: "Action Win Right:" }), (0, jsx_runtime_1.jsxs)("select", { value: actionWinRight, onChange: e => setActionWinRight(e.target.value), style: { padding: 6, borderRadius: 4, minWidth: 140 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "none", children: "None" }), actions
                                        .filter(action => action.miniGame) // Only show minigame actions
                                        .map(action => {
                                        const actionAny = action; // Type assertion for dynamic properties
                                        let displayName = action.name;
                                        // Add minigame type and specific command info
                                        if (action.miniGame) {
                                            if (action.miniGame === 'pvz' && actionAny.pvzCommand) {
                                                displayName += ` (${actionAny.pvzCommand})`;
                                            }
                                            else if (action.miniGame === 'pvz_hybrid' && actionAny.pvzCommand) {
                                                displayName += ` (${actionAny.pvzCommand})`;
                                            }
                                            else if (action.miniGame === 'peak' && actionAny.peakCommand) {
                                                displayName += ` (${actionAny.peakCommand})`;
                                            }
                                            else if (action.miniGame === 'sandbox' && actionAny.miniGameAction) {
                                                displayName += ` (${actionAny.miniGameAction})`;
                                            }
                                            else if (action.miniGame === 'l4d2' && actionAny.miniGameAction) {
                                                displayName += ` (${actionAny.miniGameAction})`;
                                            }
                                            else if (action.miniGame === 'cubo' && actionAny.miniGameAction) {
                                                displayName += ` (${actionAny.miniGameAction})`;
                                            }
                                            else {
                                                displayName += ` (${action.miniGame})`;
                                            }
                                        }
                                        return ((0, jsx_runtime_1.jsx)("option", { value: action.id, children: displayName }, action.id));
                                    })] })] })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, children: (0, jsx_runtime_1.jsx)("h2", { style: { color: '#7fff7f', margin: 0 }, children: "Gift VS Gift" }) }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: ["Goal: ", (0, jsx_runtime_1.jsx)("input", { type: "number", value: goal, onChange: e => {
                                    const newGoal = Number(e.target.value);
                                    setGoal(newGoal);
                                    // Update original goal when manually changed
                                    originalGoalRef.current = newGoal;
                                }, style: { width: 80, padding: 4, borderRadius: 4, border: '1px solid #444', background: '#23262f', color: '#fff' } })] }), (0, jsx_runtime_1.jsx)("button", { style: { background: '#23262f', color: '#fff', border: '1px solid #444', borderRadius: 4, padding: '4px 14px', fontWeight: 'bold', cursor: 'pointer' }, onClick: handleOpenCustomize, children: "Customize" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { textAlign: 'center', flex: 1 }, children: [(0, jsx_runtime_1.jsx)("select", { value: leftGift.id, onChange: e => setLeftGift(availableGifts_generated_1.availableGifts.find(g => g.id === e.target.value) || availableGifts_generated_1.availableGifts[0]), style: { padding: 8, borderRadius: 4, background: '#23262f', color: '#fff', border: '1px solid #444', marginBottom: 8 }, children: availableGifts_generated_1.availableGifts.map((gift, idx) => ((0, jsx_runtime_1.jsx)("option", { value: gift.id, children: gift.name }, `left_${gift.id}_${idx}_${gift.name.replace(/\s+/g, '_')}`))) }), (0, jsx_runtime_1.jsx)("div", { style: { margin: '12px 0' }, children: (0, jsx_runtime_1.jsx)("img", { src: leftGift.image, alt: leftGift.name, style: { width: 90, height: 90, objectFit: 'contain', borderRadius: 12, background: settings.gift1Bg } }) }), (0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 'bold', fontSize: 18 }, children: leftGift.name }), (0, jsx_runtime_1.jsxs)("div", { style: { color: '#b6ffb6', fontSize: 14 }, children: [leftGift.coins, " Coins"] }), (0, jsx_runtime_1.jsxs)("div", { style: { margin: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setLeftPoints(p => Math.max(0, p - 1)), style: { borderRadius: 4, padding: '4px 12px', background: '#23262f', color: '#fff', border: '1px solid #444', cursor: 'pointer', fontSize: 20 }, children: "-" }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 32, fontWeight: 'bold', minWidth: 32, display: 'inline-block' }, children: leftPoints }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setLeftPoints(p => p + 1), style: { borderRadius: 4, padding: '4px 12px', background: '#23262f', color: '#fff', border: '1px solid #444', cursor: 'pointer', fontSize: 20 }, children: "+" })] })] }), (0, jsx_runtime_1.jsx)("div", { style: { flex: '0 0 120px', textAlign: 'center' }, children: (0, jsx_runtime_1.jsx)("img", { src: vsImage, alt: "VS", style: { width: 100, height: 100, objectFit: 'contain', margin: '0 auto' } }) }), (0, jsx_runtime_1.jsxs)("div", { style: { textAlign: 'center', flex: 1 }, children: [(0, jsx_runtime_1.jsx)("select", { value: rightGift.id, onChange: e => setRightGift(availableGifts_generated_1.availableGifts.find(g => g.id === e.target.value) || availableGifts_generated_1.availableGifts[1]), style: { padding: 8, borderRadius: 4, background: '#23262f', color: '#fff', border: '1px solid #444', marginBottom: 8 }, children: availableGifts_generated_1.availableGifts.map((gift, idx) => ((0, jsx_runtime_1.jsx)("option", { value: gift.id, children: gift.name }, `right_${gift.id}_${idx}_${gift.name.replace(/\s+/g, '_')}`))) }), (0, jsx_runtime_1.jsx)("div", { style: { margin: '12px 0' }, children: (0, jsx_runtime_1.jsx)("img", { src: rightGift.image, alt: rightGift.name, style: { width: 90, height: 90, objectFit: 'contain', borderRadius: 12, background: settings.gift2Bg } }) }), (0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 'bold', fontSize: 18 }, children: rightGift.name }), (0, jsx_runtime_1.jsxs)("div", { style: { color: '#b6ffb6', fontSize: 14 }, children: [rightGift.coins, " Coins"] }), (0, jsx_runtime_1.jsxs)("div", { style: { margin: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setRightPoints(p => Math.max(0, p - 1)), style: { borderRadius: 4, padding: '4px 12px', background: '#23262f', color: '#fff', border: '1px solid #444', cursor: 'pointer', fontSize: 20 }, children: "-" }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 32, fontWeight: 'bold', minWidth: 32, display: 'inline-block' }, children: rightPoints }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setRightPoints(p => p + 1), style: { borderRadius: 4, padding: '4px 12px', background: '#23262f', color: '#fff', border: '1px solid #444', cursor: 'pointer', fontSize: 20 }, children: "+" })] })] })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    width: '100%',
                    height: 60,
                    background: 'rgba(0,0,0,0.3)',
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                    pointerEvents: 'none',
                } }), showCustomize && ((0, jsx_runtime_1.jsx)("div", { style: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000a', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: (0, jsx_runtime_1.jsxs)("div", { style: { background: '#23262f', borderRadius: 12, padding: 32, minWidth: 400, boxShadow: '0 4px 32px #0008', color: '#fff', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { margin: 0 }, children: "Customize Overlay" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleCancelCustomize, style: { background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }, children: "\u00D7" })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: (0, jsx_runtime_1.jsxs)("div", { style: { minWidth: 220, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }, children: [(0, jsx_runtime_1.jsxs)("label", { children: ["Font", (0, jsx_runtime_1.jsx)("select", { value: tempSettings.font, onChange: e => setTempSettings(s => ({ ...s, font: e.target.value })), style: { marginLeft: 8 }, children: fonts.map(f => (0, jsx_runtime_1.jsx)("option", { value: f, children: f }, f)) })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Font Size", (0, jsx_runtime_1.jsx)("input", { type: "number", value: tempSettings.fontSize, onChange: e => setTempSettings(s => ({ ...s, fontSize: Number(e.target.value) })), style: { marginLeft: 8, width: 60 } })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Font Spacing", (0, jsx_runtime_1.jsx)("input", { type: "number", value: tempSettings.fontSpacing, onChange: e => setTempSettings(s => ({ ...s, fontSpacing: Number(e.target.value) })), style: { marginLeft: 8, width: 60 } })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Background Color", (0, jsx_runtime_1.jsx)("input", { type: "color", value: tempSettings.backgroundColor.startsWith('#') ? tempSettings.backgroundColor : '#090909', onChange: e => setTempSettings(s => ({ ...s, backgroundColor: e.target.value })), style: { marginLeft: 8 } }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: tempSettings.backgroundColor, onChange: e => setTempSettings(s => ({ ...s, backgroundColor: e.target.value })), placeholder: "#090909 or rgba(0,0,0,0.2)", style: { marginLeft: 8, width: 140 } }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: setOverlayTransparent, style: { marginLeft: 8, padding: '2px 10px', borderRadius: 4, background: '#444', color: '#fff', border: 'none', cursor: 'pointer' }, children: "Transparent" })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Border Color", (0, jsx_runtime_1.jsx)("input", { type: "color", value: tempSettings.borderColor, onChange: e => setTempSettings(s => ({ ...s, borderColor: e.target.value })), style: { marginLeft: 8 } })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Counter Color", (0, jsx_runtime_1.jsx)("input", { type: "color", value: tempSettings.counterColor, onChange: e => setTempSettings(s => ({ ...s, counterColor: e.target.value })), style: { marginLeft: 8 } })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Gift 1 Background Color", (0, jsx_runtime_1.jsx)("input", { type: "color", value: tempSettings.gift1Bg.startsWith('#') ? tempSettings.gift1Bg : '#ffffff', onChange: e => setTempSettings(s => ({ ...s, gift1Bg: e.target.value })), style: { marginLeft: 8 } }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: tempSettings.gift1Bg, onChange: e => setTempSettings(s => ({ ...s, gift1Bg: e.target.value })), placeholder: "#ffffff or rgba(255,255,255,0.2)", style: { marginLeft: 8, width: 140 } }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: setGift1Transparent, style: { marginLeft: 8, padding: '2px 10px', borderRadius: 4, background: '#444', color: '#fff', border: 'none', cursor: 'pointer' }, children: "Transparent" })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Gift 2 Background Color", (0, jsx_runtime_1.jsx)("input", { type: "color", value: tempSettings.gift2Bg.startsWith('#') ? tempSettings.gift2Bg : '#ffffff', onChange: e => setTempSettings(s => ({ ...s, gift2Bg: e.target.value })), style: { marginLeft: 8 } }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: tempSettings.gift2Bg, onChange: e => setTempSettings(s => ({ ...s, gift2Bg: e.target.value })), placeholder: "#ffffff or rgba(255,255,255,0.2)", style: { marginLeft: 8, width: 140 } }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: setGift2Transparent, style: { marginLeft: 8, padding: '2px 10px', borderRadius: 4, background: '#444', color: '#fff', border: 'none', cursor: 'pointer' }, children: "Transparent" })] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.showBottomText, onChange: e => setTempSettings(s => ({ ...s, showBottomText: e.target.checked })), style: { marginRight: 8 } }), "Show Bottom Text"] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Team Left Text", (0, jsx_runtime_1.jsx)("input", { type: "text", value: tempSettings.teamLeftText, onChange: e => setTempSettings(s => ({ ...s, teamLeftText: e.target.value })), style: { marginLeft: 8 } })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Team Right Text", (0, jsx_runtime_1.jsx)("input", { type: "text", value: tempSettings.teamRightText, onChange: e => setTempSettings(s => ({ ...s, teamRightText: e.target.value })), style: { marginLeft: 8 } })] })] }) }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: handleCancelCustomize, style: { padding: '8px 24px', borderRadius: 4, background: '#444', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }, children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleSaveCustomize, style: { padding: '8px 24px', borderRadius: 4, background: '#3a8dde', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }, children: "Apply" })] })] }) }))] }));
};
exports.GiftVsGiftOverlay = GiftVsGiftOverlay;
exports.default = exports.GiftVsGiftOverlay;
