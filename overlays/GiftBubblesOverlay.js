"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftBubblesOverlay = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const availableGifts_generated_1 = require("../availableGifts.generated");
const defaultSettings = {
    maxBubbles: 8,
    bubbleSpeed: 15,
    enableSound: true,
    enableCombo: true,
    enableTrails: true,
    enableClusters: true,
    enableReflections: true,
    bubbleSize: 'auto',
    fixedBubbleSize: 100,
    enableRainbow: true,
    enableWobble: true,
    enableShine: true,
};
const GiftBubblesOverlay = ({ editor = false, actions = [], triggerAction, refreshTrigger }) => {
    const [settings, setSettings] = (0, react_1.useState)(defaultSettings);
    const [tempSettings, setTempSettings] = (0, react_1.useState)(settings);
    const [showCustomize, setShowCustomize] = (0, react_1.useState)(false);
    const [isEnabled, setIsEnabled] = (0, react_1.useState)(true);
    // Load settings from localStorage
    (0, react_1.useEffect)(() => {
        try {
            const saved = localStorage.getItem('gift_bubbles_config');
            if (saved) {
                const config = JSON.parse(saved);
                setSettings(config);
                setTempSettings(config);
            }
        }
        catch (e) {
            console.error('Failed to load gift bubbles config:', e);
        }
    }, []);
    // Check if overlay server is available
    const checkServerHealth = async () => {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000);
            try {
                const response = await fetch('http://localhost:3002/api/gift-bubbles', {
                    method: 'GET',
                    signal: controller.signal,
                });
                return response.ok;
            }
            finally {
                clearTimeout(id);
            }
        }
        catch (e) {
            return false;
        }
    };
    // Save settings to localStorage
    (0, react_1.useEffect)(() => {
        if (!editor)
            return;
        const timeout = setTimeout(async () => {
            localStorage.setItem('gift_bubbles_config', JSON.stringify(settings));
            // Check if server is available before sending
            const serverAvailable = await checkServerHealth();
            if (!serverAvailable) {
                console.warn('[GiftBubbles] Overlay server not available. Settings saved locally only.');
                return;
            }
            // Send to overlay server with better error handling
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000);
            fetch('http://localhost:3002/api/gift-bubbles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
                signal: controller.signal,
            })
                .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
                .then(data => {
                console.log('[GiftBubbles] Settings saved successfully:', data);
            })
                .catch(e => {
                console.error('[GiftBubbles] Failed to send gift bubbles config:', e);
                // Check if it's a network error (server not running)
                if (e.name === 'AbortError') {
                    console.warn('[GiftBubbles] Request timed out');
                }
                else if (e.name === 'TypeError' && e.message.includes('fetch')) {
                    console.warn('[GiftBubbles] Overlay server may not be running. Settings saved locally only.');
                }
                // Don't show error to user as this is a background operation
            })
                .finally(() => {
                clearTimeout(id);
            });
            // Send settings update to overlay if it's open
            if (window.opener) {
                window.opener.postMessage({
                    type: 'settings-update',
                    settings: settings
                }, '*');
            }
        }, 400);
        return () => clearTimeout(timeout);
    }, [settings, editor]);
    // Refresh configuration when actions are deleted
    (0, react_1.useEffect)(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            // Reload configuration from localStorage to get updated action references
            try {
                const saved = localStorage.getItem('gift_bubbles_config');
                if (saved) {
                    const config = JSON.parse(saved);
                    setSettings(config);
                    setTempSettings(config);
                }
            }
            catch (e) {
                console.error('Failed to refresh gift bubbles config:', e);
            }
        }
    }, [refreshTrigger]);
    const handleSaveSettings = () => {
        setSettings(tempSettings);
        setShowCustomize(false);
    };
    const handleResetSettings = () => {
        setTempSettings(defaultSettings);
    };
    const handleCancelSettings = () => {
        setTempSettings(settings);
        setShowCustomize(false);
    };
    const toggleOverlay = () => {
        const newEnabled = !isEnabled;
        setIsEnabled(newEnabled);
        // Send toggle to overlay server
        fetch('http://localhost:3002/api/gift-bubbles/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: newEnabled }),
        })
            .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
            .then(data => {
            console.log('[GiftBubbles] Toggle successful:', data);
        })
            .catch(e => {
            console.error('[GiftBubbles] Failed to toggle gift bubbles:', e);
        });
        // Send toggle message to overlay if it's open
        if (window.opener) {
            window.opener.postMessage({
                type: 'overlay-toggle',
                enabled: newEnabled
            }, '*');
        }
    };
    if (!editor) {
        return ((0, jsx_runtime_1.jsx)("div", { style: {
                width: '100vw',
                height: '100vh',
                background: 'transparent',
                overflow: 'hidden',
                position: 'fixed',
                top: 0,
                left: 0,
                pointerEvents: 'none'
            }, children: (0, jsx_runtime_1.jsx)("div", { id: "gift-bubbles-overlay-container" }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            background: '#23262f',
            borderRadius: 8,
            padding: 24,
            boxShadow: '0 2px 8px #0002',
            marginTop: 24
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16
                }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { color: '#7fff7f', margin: 0 }, children: "Gift Bubbles Overlay" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)("button", { style: {
                                    background: isEnabled ? '#4CAF50' : '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '8px 16px',
                                    cursor: 'pointer',
                                    fontSize: 14
                                }, onClick: toggleOverlay, children: isEnabled ? 'Enabled' : 'Disabled' }), (0, jsx_runtime_1.jsx)("button", { style: {
                                    background: '#23262f',
                                    color: '#7fff7f',
                                    border: '1px solid #444',
                                    borderRadius: 4,
                                    padding: '8px 16px',
                                    cursor: 'pointer',
                                    fontSize: 14
                                }, onClick: () => setShowCustomize(!showCustomize), children: showCustomize ? 'Hide Settings' : 'Customize' })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                            background: '#1a1d23',
                            color: '#7fff7f',
                            padding: '8px 12px',
                            borderRadius: 4,
                            fontFamily: 'monospace',
                            fontSize: 14,
                            border: '1px solid #444'
                        }, children: "http://localhost:3002/gift-bubbles-overlay.html" }), (0, jsx_runtime_1.jsx)("button", { style: {
                            background: '#23262f',
                            color: '#7fff7f',
                            border: '1px solid #444',
                            borderRadius: 4,
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontSize: 14
                        }, onClick: () => {
                            navigator.clipboard.writeText('http://localhost:3002/gift-bubbles-overlay.html');
                            // You could add a toast notification here
                        }, title: "Copy URL", children: "Copy URL" })] }), (0, jsx_runtime_1.jsx)("p", { style: { color: '#b6ffb6', marginBottom: 16 }, children: "Beautiful animated gift bubbles that float to the top and pop with realistic effects. Each gift creates a unique bubble based on its value and type." }), showCustomize && ((0, jsx_runtime_1.jsxs)("div", { style: {
                    background: '#1a1d23',
                    borderRadius: 8,
                    padding: 20,
                    marginTop: 16,
                    border: '1px solid #444'
                }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: '#7fff7f', marginTop: 0, marginBottom: 16 }, children: "Bubble Settings" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'block', marginBottom: 4 }, children: ["Max Bubbles: ", tempSettings.maxBubbles] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "3", max: "15", value: tempSettings.maxBubbles, onChange: (e) => setTempSettings(prev => ({ ...prev, maxBubbles: parseInt(e.target.value) })), style: { width: '100%' } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'block', marginBottom: 4 }, children: ["Bubble Speed: ", tempSettings.bubbleSpeed, "s"] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "10", max: "25", value: tempSettings.bubbleSpeed, onChange: (e) => setTempSettings(prev => ({ ...prev, bubbleSpeed: parseInt(e.target.value) })), style: { width: '100%' } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { color: '#b6ffb6', display: 'block', marginBottom: 4 }, children: "Bubble Size" }), (0, jsx_runtime_1.jsxs)("select", { value: tempSettings.bubbleSize, onChange: (e) => setTempSettings(prev => ({ ...prev, bubbleSize: e.target.value })), style: {
                                                    width: '100%',
                                                    padding: '8px',
                                                    background: '#23262f',
                                                    color: '#7fff7f',
                                                    border: '1px solid #444',
                                                    borderRadius: 4
                                                }, children: [(0, jsx_runtime_1.jsx)("option", { value: "auto", children: "Auto (Based on Gift Value)" }), (0, jsx_runtime_1.jsx)("option", { value: "fixed", children: "Fixed Size" })] })] }), tempSettings.bubbleSize === 'fixed' && ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'block', marginBottom: 4 }, children: ["Fixed Size: ", tempSettings.fixedBubbleSize, "px"] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "60", max: "300", value: tempSettings.fixedBubbleSize, onChange: (e) => setTempSettings(prev => ({ ...prev, fixedBubbleSize: parseInt(e.target.value) })), style: { width: '100%' } })] }))] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.enableSound, onChange: (e) => setTempSettings(prev => ({ ...prev, enableSound: e.target.checked })) }), "Enable Sound Effects"] }) }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.enableCombo, onChange: (e) => setTempSettings(prev => ({ ...prev, enableCombo: e.target.checked })) }), "Enable Combo Bubbles"] }) }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.enableTrails, onChange: (e) => setTempSettings(prev => ({ ...prev, enableTrails: e.target.checked })) }), "Enable Bubble Trails"] }) }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.enableClusters, onChange: (e) => setTempSettings(prev => ({ ...prev, enableClusters: e.target.checked })) }), "Enable Bubble Clusters"] }) }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.enableReflections, onChange: (e) => setTempSettings(prev => ({ ...prev, enableReflections: e.target.checked })) }), "Enable Reflections"] }) }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.enableRainbow, onChange: (e) => setTempSettings(prev => ({ ...prev, enableRainbow: e.target.checked })) }), "Enable Rainbow Effect"] }) }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.enableWobble, onChange: (e) => setTempSettings(prev => ({ ...prev, enableWobble: e.target.checked })) }), "Enable Wobble Animation"] }) }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.enableShine, onChange: (e) => setTempSettings(prev => ({ ...prev, enableShine: e.target.checked })) }), "Enable Shine Effects"] }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }, children: [(0, jsx_runtime_1.jsx)("button", { style: {
                                    background: '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '8px 16px',
                                    cursor: 'pointer',
                                    fontSize: 14
                                }, onClick: handleResetSettings, children: "Reset to Default" }), (0, jsx_runtime_1.jsx)("button", { style: {
                                    background: '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '8px 16px',
                                    cursor: 'pointer',
                                    fontSize: 14
                                }, onClick: handleCancelSettings, children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { style: {
                                    background: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '8px 16px',
                                    cursor: 'pointer',
                                    fontSize: 14
                                }, onClick: handleSaveSettings, children: "Save Settings" })] })] })), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 16 }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: '#7fff7f', marginBottom: 12 }, children: "Preview" }), (0, jsx_runtime_1.jsxs)("div", { style: {
                            background: '#1a1d23',
                            borderRadius: 8,
                            padding: 20,
                            border: '1px solid #444',
                            textAlign: 'center'
                        }, children: [(0, jsx_runtime_1.jsx)("p", { style: { color: '#b6ffb6', margin: '0 0 16px 0' }, children: "Gift bubbles will automatically appear when viewers send gifts during your live stream." }), (0, jsx_runtime_1.jsx)("div", { style: {
                                    display: 'flex',
                                    gap: 16,
                                    justifyContent: 'center',
                                    flexWrap: 'wrap'
                                }, children: availableGifts_generated_1.availableGifts.slice(0, 6).map((gift, index) => ((0, jsx_runtime_1.jsxs)("div", { style: {
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '50%',
                                        width: '80px',
                                        height: '80px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                                fontSize: '20px',
                                                marginBottom: '2px',
                                                lineHeight: '1'
                                            }, children: gift.name === 'Go Popular' ? '🔥' :
                                                gift.name === 'Pegasus' ? '🦄' :
                                                    gift.name === 'Fire Phoenix' ? '🦅' :
                                                        gift.name === 'Thunder Falcon' ? '⚡' :
                                                            gift.name === 'TikTok Universe' ? '🌌' :
                                                                gift.name === 'Infinite +Heart' ? '💖' : '🎁' }), (0, jsx_runtime_1.jsx)("div", { style: {
                                                fontSize: '10px',
                                                lineHeight: '1.1',
                                                textAlign: 'center',
                                                color: '#fff',
                                                fontWeight: 'bold',
                                                maxWidth: '70px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                                            }, children: gift.name.length > 8 ? gift.name.substring(0, 8) + '...' : gift.name })] }, index))) }), (0, jsx_runtime_1.jsx)("p", { style: { color: '#888', fontSize: '12px', margin: '16px 0 0 0' }, children: "Each gift creates a unique bubble with size, effects, and animations based on its value" })] })] })] }));
};
exports.GiftBubblesOverlay = GiftBubblesOverlay;
exports.default = exports.GiftBubblesOverlay;
