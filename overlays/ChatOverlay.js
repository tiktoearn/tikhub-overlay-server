"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatOverlay = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const defaultSettings = {
    showAvatars: true,
    showBadges: true,
    showTimestamps: true,
    oneLine: false,
    chatThreshold: 50,
    hideAfter: 0,
    fontSize: 18,
    fontFamily: 'DM Sans',
    messageOpacity: 100,
    backgroundColor: 'transparent',
    backgroundOpacity: 0,
};
const ChatOverlay = ({ editor = false, actions = [], triggerAction, refreshTrigger }) => {
    const [settings, setSettings] = (0, react_1.useState)(defaultSettings);
    const [tempSettings, setTempSettings] = (0, react_1.useState)(settings);
    const [showCustomize, setShowCustomize] = (0, react_1.useState)(false);
    const [isEnabled, setIsEnabled] = (0, react_1.useState)(true);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    // Load settings from localStorage
    (0, react_1.useEffect)(() => {
        try {
            const saved = localStorage.getItem('chat_overlay_config');
            if (saved) {
                const config = JSON.parse(saved);
                setSettings(config);
                setTempSettings(config);
            }
        }
        catch (e) {
            console.error('Failed to load chat overlay config:', e);
        }
    }, []);
    // Save settings to localStorage (like other overlays)
    (0, react_1.useEffect)(() => {
        if (!editor)
            return;
        localStorage.setItem('chat_overlay_config', JSON.stringify(settings));
        // Try to send to server but don't fail if server is not running (like Goal Overlays)
        fetch('http://localhost:3002/api/chat-overlay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        }).catch(err => {
            // Gracefully handle server not running - settings saved locally
            console.log('[ChatOverlay] Settings saved locally (server not available)');
        });
        // Send settings update to overlay if it's open (for real-time updates)
        if (window.opener) {
            window.opener.postMessage({
                type: 'settings-update',
                settings: settings
            }, '*');
        }
        // Also broadcast to all windows (in case overlay is in different window)
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'settings-update',
                settings: settings
            }, '*');
        }
    }, [settings, editor]);
    // Refresh configuration when actions are deleted
    (0, react_1.useEffect)(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            // Reload configuration from localStorage to get updated action references
            try {
                const saved = localStorage.getItem('chat_overlay_config');
                if (saved) {
                    const config = JSON.parse(saved);
                    setSettings(config);
                    setTempSettings(config);
                }
            }
            catch (e) {
                console.error('Failed to refresh chat overlay config:', e);
            }
        }
    }, [refreshTrigger]);
    const handleSaveSettings = () => {
        setSettings(tempSettings);
        setShowCustomize(false);
    };
    // Send real-time preview updates to browser overlay
    (0, react_1.useEffect)(() => {
        if (!editor)
            return;
        const timeout = setTimeout(() => {
            // Send settings to server (like other overlays do)
            fetch('http://localhost:3002/api/chat-overlay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: tempSettings }),
            }).catch(err => {
                // Gracefully handle server not running
                console.log('[ChatOverlay] Settings saved locally (server not available)');
            });
            // Send settings update to overlay if it's open (primary method)
            if (window.opener) {
                window.opener.postMessage({
                    type: 'chat-overlay-settings-update',
                    settings: tempSettings
                }, '*');
                console.log('=== TIKHUB SENDING SETTINGS VIA POSTMESSAGE ===');
                console.log('Sent to window.opener:', tempSettings);
            }
            // For real browser overlay (separate window), use localStorage as backup
            // The browser overlay polls localStorage every 500ms for changes
            try {
                // Save temp settings to localStorage - this is the BACKUP communication method
                localStorage.setItem('chat_overlay_temp_config', JSON.stringify(tempSettings));
                // Also save to main config for permanent settings when saved
                if (JSON.stringify(tempSettings) === JSON.stringify(settings)) {
                    localStorage.setItem('chat_overlay_config', JSON.stringify(tempSettings));
                }
                console.log('=== TIKHUB SENDING SETTINGS TO REAL OVERLAY ===');
                console.log('Saved to localStorage:', tempSettings);
                console.log('Settings saved to chat_overlay_temp_config');
            }
            catch (error) {
                console.error('Error saving settings to localStorage:', error);
            }
        }, 400);
        return () => clearTimeout(timeout);
    }, [tempSettings, editor]);
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
        // Try to send toggle to server but don't fail if server is not running
        fetch('http://localhost:3002/api/chat-overlay/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: newEnabled }),
        }).catch(err => {
            // Gracefully handle server not running
            console.log('[ChatOverlay] Toggle saved locally (server not available)');
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
            }, children: (0, jsx_runtime_1.jsx)("div", { id: "chat-overlay-container" }) }));
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
                }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { color: '#7fff7f', margin: 0 }, children: "TikTok Chat Overlay" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: isConnected ? '#4CAF50' : '#f44336',
                                    marginRight: 8
                                } }), (0, jsx_runtime_1.jsx)("button", { style: {
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
                                }, onClick: () => setShowCustomize(!showCustomize), children: "Customize" })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                            background: '#1a1d23',
                            color: '#7fff7f',
                            padding: '8px 12px',
                            borderRadius: 4,
                            fontFamily: 'monospace',
                            fontSize: 14,
                            border: '1px solid #444'
                        }, children: "http://localhost:3002/chat-overlay.html" }), (0, jsx_runtime_1.jsx)("button", { style: {
                            background: '#23262f',
                            color: '#7fff7f',
                            border: '1px solid #444',
                            borderRadius: 4,
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontSize: 14
                        }, onClick: () => {
                            navigator.clipboard.writeText('http://localhost:3002/chat-overlay.html');
                        }, title: "Copy URL", children: "Copy URL" })] }), showCustomize && ((0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }, onClick: () => setShowCustomize(false), children: (0, jsx_runtime_1.jsxs)("div", { style: {
                        background: '#1a1d23',
                        borderRadius: 12,
                        padding: 24,
                        border: '1px solid #444',
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                    }, onClick: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { color: '#7fff7f', margin: 0 }, children: "Chat Overlay Settings" }), (0, jsx_runtime_1.jsx)("button", { style: {
                                        background: 'transparent',
                                        color: '#888',
                                        border: 'none',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        padding: '0',
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }, onClick: () => setShowCustomize(false), children: "\u00D7" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'block', marginBottom: 4 }, children: ["Font Size: ", tempSettings.fontSize, "px"] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "12", max: "32", value: tempSettings.fontSize, onChange: (e) => setTempSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) })), style: { width: '100%' } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'block', marginBottom: 4 }, children: ["Message Opacity: ", tempSettings.messageOpacity, "%"] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "50", max: "100", value: tempSettings.messageOpacity, onChange: (e) => setTempSettings(prev => ({ ...prev, messageOpacity: parseInt(e.target.value) })), style: { width: '100%' } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { color: '#b6ffb6', display: 'block', marginBottom: 4 }, children: "Font Family" }), (0, jsx_runtime_1.jsxs)("select", { value: tempSettings.fontFamily, onChange: (e) => setTempSettings(prev => ({ ...prev, fontFamily: e.target.value })), style: {
                                                        width: '100%',
                                                        padding: '8px',
                                                        background: '#23262f',
                                                        color: '#7fff7f',
                                                        border: '1px solid #444',
                                                        borderRadius: 4
                                                    }, children: [(0, jsx_runtime_1.jsx)("option", { value: "DM Sans", children: "DM Sans" }), (0, jsx_runtime_1.jsx)("option", { value: "Arial", children: "Arial" }), (0, jsx_runtime_1.jsx)("option", { value: "Helvetica", children: "Helvetica" }), (0, jsx_runtime_1.jsx)("option", { value: "Georgia", children: "Georgia" }), (0, jsx_runtime_1.jsx)("option", { value: "Times New Roman", children: "Times New Roman" })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'block', marginBottom: 4 }, children: ["Chat Threshold: ", tempSettings.chatThreshold] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "20", max: "100", value: tempSettings.chatThreshold, onChange: (e) => setTempSettings(prev => ({ ...prev, chatThreshold: parseInt(e.target.value) })), style: { width: '100%' } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { color: '#b6ffb6', display: 'block', marginBottom: 4 }, children: "Background Color" }), (0, jsx_runtime_1.jsx)("input", { type: "color", value: tempSettings.backgroundColor === 'transparent' ? '#000000' : tempSettings.backgroundColor, onChange: (e) => setTempSettings(prev => ({ ...prev, backgroundColor: e.target.value })), style: {
                                                        width: '100%',
                                                        height: '40px',
                                                        border: '1px solid #444',
                                                        borderRadius: '4px',
                                                        background: '#23262f'
                                                    } }), (0, jsx_runtime_1.jsx)("button", { style: {
                                                        width: '100%',
                                                        marginTop: '8px',
                                                        padding: '6px',
                                                        background: '#23262f',
                                                        color: '#b6ffb6',
                                                        border: '1px solid #444',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px'
                                                    }, onClick: () => setTempSettings(prev => ({ ...prev, backgroundColor: 'transparent' })), children: "Transparent" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'block', marginBottom: 4 }, children: ["Background Opacity: ", tempSettings.backgroundOpacity, "%"] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "0", max: "100", value: tempSettings.backgroundOpacity, onChange: (e) => setTempSettings(prev => ({ ...prev, backgroundOpacity: parseInt(e.target.value) })), style: { width: '100%' } })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.showAvatars, onChange: (e) => setTempSettings(prev => ({ ...prev, showAvatars: e.target.checked })) }), "Show Avatars"] }) }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.showBadges, onChange: (e) => setTempSettings(prev => ({ ...prev, showBadges: e.target.checked })) }), "Show Badges"] }) }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.showTimestamps, onChange: (e) => setTempSettings(prev => ({ ...prev, showTimestamps: e.target.checked })) }), "Show Timestamps"] }) }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("label", { style: { color: '#b6ffb6', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: tempSettings.oneLine, onChange: (e) => setTempSettings(prev => ({ ...prev, oneLine: e.target.checked })) }), "One Line Display"] }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }, children: [(0, jsx_runtime_1.jsx)("button", { style: {
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
                                    }, onClick: handleSaveSettings, children: "Save Settings" })] })] }) })), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 16 }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: '#7fff7f', marginBottom: 12 }, children: "Preview" }), (0, jsx_runtime_1.jsxs)("div", { style: {
                            background: tempSettings.backgroundColor === 'transparent'
                                ? `rgba(0, 0, 0, ${tempSettings.backgroundOpacity / 100})`
                                : tempSettings.backgroundColor,
                            borderRadius: 0,
                            padding: '10px',
                            border: '1px solid #444',
                            minHeight: '200px',
                            fontFamily: tempSettings.fontFamily,
                            fontSize: tempSettings.fontSize,
                            color: '#ffffff',
                            position: 'relative',
                            overflow: 'hidden'
                        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                    display: 'flex',
                                    flexDirection: 'column-reverse',
                                    height: '180px',
                                    overflow: 'hidden'
                                }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                            margin: '2px 0',
                                            opacity: tempSettings.messageOpacity / 100,
                                            position: 'relative',
                                            color: '#FFF',
                                            lineHeight: '150%',
                                            textShadow: '2px 2px 5px rgba(0,0,0,0.75)',
                                            transition: 'all ease-in-out 300ms'
                                        }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                                                display: tempSettings.oneLine ? 'flex' : 'block',
                                                alignItems: tempSettings.oneLine ? 'center' : 'stretch',
                                                gap: tempSettings.oneLine ? '5px' : '0',
                                                whiteSpace: tempSettings.oneLine ? 'nowrap' : 'normal'
                                            }, children: [tempSettings.showTimestamps && ((0, jsx_runtime_1.jsx)("span", { style: {
                                                        opacity: 0.7,
                                                        fontSize: '14px',
                                                        marginRight: '8px',
                                                        display: 'inline'
                                                    }, children: "23:31" })), tempSettings.showAvatars && ((0, jsx_runtime_1.jsx)("span", { style: {
                                                        display: 'inline-block',
                                                        marginRight: '8px',
                                                        verticalAlign: 'middle'
                                                    }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                            color: 'white'
                                                        }, children: "CV" }) })), tempSettings.showBadges && ((0, jsx_runtime_1.jsx)("span", { style: {
                                                        display: 'inline',
                                                        marginRight: '4px'
                                                    }, children: (0, jsx_runtime_1.jsx)("span", { style: {
                                                            background: 'rgba(255, 215, 0, 0.8)',
                                                            color: '#000',
                                                            padding: '2px 6px',
                                                            borderRadius: '10px',
                                                            fontSize: '10px',
                                                            fontWeight: 'bold',
                                                            marginRight: '4px'
                                                        }, children: "VIP" }) })), (0, jsx_runtime_1.jsx)("span", { style: {
                                                        color: '#ff6b6b',
                                                        fontWeight: 'bold',
                                                        marginRight: '8px'
                                                    }, children: "CoolViewer123" }), (0, jsx_runtime_1.jsx)("span", { children: "Hello! This is amazing! \uD83D\uDD25" })] }) }), (0, jsx_runtime_1.jsx)("div", { style: {
                                            margin: '2px 0',
                                            opacity: tempSettings.messageOpacity / 100,
                                            position: 'relative',
                                            color: '#FFF',
                                            lineHeight: '150%',
                                            textShadow: '2px 2px 5px rgba(0,0,0,0.75)',
                                            transition: 'all ease-in-out 300ms'
                                        }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                                                display: tempSettings.oneLine ? 'flex' : 'block',
                                                alignItems: tempSettings.oneLine ? 'center' : 'stretch',
                                                gap: tempSettings.oneLine ? '5px' : '0',
                                                whiteSpace: tempSettings.oneLine ? 'nowrap' : 'normal'
                                            }, children: [tempSettings.showTimestamps && ((0, jsx_runtime_1.jsx)("span", { style: {
                                                        opacity: 0.7,
                                                        fontSize: '14px',
                                                        marginRight: '8px',
                                                        display: 'inline'
                                                    }, children: "23:32" })), tempSettings.showAvatars && ((0, jsx_runtime_1.jsx)("span", { style: {
                                                        display: 'inline-block',
                                                        marginRight: '8px',
                                                        verticalAlign: 'middle'
                                                    }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(45deg, #667eea, #764ba2)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                            color: 'white'
                                                        }, children: "TG" }) })), (0, jsx_runtime_1.jsx)("span", { style: {
                                                        color: '#667eea',
                                                        fontWeight: 'bold',
                                                        marginRight: '8px'
                                                    }, children: "TopGifter" }), (0, jsx_runtime_1.jsx)("span", { children: "Great stream! Love the content! \uD83C\uDF89" })] }) }), (0, jsx_runtime_1.jsx)("div", { style: {
                                            margin: '2px 0',
                                            opacity: tempSettings.messageOpacity / 100,
                                            position: 'relative',
                                            color: '#FFF',
                                            lineHeight: '150%',
                                            textShadow: '2px 2px 5px rgba(0,0,0,0.75)',
                                            transition: 'all ease-in-out 300ms'
                                        }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                                                display: tempSettings.oneLine ? 'flex' : 'block',
                                                alignItems: tempSettings.oneLine ? 'center' : 'stretch',
                                                gap: tempSettings.oneLine ? '5px' : '0',
                                                whiteSpace: tempSettings.oneLine ? 'nowrap' : 'normal'
                                            }, children: [tempSettings.showTimestamps && ((0, jsx_runtime_1.jsx)("span", { style: {
                                                        opacity: 0.7,
                                                        fontSize: '14px',
                                                        marginRight: '8px',
                                                        display: 'inline'
                                                    }, children: "23:33" })), tempSettings.showAvatars && ((0, jsx_runtime_1.jsx)("span", { style: {
                                                        display: 'inline-block',
                                                        marginRight: '8px',
                                                        verticalAlign: 'middle'
                                                    }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(45deg, #f093fb, #f5576c)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                            color: 'white'
                                                        }, children: "AS" }) })), (0, jsx_runtime_1.jsx)("span", { style: {
                                                        color: '#f093fb',
                                                        fontWeight: 'bold',
                                                        marginRight: '8px'
                                                    }, children: "AwesomeSub" }), (0, jsx_runtime_1.jsx)("span", { children: "This is so entertaining! Keep it up! \uD83D\uDC4F" })] }) }), (0, jsx_runtime_1.jsx)("div", { style: {
                                            margin: '5px 0',
                                            opacity: tempSettings.messageOpacity / 100,
                                            position: 'relative',
                                            color: '#FFF',
                                            lineHeight: '150%',
                                            textShadow: '2px 2px 5px rgba(0,0,0,0.75)',
                                            transition: 'all ease-in-out 300ms'
                                        }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                                                display: tempSettings.oneLine ? 'flex' : 'block',
                                                alignItems: tempSettings.oneLine ? 'center' : 'stretch',
                                                gap: tempSettings.oneLine ? '5px' : '0',
                                                whiteSpace: tempSettings.oneLine ? 'nowrap' : 'normal'
                                            }, children: [tempSettings.showTimestamps && ((0, jsx_runtime_1.jsx)("span", { style: {
                                                        opacity: 0.7,
                                                        fontSize: '14px',
                                                        marginRight: '8px',
                                                        display: 'inline'
                                                    }, children: "23:34" })), tempSettings.showAvatars && ((0, jsx_runtime_1.jsx)("span", { style: {
                                                        display: 'inline-block',
                                                        marginRight: '8px',
                                                        verticalAlign: 'middle'
                                                    }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(45deg, #4facfe, #00f2fe)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                            color: 'white'
                                                        }, children: "VF" }) })), (0, jsx_runtime_1.jsx)("span", { style: {
                                                        color: '#4facfe',
                                                        fontWeight: 'bold',
                                                        marginRight: '8px'
                                                    }, children: "ViewerFan" }), (0, jsx_runtime_1.jsx)("span", { children: "First time watching, this is amazing! \uD83D\uDCAF" })] }) }), (0, jsx_runtime_1.jsx)("div", { style: {
                                            margin: '5px 0',
                                            opacity: tempSettings.messageOpacity / 100,
                                            position: 'relative',
                                            color: '#FFF',
                                            lineHeight: '150%',
                                            textShadow: '2px 2px 5px rgba(0,0,0,0.75)',
                                            transition: 'all ease-in-out 300ms'
                                        }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                                                display: tempSettings.oneLine ? 'flex' : 'block',
                                                alignItems: tempSettings.oneLine ? 'center' : 'stretch',
                                                gap: tempSettings.oneLine ? '5px' : '0',
                                                whiteSpace: tempSettings.oneLine ? 'nowrap' : 'normal'
                                            }, children: [tempSettings.showTimestamps && ((0, jsx_runtime_1.jsx)("span", { style: {
                                                        opacity: 0.7,
                                                        fontSize: '14px',
                                                        marginRight: '8px',
                                                        display: 'inline'
                                                    }, children: "23:35" })), tempSettings.showAvatars && ((0, jsx_runtime_1.jsx)("span", { style: {
                                                        display: 'inline-block',
                                                        marginRight: '8px',
                                                        verticalAlign: 'middle'
                                                    }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(45deg, #43e97b, #38f9d7)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                            color: 'white'
                                                        }, children: "CS" }) })), (0, jsx_runtime_1.jsx)("span", { style: {
                                                        color: '#43e97b',
                                                        fontWeight: 'bold',
                                                        marginRight: '8px'
                                                    }, children: "ChatSupporter" }), (0, jsx_runtime_1.jsx)("span", { children: "Can't wait for the next stream! \u2B50" })] }) })] }), (0, jsx_runtime_1.jsx)("p", { style: {
                                    color: '#888',
                                    fontSize: '12px',
                                    margin: '16px 0 0 0',
                                    position: 'absolute',
                                    bottom: '5px',
                                    left: '10px'
                                }, children: "Live preview - settings apply in real-time" })] })] })] }));
};
exports.ChatOverlay = ChatOverlay;
exports.default = exports.ChatOverlay;
