// TikHub Overlay Server - Render.com
// Hosts OBS overlays and provides real-time WebSocket updates from TikHub

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3003;

// WebSocket Server
const wss = new WebSocket.Server({ server });

// In-memory storage
const storage = {
    // WebSocket clients organized by overlay type
    clients: {
        giftBubbles: new Set(),
        luckyWheel: new Set(),
        luckyWheel2: new Set(),
        songRequest: new Set(),
        likeGoal: new Set(),
        followGoal: new Set(),
        timer: new Set(),
        chat: new Set(),
        winGoal: new Set(),
        topGift: new Set(),
        topStreak: new Set(),
        giftVsGift: new Set(),
        // New: Minigame rectangle overlay (triggers grid)
        minigameRect: new Set()
    },
    
    // Current state for each overlay type
    state: {
        actions: [],
        luckyWheel: null,
        luckyWheel2: null,
        songRequests: [],
        currentTrack: null,
        spotifyQueue: [],
        likeGoal: { current: 0, goal: 100 },
        followGoal: { current: 0, goal: 50 },
        winGoal: { current: 0, total: 5, style: null },
        timer: { remaining: 0, isRunning: false },
        topGift: { topGifter: null, gifts: [] },
        topStreak: { topStreaker: null, streaks: [] },
        topGiftSettings: {
            fontFamily: 'Comic Sans MS',
            fontSize: 22,
            fontLineSpacing: 1.2,
            fontLetterSpacing: 0,
            title: 'TOP GIFT',
            titleSize: 18,
            titleColor: '#ffffff',
            usernameColor: '#ffffff',
            usernameSize: 32,
            counterColor: '#ffd700',
            titleVerticalOffset: 20,
            giftVerticalOffset: 50,
            usernameVerticalOffset: 125,
            counterVerticalOffset: 165,
            enableFontBorder: true,
            borderColor: '#242424',
            giftImageVisible: true,
            giftImageOpacity: 100
        },
        topStreakSettings: {
            fontFamily: 'Comic Sans MS',
            fontSize: 22,
            fontLineSpacing: 1.2,
            fontLetterSpacing: 0,
            title: 'TOP STREAK',
            titleSize: 18,
            titleColor: '#ffffff',
            usernameColor: '#ffffff',
            usernameSize: 32,
            counterColor: '#ffd700',
            titleVerticalOffset: 20,
            giftVerticalOffset: 50,
            usernameVerticalOffset: 125,
            counterVerticalOffset: 165,
            enableFontBorder: true,
            borderColor: '#242424',
            giftImageVisible: true,
            giftImageOpacity: 100
        },
        giftVsGift: { team1: { name: 'Team 1', score: 0 }, team2: { name: 'Team 2', score: 0 } },
        chatOverlaySettings: null,
        // New: current state for minigame rectangle overlay
        minigameRect: { triggers: [], config: null }
    },
    
    // Session management
    sessions: new Map() // sessionId -> session data
};

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Session-Token', 'X-Auth-Type']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'overlays')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Health check
app.get('/ping', (req, res) => {
    res.json({
        success: true,
        message: "TikHub Overlay Server is running on Render.com",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        platform: "Render.com",
        activeClients: {
            giftBubbles: storage.clients.giftBubbles.size,
            luckyWheel: storage.clients.luckyWheel.size,
            luckyWheel2: storage.clients.luckyWheel2.size,
            songRequest: storage.clients.songRequest.size,
            likeGoal: storage.clients.likeGoal.size,
            followGoal: storage.clients.followGoal.size,
            timer: storage.clients.timer.size,
            chat: storage.clients.chat.size,
            winGoal: storage.clients.winGoal.size,
            topGift: storage.clients.topGift.size,
            topStreak: storage.clients.topStreak.size,
            giftVsGift: storage.clients.giftVsGift.size
        }
    });
});

// TikHub authentication endpoint
app.post('/tikhub/authenticate', (req, res) => {
    const { appId, secretKey } = req.body;
    
    // Simple authentication (you can enhance this)
    if (appId === 'TikHub-Overlay-Integration') {
        const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        storage.sessions.set(sessionToken, {
            appId,
            createdAt: Date.now(),
            lastActivity: Date.now()
        });
        
        console.log('✅ TikHub authenticated');
        
        return res.json({
            success: true,
            sessionToken,
            message: 'Authenticated successfully'
        });
    }
    
    res.status(401).json({
        success: false,
        error: 'Invalid credentials'
    });
});

// Broadcast event to all clients of a specific type
function broadcast(clientType, data) {
    const clients = storage.clients[clientType];
    if (!clients) return;
    
    const message = JSON.stringify(data);
    let successCount = 0;
    
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
                successCount++;
            } catch (error) {
                console.error(`Failed to send to ${clientType} client:`, error);
            }
        }
    });
    
    console.log(`📡 Broadcast to ${clientType}: ${successCount}/${clients.size} clients`);
}

// Broadcast to all clients
function broadcastAll(data) {
    Object.keys(storage.clients).forEach(clientType => {
        broadcast(clientType, data);
    });
}

// Event endpoints - receive events from TikHub app
app.post('/event/gift', (req, res) => {
    const giftData = req.body;
    console.log('🎁 Received gift event:', giftData);
    
    // Broadcast to gift bubble overlays
    broadcast('giftBubbles', { type: 'gift', giftData });
    
    // Broadcast to Gift vs Gift overlay
    broadcast('giftVsGift', { type: 'gift', ...giftData });
    
    // Broadcast to Top Gift overlay
    broadcast('topGift', { type: 'gift', giftData });
    
    // Broadcast to Top Streak overlay
    broadcast('topStreak', { type: 'gift', giftData });
    
    // Also broadcast to general clients
    broadcastAll({ type: 'tiktok-event', event: { type: 'gift', ...giftData } });
    
    res.json({ success: true, message: 'Gift event broadcasted' });
});

app.post('/event/follow', (req, res) => {
    const followData = req.body;
    console.log('❤️ Received follow event:', followData);
    
    // Update follow goal state
    if (!storage.state.followGoal) {
        storage.state.followGoal = { current: 0, goal: 50 };
    }
    storage.state.followGoal.current = (storage.state.followGoal.current || 0) + 1;
    
    // Broadcast to follow goal overlay with expected format
    broadcast('followGoal', { 
        type: 'update', 
        payload: { 
            type: 'follow',
            count: storage.state.followGoal.current,
            ...followData 
        } 
    });
    
    broadcastAll({ type: 'tiktok-event', event: { type: 'follow', ...followData } });
    
    res.json({ success: true, message: 'Follow event broadcasted' });
});

app.post('/event/like', (req, res) => {
    const likeData = req.body;
    console.log('👍 Received like event:', likeData);
    
    // Update like goal state
    if (!storage.state.likeGoal) {
        storage.state.likeGoal = { current: 0, goal: 100 };
    }
    const likeCount = likeData.likeCount || likeData.count || 1;
    storage.state.likeGoal.current = (storage.state.likeGoal.current || 0) + likeCount;
    
    // Broadcast to like goal overlay with expected format
    broadcast('likeGoal', { 
        type: 'update', 
        payload: { 
            type: 'like',
            count: storage.state.likeGoal.current,
            ...likeData 
        } 
    });
    
    broadcastAll({ type: 'tiktok-event', event: { type: 'like', ...likeData } });
    
    res.json({ success: true, message: 'Like event broadcasted' });
});

app.post('/event/chat', (req, res) => {
    const chatData = req.body;
    console.log('💬 Received chat event:', chatData);
    
    // Broadcast to chat clients with direct format
    broadcast('chat', { type: 'chat', ...chatData });
    
    // Broadcast to all clients with both payload and event formats for compatibility
    broadcastAll({ 
        type: 'tiktok-event', 
        event: { type: 'chat', ...chatData },
        payload: { type: 'chat', ...chatData }
    });
    
    res.json({ success: true, message: 'Chat event broadcasted' });
});

// Alternative endpoint for chat events (compatibility)
app.post('/api/chat-event', (req, res) => {
    const chatData = req.body;
    console.log('💬 [API] Received chat event:', chatData.type || 'unknown');
    
    // Broadcast to chat clients with direct format
    broadcast('chat', { type: 'chat', ...chatData });
    
    // Broadcast to all clients with both payload and event formats for compatibility
    broadcastAll({ 
        type: 'tiktok-event', 
        event: { type: 'chat', ...chatData },
        payload: { type: 'chat', ...chatData }
    });
    
    res.json({ success: true, sentTo: storage.clients.chat.size, message: 'Chat event broadcasted' });
});

// Chat Overlay Settings API
app.post('/api/chat-overlay', (req, res) => {
    const settings = req.body.settings || req.body;
    console.log('⚙️ Received chat overlay settings update:', settings);
    
    // Store settings in state
    storage.state.chatOverlaySettings = settings;
    
    // Broadcast to all connected chat overlay clients
    broadcast('chat', { 
        type: 'chat-overlay-settings-update', 
        settings: settings 
    });
    
    res.json({ 
        success: true, 
        sentTo: storage.clients.chat.size,
        message: 'Chat overlay settings updated and broadcasted' 
    });
});

app.post('/event/share', (req, res) => {
    const shareData = req.body;
    console.log('📤 Received share event:', shareData);
    
    broadcastAll({ type: 'tiktok-event', event: { type: 'share', ...shareData } });
    
    res.json({ success: true, message: 'Share event broadcasted' });
});

app.post('/event/subscribe', (req, res) => {
    const subscribeData = req.body;
    console.log('⭐ Received subscribe event:', subscribeData);
    
    broadcastAll({ type: 'tiktok-event', event: { type: 'subscribe', ...subscribeData } });
    
    res.json({ success: true, message: 'Subscribe event broadcasted' });
});

// Lucky Wheel
app.post('/overlay/luckywheel/config', (req, res) => {
    storage.state.luckyWheel = req.body.config;
    broadcast('luckyWheel', { type: 'wheel-config-update', config: req.body.config });
    res.json({ success: true, message: 'Lucky wheel config updated' });
});

app.post('/overlay/luckywheel/spin', (req, res) => {
    broadcast('luckyWheel', { type: 'wheel-spin', ...req.body });
    res.json({ success: true, message: 'Lucky wheel spin broadcasted' });
});

// Lucky Wheel 2
app.post('/overlay/luckywheel2/config', (req, res) => {
    storage.state.luckyWheel2 = req.body.config;
    broadcast('luckyWheel2', { type: 'wheel2-config-update', config: req.body.config });
    res.json({ success: true, message: 'Lucky wheel 2 config updated' });
});

app.post('/overlay/luckywheel2/spin', (req, res) => {
    broadcast('luckyWheel2', { type: 'wheel2-spin', ...req.body });
    res.json({ success: true, message: 'Lucky wheel 2 spin broadcasted' });
});

// Actions API
app.get('/api/actions', (req, res) => {
    res.json({ 
        success: true, 
        actions: storage.state.actions || [] 
    });
});

app.post('/api/actions', (req, res) => {
    const { actions } = req.body;
    if (Array.isArray(actions)) {
        storage.state.actions = actions;
        res.json({ success: true, message: 'Actions updated' });
    } else {
        res.status(400).json({ success: false, error: 'Actions must be an array' });
    }
});

// Execute action endpoint (browser overlay calls this, but actions are executed in TikHub app)
app.post('/api/execute-action', (req, res) => {
    const { action, actionId } = req.body;
    console.log('🎯 Browser overlay requested action execution:', action?.name || actionId);
    // Browser overlays are display-only. Actions are executed by the TikHub app.
    // This endpoint exists to prevent 404 errors in the browser console.
    res.json({ 
        success: true, 
        message: 'Action execution is handled by TikHub app',
        note: 'Browser overlays are for display only'
    });
});

// Song Requests
app.post('/overlay/songrequest/add', (req, res) => {
    const request = req.body;
    storage.state.songRequests.push(request);
    broadcast('songRequest', { type: 'song_request', request });
    res.json({ success: true, message: 'Song request added' });
});

app.post('/overlay/songrequest/update', (req, res) => {
    const { currentTrack, spotifyQueue } = req.body;
    if (currentTrack) storage.state.currentTrack = currentTrack;
    if (spotifyQueue) storage.state.spotifyQueue = spotifyQueue;
    
    broadcast('songRequest', { 
        type: 'spotify_update', 
        currentTrack: storage.state.currentTrack,
        spotifyQueue: storage.state.spotifyQueue
    });
    
    res.json({ success: true, message: 'Spotify data updated' });
});

// Like Goal
app.post('/overlay/likegoal/update', (req, res) => {
    const config = req.body;
    
    // Merge with existing state to preserve count
    storage.state.likeGoal = {
        ...storage.state.likeGoal,
        ...config,
        current: config.count !== undefined ? config.count : (storage.state.likeGoal?.current || 0)
    };
    
    broadcast('likeGoal', { 
        type: 'update', 
        payload: { 
            type: 'like',
            ...storage.state.likeGoal 
        } 
    });
    
    res.json({ success: true, message: 'Like goal updated' });
});

// Follow Goal
app.post('/overlay/followgoal/update', (req, res) => {
    const config = req.body;
    
    // Merge with existing state to preserve count
    storage.state.followGoal = {
        ...storage.state.followGoal,
        ...config,
        current: config.count !== undefined ? config.count : (storage.state.followGoal?.current || 0)
    };
    
    broadcast('followGoal', { 
        type: 'update', 
        payload: { 
            type: 'follow',
            ...storage.state.followGoal 
        } 
    });
    
    res.json({ success: true, message: 'Follow goal updated' });
});

// Win Goal
app.post('/overlay/wingoal/update', (req, res) => {
    storage.state.winGoal = req.body;
    broadcast('winGoal', { type: 'win-goal-update', ...req.body });
    res.json({ success: true, message: 'Win goal updated' });
});

// Timer
app.post('/overlay/timer/update', (req, res) => {
    storage.state.timer = req.body;
    broadcast('timer', req.body);
    res.json({ success: true, message: 'Timer updated' });
});

// Top Gift
app.post('/overlay/topgift/update', (req, res) => {
    storage.state.topGift = req.body;
    broadcast('topGift', { type: 'top-gift-update', ...req.body });
    res.json({ success: true, message: 'Top gift updated' });
});

// Top Streak
app.post('/overlay/topstreak/update', (req, res) => {
    storage.state.topStreak = req.body;
    broadcast('topStreak', { type: 'top-streak-update', ...req.body });
    res.json({ success: true, message: 'Top streak updated' });
});

// Gift vs Gift
app.post('/overlay/giftvsgift/update', (req, res) => {
    console.log('🎯 [GiftVsGift] Received update:', {
        leftPoints: req.body.leftPoints,
        rightPoints: req.body.rightPoints,
        goal: req.body.goal,
        goalBehavior: req.body.goalBehavior
    });
    storage.state.giftVsGift = req.body;
    broadcast('giftVsGift', { type: 'gift-vs-gift-update', ...req.body });
    console.log(`📡 [GiftVsGift] Broadcasted update to ${storage.clients.giftVsGift.size} clients`);
    res.json({ success: true, message: 'Gift vs gift updated' });
});

// Minigame Rectangle Overlay - triggers grid
app.post('/overlay/minigame-rect/update', (req, res) => {
    const { triggers, config } = req.body || {};
    console.log('🧩 Received minigame rectangle overlay update:', {
        triggerCount: Array.isArray(triggers) ? triggers.length : 0,
        hasConfig: !!config
    });

    storage.state.minigameRect = {
        triggers: Array.isArray(triggers) ? triggers : [],
        config: config || null
    };

    broadcast('minigameRect', {
        type: 'minigame-rect-update',
        triggers: storage.state.minigameRect.triggers,
        config: storage.state.minigameRect.config
    });

    res.json({ success: true, message: 'Minigame rectangle overlay updated' });
});

app.get('/api/giftvsgift', (req, res) => {
    const data = storage.state.giftVsGift || {
        leftPoints: 0,
        rightPoints: 0,
        goal: 500,
        goalBehavior: 'keep',
        actionWinLeft: 'none',
        actionWinRight: 'none'
    };
    console.log('📥 [GiftVsGift] GET request - returning:', {
        leftPoints: data.leftPoints,
        rightPoints: data.rightPoints,
        goal: data.goal
    });
    res.json(data);
});

// Save Gift vs Gift configuration (left/right gifts, settings)
app.post('/api/giftvsgift', (req, res) => {
    console.log('💾 [GiftVsGift] POST /api/giftvsgift - Saving config:', req.body);
    
    // Merge with existing state to preserve counts
    storage.state.giftVsGift = {
        ...storage.state.giftVsGift,
        ...req.body
    };
    
    // Broadcast the config update to all connected overlays
    broadcast('giftVsGift', { type: 'gift-vs-gift-config', ...storage.state.giftVsGift });
    console.log(`📡 [GiftVsGift] Config broadcasted to ${storage.clients.giftVsGift.size} clients`);
    
    res.json({ success: true, message: 'Gift vs gift config saved' });
});

// Top Gift / Top Streak settings APIs
app.get('/api/topgift-settings', (_req, res) => {
    res.json({ success: true, settings: storage.state.topGiftSettings });
});

app.post('/api/topgift-settings', (req, res) => {
    try {
        storage.state.topGiftSettings = { ...storage.state.topGiftSettings, ...req.body };
        broadcast('topGift', { type: 'topgift-settings-update', settings: storage.state.topGiftSettings });
        res.json({ success: true });
    } catch (error) {
        console.error('[Overlay Server] Failed to save top gift settings:', error);
        res.status(500).json({ success: false, error: 'Failed to save settings' });
    }
});

app.get('/api/topstreak-settings', (_req, res) => {
    res.json({ success: true, settings: storage.state.topStreakSettings });
});

app.post('/api/topstreak-settings', (req, res) => {
    try {
        storage.state.topStreakSettings = { ...storage.state.topStreakSettings, ...req.body };
        broadcast('topStreak', { type: 'topstreak-settings-update', settings: storage.state.topStreakSettings });
        res.json({ success: true });
    } catch (error) {
        console.error('[Overlay Server] Failed to save top streak settings:', error);
        res.status(500).json({ success: false, error: 'Failed to save settings' });
    }
});

// Generic event broadcast (for any TikTok event)
app.post('/broadcast-event', (req, res) => {
    const { event, data } = req.body;
    console.log('📢 Broadcasting event:', event, data);
    
    broadcastAll({ type: 'tiktok-event', event: event || data });
    
    res.json({ success: true, message: 'Event broadcasted' });
});

// Get current state (for overlay initialization)
app.get('/state/:overlayType', (req, res) => {
    const { overlayType } = req.params;
    const state = storage.state[overlayType];
    
    res.json({
        success: true,
        state: state || null,
        timestamp: Date.now()
    });
});

// Goal settings endpoint (for like/follow goal overlays)
app.get('/api/goal-settings', (req, res) => {
    res.json({
        success: true,
        likeGoal: storage.state.likeGoal || { current: 0, goal: 100 },
        followGoal: storage.state.followGoal || { current: 0, goal: 50 },
        timestamp: Date.now()
    });
});

// Save goal settings (POST endpoint)
app.post('/api/goal-settings', (req, res) => {
    console.log('📝 [Goal Settings] Saving settings:', req.body);
    
    // Update likeGoal if provided
    if (req.body.likeGoal) {
        storage.state.likeGoal = { ...storage.state.likeGoal, ...req.body.likeGoal };
        broadcast('likeGoal', { type: 'update', payload: storage.state.likeGoal });
    }
    
    // Update followGoal if provided
    if (req.body.followGoal) {
        storage.state.followGoal = { ...storage.state.followGoal, ...req.body.followGoal };
        broadcast('followGoal', { type: 'update', payload: storage.state.followGoal });
    }
    
    console.log('✅ [Goal Settings] Settings saved and broadcasted');
    
    res.json({
        success: true,
        likeGoal: storage.state.likeGoal,
        followGoal: storage.state.followGoal,
        timestamp: Date.now()
    });
});

// Test endpoints for goal overlays
app.post('/api/test/like', (req, res) => {
    const { count = 1 } = req.body;
    console.log(`🧪 Test like event: +${count}`);
    
    // Update like goal
    storage.state.likeGoal.current = Math.min(
        storage.state.likeGoal.current + count,
        storage.state.likeGoal.goal
    );
    
    // Broadcast to overlays
    broadcast('likeGoal', { 
        type: 'like-goal-update', 
        ...storage.state.likeGoal 
    });
    
    res.json({ 
        success: true, 
        current: storage.state.likeGoal.current,
        goal: storage.state.likeGoal.goal
    });
});

app.post('/api/test/follow', (req, res) => {
    const { count = 1 } = req.body;
    console.log(`🧪 Test follow event: +${count}`);
    
    // Update follow goal
    storage.state.followGoal.current = Math.min(
        storage.state.followGoal.current + count,
        storage.state.followGoal.goal
    );
    
    // Broadcast to overlays
    broadcast('followGoal', { 
        type: 'follow-goal-update', 
        ...storage.state.followGoal 
    });
    
    res.json({ 
        success: true, 
        current: storage.state.followGoal.current,
        goal: storage.state.followGoal.goal
    });
});

// Cut/Reset goal endpoints
app.post('/api/cut/like', (req, res) => {
    console.log('✂️ Cutting like goal (resetting to 0)');
    
    storage.state.likeGoal.current = 0;
    
    // Broadcast to overlays
    broadcast('likeGoal', { 
        type: 'like-goal-update', 
        ...storage.state.likeGoal 
    });
    
    res.json({ 
        success: true, 
        current: 0,
        goal: storage.state.likeGoal.goal,
        message: 'Like goal reset'
    });
});

app.post('/api/cut/follow', (req, res) => {
    console.log('✂️ Cutting follow goal (resetting to 0)');
    
    storage.state.followGoal.current = 0;
    
    // Broadcast to overlays
    broadcast('followGoal', { 
        type: 'follow-goal-update', 
        ...storage.state.followGoal 
    });
    
    res.json({ 
        success: true, 
        current: 0,
        goal: storage.state.followGoal.goal,
        message: 'Follow goal reset'
    });
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    
    // Determine overlay type from path
    let overlayType = 'general';
    
    if (path.includes('/gift-bubbles') || path.includes('/giftbubbles')) {
        overlayType = 'giftBubbles';
    } else if (path.includes('/luckywheel2')) {
        overlayType = 'luckyWheel2';
    } else if (path.includes('/luckywheel')) {
        overlayType = 'luckyWheel';
    } else if (path.includes('/songrequest') || path.includes('/song')) {
        overlayType = 'songRequest';
    } else if (path.includes('/like-goal') || path.includes('/likegoal')) {
        overlayType = 'likeGoal';
    } else if (path.includes('/follow-goal') || path.includes('/followgoal')) {
        overlayType = 'followGoal';
    } else if (path.includes('/timer')) {
        overlayType = 'timer';
    } else if (path.includes('/chat')) {
        overlayType = 'chat';
    } else if (path.includes('/win-goal') || path.includes('/wingoal')) {
        overlayType = 'winGoal';
    } else if (path.includes('/top-gift') || path.includes('/topgift')) {
        overlayType = 'topGift';
    } else if (path.includes('/top-streak') || path.includes('/topstreak')) {
        overlayType = 'topStreak';
    } else if (path.includes('/giftvsgift') || path.includes('/gift-vs-gift')) {
        overlayType = 'giftVsGift';
    } else if (path.includes('/minigame-rect')) {
        // New: minigame rectangle triggers overlay
        overlayType = 'minigameRect';
    }
    
    // Log WebSocket connection
    console.log(`📡 WebSocket connected: ${overlayType} (path: ${path})`);
    
    // Add to appropriate client set
    if (storage.clients[overlayType]) {
        storage.clients[overlayType].add(ws);
        console.log(`✅ ${overlayType} overlay connected (${storage.clients[overlayType].size} total)`);
        
        // Send current state to new client
        const currentState = storage.state[overlayType];
        if (currentState) {
            try {
                ws.send(JSON.stringify({ type: 'initial-state', state: currentState }));
            } catch (error) {
                console.error('Failed to send initial state:', error);
            }
        }

        if (overlayType === 'topGift') {
            try {
                ws.send(JSON.stringify({ type: 'topgift-settings-update', settings: storage.state.topGiftSettings }));
            } catch (error) {
                console.error('[Overlay Server] Failed to send top gift settings on connect:', error);
            }
        } else if (overlayType === 'topStreak') {
            try {
                ws.send(JSON.stringify({ type: 'topstreak-settings-update', settings: storage.state.topStreakSettings }));
            } catch (error) {
                console.error('[Overlay Server] Failed to send top streak settings on connect:', error);
            }
        }
    }
    
    // Handle incoming messages from clients
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log(`📨 [${overlayType}] Received message:`, data);
            
            // Handle goal-completed events from browser overlays
            if (data.type === 'goal-completed') {
                console.log(`🎉 [${overlayType}] Goal completed! Broadcasting to all clients...`);
                
                const goalType = data.goalType; // 'like' or 'follow'
                const { count, goal, whenReached, actionOnFinish } = data;
                
                // Update server state
                if (goalType === 'like' && storage.state.likeGoal) {
                    // Store original goal if not already stored
                    if (!storage.state.likeGoal.originalGoal) {
                        storage.state.likeGoal.originalGoal = storage.state.likeGoal.goal || 100;
                    }
                    const originalGoal = storage.state.likeGoal.originalGoal;
                    let newGoal = goal;
                    
                    if (whenReached === 'double') {
                        newGoal = goal * 2;
                    } else if (whenReached === 'increase') {
                        newGoal = goal + originalGoal;
                    } else if (whenReached === 'reset') {
                        newGoal = originalGoal;
                    } else if (whenReached === 'hide') {
                        newGoal = 999999;
                    }
                    
                    storage.state.likeGoal.current = 0;
                    storage.state.likeGoal.goal = newGoal;
                    
                    console.log(`🎯 Like goal updated: ${goal} → ${newGoal} (behavior: ${whenReached})`);
                    
                    // Broadcast to all clients
                    broadcastAll({ 
                        type: 'goal-completed', 
                        goalType: 'like',
                        count: 0,
                        goal: newGoal,
                        whenReached,
                        actionOnFinish
                    });
                    
                    // Broadcast reset count to like goal overlays
                    broadcast('likeGoal', {
                        type: 'reset-count'
                    });
                    
                    // Broadcast updated goal to like goal overlays
                    broadcast('likeGoal', {
                        type: 'update-goal',
                        newGoal: newGoal
                    });
                    
                } else if (goalType === 'follow' && storage.state.followGoal) {
                    // Store original goal if not already stored
                    if (!storage.state.followGoal.originalGoal) {
                        storage.state.followGoal.originalGoal = storage.state.followGoal.goal || 50;
                    }
                    const originalGoal = storage.state.followGoal.originalGoal;
                    let newGoal = goal;
                    
                    if (whenReached === 'double') {
                        newGoal = goal * 2;
                    } else if (whenReached === 'increase') {
                        newGoal = goal + originalGoal;
                    } else if (whenReached === 'reset') {
                        newGoal = originalGoal;
                    } else if (whenReached === 'hide') {
                        newGoal = 999999;
                    }
                    
                    storage.state.followGoal.current = 0;
                    storage.state.followGoal.goal = newGoal;
                    
                    console.log(`🎯 Follow goal updated: ${goal} → ${newGoal} (behavior: ${whenReached})`);
                    
                    // Broadcast to all clients
                    broadcastAll({ 
                        type: 'goal-completed', 
                        goalType: 'follow',
                        count: 0,
                        goal: newGoal,
                        whenReached,
                        actionOnFinish
                    });
                    
                    // Broadcast reset count to follow goal overlays
                    broadcast('followGoal', {
                        type: 'reset-count'
                    });
                    
                    // Broadcast updated goal to follow goal overlays
                    broadcast('followGoal', {
                        type: 'update-goal',
                        newGoal: newGoal
                    });
                }
            }
        } catch (error) {
            console.error(`Error parsing WebSocket message from ${overlayType}:`, error);
        }
    });
    
    // Handle disconnection
    ws.on('close', () => {
        if (storage.clients[overlayType]) {
            storage.clients[overlayType].delete(ws);
            console.log(`❌ ${overlayType} overlay disconnected (${storage.clients[overlayType].size} remaining)`);
        }
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error(`WebSocket error for ${overlayType}:`, error);
    });
});

// 404 handler - use bare middleware instead of '*' path to avoid path-to-regexp issues
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found",
        availableEndpoints: [
            "GET /ping",
            "POST /tikhub/authenticate",
            "POST /event/gift",
            "POST /event/follow",
            "POST /event/like",
            "POST /event/chat",
            "POST /event/share",
            "POST /event/subscribe",
            "POST /broadcast-event",
            "GET /api/actions",
            "POST /api/actions",
            "POST /api/execute-action",
            "GET /api/goal-settings",
            "POST /api/goal-settings",
            "POST /api/test/like",
            "POST /api/test/follow",
            "POST /api/cut/like",
            "POST /api/cut/follow",
            "POST /overlay/luckywheel/config",
            "POST /overlay/luckywheel/spin",
            "POST /overlay/luckywheel2/config",
            "POST /overlay/luckywheel2/spin",
            "POST /overlay/songrequest/add",
            "POST /overlay/songrequest/update",
            "POST /overlay/likegoal/update",
            "POST /overlay/followgoal/update",
            "POST /overlay/wingoal/update",
            "POST /overlay/timer/update",
            "POST /overlay/topgift/update",
            "POST /overlay/topstreak/update",
            "POST /overlay/giftvsgift/update",
            "GET /api/giftvsgift",
            "POST /api/giftvsgift",
            "GET /state/:overlayType",
            "WebSocket: /ws/gift-bubbles",
            "WebSocket: /ws/luckywheel",
            "WebSocket: /ws/luckywheel2",
            "WebSocket: /ws/songrequests",
            "WebSocket: /ws/like-goal",
            "WebSocket: /ws/follow-goal",
            "WebSocket: /ws/timer",
            "WebSocket: /ws/chat",
            "WebSocket: /ws/win-goal",
            "WebSocket: /ws/topgift",
            "WebSocket: /ws/topstreak",
            "WebSocket: /ws/giftvsgift"
        ]
    });
});

// Start server
server.listen(PORT, () => {
    console.log('🚀 TikHub Overlay Server running on Render.com');
    console.log(`🌐 Server listening on port ${PORT}`);
    console.log('📡 WebSocket server ready');
    console.log('🎨 Overlay endpoints available');
    console.log('✅ Ready to receive TikHub events!');
});

module.exports = app;
