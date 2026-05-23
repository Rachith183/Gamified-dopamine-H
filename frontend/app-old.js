/**
 * INTERACTIVE CHARACTER BUILD AI - COMPLETE REWRITE
 * Features: Firebase sync, Expression system, Audio animations, Emotion routing
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const EXPRESSION_MAP = {
    'exp 1': 'exp 1 - angry',
    'exp 2': 'exp 2 - annoyed or disatisfied',
    'exp 3': 'exp3-proud or satisfied',
    'exp 4': 'exp 4 - smiling'
};

// ============================================================================
// APPLICATION STATE
// ============================================================================

const AppState = {
    currentYear: 2026,
    currentMonth: 4, // 0-indexed: May
    currentPanel: 'ch-core',
    currentExpression: 'exp 3',
    sidebarOpen: false,
    
    // Firebase data
    userProfile: {},
    userGoals: {
        daily: 0,
        midterm: 0,
        endgoal: 0
    },
    userCalendar: {},
    userDistractions: [],
    userContext: {},
};

// ============================================================================
// ANIMATION STATE
// ============================================================================

const AnimationState = {
    // Mouth layers
    mouthClosed: 1.0,
    mouthMiddling: 0.0,
    mouthOpen: 0.0,
    
    // Eye layers
    eyeOpen: 1.0,
    eyeAnnoyed: 0.0,
    eyeHalfClosed: 0.0,
    
    // Blinking
    isBlinking: false,
    blinkCycle: 0,
    blinkDuration: 150,
    blinkInterval: 3000,
    lastBlinkTime: 0,
    
    // Speech
    isSpeaking: false,
    currentAudioDuration: 0,
    animationStartTime: 0,
    mouthCycleProgress: 0,
    animationFrameId: null,
};

// ============================================================================
// DOM REFERENCES
// ============================================================================

const DOM = {
    // Header & Sidebar
    sidebarToggle: document.getElementById('sidebar-toggle-btn'),
    sidebar: document.getElementById('app-sidebar'),
    sidebarItems: document.querySelectorAll('.sidebar-nav-item'),
    contentViewport: document.getElementById('content-viewport'),
    
    // Panels
    allPanels: document.querySelectorAll('.app-panel'),
    panelChCore: document.getElementById('panel-ch-core'),
    panelGoals: document.getElementById('panel-goal-tracker'),
    panelCalendar: document.getElementById('panel-calendar'),
    panelDistraction: document.getElementById('panel-distraction'),
    panelProfile: document.getElementById('panel-profile'),
    
    // Avatar
    avatarBase: document.getElementById('avatar-base'),
    avatarCanvas: document.getElementById('avatar-canvas'),
    
    // Chat
    chatHistory: document.getElementById('chat-history'),
    chatInput: document.getElementById('chat-input'),
    chatSendBtn: document.getElementById('chat-send-btn'),
    
    // Calendar
    calendarGrid: document.getElementById('calendar-grid'),
    calendarTitle: document.getElementById('calendar-month-year'),
    prevMonthBtn: document.getElementById('prev-month-btn'),
    nextMonthBtn: document.getElementById('next-month-btn'),
    
    // Goals
    dailyProgress: document.getElementById('daily-progress'),
    midtermProgress: document.getElementById('midterm-progress'),
    endgoalProgress: document.getElementById('endgoal-progress'),
    dailyValue: document.getElementById('daily-value'),
    midtermValue: document.getElementById('midterm-value'),
    endgoalValue: document.getElementById('endgoal-value'),
    performanceTbody: document.getElementById('performance-tbody'),
    
    // Distraction
    distractionForm: document.getElementById('distraction-form'),
    dailyDistractionCount: document.getElementById('daily-distraction-count'),
    weeklyDistractionCount: document.getElementById('weekly-distraction-count'),
    monthlyDistractionCount: document.getElementById('monthly-distraction-count'),
    distractionEntries: document.getElementById('distraction-entries'),
    
    // Profile
    profileForm: document.getElementById('profile-form'),
    academicDetails: document.getElementById('academic-details'),
    routineConstraints: document.getElementById('routine-constraints'),
    physicalMetrics: document.getElementById('physical-metrics'),
    lifestyleRegimen: document.getElementById('lifestyle-regimen'),
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
    
    // Hide all panels
    DOM.allPanels.forEach(panel => panel.classList.add('hidden'));
    
    // Show selected panel
    const selectedPanel = document.getElementById(`panel-${panelName}`);
    if (selectedPanel) {
        selectedPanel.classList.remove('hidden');
    }
    
    // Close sidebar on mobile
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
    
    // Update title
    DOM.calendarTitle.textContent = `${MONTH_NAMES[month]} ${year}`;
    
    // Clear grid
    DOM.calendarGrid.innerHTML = '';
    
    // Get first day and day count
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Add empty cells before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day-cell empty';
        DOM.calendarGrid.appendChild(emptyCell);
    }
    
    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        cell.textContent = day;
        
        // Check if date has >= 2 tasks
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
    AppState.currentExpression = expressionState;
    const folderMap = EXPRESSION_MAP;
    const folder = folderMap[expressionState] || folderMap['exp 3'];
    
    const newSrc = `./${folder}/idle.png`;
    
    // Fade out
    DOM.avatarBase.style.opacity = '0.5';
    
    // Switch and fade in
    setTimeout(() => {
        DOM.avatarBase.src = newSrc;
        DOM.avatarBase.style.opacity = '1';
    }, 150);
}

function evaluateEmotionState() {
    // Calculate emotion based on metrics
    const distractionCount = AppState.userDistractions.filter(
        d => d.date === new Date().toISOString().split('T')[0]
    ).length;
    
    const dailyProgress = AppState.userGoals.daily || 0;
    const hasContext = Object.keys(AppState.userContext).length > 0;
    
    // exp 1 - angry: zero tasks in 48h
    // exp 2 - annoyed: distractions >= 3 or daily < 30%
    // exp 3 - proud: daily target met or has structured context
    // exp 4 - smiling: distraction >= 3 with low completion
    
    if (distractionCount >= 3 && dailyProgress < 40) {
        return 'exp 4'; // sardonic smile
    } else if (distractionCount >= 3) {
        return 'exp 2'; // annoyed
    } else if (dailyProgress >= 70 || hasContext) {
        return 'exp 3'; // proud/satisfied
    } else if (dailyProgress < 30) {
        return 'exp 1'; // angry
    }
    
    return 'exp 3'; // default
}

// ============================================================================
// ANIMATION ENGINE: MOUTH & EYES
// ============================================================================

function lerp(current, target, factor) {
    return current + (target - current) * factor;
}

function updateMouthLayers() {
    if (!document.getElementById('mouth-closed')) {
        const closedImg = document.createElement('img');
        closedImg.id = 'mouth-closed';
        closedImg.src = './mouth(use for speaking animation and expression and generation)/mouth_closed.png';
        closedImg.className = 'mouth-layer';
        DOM.avatarCanvas.appendChild(closedImg);
        
        const middlingImg = document.createElement('img');
        middlingImg.id = 'mouth-middling';
        middlingImg.src = './mouth(use for speaking animation and expression and generation)/mouth_middling.png';
        middlingImg.className = 'mouth-layer';
        DOM.avatarCanvas.appendChild(middlingImg);
        
        const openImg = document.createElement('img');
        openImg.id = 'mouth-open';
        openImg.src = './mouth(use for speaking animation and expression and generation)/mouth_open.png';
        openImg.className = 'mouth-layer';
        DOM.avatarCanvas.appendChild(openImg);
    }
    
    const mouthClosed = document.getElementById('mouth-closed');
    const mouthMiddling = document.getElementById('mouth-middling');
    const mouthOpen = document.getElementById('mouth-open');
    
    if (mouthClosed) mouthClosed.style.opacity = AnimationState.mouthClosed.toFixed(2);
    if (mouthMiddling) mouthMiddling.style.opacity = AnimationState.mouthMiddling.toFixed(2);
    if (mouthOpen) mouthOpen.style.opacity = AnimationState.mouthOpen.toFixed(2);
}

function updateEyeLayers() {
    if (!document.getElementById('eye-open')) {
        const openImg = document.createElement('img');
        openImg.id = 'eye-open';
        openImg.src = './eyes (  use blinking animation and expression  and emotiongeneration)/full opened eye.png';
        openImg.className = 'eye-layer';
        DOM.avatarCanvas.appendChild(openImg);
        
        const annoyedImg = document.createElement('img');
        annoyedImg.id = 'eye-annoyed';
        annoyedImg.src = './eyes (  use blinking animation and expression  and emotiongeneration)/annoyed_eye.png';
        annoyedImg.className = 'eye-layer';
        DOM.avatarCanvas.appendChild(annoyedImg);
        
        const halfClosedImg = document.createElement('img');
        halfClosedImg.id = 'eye-half-closed';
        halfClosedImg.src = './eyes (  use blinking animation and expression  and emotiongeneration)/half closed eye.png';
        halfClosedImg.className = 'eye-layer';
        DOM.avatarCanvas.appendChild(halfClosedImg);
    }
    
    const eyeOpen = document.getElementById('eye-open');
    const eyeAnnoyed = document.getElementById('eye-annoyed');
    const eyeHalfClosed = document.getElementById('eye-half-closed');
    
    if (eyeOpen) eyeOpen.style.opacity = AnimationState.eyeOpen.toFixed(2);
    if (eyeAnnoyed) eyeAnnoyed.style.opacity = AnimationState.eyeAnnoyed.toFixed(2);
    if (eyeHalfClosed) eyeHalfClosed.style.opacity = AnimationState.eyeHalfClosed.toFixed(2);
}

function updatePhoneticMouthCycle(progress) {
    const cyclePhase = progress % 1.0;
    const lerpFactor = 0.25;
    
    if (cyclePhase < 0.33) {
        // Opening
        AnimationState.mouthClosed = lerp(AnimationState.mouthClosed, 0.0, lerpFactor);
        AnimationState.mouthMiddling = lerp(AnimationState.mouthMiddling, 0.3, lerpFactor);
        AnimationState.mouthOpen = lerp(AnimationState.mouthOpen, 0.7, lerpFactor);
    } else if (cyclePhase < 0.66) {
        // Transition
        AnimationState.mouthOpen = lerp(AnimationState.mouthOpen, 0.1, lerpFactor);
        AnimationState.mouthMiddling = lerp(AnimationState.mouthMiddling, 0.9, lerpFactor);
        AnimationState.mouthClosed = lerp(AnimationState.mouthClosed, 0.0, lerpFactor);
    } else {
        // Consonant/Pause
        AnimationState.mouthMiddling = lerp(AnimationState.mouthMiddling, 0.2, lerpFactor);
        AnimationState.mouthClosed = lerp(AnimationState.mouthClosed, 0.8, lerpFactor);
        AnimationState.mouthOpen = lerp(AnimationState.mouthOpen, 0.0, lerpFactor);
    }
}

function updateBlinkAnimation(currentTime) {
    const timeSinceLastBlink = currentTime - AnimationState.lastBlinkTime;
    
    if (timeSinceLastBlink >= AnimationState.blinkInterval) {
        AnimationState.isBlinking = true;
        AnimationState.blinkCycle = 0;
        AnimationState.lastBlinkTime = currentTime;
    }
    
    if (AnimationState.isBlinking) {
        const blinkProgress = (AnimationState.blinkCycle / AnimationState.blinkDuration) * 2;
        
        if (blinkProgress < 1.0) {
            AnimationState.eyeOpen = lerp(AnimationState.eyeOpen, 0.0, 0.15);
            AnimationState.eyeHalfClosed = lerp(AnimationState.eyeHalfClosed, 1.0, 0.15);
        } else {
            AnimationState.eyeHalfClosed = lerp(AnimationState.eyeHalfClosed, 0.0, 0.15);
            AnimationState.eyeOpen = lerp(AnimationState.eyeOpen, 1.0, 0.15);
        }
        
        AnimationState.blinkCycle += 16;
        if (AnimationState.blinkCycle >= AnimationState.blinkDuration * 2) {
            AnimationState.isBlinking = false;
            AnimationState.eyeOpen = 1.0;
            AnimationState.eyeHalfClosed = 0.0;
        }
    }
}

function updateEmotionState() {
    const distractionCount = AppState.userDistractions.filter(
        d => d.date === new Date().toISOString().split('T')[0]
    ).length;
    
    const threshold = 2;
    const lerpFactor = 0.1;
    
    if (distractionCount >= threshold) {
        AnimationState.eyeOpen = lerp(AnimationState.eyeOpen, 0.0, lerpFactor);
        AnimationState.eyeAnnoyed = lerp(AnimationState.eyeAnnoyed, 1.0, lerpFactor);
    } else {
        AnimationState.eyeOpen = lerp(AnimationState.eyeOpen, 1.0, lerpFactor);
        AnimationState.eyeAnnoyed = lerp(AnimationState.eyeAnnoyed, 0.0, lerpFactor);
    }
}

function animationLoop(currentTime) {
    updateEmotionState();
    
    if (AnimationState.isSpeaking && AnimationState.currentAudioDuration > 0) {
        const elapsedTime = currentTime - AnimationState.animationStartTime;
        const progress = elapsedTime / (AnimationState.currentAudioDuration * 1000);
        
        if (progress < 1.0) {
            const cycleSpeed = (150 / AnimationState.currentAudioDuration) * 1000;
            AnimationState.mouthCycleProgress = (elapsedTime % cycleSpeed) / cycleSpeed;
            updatePhoneticMouthCycle(AnimationState.mouthCycleProgress);
        } else {
            AnimationState.isSpeaking = false;
            AnimationState.mouthClosed = lerp(AnimationState.mouthClosed, 1.0, 0.2);
            AnimationState.mouthMiddling = lerp(AnimationState.mouthMiddling, 0.0, 0.2);
            AnimationState.mouthOpen = lerp(AnimationState.mouthOpen, 0.0, 0.2);
        }
    } else if (!AnimationState.isSpeaking) {
        AnimationState.mouthClosed = lerp(AnimationState.mouthClosed, 1.0, 0.2);
        AnimationState.mouthMiddling = lerp(AnimationState.mouthMiddling, 0.0, 0.2);
        AnimationState.mouthOpen = lerp(AnimationState.mouthOpen, 0.0, 0.2);
    }
    
    updateBlinkAnimation(currentTime);
    updateMouthLayers();
    updateEyeLayers();
    
    AnimationState.animationFrameId = requestAnimationFrame(animationLoop);
}

function startSpeechAnimation(audioDuration) {
    AnimationState.isSpeaking = true;
    AnimationState.currentAudioDuration = audioDuration;
    AnimationState.animationStartTime = performance.now();
}

function stopSpeechAnimation() {
    AnimationState.isSpeaking = false;
}

function initAnimationEngine() {
    updateMouthLayers();
    updateEyeLayers();
    AnimationState.animationFrameId = requestAnimationFrame(animationLoop);
}

// ============================================================================
// CHAT & GEMINI INTEGRATION
// ============================================================================

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

async function callGeminiAPI(userMessage) {
    const apiKey = window.AOI_GEMINI_API_KEY;
    const model = window.AOI_GEMINI_MODEL || 'gemini-2.5-flash';
    
    if (!apiKey) {
        console.error('Gemini API key not found');
        return null;
    }
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: userMessage
                    }]
                }]
            })
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        
        // Evaluate emotion and get expression
        const emotionExpression = evaluateEmotionState();
        
        return {
            character_dialogue: text,
            current_expression_state: emotionExpression
        };
    } catch (error) {
        console.error('Gemini API error:', error);
        return null;
    }
}

async function generateAndPlayAudio(text) {
    try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        const wordCount = text.split(' ').length;
        const estimatedDuration = (wordCount * 0.15) + 0.5;
        
        utterance.onstart = () => startSpeechAnimation(estimatedDuration);
        utterance.onend = () => stopSpeechAnimation();
        
        speechSynthesis.speak(utterance);
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
        const response = await callGeminiAPI(userMessage);
        
        if (response && response.character_dialogue) {
            const aiMsgEl = document.createElement('div');
            aiMsgEl.className = 'chat-message ai';
            aiMsgEl.innerHTML = `<p>${escapeHtml(response.character_dialogue)}</p>`;
            DOM.chatHistory?.appendChild(aiMsgEl);
            
            if (response.current_expression_state) {
                switchAvatarExpression(response.current_expression_state);
            }
            
            await generateAndPlayAudio(response.character_dialogue);
            
            if (DOM.chatHistory) {
                DOM.chatHistory.scrollTop = DOM.chatHistory.scrollHeight;
            }
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

function updateProgressCircle(circleId, percentage) {
    const circle = document.querySelector(`#${circleId}`);
    if (!circle) return;
    
    const circumference = 2 * Math.PI * 50;
    const offset = circumference - (circumference * percentage) / 100;
    circle.style.strokeDashoffset = offset;
}

function updateGoalProgress() {
    const dailyXP = AppState.userGoals.daily || 0;
    const midtermXP = AppState.userGoals.midterm || 0;
    const endgoalXP = AppState.userGoals.endgoal || 0;
    
    updateProgressCircle('daily-progress', dailyXP);
    updateProgressCircle('midterm-progress', midtermXP);
    updateProgressCircle('endgoal-progress', endgoalXP);
    
    if (DOM.dailyValue) DOM.dailyValue.textContent = `${dailyXP}%`;
    if (DOM.midtermValue) DOM.midtermValue.textContent = `${midtermXP}%`;
    if (DOM.endgoalValue) DOM.endgoalValue.textContent = `${endgoalXP}%`;
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
    
    const formData = new FormData(DOM.distractionForm);
    const entry = {
        type: formData.get('distraction-type'),
        date: formData.get('distraction-date'),
        time: formData.get('distraction-time'),
        duration: parseInt(formData.get('distraction-duration'), 10),
        timestamp: new Date().toISOString()
    };
    
    AppState.userDistractions.push(entry);
    updateDistractionCounts();
    DOM.distractionForm.reset();
    
    // Reevaluate emotion
    const newExpression = evaluateEmotionState();
    if (newExpression !== AppState.currentExpression) {
        switchAvatarExpression(newExpression);
    }
}

function initDistractionTracker() {
    DOM.distractionForm?.addEventListener('submit', handleDistractionSubmit);
}

// ============================================================================
// PROFILE FORM
// ============================================================================

async function handleProfileSubmit(e) {
    e.preventDefault();
    
    AppState.userContext = {
        academic: DOM.academicDetails?.value || '',
        routine: DOM.routineConstraints?.value || '',
        physical: DOM.physicalMetrics?.value || '',
        lifestyle: DOM.lifestyleRegimen?.value || ''
    };
    
    console.log('Profile saved (local):', AppState.userContext);
    
    // Reevaluate emotion
    const newExpression = evaluateEmotionState();
    if (newExpression !== AppState.currentExpression) {
        switchAvatarExpression(newExpression);
    }
}

function initProfileForm() {
    DOM.profileForm?.addEventListener('submit', handleProfileSubmit);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeApp() {
    console.log('🚀 Initializing Interactive Character Build AI');
    
    initRouting();
    initCalendar();
    initChat();
    initDistractionTracker();
    initProfileForm();
    initAnimationEngine();
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
