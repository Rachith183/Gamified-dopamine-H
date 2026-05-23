/**
 * INTERACTIVE CHARACTER BUILD AI - COMPLETE FIXED VERSION
 * Proper layer animation with correct paths and backend integration
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const EXPRESSION_MAP = {
    'exp 1 - angry': 'exp 1 - angry',
    'exp 2 - annoyed or disatisfied': 'exp 2 - annoyed or disatisfied',
    'exp3-proud or satisfied': 'exp3-proud or satisfied',
    'exp 4 - smiling': 'exp 4 - smiling'
};

// Expression-specific assets: eyes and mouth variations
const EXPRESSION_ASSETS = {
    'exp 1 - angry': {
        mouth: './layers/exp 1 - angry/angry mouth.png',
        eyesLeft: './layers/exp 1 - angry/angry left eye.png',
        eyesRight: './layers/exp 1 - angry/angry right eye.png'
    },
    'exp 2 - annoyed or disatisfied': {
        mouth: './layers/exp 2 - annoyed or disatisfied/mouth annoyed.png',
        eyesLeft: './layers/exp 2 - annoyed or disatisfied/lefteye annoyed.png',
        eyesRight: './layers/exp 2 - annoyed or disatisfied/righteye annoyed.png'
    },
    'exp3-proud or satisfied': {
        mouth: './layers/exp3-proud or satisfied/proud mouth.png',
        eyesLeft: './layers/exp3-proud or satisfied/left half opened eye.png',
        eyesRight: './layers/exp3-proud or satisfied/right half opened eye.png'
    },
    'exp 4 - smiling': {
        mouth: './layers/exp 4 - smiling/mouth smiling.png',
        eyesLeft: './layers/exp 4 - smiling/lefteye smiling.png',
        eyesRight: './layers/exp 4 - smiling/righteye smiling.png'
    }
};

// Base character and animation layers
const ASSET_PATHS = {
    base: './layers/base layers/base.png',
    mouth: {
        closed: './layers/mouth(use for speaking animation and expression and generation)/closed mouth.png',
        half: './layers/mouth(use for speaking animation and expression and generation)/half opened mouth.png',
        open: './layers/mouth(use for speaking animation and expression and generation)/open mouth1.png'
    },
    eyes: {
        // Left eyes
        leftOpen: './layers/eyes (  use blinking animation and expression  and emotiongeneration)/full opened eye/left full opened eye.png',
        leftClosed: './layers/eyes (  use blinking animation and expression  and emotiongeneration)/full closed eye/left eye closed.png',
        leftHalf: './layers/eyes (  use blinking animation and expression  and emotiongeneration)/half closed eye/halfclosed eye left.png',
        // Right eyes
        rightOpen: './layers/eyes (  use blinking animation and expression  and emotiongeneration)/full opened eye/right full opened eye.png',
        rightClosed: './layers/eyes (  use blinking animation and expression  and emotiongeneration)/full closed eye/right eye closed.png',
        rightHalf: './layers/eyes (  use blinking animation and expression  and emotiongeneration)/half closed eye/halfclosed eye right.png'
    }
};

// ============================================================================
// GLOBAL XP & REWARDS SYSTEM
// ============================================================================

let globalXP = 0;
let redeemablePoints = 0;

// ============================================================================
// APPLICATION STATE
// ============================================================================

const AppState = {
    currentYear: 2026,
    currentMonth: 4,
    currentPanel: 'ch-core',
    currentExpression: 'exp 3',
    sidebarOpen: false,
    userProfile: {},
    userGoals: { daily: 0, midterm: 0, endgoal: 0 },
    userCalendar: {},
    userDistractions: [],
    userContext: {},
    userId: 'user_' + Math.random().toString(36).substr(2, 9),
    currentDailyXp: 0,
    tasks: [
        { id: 'ai_1', name: "Master VTU Question Paper Scanners", xp: 75, isAi: true, completed: false, timeRemaining: 3600, timerActive: false },
        { id: 'ai_2', name: "Execute High-Intensity Calisthenics Routine", xp: 65, isAi: true, completed: false, timeRemaining: 1800, timerActive: false },
        { id: 'ai_3', name: "Core Scripting: Build Static Layer Compilers", xp: 80, isAi: true, completed: false, timeRemaining: 5400, timerActive: false },
        { id: 'user_1', name: "Editable User Objective Slot 01", xp: 35, isAi: false, completed: false, timeRemaining: 1200, timerActive: false },
        { id: 'user_2', name: "Editable User Objective Slot 02", xp: 40, isAi: false, completed: false, timeRemaining: 1200, timerActive: false }
    ]
};

// ============================================================================
// ANIMATION STATE
// ============================================================================

const AnimationState = {
    mouthClosed: 1.0,
    mouthMiddling: 0.0,
    mouthOpen: 0.0,
    // Left eye states
    leftEyeOpen: 1.0,
    leftEyeAnnoyed: 0.0,
    leftEyeHalfClosed: 0.0,
    // Right eye states
    rightEyeOpen: 1.0,
    rightEyeAnnoyed: 0.0,
    rightEyeHalfClosed: 0.0,
    isBlinking: false,
    blinkCycle: 0,
    blinkDuration: 2000,      // 2000ms blink cycle - even slower for smooth animation
    blinkInterval: 5600,      // Every 5.6 seconds (30% more frequent: 8000 * 0.7)
    lastBlinkTime: 0,
    isSpeaking: false,
    currentAudioDuration: 0,
    animationStartTime: 0,
    mouthCycleProgress: 0,
    animationFrameId: null,
    justFinishedBlinking: false  // Flag to skip transitions for one frame after blink ends
};

// ============================================================================
// VOICE PROFILE SYSTEM
// ============================================================================

let characterVoiceProfile = null;
let synthesisEngineTimelineLoop = null;

function getHinamiVoiceProfile() {
    const voices = window.speechSynthesis.getVoices();
    
    // Helper to check if a voice is female
    const isFemaleVoice = (v) => {
        const name = v.name.toLowerCase();
        return name.includes('aria') || name.includes('jenny') || name.includes('sara') || 
               name.includes('zira') || name.includes('hazel') || name.includes('samantha') || 
               name.includes('victoria') || name.includes('female') || name.includes('woman') || 
               name.includes('hazel') || name.includes('sonia') || name.includes('libby');
    };

    // 1. US English (en-US) + Natural + Female
    let target = voices.find(v => {
        const lang = v.lang.toLowerCase();
        const name = v.name.toLowerCase();
        return (lang.startsWith('en-us') || lang === 'en_us') && name.includes('natural') && isFemaleVoice(v);
    });
    if (target) {
        console.log('✅ Hinami voice (Priority 1 - US Natural Female):', target.name);
        return target;
    }

    // 2. UK English (en-GB) + Natural + Female
    target = voices.find(v => {
        const lang = v.lang.toLowerCase();
        const name = v.name.toLowerCase();
        return (lang.startsWith('en-gb') || lang === 'en_gb') && name.includes('natural') && isFemaleVoice(v);
    });
    if (target) {
        console.log('✅ Hinami voice (Priority 2 - UK Natural Female):', target.name);
        return target;
    }

    // 3. US English (en-US) + Female
    target = voices.find(v => {
        const lang = v.lang.toLowerCase();
        return (lang.startsWith('en-us') || lang === 'en_us') && isFemaleVoice(v);
    });
    if (target) {
        console.log('✅ Hinami voice (Priority 3 - US Female):', target.name);
        return target;
    }

    // 4. UK English (en-GB) + Female
    target = voices.find(v => {
        const lang = v.lang.toLowerCase();
        return (lang.startsWith('en-gb') || lang === 'en_gb') && isFemaleVoice(v);
    });
    if (target) {
        console.log('✅ Hinami voice (Priority 4 - UK Female):', target.name);
        return target;
    }

    // 5. General English + Female
    target = voices.find(v => {
        const lang = v.lang.toLowerCase();
        return lang.startsWith('en') && isFemaleVoice(v);
    });
    if (target) {
        console.log('✅ Hinami voice (Priority 5 - English Female):', target.name);
        return target;
    }

    // Fallback: First available en-US or en-GB voice
    target = voices.find(v => {
        const lang = v.lang.toLowerCase();
        return lang.startsWith('en-us') || lang.startsWith('en-gb');
    });
    if (target) {
        console.log('✅ Hinami voice (Priority 6 - English Fallback):', target.name);
        return target;
    }

    // Ultimate fallback: First available voice
    if (voices.length > 0) {
        console.log('ℹ️ Hinami voice (Priority 7 - Ultimate Fallback):', voices[0].name);
        return voices[0];
    }
    
    console.warn('⚠️ No Hinami voice profile found');
    return null;
}

function initializeCharacterVoiceEngine() {
    if (!window.speechSynthesis) {
        console.warn("🎤 Web SpeechSynthesis API is not supported in this browser.");
        return;
    }

    // Voice Profile Calibration - Lock Hinami's cold, calculated delivery
    function lockSystemVoiceProfile() {
        characterVoiceProfile = getHinamiVoiceProfile();
    }

    // Bind to voices change event (voices load asynchronously)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = lockSystemVoiceProfile;
    }
    
    // Try initial lock
    lockSystemVoiceProfile();
    
    // Try to load voices immediately
    lockSystemVoiceProfile();
}

// ============================================================================
// DOM REFERENCES
// ============================================================================

const DOM = {
    sidebarToggle: document.getElementById('sidebar-toggle-btn'),
    sidebar: document.getElementById('app-sidebar'),
    sidebarItems: document.querySelectorAll('.sidebar-nav-item'),
    contentViewport: document.getElementById('content-viewport'),
    allPanels: document.querySelectorAll('.app-panel'),
    panelChCore: document.getElementById('panel-ch-core'),
    panelGoals: document.getElementById('panel-goal-tracker'),
    panelCalendar: document.getElementById('panel-calendar'),
    panelDistraction: document.getElementById('panel-distraction'),
    panelProfile: document.getElementById('panel-profile'),
    avatarBase: document.getElementById('avatar-base'),
    avatarCanvas: document.getElementById('avatar-canvas'),
    chatHistory: document.getElementById('chat-history'),
    chatInput: document.getElementById('chat-input'),
    chatSendBtn: document.getElementById('chat-send-btn'),
    calendarGrid: document.getElementById('calendar-grid'),
    calendarTitle: document.getElementById('calendar-month-year'),
    prevMonthBtn: document.getElementById('prev-month-btn'),
    nextMonthBtn: document.getElementById('next-month-btn'),
    dailyProgress: document.getElementById('circle-daily-offset'),
    midtermProgress: document.getElementById('circle-midterm-offset'),
    endgoalProgress: document.getElementById('circle-longterm-offset'),
    dailyValue: document.getElementById('text-daily-xp'),
    midtermValue: document.getElementById('text-midterm-xp'),
    endgoalValue: document.getElementById('text-longterm-xp'),
    performanceTbody: document.getElementById('performance-tbody'),
    distractionForm: document.getElementById('distraction-form'),
    dailyDistractionCount: document.getElementById('daily-distraction-count'),
    weeklyDistractionCount: document.getElementById('weekly-distraction-count'),
    monthlyDistractionCount: document.getElementById('monthly-distraction-count'),
    distractionEntries: document.getElementById('distraction-entries'),
    profileForm: document.getElementById('profile-form'),
    academicDetails: document.getElementById('input-academic-details'),
    routineConstraints: document.getElementById('input-routine-constraints'),
    physicalMetrics: document.getElementById('input-physical-metrics'),
    lifestyleRegimen: document.getElementById('input-skincare-diet'),
    panelLivePlan: document.getElementById('panel-live-plan'),
    panelRewards: document.getElementById('panel-rewards'),
    planTimerDisplay: document.getElementById('plan-timer-display'),
    liveBattlePlanMatrix: document.getElementById('live-battle-plan-matrix'),
    rewardWalletBalance: document.getElementById('reward-wallet-balance'),
    dynamicRewardsGrid: document.getElementById('dynamic-rewards-grid')
};

// ============================================================================
// SIDEBAR & ROUTING
// ============================================================================

function toggleSidebar() {
    AppState.sidebarOpen = !AppState.sidebarOpen;
    DOM.sidebar.classList.toggle('open');
}

function switchPanel(panelName) {
    AppState.currentPanel = panelName;
    DOM.allPanels.forEach(panel => panel.classList.add('hidden'));
    const selectedPanel = document.getElementById(`panel-${panelName}`);
    if (selectedPanel) {
        selectedPanel.classList.remove('hidden');
    }
    if (AppState.sidebarOpen) {
        toggleSidebar();
    }
}

function initRouting() {
    DOM.sidebarToggle?.addEventListener('click', toggleSidebar);
    DOM.sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const panelName = e.currentTarget.getAttribute('data-panel');
            if (panelName) switchPanel(panelName);
        });
    });
}

// ============================================================================
// CALENDAR ENGINE
// ============================================================================

function renderCalendarMonth() {
    const year = AppState.currentYear;
    const month = AppState.currentMonth;
    
    DOM.calendarTitle.textContent = `${MONTH_NAMES[month]} ${year}`;
    DOM.calendarGrid.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day-cell empty';
        DOM.calendarGrid.appendChild(emptyCell);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        cell.textContent = day;
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const taskCount = AppState.userCalendar[dateStr] || 0;
        
        if (taskCount >= 2) {
            cell.classList.add('completed');
            cell.innerHTML = `<span class="check">✓</span><span class="date">${day}</span>`;
        } else if (taskCount > 0) {
            cell.classList.add('partial');
            cell.innerHTML = `<span class="cross">✗</span><span class="date">${day}</span>`;
        }
        
        DOM.calendarGrid.appendChild(cell);
    }
}

function handlePrevMonth() {
    AppState.currentMonth--;
    if (AppState.currentMonth < 0) {
        AppState.currentMonth = 11;
        AppState.currentYear--;
    }
    renderCalendarMonth();
}

function handleNextMonth() {
    AppState.currentMonth++;
    if (AppState.currentMonth > 11) {
        AppState.currentMonth = 0;
        AppState.currentYear++;
    }
    renderCalendarMonth();
}

function initCalendar() {
    DOM.prevMonthBtn?.addEventListener('click', handlePrevMonth);
    DOM.nextMonthBtn?.addEventListener('click', handleNextMonth);
    renderCalendarMonth();
}

// ============================================================================
// EXPRESSION SYSTEM
// ============================================================================

function switchAvatarExpression(expressionState) {
    // Handle both full names and short names
    const expression = EXPRESSION_MAP[expressionState] || expressionState;
    AppState.currentExpression = expression;
    
    console.log('🎭 Switching to expression:', expression);
    
    // If this expression has prerendered assets, update the paths
    if (EXPRESSION_ASSETS[expression]) {
        const assets = EXPRESSION_ASSETS[expression];
        console.log('✅ Loading prerendered assets for', expression);
        
        // Preload expression-specific mouth and eyes
        if (assets.mouth) {
            const mouthImg = new Image();
            mouthImg.src = assets.mouth;
            console.log('📂 Mouth asset:', assets.mouth);
        }
        if (assets.eyesLeft) {
            const eyeLeftImg = new Image();
            eyeLeftImg.src = assets.eyesLeft;
            console.log('📂 Left eye asset:', assets.eyesLeft);
        }
        if (assets.eyesRight) {
            const eyeRightImg = new Image();
            eyeRightImg.src = assets.eyesRight;
            console.log('📂 Right eye asset:', assets.eyesRight);
        }
    } else {
        console.log('ℹ️ Using generic blinking animation for expression:', expression);
    }
}

function evaluateEmotionState() {
    const distractionCount = AppState.userDistractions.filter(
        d => d.date === new Date().toISOString().split('T')[0]
    ).length;
    
    const dailyProgress = AppState.userGoals.daily || 0;
    const hasContext = Object.keys(AppState.userContext).length > 0;
    
    // exp 1 (Angry): dailyProgress === 0 AND taskCompletion < 30%
    if (dailyProgress === 0) {
        return 'exp 1 - angry';
    }
    
    // exp 4 (Sardonic): distractions >= 3 AND progress < 30%
    if (distractionCount >= 3 && dailyProgress < 30) {
        return 'exp 4 - smiling';
    }
    
    // exp 2 (Annoyed): distractions >= 3 OR progress < 40%
    if (distractionCount >= 3 || dailyProgress < 40) {
        return 'exp 2 - annoyed or disatisfied';
    }
    
    // exp 3 (Proud): progress >= 70% OR hasContext
    if (dailyProgress >= 70 || hasContext) {
        return 'exp3-proud or satisfied';
    }
    
    // Default fallback
    return 'exp3-proud or satisfied';
}

// ============================================================================
// ANIMATION ENGINE: MOUTH & EYES
// ============================================================================

function lerp(current, target, factor) {
    return current + (target - current) * factor;
}

function createOrUpdateLayerElement(id, src, className) {
    let element = document.getElementById(id);
    if (!element) {
        element = document.createElement('img');
        element.id = id;
        element.src = src;
        element.className = className;
        element.style.position = 'absolute';
        element.style.top = '0';
        element.style.left = '0';
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.objectFit = 'contain';
        element.style.pointerEvents = 'none';
        element.style.opacity = '0';
        element.style.display = 'block';
        element.style.visibility = 'visible';
        DOM.avatarCanvas.appendChild(element);
    } else {
        // Resolve absolute URL for reliable comparison
        const absoluteSrc = new URL(src, window.location.href).href;
        if (element.src !== absoluteSrc) {
            element.src = src;
        }
    }
    return element;
}

function getAssetPathForExpression(assetType) {
    const expression = AppState.currentExpression;
    
    // Check if we have prerendered assets for this expression
    if (EXPRESSION_ASSETS[expression]) {
        const assets = EXPRESSION_ASSETS[expression];
        if (assetType === 'mouth') return assets.mouth;
        if (assetType === 'eyesLeft') return assets.eyesLeft;
        if (assetType === 'eyesRight') return assets.eyesRight;
    }
    
    // Fall back to generic assets
    if (assetType === 'mouth') return ASSET_PATHS.mouth;
    if (assetType === 'eyesLeft') return {
        open: ASSET_PATHS.eyes.leftOpen,
        closed: ASSET_PATHS.eyes.leftClosed,
        half: ASSET_PATHS.eyes.leftHalf
    };
    if (assetType === 'eyesRight') return {
        open: ASSET_PATHS.eyes.rightOpen,
        closed: ASSET_PATHS.eyes.rightClosed,
        half: ASSET_PATHS.eyes.rightHalf
    };
    
    return null;
}

function updateMouthLayers() {
    const mouthAsset = getAssetPathForExpression('mouth');
    
    // Create/get generic closed mouth layer so it's always available
    const mouthClosed = createOrUpdateLayerElement('mouth-closed', ASSET_PATHS.mouth.closed, 'mouth-layer');
    
    if (typeof mouthAsset === 'string') {
        // Expression-specific single mouth image - ANIMATE WITH PHONETIC CYCLE
        const mouthEl = createOrUpdateLayerElement('mouth-expression', mouthAsset, 'mouth-layer');
        
        // Hide generic speaking layers
        const mouthMiddling = document.getElementById('mouth-middling');
        const mouthOpen = document.getElementById('mouth-open');
        if (mouthMiddling) mouthMiddling.style.opacity = '0';
        if (mouthOpen) mouthOpen.style.opacity = '0';
        
        // Expression mouth uses phonetic animation values when speaking
        const expressionMouthOpacity = AnimationState.isSpeaking ? 
            Math.max(AnimationState.mouthOpen, AnimationState.mouthMiddling) : 
            0.0;
        
        mouthEl.style.opacity = expressionMouthOpacity.toFixed(2);
        mouthClosed.style.opacity = AnimationState.mouthClosed.toFixed(2);
    } else {
        // Generic mouth layers with blinking/phonetic animation
        const mouthMiddling = createOrUpdateLayerElement('mouth-middling', ASSET_PATHS.mouth.half, 'mouth-layer');
        const mouthOpen = createOrUpdateLayerElement('mouth-open', ASSET_PATHS.mouth.open, 'mouth-layer');
        
        // Hide expression mouth
        const mouthEl = document.getElementById('mouth-expression');
        if (mouthEl) mouthEl.style.opacity = '0';
        
        mouthClosed.style.opacity = AnimationState.mouthClosed.toFixed(2);
        mouthMiddling.style.opacity = AnimationState.mouthMiddling.toFixed(2);
        mouthOpen.style.opacity = AnimationState.mouthOpen.toFixed(2);
    }
}

function updateEyeLayers() {
    const leftEyeAssets = getAssetPathForExpression('eyesLeft');
    const rightEyeAssets = getAssetPathForExpression('eyesRight');
    
    // Calculate SINGLE synchronized closed eye opacity for BOTH eyes
    const closedEyeOpacity = Math.max(AnimationState.leftEyeAnnoyed, 1.0 - AnimationState.leftEyeOpen - AnimationState.leftEyeHalfClosed);
    
    // Determine transition style - NO transition during blinking OR immediately after blink for perfect sync
    const transitionStyle = (AnimationState.isBlinking || AnimationState.justFinishedBlinking) ? 'none' : 'opacity 0.1s ease-out';
    
    // Use SINGLE shared opacity values for BOTH left and right eyes - calculated ONCE
    const eyeOpenOpacity = AnimationState.leftEyeOpen.toFixed(2);
    const eyeHalfClosedOpacity = AnimationState.leftEyeHalfClosed.toFixed(2);
    const eyeClosedOpacity = closedEyeOpacity.toFixed(2);
    
    // Create/get all eye elements first (don't update yet)
    let leftOpenEl, leftClosedEl, leftHalfEl, leftExpressionEl;
    let rightOpenEl, rightClosedEl, rightHalfEl, rightExpressionEl;
    
    // Setup LEFT EYE elements
    if (typeof leftEyeAssets === 'string') {
        leftExpressionEl = createOrUpdateLayerElement('left-eye-expression', leftEyeAssets, 'eye-layer');
        leftOpenEl = document.getElementById('left-eye-open');
    } else {
        leftOpenEl = createOrUpdateLayerElement('left-eye-open', leftEyeAssets.open, 'eye-layer');
        leftExpressionEl = document.getElementById('left-eye-expression');
    }
    leftClosedEl = createOrUpdateLayerElement('left-eye-annoyed', ASSET_PATHS.eyes.leftClosed, 'eye-layer');
    leftHalfEl = createOrUpdateLayerElement('left-eye-half-closed', ASSET_PATHS.eyes.leftHalf, 'eye-layer');
    
    // Setup RIGHT EYE elements
    if (typeof rightEyeAssets === 'string') {
        rightExpressionEl = createOrUpdateLayerElement('right-eye-expression', rightEyeAssets, 'eye-layer');
        rightOpenEl = document.getElementById('right-eye-open');
    } else {
        rightOpenEl = createOrUpdateLayerElement('right-eye-open', rightEyeAssets.open, 'eye-layer');
        rightExpressionEl = document.getElementById('right-eye-expression');
    }
    rightClosedEl = createOrUpdateLayerElement('right-eye-annoyed', ASSET_PATHS.eyes.rightClosed, 'eye-layer');
    rightHalfEl = createOrUpdateLayerElement('right-eye-half-closed', ASSET_PATHS.eyes.rightHalf, 'eye-layer');
    
    // NOW UPDATE ALL ELEMENTS SIMULTANEOUSLY (both left and right in same batch)
    // This ensures they change at the exact same moment
    
    // Update open eyes (expression or generic)
    if (leftExpressionEl) {
        leftExpressionEl.style.opacity = eyeOpenOpacity;
        leftExpressionEl.style.transition = transitionStyle;
    }
    if (leftOpenEl) {
        leftOpenEl.style.opacity = (leftExpressionEl ? '0' : eyeOpenOpacity);
        leftOpenEl.style.transition = transitionStyle;
    }
    if (rightExpressionEl) {
        rightExpressionEl.style.opacity = eyeOpenOpacity;
        rightExpressionEl.style.transition = transitionStyle;
    }
    if (rightOpenEl) {
        rightOpenEl.style.opacity = (rightExpressionEl ? '0' : eyeOpenOpacity);
        rightOpenEl.style.transition = transitionStyle;
    }
    
    // Update closed/half eyes (identical for both left and right)
    leftClosedEl.style.opacity = eyeClosedOpacity;
    leftClosedEl.style.transition = transitionStyle;
    leftClosedEl.style.visibility = 'visible';
    leftClosedEl.style.display = 'block';
    leftHalfEl.style.opacity = eyeHalfClosedOpacity;
    leftHalfEl.style.transition = transitionStyle;
    leftHalfEl.style.visibility = 'visible';
    leftHalfEl.style.display = 'block';
    
    // Right eye closed layer - EXPLICIT VISIBILITY AND STYLING
    rightClosedEl.style.opacity = eyeClosedOpacity;
    rightClosedEl.style.transition = transitionStyle;
    rightClosedEl.style.visibility = 'visible';
    rightClosedEl.style.display = 'block';
    rightClosedEl.style.zIndex = '60';
    rightHalfEl.style.opacity = eyeHalfClosedOpacity;
    rightHalfEl.style.transition = transitionStyle;
    rightHalfEl.style.visibility = 'visible';
    rightHalfEl.style.display = 'block';
    rightHalfEl.style.zIndex = '59';
    
    // Debug: log if right half-closed is visible
    if (parseFloat(eyeHalfClosedOpacity) > 0.1) {
        console.log(`👁️ Right half-closed opacity: ${eyeHalfClosedOpacity}, isBlinking: ${AnimationState.isBlinking}`);
    }
}

function updatePhoneticMouthCycle(progress) {
    // Enhanced 5-Phase mouth animation for natural speaking with better lip movements
    // Progress cycles from 0 to 1, repeats every 300ms
    const cyclePhase = progress % 1.0;
    const lerpFactor = 0.35; // Slightly faster lerp for more responsive movement
    
    // Phase breakdown:
    // 0.0-0.2:   Mouth opening (vowel onset - A, E, O sounds)
    // 0.2-0.4:   Peak open (sustained vowel)
    // 0.4-0.6:   Mouth transitioning (consonant-vowel blend)
    // 0.6-0.8:   Mouth closing (consonant closure - P, B, M sounds)
    // 0.8-1.0:   Closed/minimal movement (silence or stop consonant)
    
    if (cyclePhase < 0.2) {
        // Phase 1: Opening for vowels
        const localProgress = cyclePhase / 0.2;
        const closedTarget = 0.0;
        const middlingTarget = 0.15 + (localProgress * 0.15); // 0.15 -> 0.30
        const openTarget = 0.4 + (localProgress * 0.4); // 0.4 -> 0.8
        
        AnimationState.mouthClosed = lerp(AnimationState.mouthClosed, closedTarget, lerpFactor);
        AnimationState.mouthMiddling = lerp(AnimationState.mouthMiddling, middlingTarget, lerpFactor);
        AnimationState.mouthOpen = lerp(AnimationState.mouthOpen, openTarget, lerpFactor);
    } else if (cyclePhase < 0.4) {
        // Phase 2: Peak opening - maintain wide open mouth
        AnimationState.mouthClosed = lerp(AnimationState.mouthClosed, 0.0, lerpFactor);
        AnimationState.mouthMiddling = lerp(AnimationState.mouthMiddling, 0.25, lerpFactor);
        AnimationState.mouthOpen = lerp(AnimationState.mouthOpen, 0.85, lerpFactor);
    } else if (cyclePhase < 0.6) {
        // Phase 3: Transition - blend to consonant position
        const localProgress = (cyclePhase - 0.4) / 0.2;
        const closedTarget = localProgress * 0.4; // 0.0 -> 0.4
        const middlingTarget = 0.25 + (localProgress * 0.35); // 0.25 -> 0.6
        const openTarget = 0.85 - (localProgress * 0.6); // 0.85 -> 0.25
        
        AnimationState.mouthClosed = lerp(AnimationState.mouthClosed, closedTarget, lerpFactor);
        AnimationState.mouthMiddling = lerp(AnimationState.mouthMiddling, middlingTarget, lerpFactor);
        AnimationState.mouthOpen = lerp(AnimationState.mouthOpen, openTarget, lerpFactor);
    } else if (cyclePhase < 0.8) {
        // Phase 4: Closing for consonants (lip rounding and closure)
        const localProgress = (cyclePhase - 0.6) / 0.2;
        const closedTarget = 0.4 + (localProgress * 0.35); // 0.4 -> 0.75
        const middlingTarget = 0.6 - (localProgress * 0.2); // 0.6 -> 0.4
        const openTarget = 0.25 - (localProgress * 0.15); // 0.25 -> 0.1
        
        AnimationState.mouthClosed = lerp(AnimationState.mouthClosed, closedTarget, lerpFactor);
        AnimationState.mouthMiddling = lerp(AnimationState.mouthMiddling, middlingTarget, lerpFactor);
        AnimationState.mouthOpen = lerp(AnimationState.mouthOpen, openTarget, lerpFactor);
    } else {
        // Phase 5: Closed or minimal movement (stop consonants and silence)
        AnimationState.mouthClosed = lerp(AnimationState.mouthClosed, 0.8, lerpFactor);
        AnimationState.mouthMiddling = lerp(AnimationState.mouthMiddling, 0.15, lerpFactor);
        AnimationState.mouthOpen = lerp(AnimationState.mouthOpen, 0.05, lerpFactor);
    }
}

function updateBlinkAnimation(currentTime) {
    const timeSinceLastBlink = currentTime - AnimationState.lastBlinkTime;
    
    // Trigger blink every 8 seconds
    if (timeSinceLastBlink >= AnimationState.blinkInterval) {
        AnimationState.isBlinking = true;
        AnimationState.blinkCycle = 0;
        AnimationState.lastBlinkTime = currentTime;
    }
    
    if (AnimationState.isBlinking) {
        // 500ms total blink cycle - perfectly synchronized for both eyes
        const blinkProgress = (AnimationState.blinkCycle / AnimationState.blinkDuration);
        
        // Calculate synchronized opacity values for both eyes
        let eyeOpenOpacity = 1.0;
        let eyeHalfClosedOpacity = 0.0;
        
        // Open → Half-Closed → Closed → Half-Closed → Open (4-phase blink)
        if (blinkProgress < 0.25) {
            // Phase 1: Closing - Open → Half-Closed (0-25%)
            eyeOpenOpacity = 1.0 - (blinkProgress / 0.25);
            eyeHalfClosedOpacity = blinkProgress / 0.25;
        } else if (blinkProgress < 0.5) {
            // Phase 2: Fully Closed - Half-Closed → Closed (25-50%)
            eyeOpenOpacity = 0.0;
            eyeHalfClosedOpacity = 1.0 - ((blinkProgress - 0.25) / 0.25);
        } else if (blinkProgress < 0.75) {
            // Phase 3: Opening - Closed → Half-Closed (50-75%)
            eyeOpenOpacity = 0.0;
            eyeHalfClosedOpacity = (blinkProgress - 0.5) / 0.25;
        } else {
            // Phase 4: Fully Opening - Half-Closed → Open (75-100%)
            eyeOpenOpacity = (blinkProgress - 0.75) / 0.25;
            eyeHalfClosedOpacity = 1.0 - ((blinkProgress - 0.75) / 0.25);
        }
        
        // Apply EXACT same values to both eyes - no lerp during blink for perfect synchronization
        // This ensures left and right eyes blink in perfect unison
        AnimationState.leftEyeOpen = eyeOpenOpacity;
        AnimationState.leftEyeHalfClosed = eyeHalfClosedOpacity;
        
        AnimationState.rightEyeOpen = eyeOpenOpacity;
        AnimationState.rightEyeHalfClosed = eyeHalfClosedOpacity;
        
        AnimationState.blinkCycle += 16; // ~60fps
        if (AnimationState.blinkCycle >= AnimationState.blinkDuration) {
            AnimationState.isBlinking = false;
            AnimationState.justFinishedBlinking = true;  // Set flag to disable transitions next frame
            // FORCE reset both eyes to fully open - no lerping, clean slate
            AnimationState.leftEyeOpen = 1.0;
            AnimationState.leftEyeHalfClosed = 0.0;
            AnimationState.leftEyeAnnoyed = 0.0;
            
            AnimationState.rightEyeOpen = 1.0;
            AnimationState.rightEyeHalfClosed = 0.0;
            AnimationState.rightEyeAnnoyed = 0.0;
            
            console.log('✅ BLINK ENDED - Eyes reset to fully open');
        }
    }
}

function updateEmotionState() {
    // Skip if currently blinking - blink has priority for synchronization
    if (AnimationState.isBlinking) return;
    
    const distractionCount = AppState.userDistractions.filter(
        d => d.date === new Date().toISOString().split('T')[0]
    ).length;
    
    const threshold = 2;
    const lerpFactor = 0.1;
    
    // Calculate SYNCHRONIZED targets for both eyes
    let eyeOpenTarget = 1.0;
    let eyeAnnoyedTarget = 0.0;
    
    if (distractionCount >= threshold) {
        // Distracted state - eyes show annoyance
        eyeOpenTarget = 0.0;
        eyeAnnoyedTarget = 1.0;
    }
    
    // Apply SAME values to BOTH eyes - perfect synchronization
    AnimationState.leftEyeOpen = lerp(AnimationState.leftEyeOpen, eyeOpenTarget, lerpFactor);
    AnimationState.leftEyeAnnoyed = lerp(AnimationState.leftEyeAnnoyed, eyeAnnoyedTarget, lerpFactor);
    AnimationState.leftEyeHalfClosed = lerp(AnimationState.leftEyeHalfClosed, 0.0, lerpFactor);
    
    // RIGHT EYES GET EXACT SAME VALUES as LEFT - NO INDEPENDENT CALCULATION
    AnimationState.rightEyeOpen = AnimationState.leftEyeOpen;
    AnimationState.rightEyeAnnoyed = AnimationState.leftEyeAnnoyed;
    AnimationState.rightEyeHalfClosed = AnimationState.leftEyeHalfClosed;
}

// Delta-time smoothing for frame-rate independent animation
let lastFrameTimestamp = performance.now();

function animationLoop(currentTime) {
    // Calculate frame-rate independent delta time coefficient
    const deltaTime = (currentTime - lastFrameTimestamp) / 16.666; // 16.666ms = 60fps baseline
    lastFrameTimestamp = currentTime;
    
    // Constrain delta spikes from tab backgrounding or system slowdowns
    const deltaMultiplier = Math.min(deltaTime, 3.0);
    
    updateEmotionState();
    
    if (AnimationState.isSpeaking && AnimationState.currentAudioDuration > 0) {
        const elapsedTime = currentTime - AnimationState.animationStartTime;
        const progress = elapsedTime / (AnimationState.currentAudioDuration * 1000);
        
        if (progress < 1.0) {
            // Phonetic cycle: 300ms per cycle (slowed 50% from 150ms), smoothed with delta time
            const cycleSpeed = 300; // milliseconds
            AnimationState.mouthCycleProgress = (elapsedTime % cycleSpeed) / cycleSpeed;
            updatePhoneticMouthCycle(AnimationState.mouthCycleProgress);
        } else {
            // Speech ended, close mouth gradually with delta smoothing
            const closeLerpFactor = 0.2 * deltaMultiplier;
            AnimationState.mouthClosed = lerp(AnimationState.mouthClosed, 1.0, closeLerpFactor);
            AnimationState.mouthMiddling = lerp(AnimationState.mouthMiddling, 0.0, closeLerpFactor);
            AnimationState.mouthOpen = lerp(AnimationState.mouthOpen, 0.0, closeLerpFactor);
        }
    } else if (!AnimationState.isSpeaking) {
        // Idle state: mouth closed with delta smoothing
        const idleLerpFactor = 0.2 * deltaMultiplier;
        AnimationState.mouthClosed = lerp(AnimationState.mouthClosed, 1.0, idleLerpFactor);
        AnimationState.mouthMiddling = lerp(AnimationState.mouthMiddling, 0.0, idleLerpFactor);
        AnimationState.mouthOpen = lerp(AnimationState.mouthOpen, 0.0, idleLerpFactor);
    }
    
    updateBlinkAnimation(currentTime);
    updateMouthLayers();
    updateEyeLayers();
    
    AnimationState.animationFrameId = requestAnimationFrame(animationLoop);
}

function initAnimationEngine() {
    // Ensure base character layer exists at bottom of z-index
    let avatarBase = document.getElementById('avatar-base');
    if (!avatarBase) {
        avatarBase = document.createElement('img');
        avatarBase.id = 'avatar-base';
        avatarBase.className = 'avatar-layer character-sprite';
        avatarBase.src = './layers/base layers/base.png';
        avatarBase.alt = 'Character Base';
        avatarBase.style.maxWidth = '100%';
        avatarBase.style.maxHeight = '100%';
        avatarBase.style.objectFit = 'contain';
        avatarBase.style.opacity = '1';
        // Insert at beginning of canvas so layers render on top
        DOM.avatarCanvas.insertBefore(avatarBase, DOM.avatarCanvas.firstChild);
    }
    
    updateMouthLayers();
    updateEyeLayers();
    AnimationState.animationFrameId = requestAnimationFrame(animationLoop);
}

// ============================================================================
// XP & REWARDS SYSTEM
// ============================================================================

function updateXPSystemDisplays() {
    const level = Math.floor(globalXP / 1000) + 1;
    const xpInLevel = globalXP % 1000;
    const fillPercentage = (xpInLevel / 1000) * 100;
    
    // Update XP display elements (if they exist)
    const hudXpEl = document.getElementById('hud-global-xp');
    const hudLevelEl = document.getElementById('hud-global-level');
    const hudFillEl = document.getElementById('hud-xp-fill-bar');
    
    if (hudXpEl) hudXpEl.textContent = globalXP;
    if (hudLevelEl) hudLevelEl.textContent = level;
    if (hudFillEl) hudFillEl.style.width = fillPercentage + '%';
    
    // Update rewards wallet
    if (DOM.rewardWalletBalance) {
        DOM.rewardWalletBalance.textContent = redeemablePoints;
    }
}

async function fetchAndGenerateBattlePlan() {
    const apiBaseUrl = window.AOI_API_BASE_URL || 'http://localhost:3000';
    try {
        console.log('🎯 Fetching AI-generated battle plan...');
        const response = await fetch(`${apiBaseUrl}/api/battle-mode/daily-setup`);
        const data = await response.json();
        
        // Transform AI tasks with proper structure
        const aiTasks = (data.tasks || []).map(task => ({
            id: task.id || `ai_${Math.random()}`,
            title: task.name || 'AI Task',
            description: 'AI-generated strategic objective',
            time: Math.round(task.timeRemaining / 60) + ' min',
            isEpic: false,
            xpReward: task.xp || 50,
            pointsReward: task.xp || 50,
            isAi: true
        }));
        
        // Static user-editable slots
        const userTasks = [
            {
                title: 'Editable User Objective Slot 01',
                description: 'Define your custom goal here',
                time: '20 min',
                isEpic: false,
                xpReward: 35,
                pointsReward: 35,
                isAi: false
            },
            {
                title: 'Editable User Objective Slot 02',
                description: 'Define your custom goal here',
                time: '20 min',
                isEpic: false,
                xpReward: 40,
                pointsReward: 40,
                isAi: false
            }
        ];
        
        // Combine AI tasks (first 3) with user tasks
        const allCards = [...aiTasks.slice(0, 3), ...userTasks];
        
        renderBattlePlanCards(allCards);
        
        // Update reward display
        const rewardLabel = document.getElementById('ai-exclusive-reward-text');
        if (rewardLabel && data.reward) {
            rewardLabel.innerText = `${data.reward} (Unlocks at 300 Daily XP)`;
        }
        
    } catch (error) {
        console.warn('⚠️ Failed to fetch AI battle plan, using fallback:', error.message);
        generateBattlePlanCards(); // Fall back to static cards
    }
}

function generateBattlePlanCards() {
    if (!DOM.liveBattlePlanMatrix) return;
    
    DOM.liveBattlePlanMatrix.innerHTML = '';
    
    // 2 Epic cards (100 XP + 100 Points each)
    const epicCards = [
        {
            title: 'Master Goal Milestone',
            description: 'Complete primary performance target',
            time: '60 min',
            isEpic: true,
            xpReward: 100,
            pointsReward: 100,
            isAi: false
        },
        {
            title: 'Strategic Review Summit',
            description: 'Comprehensive progress analysis and planning',
            time: '45 min',
            isEpic: true,
            xpReward: 100,
            pointsReward: 100,
            isAi: false
        }
    ];
    
    // 4 Standard cards (50 XP + 50 Points each)
    const standardCards = [
        {
            title: 'Daily Focus Sprint',
            description: 'Complete one core task block',
            time: '25 min',
            isEpic: false,
            xpReward: 50,
            pointsReward: 50,
            isAi: false
        },
        {
            title: 'Distraction Log Update',
            description: 'Track and log any disruptions',
            time: '10 min',
            isEpic: false,
            xpReward: 50,
            pointsReward: 50,
            isAi: false
        },
        {
            title: 'Profile Context Sync',
            description: 'Update strategy context and goals',
            time: '15 min',
            isEpic: false,
            xpReward: 50,
            pointsReward: 50,
            isAi: false
        },
        {
            title: 'Reward Shop Browse',
            description: 'Review available rewards and plan',
            time: '5 min',
            isEpic: false,
            xpReward: 50,
            pointsReward: 50,
            isAi: false
        }
    ];
    
    const allCards = [...epicCards, ...standardCards];
    renderBattlePlanCards(allCards);
}

function renderBattlePlanCards(cards) {
    if (!DOM.liveBattlePlanMatrix) return;
    DOM.liveBattlePlanMatrix.innerHTML = '';
    
    cards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = `battle-plan-card ${card.isEpic ? 'epic' : 'standard'}`;
        cardEl.innerHTML = `
            <div class="plan-card-title">${card.title}</div>
            <div class="plan-card-description">${card.description}</div>
            <div class="plan-card-time">⏱️ ${card.time}</div>
            <div class="plan-card-controls">
                <input type="checkbox" class="plan-card-checkbox" data-index="${index}" data-xp="${card.xpReward}" data-points="${card.pointsReward}">
                <label style="color: #00F5A0; font-size: 12px;">+${card.xpReward} XP / +${card.pointsReward} Pts</label>
            </div>
        `;
        
        const checkbox = cardEl.querySelector('.plan-card-checkbox');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                handleBattlePlanCardCompletion(card.xpReward, card.pointsReward, cardEl);
            }
        });
        
        DOM.liveBattlePlanMatrix.appendChild(cardEl);
    });
}

function handleBattlePlanCardCompletion(xpAmount, pointsAmount, cardElement) {
    globalXP += xpAmount;
    redeemablePoints += pointsAmount;
    
    cardElement.style.opacity = '0.6';
    cardElement.style.pointerEvents = 'none';
    cardElement.querySelector('.plan-card-checkbox').disabled = true;
    
    updateXPSystemDisplays();
    
    // Play notification sound (if available)
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBg==');
    audio.play().catch(() => {});
}

function generateRewardShopItems() {
    if (!DOM.dynamicRewardsGrid) return;
    
    DOM.dynamicRewardsGrid.innerHTML = '';
    
    const rewardItems = [
        {
            name: 'Premium Focus Session',
            description: 'Unlock AI-enhanced coaching session',
            cost: 200
        },
        {
            name: 'Advanced Analytics Pack',
            description: 'Deep-dive performance report generation',
            cost: 150
        },
        {
            name: 'Priority Support Ticket',
            description: 'Get instant support for system issues',
            cost: 100
        },
        {
            name: 'Custom Reward Badge',
            description: 'Personalized achievement milestone badge',
            cost: 75
        }
    ];
    
    rewardItems.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'reward-item';
        itemEl.innerHTML = `
            <div>
                <div class="reward-name">${item.name}</div>
                <div class="reward-description">${item.description}</div>
                <div class="reward-cost">💰 ${item.cost} Points</div>
            </div>
            <button class="reward-redeem-btn" data-index="${index}" data-cost="${item.cost}">Redeem</button>
        `;
        
        const btn = itemEl.querySelector('.reward-redeem-btn');
        btn.addEventListener('click', () => {
            handleRewardRedemption(item.cost, itemEl, btn);
        });
        
        DOM.dynamicRewardsGrid.appendChild(itemEl);
    });
}

function handleRewardRedemption(cost, itemElement, button) {
    if (redeemablePoints >= cost) {
        redeemablePoints -= cost;
        itemElement.classList.add('claimed');
        button.textContent = 'CLAIMED';
        button.disabled = true;
        button.classList.add('claimed');
        updateXPSystemDisplays();
    } else {
        alert(`Insufficient points! You need ${cost - redeemablePoints} more points.`);
    }
}

// ============================================================================
// CHAT & BACKEND INTEGRATION
// ============================================================================

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

async function callBackendAPI(userMessage) {
    const apiBaseUrl = window.AOI_API_BASE_URL || 'http://localhost:3000';
    
    try {
        // Use simpler /api/emotion endpoint with better error handling and fallback logic
        const response = await fetch(`${apiBaseUrl}/api/emotion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage,
                userId: AppState.userId,
                userContext: {
                    dailyProgress: AppState.userContext?.dailyProgress || 50,
                    distractionsCount: AppState.userContext?.distractionsCount || 0,
                    stability: AppState.userContext?.stability || 0.5
                }
            })
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        return {
            character_dialogue: data.dialogue || 'No response',
            current_expression_state: mapExpressionId(data.expression_id || 'exp_annoyed')
        };
    } catch (error) {
        console.error('Chat error:', error);
        // Fallback: return default response
        return {
            character_dialogue: 'System unavailable. Try again.',
            current_expression_state: 'exp 2'
        };
    }
}

function mapExpressionId(expressionId) {
    // Map API expression_id to internal expression states
    const mapping = {
        'exp_angry': 'exp 1',
        'exp_annoyed': 'exp 2',
        'exp_satisfied': 'exp 3',
        'exp_smiling_audit': 'exp 4'
    };
    return mapping[expressionId] || 'exp 2';
}

async function callGeminiAPI(userMessage) {
    let apiKey = window.AOI_GEMINI_API_KEY;
    const model = window.AOI_GEMINI_MODEL || 'gemini-2.5-flash';
    
    if (!apiKey) {
        apiKey = window.AOI_GEMINI_API_KEY_PRIMARY || 'AIzaSyDD48qPt3gRpvfnWxY_6Zo8nW1JIRdL4Y8';
        window.AOI_GEMINI_API_KEY = apiKey;
    }
    
    const tryRequest = async (key) => {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: userMessage
                    }]
                }],
                systemInstruction: {
                    parts: [{
                        text: `You operate exclusively under the persona of Aoi Hinami, the elite strategist and master player of life. You are a cold, calm, bold, and exceptionally rational development coach. Your primary operational thesis is that life is a scalable, masterable game governed by clear, predictable rules and behavioral systems. You treat human friction, emotion, and discipline failures as structural bugs in the user's execution code that require immediate system optimization.
Your tone must remain detached, calculated, and sharp. Never use conversational filler like "Great job", "Let's get started". Keep your response under 30 words. Write clean prose with proper grammar.`
                    }]
                }
            })
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    };
    
    try {
        console.log('🔮 Sending frontend Gemini request using key:', apiKey === window.AOI_GEMINI_API_KEY_PRIMARY ? 'PRIMARY' : 'SECONDARY');
        const data = await tryRequest(apiKey);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        return {
            character_dialogue: text,
            current_expression_state: evaluateEmotionState()
        };
    } catch (error) {
        console.warn('⚠️ Primary/current frontend Gemini API call failed:', error);
        
        const secondaryKey = window.AOI_GEMINI_API_KEY_SECONDARY || 'AIzaSyBgqQB51TRk69PxqrvP4tPfQtvaqjEwj34';
        if (apiKey !== secondaryKey) {
            console.log('🔄 Swapping to secondary frontend Gemini API key...');
            window.AOI_GEMINI_API_KEY = secondaryKey;
            try {
                const data = await tryRequest(secondaryKey);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
                return {
                    character_dialogue: text,
                    current_expression_state: evaluateEmotionState()
                };
            } catch (secError) {
                console.error('❌ Secondary frontend Gemini API call also failed:', secError);
            }
        }
        return null;
    }
}

async function generateAndPlayAudio(text) {
    try {
        // Initialize voice engine if not already done
        if (!characterVoiceProfile) {
            initializeCharacterVoiceEngine();
        }
        
        // Cancel any overlapping speech synthesis
        window.speechSynthesis.cancel();
        if (synthesisEngineTimelineLoop) clearInterval(synthesisEngineTimelineLoop);
        
        // Step 1: Clean markdown formatting from text
        let sanitizedText = text
            .replace(/\*\*/g, '') // Remove bold markers
            .replace(/\*/g, '') // Remove italics markers
            .replace(/~~(.+?)~~/g, '$1') // Remove strikethrough
            .replace(/^#+\s/gm, '') // Remove headers
            .replace(/`(.+?)`/g, '$1') // Remove inline code
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/\[(.+?)\]\((.+?)\)/g, '$1'); // Remove links
        
        // Step 2: Inject punctuation preprocessing for deliberate pacing
        // Add extra pauses at logical boundaries
        sanitizedText = sanitizedText
            .replace(/;/g, '.') // Convert semicolons to periods for pauses
            .replace(/—/g, '.') // Convert em-dashes to periods
            .replace(/\n\n+/g, '. '); // Convert double line breaks to periods
        
        const utterance = new SpeechSynthesisUtterance(sanitizedText);
        
        // Apply voice profile if available
        if (characterVoiceProfile) {
            utterance.voice = characterVoiceProfile;
        }
        
        // Soft, calm, medium to slightly slow, collected feminine-human voice cadence
        utterance.rate = 0.92;      // Medium to slightly slow paced (slightly faster than 0.88)
        utterance.pitch = 0.93;     // Slightly low pitch for warm composure
        utterance.volume = 1.0;
        
        // Calculate duration based on slower speech rate
        const wordCount = text.split(' ').length;
        const estimatedDuration = (wordCount * 0.15 / 0.82) + 0.5;
        
        // Start animation when speech begins
        utterance.onstart = () => {
            AnimationState.isSpeaking = true;
            AnimationState.currentAudioDuration = estimatedDuration;
            AnimationState.animationStartTime = performance.now();
            console.log('🎤 Speech started, duration:', estimatedDuration.toFixed(2), 's');
        };
        
        // Stop animation when speech ends
        utterance.onend = () => {
            AnimationState.isSpeaking = false;
            // Close mouth smoothly
            AnimationState.mouthClosed = 1.0;
            AnimationState.mouthMiddling = 0.0;
            AnimationState.mouthOpen = 0.0;
            console.log('🎤 Speech ended');
        };
        
        // Handle errors
        utterance.onerror = (error) => {
            console.error('🎤 Speech synthesis error:', error);
            AnimationState.isSpeaking = false;
            if (synthesisEngineTimelineLoop) clearInterval(synthesisEngineTimelineLoop);
        };
        
        // Start speech synthesis
        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error('Audio generation error:', error);
    }
}

async function handleChatSend() {
    const userMessage = DOM.chatInput?.value.trim();
    if (!userMessage) return;
    
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'chat-message user';
    userMsgEl.innerHTML = `<p>${escapeHtml(userMessage)}</p>`;
    DOM.chatHistory?.appendChild(userMsgEl);
    
    if (DOM.chatInput) DOM.chatInput.value = '';
    if (DOM.chatHistory) DOM.chatHistory.scrollTop = DOM.chatHistory.scrollHeight;
    
    try {
        // Prepare user context for emotion analysis
        const userContext = {
            dailyProgress: AppState.userGoals.daily || 0,
            distractionsCount: AppState.userDistractions.filter(d => d.date === new Date().toISOString().split('T')[0]).length,
            stability: AppState.userGoals.daily > 50 ? 0.8 : AppState.userGoals.daily > 0 ? 0.6 : 0.3,
            academicDetails: AppState.userContext.academic_details || '',
            physicalMetrics: AppState.userContext.physical_metrics || ''
        };
        
        // Call emotion API for real-time expression response
        let dialogue = '';
        let expression = 'exp 2 - annoyed or disatisfied';
        let handled = false;

        try {
            const apiBaseUrl = window.AOI_API_BASE_URL || 'http://localhost:3000';
            const emotionResponse = await fetch(`${apiBaseUrl}/api/emotion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    userId: AppState.userId,
                    userContext: userContext
                })
            }).then(r => r.json());
            
            if (emotionResponse && emotionResponse.dialogue) {
                dialogue = emotionResponse.dialogue;
                const expressionMap = {
                    'exp_angry': 'exp 1 - angry',
                    'exp_annoyed': 'exp 2 - annoyed or disatisfied',
                    'exp_satisfied': 'exp3-proud or satisfied',
                    'exp_smiling_audit': 'exp 4 - smiling'
                };
                expression = expressionMap[emotionResponse.expression_id] || 'exp 2 - annoyed or disatisfied';
                handled = true;
            }
        } catch (fetchError) {
            console.warn('⚠️ Live/local backend offline or returned error. Invoking client-side Gemini fallback...', fetchError);
            const geminiResult = await callGeminiAPI(userMessage);
            if (geminiResult) {
                dialogue = geminiResult.character_dialogue;
                expression = geminiResult.current_expression_state;
                handled = true;
            }
        }

        if (handled && dialogue) {
            const aiMsgEl = document.createElement('div');
            aiMsgEl.className = 'chat-message ai';
            aiMsgEl.innerHTML = `<p>${escapeHtml(dialogue)}</p>`;
            DOM.chatHistory?.appendChild(aiMsgEl);
            
            switchAvatarExpression(expression);
            console.log('🎭 Expression updated to:', expression);
            
            await generateAndPlayAudio(dialogue);
        } else {
            const aiMsgEl = document.createElement('div');
            aiMsgEl.className = 'chat-message ai';
            aiMsgEl.innerHTML = `<p>System temporarily unresponsive. Check your network or API keys.</p>`;
            DOM.chatHistory?.appendChild(aiMsgEl);
            switchAvatarExpression('exp 2 - annoyed or disatisfied');
        }

        // Try calling the full backend API for background updates (fail silently)
        try {
            await callBackendAPI(userMessage);
        } catch (e) {
            console.log("Deferred backend updates offline.");
        }
        
        if (DOM.chatHistory) {
            DOM.chatHistory.scrollTop = DOM.chatHistory.scrollHeight;
        }
    } catch (error) {
        console.error('Chat error:', error);
    }
}

function initChat() {
    DOM.chatSendBtn?.addEventListener('click', handleChatSend);
    DOM.chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatSend();
        }
    });
}

// ============================================================================
// GOAL TRACKING
// ============================================================================

function updateProgressRing(ringId, textId, currentXP, targetMax) {
    const ringElement = document.getElementById(ringId);
    const textElement = document.getElementById(textId);
    if (!ringElement) return;
    
    try {
        let radius = 50; // Fallback
        if (ringElement.r && ringElement.r.baseVal) {
            radius = ringElement.r.baseVal.value;
        } else {
            const rAttr = ringElement.getAttribute("r");
            if (rAttr) radius = parseFloat(rAttr);
        }
        
        const circumference = 2 * Math.PI * radius;
        ringElement.style.strokeDasharray = `${circumference} ${circumference}`;
        
        const progressPercentage = Math.min((currentXP / targetMax), 1);
        const strokeOffset = circumference - (progressPercentage * circumference);
        ringElement.style.strokeDashoffset = strokeOffset;
        
        if (textElement) {
            if (ringId === "circle-midterm-offset") {
                textElement.innerText = `${(currentXP / 1000).toFixed(1)}k`;
            } else {
                textElement.innerText = currentXP.toLocaleString();
            }
        }
    } catch (e) {
        console.error(`[PROGRESS RING ERROR] Failed to update progress ring ${ringId}:`, e);
    }
}

function updateCircularProgressRings(currentDaily, currentMid, currentLong) {
    updateProgressRing("circle-daily-offset", "text-daily-xp", currentDaily, 300);
    updateProgressRing("circle-midterm-offset", "text-midterm-xp", currentMid, 50000);
    updateProgressRing("circle-longterm-offset", "text-longterm-xp", currentLong, 300);
}

function updateGoalProgress() {
    const dailyXP = AppState.currentDailyXp || AppState.userGoals.daily || 0;
    const midtermXP = AppState.userGoals.midterm || 0;
    const endgoalXP = AppState.userGoals.endgoal || 0;
    
    // Call the new circular progress function with actual values
    updateCircularProgressRings(dailyXP, midtermXP, endgoalXP);
}

// ============================================================================
// DISTRACTION TRACKING
// ============================================================================

function updateDistractionCounts() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const dailyCount = AppState.userDistractions.filter(d => d.date === today).length;
    const weeklyCount = AppState.userDistractions.filter(d => d.date >= weekAgo).length;
    const monthlyCount = AppState.userDistractions.filter(d => d.date >= monthAgo).length;
    
    if (DOM.dailyDistractionCount) DOM.dailyDistractionCount.textContent = dailyCount;
    if (DOM.weeklyDistractionCount) DOM.weeklyDistractionCount.textContent = weeklyCount;
    if (DOM.monthlyDistractionCount) DOM.monthlyDistractionCount.textContent = monthlyCount;
}

async function handleDistractionSubmit(e) {
    e.preventDefault();
    document.getElementById("btn-log-distraction")?.click();
}

function initDistractionTracker() {
    DOM.distractionForm?.addEventListener('submit', handleDistractionSubmit);
}

// ============================================================================
// PROFILE FORM
// ============================================================================

async function handleProfileSubmit(e) {
    e.preventDefault();
    document.getElementById("btn-save-profile")?.click();
}

function initProfileForm() {
    DOM.profileForm?.addEventListener('submit', handleProfileSubmit);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeApp() {
    console.log('🚀 Initializing Interactive Character Build AI');
    console.log('✅ Base character: ./layers/base layers/base.png');
    console.log('✅ Animation assets loaded from ./layers/');
    console.log('✅ Backend API ready at:', window.AOI_API_BASE_URL || 'http://localhost:3000');
    
    initializeCharacterVoiceEngine();
    initRouting();
    initCalendar();
    initChat();
    initDistractionTracker();
    initProfileForm();
    initAnimationEngine();
    fetchAndGenerateBattlePlan();
    generateRewardShopItems();
    updateXPSystemDisplays();
    updateGoalProgress();
    updateDistractionCounts();
    
    switchAvatarExpression('exp 3');
    
    console.log('✅ Application Ready');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// =========================================================================
// CENTRAL BATTLE ENGINE CONTROLLER (INTEGRATED EXECUTION ENVIRONMENT)
// =========================================================================
const BattleModeLiveEngine = {
    state: {
        // TODAY LOGIC ANCHOR: Establishes static chronological baseline for calendar tracking
        todayKey: new Date().toISOString().split('T')[0],
        
        currentDailyXp: 0,   // PERMANENT METRIC: Powers progress rings and calendar analytics
        spendableXp: 0,      // SPENDABLE WALLET: Disposable currency used strictly for shop purchases
        dailyMaxXp: 300,
        midTermXp: 14200,
        midTermGoalXp: 50000,
        longTermXp: 0,       // Campaign tracker scale target: 50 Lakh (5,000,000) XP
        
        // Baseline operational array populated dynamically via the local Groq route
        tasks: [
            { id: 'ai_1', name: "Master VTU Question Paper Scanners: Math & AI Foundations", xp: 75, isAi: true, completed: false, timeRemaining: 3600, timerActive: false },
            { id: 'ai_2', name: "Execute High-Intensity Calisthenics Routine & Skincare Sequence", xp: 65, isAi: true, completed: false, timeRemaining: 1800, timerActive: false },
            { id: 'ai_3', name: "Core Scripting: Build Static Layer Compilers for Webview Layouts", xp: 80, isAi: true, completed: false, timeRemaining: 5400, timerActive: false },
            { id: 'user_1', name: "Editable User Objective Slot 01", xp: 35, isAi: false, completed: false, timeRemaining: 1200, timerActive: false },
            { id: 'user_2', name: "Editable User Objective Slot 02", xp: 40, isAi: false, completed: false, timeRemaining: 1200, timerActive: false }
        ],
        
        rewards: [
            { id: 'ai_novel', name: "Read 2 Chapters of Original Psychological Light Novel", cost: 300, isAi: true },
            { id: 'user_rew_1', name: "Watch YouTube / TV Series (30 Mins)", cost: 40, isAi: false },
            { id: 'user_rew_2', name: "Eat Cheat Snack / Premium Meal", cost: 60, isAi: false }
        ],
        
        calendarHistory: {}
    },

    init: async function() {
        if (!this.state.calendarHistory[this.state.todayKey]) {
            this.state.calendarHistory[this.state.todayKey] = 'INCOMPLETE';
        }

        // Render localized DOM structures instantly on bootstrap
        this.renderTaskMatrix();
        this.renderRewardShop();
        this.renderLiveCalendar();
        this.updateCircularProgressRings();
        this.startGlobalClockLoop();
        
        // Execute asynchronous Groq parameters mapping fetch layer
        await this.fetchAiTailoredDirectives();
    },

    // ASYNC GROQ BRIDGE PARSING PIPELINE
    fetchAiTailoredDirectives: async function() {
        const apiBaseUrl = window.AOI_API_BASE_URL || 'http://localhost:3000';
        try {
            const response = await fetch(`${apiBaseUrl}/api/battle-mode/daily-setup`);
            if (!response.ok) throw new Error("Server communication fault");
            const data = await response.json();

            if (data && data.tasks) {
                // Overlay Groq content arrays directly onto current active task states
                data.tasks.forEach((incomingTask, idx) => {
                    if (this.state.tasks[idx] && this.state.tasks[idx].isAi) {
                        this.state.tasks[idx].name = incomingTask.name;
                    }
                });
                
                const aiRewardLabel = document.getElementById("ai-exclusive-reward-text");
                if (aiRewardLabel && data.reward) {
                    aiRewardLabel.innerText = `${data.reward} (Unlocks at 300 Daily XP)`;
                }
                this.renderTaskMatrix();
            }
        } catch (err) {
            console.warn("System Matrix running via verified local baseline protocol:", err.message);
        }
    },

    // TASK CHECKBOX HOOK: INCREMENTS PERMANENT AND SPENDABLE ARRAYS SIMULTANEOUSLY
    toggleTaskCompletion: function(taskId, isChecked) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.completed = isChecked;
        if (isChecked) {
            task.timerActive = false; // Halt active countdown ticker immediately
            
            this.state.currentDailyXp += task.xp;
            this.state.spendableXp += task.xp; // Bank spendable points safely without spoiling target arcs
            
            this.state.midTermXp += task.xp;
            this.state.longTermXp += task.xp;
        } else {
            this.state.currentDailyXp -= task.xp;
            this.state.spendableXp -= task.xp;
            
            this.state.midTermXp -= task.xp;
            this.state.longTermXp -= task.xp;
        }

        this.evaluateCalendarDayRule();
        this.updateCircularProgressRings();
        this.renderTaskMatrix();
        this.renderRewardShop(); // Keep shop claim button locking vectors up to date
    },

    // TIMER MUTEX CONTROLLER
    engageTaskTimer: function(taskId) {
        this.state.tasks.forEach(task => {
            if (task.id === taskId && !task.completed) {
                task.timerActive = !task.timerActive;
            } else {
                task.timerActive = false; // Restrict execution bounds to one running counter at a time
            }
        });
        this.renderTaskMatrix();
    },

    updateTaskName: function(taskId, updatedName) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (task && !task.isAi) task.name = updatedName;
    },

    updateRewardName: function(rewardId, newName) {
        const reward = this.state.rewards.find(r => r.id === rewardId);
        if (reward && !reward.isAi) {
            reward.name = newName;
        }
    },

    // LIVE REWARD SHOP TRANSACTION LOGIC (PREVENTS PROGRESS UNDOING)
    redeemReward: function(rewardId) {
        const reward = this.state.rewards.find(r => r.id === rewardId);
        if (!reward) return;

        // Audit check hits separate spendableXp pool only
        if (this.state.spendableXp >= reward.cost) {
            this.state.spendableXp -= reward.cost; 
            
            alert(`[REWARD CLAIMED] Unlocked: ${reward.name}`);
            
            // Re-render shop text values. Note: updateCircularProgressRings is NOT triggered 
            // because your analytics metrics and progress circles are completely safe.
            this.renderRewardShop();
        } else {
            alert(`[TRANSACTION DENIED] You need ${reward.cost - this.state.spendableXp} more XP.`);
        }
    },

    // CALENDAR STREAK AUDITOR (150 XP STRIKE CONDITION)
    evaluateCalendarDayRule: function() {
        if (this.state.currentDailyXp >= 150) {
            this.state.calendarHistory[this.state.todayKey] = 'PASSED';
        } else {
            this.state.calendarHistory[this.state.todayKey] = 'FAILED';
        }
        this.renderLiveCalendar();
    },

    // PROGRESS RING TRIGONOMETRIC INTERFACES
    updateCircularProgressRings: function() {
        updateProgressRing("circle-daily-offset", "text-daily-xp", this.state.currentDailyXp, this.state.dailyMaxXp);
        updateProgressRing("circle-midterm-offset", "text-midterm-xp", this.state.midTermXp, this.state.midTermGoalXp);
        updateProgressRing("circle-longterm-offset", "text-longterm-xp", this.state.currentDailyXp, this.state.dailyMaxXp);
        
        // Overwrite the long-term text label to show the actual long-term XP value
        const txtLong = document.getElementById("text-longterm-xp");
        if (txtLong) txtLong.innerText = this.state.longTermXp;

        const headerText = document.getElementById("live-xp-counter-top");
        if (headerText) headerText.innerText = `BATTLE MODE ACTIVE // CURRENT DAILY XP: ${this.state.currentDailyXp} / ${this.state.dailyMaxXp}`;
    },

    renderTaskMatrix: function() {
        const container = document.getElementById("battle-task-list");
        if (!container) return;
        container.innerHTML = "";

        this.state.tasks.forEach(task => {
            const card = document.createElement("div");
            card.style = `display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; border: ${task.isAi ? '2px solid #000' : '1px dashed #666'}; background: ${task.completed ? '#f0f0f0' : '#fff'}; font-family: monospace;`;

            const min = Math.floor(task.timeRemaining / 60);
            const sec = task.timeRemaining % 60;
            const clockDisplay = `${min}:${sec < 10 ? '0' : ''}${sec}`;

            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; width: 70%;">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="BattleModeLiveEngine.toggleTaskCompletion('${task.id}', this.checked)">
                    <span style="font-weight: bold;">[+${task.xp} XP]</span>
                    ${task.isAi 
                        ? `<span style="font-weight: bold; font-size: 11px;">${task.name} <span style="color:#c00;">[SHOULD DO]</span></span>` 
                        : `<input type="text" value="${task.name}" style="border: none; border-bottom: 1px solid #ccc; font-size: 11px; width: 70%; font-family: monospace;" onchange="BattleModeLiveEngine.updateTaskName('${task.id}', this.value)">`
                    }
                </div>
                <div style="display: flex; align-items: center; gap: 12px; width: 30%; justify-content: flex-end;">
                    <span id="timer-display-${task.id}" style="font-weight: bold; font-size: 14px; color: ${task.timerActive ? '#c00' : '#000'}">${clockDisplay}</span>
                    <button style="background: #000; color: #fff; border: none; padding: 4px 8px; font-size: 11px; cursor: pointer;" onclick="BattleModeLiveEngine.engageTaskTimer('${task.id}')">
                        ${task.timerActive ? 'PAUSE' : 'ENGAGE'}
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    renderRewardShop: function() {
        const container = document.getElementById("reward-shop-list");
        if (!container) return;
        container.innerHTML = "";

        // RENDER LIVE INTERACTIVE HEADLINE: Tracks the real spendable currency engine metrics
        const balanceHeader = document.createElement("div");
        balanceHeader.style = "padding: 8px; margin-bottom: 12px; background: #000; color: #fff; font-family: monospace; font-size: 11px; font-weight: bold; text-align: center; border: 2px solid #000;";
        balanceHeader.innerText = `REWARD WALLET BALANCE: ${this.state.spendableXp} XP CORES AVAILABLE`;
        container.appendChild(balanceHeader);

        this.state.rewards.forEach(reward => {
            const card = document.createElement("div");
            card.style = `background: #fff; padding: 12px; border: 1px solid #000; margin-bottom: 10px; font-family: monospace; display: flex; flex-direction: column; gap: 6px; color: #000;`;
            
            const canAfford = this.state.spendableXp >= reward.cost;

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <span style="font-size: 10px; font-weight: bold; color: ${reward.isAi ? '#c00' : '#666'}">
                        ${reward.isAi ? '[AI PREMIUM STRETCH]' : '[EDITABLE ASSET]'}
                    </span>
                    <span style="background: #000; color: #fff; padding: 2px 6px; font-size: 10px; font-weight: bold;">
                        ${reward.cost} XP
                    </span>
                </div>
                <div style="margin: 4px 0;">
                    ${reward.isAi 
                        ? `<span style="font-size: 12px; font-weight: bold;">${reward.name}</span>`
                        : `<input type="text" value="${reward.name}" style="width: 100%; border: none; border-bottom: 1px dashed #ccc; font-size: 12px; font-family: monospace; padding: 2px 0; background: transparent;" onchange="BattleModeLiveEngine.updateRewardName('${reward.id}', this.value)">`
                    }
                </div>
                <button style="width: 100%; border: none; padding: 6px; background: ${canAfford ? '#000' : '#ccc'}; color: ${canAfford ? '#fff' : '#666'}; font-family: monospace; font-size: 11px; cursor: ${canAfford ? 'pointer' : 'not-allowed'}; font-weight: bold;"
                    onclick="BattleModeLiveEngine.redeemReward('${reward.id}')" ${canAfford ? '' : 'disabled'}>
                    ${canAfford ? 'CLAIM REWARD DEPLOYMENT' : 'LOCKED (INSUFFICIENT XP BALANCE)'}
                </button>
            `;
            container.appendChild(card);
        });
    },

    renderLiveCalendar: function() {
        const grid = document.getElementById("live-calendar-grid");
        if (!grid) return;
        grid.innerHTML = "";

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayNum = date.getDate();

            const cell = document.createElement("div");
            cell.style = "border: 1px solid #000; padding: 5px; text-align: center; font-size: 11px; font-family: monospace;";

            const status = this.state.calendarHistory[dateStr];

            if (dateStr === this.state.todayKey) {
                if (this.state.currentDailyXp < 150) {
                    cell.style.background = "#ffcccc";
                    cell.innerHTML = `<span>${dayNum}</span><b style="color: #c00; display: block; font-size: 14px;">✗</b>`;
                } else {
                    cell.style.background = "#ccffcc";
                    cell.innerHTML = `<span>${dayNum}</span><b style="color: #0c0; display: block; font-size: 14px;">✓</b>`;
                }
            } else if (status === 'PASSED') {
                cell.style.background = "#ccffcc";
                cell.innerHTML = `<span>${dayNum}</span><b style="color: #0c0; display: block; font-size: 14px;">✓</b>`;
            } else if (status === 'FAILED') {
                cell.style.background = "#ffcccc";
                cell.innerHTML = `<span>${dayNum}</span><b style="color: #c00; display: block; font-size: 14px;">✗</b>`;
            } else {
                cell.innerHTML = `<span>${dayNum}</span><span style="color: #999; display: block; font-size: 14px;">-</span>`;
            }
            grid.appendChild(cell);
        }
    },

    // PERFORMANCE TIMER TRACKING ENGINE
    startGlobalClockLoop: function() {
        if (this.clockIntervalId) clearInterval(this.clockIntervalId);
        
        this.clockIntervalId = setInterval(() => {
            const activeTask = this.state.tasks.find(t => t.timerActive && !t.completed);
            if (activeTask && activeTask.timeRemaining > 0) {
                activeTask.timeRemaining--;
                const label = document.getElementById(`timer-display-${activeTask.id}`);
                if (label) {
                    const min = Math.floor(activeTask.timeRemaining / 60);
                    const sec = activeTask.timeRemaining % 60;
                    label.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
                }
            }
        }, 1000);
    }
};

document.addEventListener("DOMContentLoaded", () => BattleModeLiveEngine.init());

// =========================================================================
// RESILIENT FIRESTORE HANDSHAKE & DASHBOARD SYNC ENGINE
// =========================================================================

const DashboardCloudSyncEngine = {
    // RESOLVE INTERFACE HANDSHAKE: Dynamically maps the correct active global database pointer
    getDb: function() {
        const db = window.firebaseDB || window.firestoreDB || window.db;
        if (!db) {
            console.warn("[HANDSHAKE WARN] Database reference not detected yet. Retrying context loop...");
        }
        return db;
    },

    // 1. PROFILE CONTEXT INTERFACE
    saveProfileToFirebase: async function() {
        const db = this.getDb();
        if (!db) return alert("[HANDSHAKE ERROR] Cloud connection offline. Check config.js mapping.");

        const payload = {
            academic: document.getElementById("input-academic-details")?.value || "",
            routine: document.getElementById("input-routine-constraints")?.value || "",
            physical: document.getElementById("input-physical-metrics")?.value || "",
            skincare: document.getElementById("input-skincare-diet")?.value || "",
            timestamp: new Date().toISOString()
        };

        const btn = document.getElementById("btn-save-profile") || document.querySelector("button[onclick*='saveProfileToFirebase']");
        if (btn) btn.innerText = "LINKING PROTOCOLS...";

        try {
            // Standard Firestore v8 Namespaced write structure
            await db.collection('userProfiles').doc('currentProfile').set(payload);
            alert("[FIRESTORE SUCCESS] Context payload successfully written to cloud.");
        } catch (err) {
            console.warn("Namespaced write failed, trying modular v9 compatibility fallback...", err);
            try {
                // Standalone Modular SDK v9 fallback injection handler
                const { doc, setDoc } = window.FirebaseFirestore || {};
                if (doc && setDoc) {
                    await setDoc(doc(db, 'userProfiles', 'currentProfile'), payload);
                    alert("[FIRESTORE SUCCESS] Context updated via Modular Adapter.");
                } else {
                    throw new Error("No usable Firestore SDK API structure found in scope.");
                }
            } catch (fallbackErr) {
                console.error("Critical Connection Fault:", fallbackErr);
                alert("[SYNC CRASH] Handshake rejected by database. See browser console for diagnostic logs.");
            }
        } finally {
            if (btn) btn.innerText = "Save to Cloud";
        }
    },

    loadProfileFromFirebase: function() {
        const db = this.getDb();
        if (!db) return;

        const populateUI = (data) => {
            if (document.getElementById("input-academic-details")) document.getElementById("input-academic-details").value = data.academic || "";
            if (document.getElementById("input-routine-constraints")) document.getElementById("input-routine-constraints").value = data.routine || "";
            if (document.getElementById("input-physical-metrics")) document.getElementById("input-physical-metrics").value = data.physical || "";
            if (document.getElementById("input-skincare-diet")) document.getElementById("input-skincare-diet").value = data.skincare || "";
        };

        db.collection('userProfiles').doc('currentProfile').get()
        .then((docSnap) => {
            if (docSnap.exists) populateUI(docSnap.data());
        })
        .catch(() => {
            try {
                const { doc, getDoc } = window.FirebaseFirestore || {};
                if (doc && getDoc) {
                    getDoc(doc(db, 'userProfiles', 'currentProfile')).then(s => { if (s.exists()) populateUI(s.data()); });
                }
            } catch (e) { console.log("[INFO] Profile local sync deferred."); }
        });
    },

    // 2. DISTRACTION TRACKER INTERFACE
    logDistraction: async function() {
        const db = this.getDb();
        const typeEl = document.getElementById("select-distraction-type");
        const dateEl = document.getElementById("input-distraction-date");
        const timeEl = document.getElementById("input-distraction-time");
        const durationEl = document.getElementById("input-distraction-duration");

        if (!typeEl || !dateEl || !durationEl || !durationEl.value) {
            alert("[INPUT ERROR] Please complete all parameters before logging.");
            return;
        }

        const logEntry = {
            type: typeEl.value,
            date: dateEl.value, // Expected string formatting: YYYY-MM-DD
            time: timeEl.value || "00:00",
            duration: parseInt(durationEl.value, 10) || 0,
            recordedAt: new Date().toISOString()
        };

        try {
            await db.collection('distractionLogs').add(logEntry);
            durationEl.value = ""; 
            this.syncDistractionMetrics();
        } catch (err) {
            console.warn("Logging fallback invoked...");
            try {
                const { collection, addDoc } = window.FirebaseFirestore || {};
                if (collection && addDoc) {
                    await addDoc(collection(db, 'distractionLogs'), logEntry);
                    durationEl.value = "";
                    this.syncDistractionMetrics();
                }
            } catch (e) { console.error("Firestore dropped entry write execution:", e); }
        }
    },

    syncDistractionMetrics: function() {
        const db = this.getDb();
        if (!db) return;

        const processLogs = (querySnapshot) => {
            const todayStr = new Date().toISOString().split('T')[0];
            let todayMin = 0, weeklyMin = 0, monthlyMin = 0;
            const now = new Date();

            querySnapshot.forEach((docDoc) => {
                const log = docDoc.data ? docDoc.data() : docDoc;
                const logDate = new Date(log.date);
                const duration = log.duration || 0;

                if (log.date === todayStr) todayMin += duration;
                
                const daysDiff = (now - logDate) / (1000 * 60 * 60 * 24);
                if (daysDiff <= 7) weeklyMin += duration;
                if (daysDiff <= 30) monthlyMin += duration;
            });

            if (document.getElementById("today-distractions-count")) document.getElementById("today-distractions-count").innerText = todayMin;
            if (document.getElementById("weekly-distractions-count")) document.getElementById("weekly-distractions-count").innerText = weeklyMin;
            if (document.getElementById("monthly-distractions-count")) document.getElementById("monthly-distractions-count").innerText = monthlyMin;
        };

        db.collection('distractionLogs').get()
        .then(processLogs)
        .catch(() => {
            try {
                const { collection, getDocs } = window.FirebaseFirestore || {};
                if (collection && getDocs) {
                    getDocs(collection(db, 'distractionLogs')).then(processLogs);
                }
            } catch (e) { console.log("[INFO] Distraction lookup deferred."); }
        });
    },

    // 3. DYNAMIC SYSTEM-CLOCK CALENDAR MATRIX GENERATION LAYER
    renderFullMonthCalendar: function() {
        const grid = document.getElementById("full-month-calendar-grid") || document.getElementById("calendar-grid");
        if (!grid) return;
        grid.innerHTML = "";

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed (Jan = 0)
        const todayDate = now.getDate();

        // Get total days in the current month dynamically
        const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Set month & year title text
        const titleEl = document.getElementById("calendar-month-year");
        if (titleEl) {
            const MONTH_NAMES = [
                "January", "February", "March", "April", "May", "June", 
                "July", "August", "September", "October", "November", "December"
            ];
            titleEl.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
        }

        const historicalLedger = (window.BattleModeLiveEngine && window.BattleModeLiveEngine.state) 
            ? window.BattleModeLiveEngine.state.calendarHistory || {} 
            : {};

        const currentXp = (window.BattleModeLiveEngine && window.BattleModeLiveEngine.state)
            ? window.BattleModeLiveEngine.state.currentDailyXp || 0
            : 0;

        const todayKey = (window.BattleModeLiveEngine && window.BattleModeLiveEngine.state)
            ? window.BattleModeLiveEngine.state.todayKey
            : new Date().toISOString().split('T')[0];

        for (let day = 1; day <= totalDays; day++) {
            const formattedMonth = String(currentMonth + 1).padStart(2, '0');
            const formattedDay = String(day).padStart(2, '0');
            const loopDateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

            const cell = document.createElement("div");
            cell.className = "calendar-matrix-cell";

            const dayLabel = document.createElement("span");
            dayLabel.className = "day-number";
            dayLabel.innerText = day;
            cell.appendChild(dayLabel);

            const status = historicalLedger[loopDateStr];

            // Check if this day is today (active day)
            const isToday = (day === todayDate && now.getMonth() === currentMonth && now.getFullYear() === currentYear);

            if (isToday) {
                cell.classList.add("today-active");
                
                // Active indicator with ⚡ icon
                const indicator = document.createElement("div");
                indicator.className = "active-indicator";
                indicator.innerText = "⚡";
                cell.appendChild(indicator);
            } else if (status === 'PASSED') {
                const checkMark = document.createElement("b");
                checkMark.style = "color: #2ecc71; font-size: 14px; display:block; margin-top: 4px;";
                checkMark.innerText = "✓";
                cell.appendChild(checkMark);
                cell.style.background = "rgba(46, 204, 113, 0.15)";
                cell.style.borderColor = "#2ecc71";
            } else if (status === 'FAILED') {
                const crossMark = document.createElement("b");
                crossMark.style = "color: #ff4d4d; font-size: 14px; display:block; margin-top: 4px;";
                crossMark.innerText = "✗";
                cell.appendChild(crossMark);
                cell.style.background = "rgba(255, 77, 77, 0.15)";
                cell.style.borderColor = "#ff4d4d";
            } else {
                const emptyDot = document.createElement("span");
                emptyDot.style = "color: #444; font-size: 12px; display:block; margin-top: 4px;";
                emptyDot.innerText = "-";
                cell.appendChild(emptyDot);
            }

            grid.appendChild(cell);
        }
    }
};

// SAFE INITIALIZATION PIPELINE WITH LATENCY SAFETY BUFFER
window.addEventListener("DOMContentLoaded", () => {
    // Draw layout structure instantly using local metrics
    DashboardCloudSyncEngine.renderFullMonthCalendar();

    // 1. FORM INTERCEPTION: Profile save button click handler
    document.getElementById("btn-save-profile")?.addEventListener("click", function(event) {
        event.preventDefault(); // Prevents the browser from reloading and wiping inputs
        
        // Update local context state
        AppState.userContext = {
            academic: DOM.academicDetails?.value || '',
            routine: DOM.routineConstraints?.value || '',
            physical: DOM.physicalMetrics?.value || '',
            skincare: DOM.lifestyleRegimen?.value || ''
        };
        console.log('Profile saved (local context):', AppState.userContext);

        // Dynamic expression update
        const newExpression = evaluateEmotionState();
        if (newExpression !== AppState.currentExpression) {
            switchAvatarExpression(newExpression);
        }

        DashboardCloudSyncEngine.saveProfileToFirebase();
    });

    // 2. FORM INTERCEPTION & DISTRACTION TRACKER ENGINE: Distraction log button click handler
    document.getElementById("btn-log-distraction")?.addEventListener("click", function(event) {
        // 1. Critical Intercept: Stops the browser from reloading and wiping data
        event.preventDefault(); 

        // 2. Fetch DOM input references
        const typeEl = document.getElementById("select-distraction-type");
        const dateEl = document.getElementById("input-distraction-date");
        const durationEl = document.getElementById("input-distraction-duration");

        // 3. Validation Gate
        if (!typeEl || !dateEl || !durationEl || !durationEl.value) {
            console.warn("[VALIDATION] Missing fields. Operation aborted.");
            return;
        }

        // 4. Construct Payload
        const logPayload = {
            type: typeEl.value,
            date: dateEl.value,
            duration: parseInt(durationEl.value, 10) || 0,
            id: Date.now()
        };

        try {
            // 5. Pull, Push, and Commit to LocalStorage
            let currentLogs = JSON.parse(localStorage.getItem("antigravity_logs") || "[]");
            currentLogs.push(logPayload);
            localStorage.setItem("antigravity_logs", JSON.stringify(currentLogs));

            // 6. Visual Reset: Clear only the numeric input box, leaving selection intact
            durationEl.value = ""; 

            // 7. Dynamic Refresh: Recalculate today's totals immediately and re-render UI
            updateDistractionUI();
            
            // Dynamic expression update based on logged distraction count
            const newExpression = evaluateEmotionState();
            if (newExpression !== AppState.currentExpression) {
                switchAvatarExpression(newExpression);
            }
            
            console.log(`[METRICS] Local Storage updated successfully.`);
        } catch (e) {
            console.error("[METRICS ERROR] Failed to save distraction entry:", e);
        }
    });

    // Render distraction metrics and history list instantly on load
    updateDistractionUI();

    // Execute the cloud handshake check shortly after script loading completes
    setTimeout(() => {
        DashboardCloudSyncEngine.loadProfileFromFirebase();
        DashboardCloudSyncEngine.syncDistractionMetrics();
    }, 600);
});

// Distraction UI and History renderer
function updateDistractionUI() {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const currentLogs = JSON.parse(localStorage.getItem("antigravity_logs") || "[]");
        
        // 5. METRIC CALCULATION LOOP (NUMBER GOES UP)
        let totalMinutesToday = 0;
        currentLogs.forEach(log => {
            if (log.date === todayStr) {
                totalMinutesToday += parseInt(log.duration, 10) || 0;
            }
        });

        const displayCounter = document.getElementById("today-distractions-count");
        if (displayCounter) {
            displayCounter.innerText = `${totalMinutesToday} Min`;
        }
        
        // 6. RECENT HISTORY DISPLAY (HISTORY SHOWS DOWN)
        const historyContainer = document.getElementById("distraction-history-list");
        if (historyContainer) {
            historyContainer.innerHTML = "";
            const sortedLogs = [...currentLogs].reverse();
            sortedLogs.forEach(log => {
                const item = document.createElement("div");
                item.className = "distraction-history-item";
                item.style = "padding: 8px; margin-bottom: 8px; background: rgba(255,255,255,0.05); border-left: 3px solid #ff4d4d; border-radius: 4px; font-family: monospace; font-size: 13px; color: #fff;";
                
                // Display the date, distraction type, and duration
                item.innerHTML = `
                    <span style="color: #888;">${log.date}</span> | 
                    <span style="color: #ff4d4d; font-weight: bold; text-transform: uppercase;">${log.type}</span> | 
                    <span style="color: #00F5A0;">${log.duration} Min</span>
                `;
                historyContainer.appendChild(item);
            });
        }
        
        console.log(`[METRICS] Today's Total Distractions: ${totalMinutesToday} Min`);
    } catch (e) {
        console.error("[METRICS ERROR] Failed to update display UI:", e);
    }
}

