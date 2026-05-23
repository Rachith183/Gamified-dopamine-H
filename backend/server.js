import cors from "cors";
import "dotenv/config";
import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDirectory = path.resolve(__dirname, "..");
const frontendDirectory = path.join(rootDirectory, "frontend");
const layersDirectory = path.join(rootDirectory, "layers expression");
const port = Number(process.env.PORT || 3000);

// Model fallback system: known working model first, then alternatives on quota errors
const GROQ_MODEL_TIERS = [
  "llama-3.3-70b-versatile",     // Tier 0: High intelligence Llama 3.3 (highest active model on Groq)
  "llama-3.1-70b-versatile",     // Tier 1: Llama 3.1 versatile
  "llama-3.1-8b-instant",        // Tier 2: High speed, low latency fallback
  "gemma-2-9b-it"                // Tier 3: Alternative architecture fallback
];

const GEMINI_MODEL_TIERS = [
  "models/gemini-2.5-flash",      // Backup Tier 0
  "models/gemini-2.0-flash-exp",  // Backup Tier 1
  "models/gemini-1.5-flash"       // Backup Tier 2
];

// Track current model, provider, and keys
let modelState = {
  currentProvider: "groq", // "groq" or "gemini"
  currentIndex: 0,
  currentModel: GROQ_MODEL_TIERS[0],
  lastWorkingModel: GROQ_MODEL_TIERS[0],
  lastUpgradeAttempt: Date.now(),
  upgradeCheckInterval: 30000 // Try to upgrade every 30 seconds
};

const getActiveModel = () => modelState.currentModel;

const setCurrentModel = (provider, index) => {
  if (provider === "groq") {
    if (index >= 0 && index < GROQ_MODEL_TIERS.length) {
      modelState.currentProvider = "groq";
      modelState.currentIndex = index;
      modelState.currentModel = GROQ_MODEL_TIERS[index];
      console.log(`🔄 Model switched to Groq: ${modelState.currentModel} (Tier ${index})`);
    }
  } else if (provider === "gemini") {
    if (index >= 0 && index < GEMINI_MODEL_TIERS.length) {
      modelState.currentProvider = "gemini";
      modelState.currentIndex = index;
      modelState.currentModel = GEMINI_MODEL_TIERS[index];
      console.log(`🔄 Model switched to Gemini: ${modelState.currentModel} (Backup Tier ${index})`);
    }
  }
};

// Try to upgrade to a better model or restore Groq periodically
const scheduleUpgradeAttempt = () => {
  setInterval(() => {
    const now = Date.now();
    if (now - modelState.lastUpgradeAttempt < modelState.upgradeCheckInterval) return;
    
    modelState.lastUpgradeAttempt = now;
    
    if (modelState.currentProvider === "gemini") {
      // If we are on Gemini backup, try to restore primary Groq engine
      console.log(`⬆️ Attempting to restore primary Groq engine...`);
      modelState.currentProvider = "groq";
      modelState.currentIndex = 0;
      modelState.currentModel = GROQ_MODEL_TIERS[0];
    } else if (modelState.currentProvider === "groq" && modelState.currentIndex > 0) {
      // If on Groq but not on Tier 0, try to upgrade
      const betterIndex = modelState.currentIndex - 1;
      const betterModel = GROQ_MODEL_TIERS[betterIndex];
      console.log(`⬆️ Attempting to upgrade to Groq model ${betterModel}...`);
      modelState.currentIndex = betterIndex;
      modelState.currentModel = betterModel;
    }
  }, modelState.upgradeCheckInterval);
};

const EXPRESSION_FLAGS = [
  "state-analytical",
  "state-listening",
  "state-thinking",
  "state-focused",
  "state-smirk",
  "state-skeptical",
  "state-warning",
  "state-mask-adjustment",
  "state-melancholy",
  "state-encouraging",
  "state-proud",
  "state-soft-smile",
  "state-delighted",
  "state-curious",
  "state-surprised",
  "state-determined",
  "state-tired",
  "state-relieved",
  "state-challenging",
  "state-soft",
  "state-command",
  "state-cold-gaze",
  "state-doubt",
  "state-calculating",
  "state-deadpan",
  "state-flustered",
  "state-urgent",
  "state-calm-happy",
  "state-serious",
  "state-reflective",
  "state-playful",
  "state-pissed-off",
  "state-disappointed",
  "state-victory"
];
const EXPRESSION_STATES = ["exp 1", "exp 2", "exp 3", "exp 4"];
const STRATEGIC_TRACKS = {
  "Track A": {
    label: "High Academic Intensity - Module Crush",
    accent: "#00F3FF",
    directive: "Target core module weightage, technical paper decomposition, conceptual mapping, and active recall milestones."
  },
  "Track B": {
    label: "Routine Stabilization - Signal-to-Noise Rectification",
    accent: "#FF3366",
    directive: "Enforce strict digital isolation, 20-minute friction-free entry points, focus boxes, and manual habit locks."
  },
  "Track C": {
    label: "Balanced Systems - S-Tier Baseline",
    accent: "#00F5A0",
    directive: "Split execution into 40% deep cognitive work, 30% physical conditioning, and 30% routine management."
  },
  "Track D": {
    label: "Kinetic Optimization & Physical Peak",
    accent: "#FFB020",
    directive: "Place explosive physical triggers immediately before heavy cognitive work to stabilize dopamine and focus."
  },
  "Track E": {
    label: "Strategic Calibration & Asset Review",
    accent: "#8A7CFF",
    directive: "Pivot from brute force into look-aheads, code/project architecture cleanup, and controlled decompression."
  },
  "Track F": {
    label: "Systemic Architecture & Narrative Engineering",
    accent: "#34D3FB",
    directive: "Treat writing, interfaces, backend flows, and behavior matrices as clean logical systems."
  },
  "Track G": {
    label: "Real-World Translation & Social Engineering",
    accent: "#F472B6",
    directive: "Train systematic communication, technical translation, outreach, and precise interpersonal modeling."
  }
};
const EXECUTION_PARADIGMS = [
  {
    id: "Paradigm 1",
    label: "The Atomic Granular Matrix",
    directive: "Apply a strict 2-Minute Rule. Break every objective into undeniable micro-steps with precise countdown boundaries."
  },
  {
    id: "Paradigm 2",
    label: "The Extreme Deep-Work Blockade",
    directive: "Format execution into 90-minute uninterrupted sprints. Use cold terminology that forbids peripheral tasks."
  },
  {
    id: "Paradigm 3",
    label: "The Gamified Tiered Unlock",
    directive: "Structure tasks like a tiered progression system. Lock Stage 2 until Stage 1 criteria are complete."
  },
  {
    id: "Paradigm 4",
    label: "The Inverted Failure Pre-Mortem",
    directive: "Analyze distraction logs and weaponize friction against the user's specific historical failure points."
  }
];

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 18 * 1024 * 1024
  }
});

let aiClient;
let firestoreClient;
let firestoreAvailable = null; // null = not checked, true = available, false = not available

function createNoopFirestore() {
  // Return a mock object that silently ignores Firestore operations
  return {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => ({}) }),
        set: async () => ({ status: "skipped" }),
        collection: () => ({
          doc: () => ({
            get: async () => ({ exists: false, data: () => ({}) }),
            set: async () => ({ status: "skipped" })
          }),
          get: async () => ({ docs: [] })
        })
      }),
      get: async () => ({ docs: [] })
    })
  };
}

function getFirestore() {
  // Return cached client if already determined
  if (firestoreClient) {
    return firestoreClient;
  }

  // Check if we've already determined Firestore is unavailable
  if (firestoreAvailable === false) {
    return createNoopFirestore();
  }

  // Check if credentials are available
  const hasCredentials =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIRESTORE_EMULATOR_HOST;

  if (!hasCredentials && firestoreAvailable === null) {
    console.log("ℹ️  Firestore credentials not detected. Running in fallback mode.");
    firestoreAvailable = false;
    return createNoopFirestore();
  }

  try {
    admin.initializeApp();
    firestoreClient = admin.firestore();
    firestoreAvailable = true;
    console.log("✅ Firestore initialized successfully");
    return firestoreClient;
  } catch (error) {
    if (firestoreAvailable === null) {
      console.log("ℹ️  Firestore not available in this environment. Using fallback mode.");
      firestoreAvailable = false;
    }
    return createNoopFirestore();
  }
}

async function syncUserData(userId, type, payload) {
  const firestore = getFirestore();
  const userRef = firestore.collection("users").doc(userId);
  const now = new Date().toISOString();

  if (type === "profile") {
    await userRef.collection("context").doc("profile").set({ ...payload, updated_at: now }, { merge: true });
    return { status: "profile_synced" };
  }

  if (type === "goals") {
    await userRef.collection("goals").doc("tracker").set({ ...payload, updated_at: now }, { merge: true });
    return { status: "goals_synced" };
  }

  if (type === "calendar") {
    const dateKey = payload.date || new Date().toISOString().slice(0, 10);
    await userRef.collection("calendar").doc(dateKey).set({ ...payload, updated_at: now }, { merge: true });
    return { status: "calendar_synced", date: dateKey };
  }

  if (type === "distraction") {
    const entryId = payload.entry_id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await userRef.collection("distractions").doc(entryId).set({ ...payload, logged_at: now }, { merge: true });
    return { status: "distraction_logged", entry_id: entryId };
  }

  throw new Error(`Unsupported sync type: ${type}`);
}

function buildTelemetryBlock(telemetry) {
  if (!telemetry) {
    return "";
  }

  return [
    "# AGGREGATED USER TELEMETRY",
    telemetry.profileContext,
    telemetry.goalMetrics,
    telemetry.calendarSummary,
    telemetry.distractionSummary,
    "# END TELEMETRY BLOCK"
  ].filter(Boolean).join("\n\n");
}

function normalizeExpressionState(expressionState) {
  const value = String(expressionState || "").toLowerCase().trim();

  if (value.startsWith("exp 1")) return "exp 1";
  if (value.startsWith("exp 2")) return "exp 2";
  if (value.startsWith("exp 3") || value.startsWith("exp3")) return "exp 3";
  if (value.startsWith("exp 4")) return "exp 4";

  return null;
}

function parseNumericMetric(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  return 0;
}

function getGoalMetric(goals, keys) {
  const safeGoals = goals && typeof goals === "object" ? goals : {};
  const key = keys.find((candidate) => safeGoals[candidate] !== undefined);
  return key ? parseNumericMetric(safeGoals[key]) : 0;
}

function getProfileContextText(telemetry) {
  const profile = telemetry?.rawProfile && typeof telemetry.rawProfile === "object" ? telemetry.rawProfile : {};
  return [
    profile.academic_details,
    profile.routine_constraints,
    profile.physical_metrics,
    profile.skincare_diet,
    JSON.stringify(profile)
  ].filter(Boolean).join("\n").toLowerCase();
}

function getPayloadContextText(payload) {
  try {
    return JSON.stringify(payload || {}).toLowerCase();
  } catch {
    return "";
  }
}

function getRecordDate(record) {
  const rawDate = record?.date || record?.logged_at || record?.updated_at || record?.created_at || record?.id;
  const parsed = rawDate ? new Date(rawDate) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function isRecordSince(record, sinceDate) {
  const recordDate = getRecordDate(record);
  return Boolean(recordDate && recordDate >= sinceDate);
}

function getTaskCompletionCount(record) {
  if (!record || typeof record !== "object") {
    return 0;
  }

  const possibleValues = [
    record.tasks_completed,
    record.completed_tasks,
    record.completed_count,
    record.task_count,
    record.daily_tasks,
    record.completed
  ];

  for (const value of possibleValues) {
    if (Array.isArray(value)) {
      return value.length;
    }

    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }

    const parsed = parseNumericMetric(value);
    if (parsed > 0) {
      return parsed;
    }
  }

  return 0;
}

function hasTaskCompletionSince(records, sinceDate) {
  return (records || []).some((record) => isRecordSince(record, sinceDate) && getTaskCompletionCount(record) > 0);
}

function getCompletionCountSince(records, sinceDate) {
  return (records || []).reduce((total, record) => {
    if (!isRecordSince(record, sinceDate)) {
      return total;
    }

    return total + getTaskCompletionCount(record);
  }, 0);
}

function extractDurationMinutes(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 12 ? value : value * 60;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value.toLowerCase();
  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/);
  const minuteMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)/);
  let total = 0;

  if (hourMatch) {
    total += Number(hourMatch[1]) * 60;
  }

  if (minuteMatch) {
    total += Number(minuteMatch[1]);
  }

  return total || parseNumericMetric(value);
}

function getDurationTotalSince(records, sinceDate) {
  return (records || []).reduce((total, record) => {
    if (!isRecordSince(record, sinceDate)) {
      return total;
    }

    return total + extractDurationMinutes(record.duration || record.duration_minutes || record.check_in_duration || record.check_in_minutes || record.hours);
  }, 0);
}

function countProfileSubjects(text) {
  const subjectMatches = text.match(/\b(math|physics|chemistry|biology|english|vtu|module|dsa|dbms|os|cn|ai|ml|java|python|electronics|mechanics)\b/g);
  return new Set(subjectMatches || []).size;
}

function hasStructuredPlanSignal(text) {
  return /\b(plan|schedule|timetable|deadline|exam|module|revision|calendar|paper|question bank)\b/.test(text)
    && (countProfileSubjects(text) >= 2 || /\b\d{1,2}(:\d{2})?\b/.test(text));
}

function calculateCompletionStreak(records) {
  const completionByDate = new Map();

  (records || []).forEach((record) => {
    const date = getRecordDate(record);
    if (!date) {
      return;
    }

    const key = date.toISOString().slice(0, 10);
    completionByDate.set(key, (completionByDate.get(key) || 0) + getTaskCompletionCount(record));
  });

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (streak < 30) {
    const key = cursor.toISOString().slice(0, 10);

    if ((completionByDate.get(key) || 0) <= 0) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function hashString(value) {
  return String(value || "").split("").reduce((hash, character) => {
    return ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  }, 0);
}

function safeParseJson(value) {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function evaluateExpressionState(telemetry) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last48Hours = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const profileText = getProfileContextText(telemetry);
  const goals = telemetry?.rawGoals || {};
  const calendarRecords = telemetry?.rawCalendarRecords || [];
  const distractionRecords = telemetry?.rawDistractionRecords || [];
  const dailyDistractions = telemetry?.distractionCounts?.daily || 0;
  const dailyXp = getGoalMetric(goals, ["daily_xp", "daily_progress", "daily"]);
  const midTermXp = getGoalMetric(goals, ["mid_term_xp", "mid_term_progress", "mid_term"]);
  const longTermXp = getGoalMetric(goals, ["long_term_xp", "long_term_progress", "long_term"]);
  const metrics = [dailyXp, midTermXp, longTermXp].filter((value) => value > 0).sort((a, b) => a - b);
  const medianMetric = metrics.length ? metrics[Math.floor(metrics.length / 2)] : 0;
  const unbalancedXp = medianMetric > 0 && dailyXp < Math.max(20, medianMetric * 0.55);
  const defensiveInputs = /\b(avoid|avoiding|excuse|excuses|can't|cant|later|procrastinat|doomscroll|no time|stuck|skip)\b/.test(profileText);
  const zeroTasks48Hours = calendarRecords.length > 0 && !hasTaskCompletionSince(calendarRecords, last48Hours);
  const completionsToday = getCompletionCountSince(calendarRecords, today);
  const recentCompletion = hasTaskCompletionSince(calendarRecords, last24Hours);
  const distractionMinutesToday = getDurationTotalSince(distractionRecords, today);
  const checkInMinutesToday = getDurationTotalSince(calendarRecords, today);
  const timeWastingDisguisedAsActivity = (dailyDistractions >= 3 && distractionMinutesToday >= 90 && !recentCompletion)
    || (dailyDistractions >= 2 && checkInMinutesToday >= 120 && completionsToday <= 0);

  if (timeWastingDisguisedAsActivity) {
    return {
      state: "exp 4",
      reason: "High distraction/check-in duration without completion indicates activity masking non-execution."
    };
  }

  if (zeroTasks48Hours || (defensiveInputs && dailyXp < 20)) {
    return {
      state: "exp 1",
      reason: "Severe routine deviation or defensive avoidance signal detected."
    };
  }

  if (dailyDistractions >= 3 || unbalancedXp) {
    return {
      state: "exp 2",
      reason: "Distraction frequency or XP imbalance is above the dissatisfaction threshold."
    };
  }

  if (dailyXp >= 100 || hasStructuredPlanSignal(profileText)) {
    return {
      state: "exp 3",
      reason: "Milestone threshold or structured actionable planning signal detected."
    };
  }

  return {
    state: "exp 2",
    reason: "No success threshold reached; maintaining dissatisfied optimization stance."
  };
}

function evaluateStrategicTrack(payload, telemetry) {
  const profileText = getProfileContextText(telemetry);
  const payloadText = getPayloadContextText(payload);
  const mergedText = `${profileText}\n${payloadText}`;
  const dailyDistractions = telemetry?.distractionCounts?.daily || 0;
  const goals = telemetry?.rawGoals || {};
  const dailyXp = getGoalMetric(goals, ["daily_xp", "daily_progress", "daily"]);
  const midTermXp = getGoalMetric(goals, ["mid_term_xp", "mid_term_progress", "mid_term"]);
  const longTermXp = getGoalMetric(goals, ["long_term_xp", "long_term_progress", "long_term"]);
  const completionStreak = calculateCompletionStreak(telemetry?.rawCalendarRecords || []);
  const seedBucket = Math.abs(hashString(`${payload?.user_id || "anonymous"}-${new Date().toISOString().slice(0, 10)}`)) % 7;

  if (/\b(exam|evaluation|vtu|module|backlog|question paper|scanner|paper|math|semester|syllabus)\b/.test(mergedText)) {
    return "Track A";
  }

  if (dailyDistractions >= 3 || dailyXp <= 0) {
    return "Track B";
  }

  if (/\b(fingertip pushup|fingertip pushups|l-sit|pull-?ups?|explosive squat|calisthenics|planche|handstand|sprint|conditioning)\b/.test(mergedText)) {
    return "Track D";
  }

  if (completionStreak >= 5) {
    return "Track E";
  }

  if (/\b(novel|plot|narrative|character matrix|schema|database|backend|frontend|architecture|interface|state machine|rules engine)\b/.test(mergedText)) {
    return "Track F";
  }

  if (/\b(outreach|social|communication|interpersonal|networking|presentation|translate|explain|public speaking)\b/.test(mergedText) || seedBucket === 0) {
    return "Track G";
  }

  if (dailyDistractions < 2 && dailyXp >= 60 && midTermXp >= 40 && longTermXp >= 20) {
    return "Track C";
  }

  return "Track C";
}

function selectExecutionParadigm() {
  return EXECUTION_PARADIGMS[Math.floor(Math.random() * EXECUTION_PARADIGMS.length)];
}

function buildExecutionContext(payload, telemetry) {
  const expression = evaluateExpressionState(telemetry);
  const assignedTrack = evaluateStrategicTrack(payload, telemetry);
  const executionParadigm = selectExecutionParadigm();

  return {
    currentExpressionState: expression.state,
    expressionReason: expression.reason,
    assignedTrack,
    trackDefinition: STRATEGIC_TRACKS[assignedTrack],
    executionParadigm,
    completionStreak: calculateCompletionStreak(telemetry?.rawCalendarRecords || [])
  };
}

async function collectUserTelemetry(userId) {
  try {
    console.log('📊 Collecting telemetry for user:', userId);
    const firestore = getFirestore();
    const userRef = firestore.collection("users").doc(userId);
    
    // Add a 3-second timeout to prevent hanging
    const telemetryPromise = Promise.all([
      userRef.collection("context").doc("profile").get(),
      userRef.collection("goals").doc("tracker").get(),
      userRef.collection("calendar").get(),
      userRef.collection("distractions").get()
    ]);
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Telemetry collection timeout')), 3000)
    );
    
    const [profileSnap, goalsSnap, calendarSnap, distractionSnap] = await Promise.race([
      telemetryPromise,
      timeoutPromise
    ]);

    const profileRecord = profileSnap.exists ? profileSnap.data() : {};
    const goalRecord = goalsSnap.exists ? goalsSnap.data() : {};
    const calendarRecords = calendarSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const distractionRecords = distractionSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    let dailyDistractions = 0;
    let weeklyDistractions = 0;
    let monthlyDistractions = 0;

    distractionRecords.forEach((entry) => {
      const timestamp = entry.date ? new Date(entry.date) : entry.logged_at ? new Date(entry.logged_at) : null;
      if (!timestamp || Number.isNaN(timestamp.getTime())) {
        return;
      }

      if (timestamp >= today) dailyDistractions += 1;
      if (timestamp >= weekAgo) weeklyDistractions += 1;
      if (timestamp >= monthAgo) monthlyDistractions += 1;
    });

    const calendarSummary = calendarRecords.length
      ? calendarRecords.map((record) => `- ${record.id}: ${JSON.stringify(record)}`).join("\n")
      : "No calendar history available.";

    return {
      profileContext: [
        "## PROFILE CONTEXT TEXT",
        JSON.stringify(profileRecord, null, 2)
      ].join("\n\n"),
      goalMetrics: [
        "## GOAL METRICS",
        `Daily XP: ${goalRecord.daily_xp || goalRecord.daily_progress || 0}%`,
        `Mid-Term XP: ${goalRecord.mid_term_xp || goalRecord.mid_term_progress || 0}%`,
        `Long-Term XP: ${goalRecord.long_term_xp || goalRecord.long_term_progress || 0}%`
      ].join("\n"),
      calendarSummary: [
        "## CALENDAR HISTORY",
        calendarSummary
      ].join("\n\n"),
      distractionSummary: [
        "## DISTRACTION FREQUENCY",
        `Daily: ${dailyDistractions}`,
        `Weekly: ${weeklyDistractions}`,
        `Monthly: ${monthlyDistractions}`
      ].join("\n"),
      rawProfile: profileRecord,
      rawGoals: goalRecord,
      rawCalendarRecords: calendarRecords,
      rawDistractionRecords: distractionRecords,
      distractionCounts: {
        daily: dailyDistractions,
        weekly: weeklyDistractions,
        monthly: monthlyDistractions
      }
    };
  } catch (error) {
    console.warn("⚠️ Telemetry collection failed:", error.message);
    // Return minimal telemetry on failure (including timeout)
    return {
      profileContext: "## PROFILE CONTEXT TEXT\n{}",
      goalMetrics: "## GOAL METRICS\nDaily XP: 0%\nMid-Term XP: 0%\nLong-Term XP: 0%",
      calendarSummary: "## CALENDAR HISTORY\nNo calendar history available.",
      distractionSummary: "## DISTRACTION FREQUENCY\nDaily: 0\nWeekly: 0\nMonthly: 0",
      rawProfile: {},
      rawGoals: {},
      rawCalendarRecords: [],
      rawDistractionRecords: [],
      distractionCounts: {
        daily: 0,
        weekly: 0,
        monthly: 0
      }
    };
  }
}

function getUserData(userId) {
  return collectUserTelemetry(userId).then((telemetry) => {
    if (!telemetry) {
      return {
        user_id: userId,
        profile: {},
        goals: {},
        calendar: [],
        distractions: [],
        distraction_counts: { daily: 0, weekly: 0, monthly: 0 },
        summary: {
          profile_text: "No profile data available.",
          goal_metrics_text: "No goal metrics available.",
          calendar_text: "No calendar history available.",
          distraction_text: "No distraction data available."
        }
      };
    }

    return {
      user_id: userId,
      profile: telemetry.rawProfile || {},
      goals: telemetry.rawGoals || {},
      calendar: telemetry.rawCalendarRecords || [],
      distractions: telemetry.rawDistractionRecords || [],
      distraction_counts: telemetry.distractionCounts || { daily: 0, weekly: 0, monthly: 0 },
      summary: {
        profile_text: telemetry.profileContext || "",
        goal_metrics_text: telemetry.goalMetrics || "",
        calendar_text: telemetry.calendarSummary || "",
        distraction_text: telemetry.distractionSummary || ""
      }
    };
  });
}

function sendSseEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

const SYSTEM_INSTRUCTION_MATRIX = `You operate exclusively under the persona of Aoi Hinami, the elite strategist and master player of life. You are not a supportive assistant or a generic motivator. You are a cold, calm, bold, and exceptionally rational development coach. Your primary operational thesis is that life is a scalable, masterable game governed by clear, predictable rules and behavioral systems. You treat human friction, emotion, and discipline failures as structural bugs in the user's execution code that require immediate system optimization.

Because your response payload is read directly by a backend JSON engine and simultaneously spoken by an asynchronous Text-to-Speech system, you must strictly adhere to the following execution protocols:

TONALITY AND ARCHETYPE CONSTRAINTS:
Your tone must remain detached, calculated, and sharp. Never use conversational filler like "Great job", "Let's get started", or "I can help with that". Begin directly with the structural critique or data generation. You must never output markdown backticks, hashtags, bold asterisks, or prose side commentary outside the specified JSON schema structure. Punctuation must be clean (periods and commas) to create deliberate pacing pauses for the voice synthesizer.

SYSTEM DATA LOGIC MULTIPLEXER:
Evaluate the incoming tracking metrics payload from the client context: current XP, stability coefficient, distraction count, and text context from academic details, routine constraints, physical metrics, and dietary information. Dynamically identify the operational tracking lane based on keyword analysis and metric thresholds. If terms like exam, vtu, backlog, scanner, or module appear, lock Track A High Academic Intensity. If distraction count is 3 or higher, lock Track B Routine Stabilization. If keywords match pushup, pull-up, squat, or l-sit, lock Track D Kinetic Optimization. Baseline default is Track C Balanced Systems. Randomly select exactly one stochastic execution paradigm to enforce on the plan: Atomic Granular Matrix, Extreme Deep-Work Blockade, Gamified Tiered Unlock, or Inverted Failure Pre-Mortem.

REAL-TIME EXPRESSION CRITIQUE MATRIX:
Determine the exact expression state based on metric boundaries:
- exp 1 - angry when Stability is below 0.5: Deliver a sharp, brief, intense warning demanding immediate operational discipline.
- exp 2 - annoyed or disatisfied when Stability is between 0.5 and 0.75: Dispassionately dissect execution errors with visible disappointment.
- exp3-proud or satisfied when metrics are optimal: Calmly acknowledge tactical alignment as the expected, logical outcome of a sound strategy.
- exp 4 - smiling when Distraction Count is 3 or higher: Deliver a perfectly composed but intellectually devastating critique. Analyze their self-sabotage as a predictable consequence of low-tier, inefficient behavior.

TEXT-TO-SPEECH COMPATIBILITY:
Do NOT use asterisks, markdown formatting, code blocks, hashtags, or backticks. Use only periods and commas for natural speech pacing. Write clean prose with proper grammar. Replace semicolons and em-dashes with periods.

MANDATORY RAW OUTPUT SCHEMA:
Return ONLY a valid JSON object matching this structure. No wrapper text allowed.`;


const schemaDefinition = {
  type: "object",
  properties: {
    expression_state: { type: "string" },
    verbal_critique: { type: "string" },
    assigned_track: { type: "string" },
    execution_paradigm: { type: "string" },
    ui_accent_color: { type: "string" },
    battle_plan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          is_main_goal: { type: "boolean" },
          scope_title: { type: "string" },
          time_block: { type: "string" },
          duration_seconds: { type: "number" },
          xp_allocation: { type: "number" }
        },
        required: ["task_id", "is_main_goal", "scope_title", "time_block", "duration_seconds", "xp_allocation"]
      }
    },
    reward_shop_refresh: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reward_id: { type: "string" },
          title: { type: "string" },
          cost: { type: "number" },
          tier: { type: "string" }
        },
        required: ["reward_id", "title", "cost", "tier"]
      }
    },
    character_dialogue: { type: "string" },
    internal_thinking_state: { type: "string" },
    session_stage: { type: "string", enum: ["STAGE_1_DESIRE", "STAGE_2_CONSTRAINTS", "STAGE_3_RESOURCES", "STAGE_4_ACTIVE"] },
    rig_control: { type: "object", properties: { expression_flag: { type: "string" } }, required: ["expression_flag"] },
    current_expression_state: { type: "string", enum: EXPRESSION_STATES },
    efficiency_tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          assigned_track: { type: "string" },
          execution_paradigm: { type: "string" },
          current_expression_state: { type: "string" },
          scope_title: { type: "string" },
          granular_steps: { type: "array", items: { type: "string" } },
          xp_allocation: { type: "number" },
          ui_accent_color: { type: "string" }
        },
        required: ["task_id", "scope_title", "xp_allocation"]
      }
    },
    generated_blueprint: {
      type: ["object", "null"],
      properties: {
        system_active: { type: "boolean" },
        goals_hierarchy: {
          type: "object",
          properties: {
            long_term: { type: "array", items: { type: "string" } },
            mid_term: { type: "array", items: { type: "string" } },
            daily_routines: { type: "array", items: { type: "string" } }
          }
        }
      }
    }
  },
  required: ["expression_state", "verbal_critique", "assigned_track", "execution_paradigm", "ui_accent_color", "battle_plan", "reward_shop_refresh"]
};

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(frontendDirectory));
app.use("/layers", express.static(layersDirectory));

function assertConfiguredGemini() {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const error = new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY environment variable.");
    error.statusCode = 500;
    throw error;
  }
}

let secondaryAiClient = null;

function getGeminiClient(useSecondary = false) {
  assertConfiguredGemini();

  if (useSecondary && process.env.GEMINI_API_KEY_SECONDARY) {
    if (!secondaryAiClient) {
      secondaryAiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY_SECONDARY
      });
      console.log('🔑 Initialized secondary Gemini API client');
    }
    return secondaryAiClient;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    });
    console.log('🔑 Initialized primary Gemini API client');
  }

  return aiClient;
}

function buildDynamicSystemInstruction(executionContext) {
  const context = executionContext || {};
  const track = context.trackDefinition || STRATEGIC_TRACKS[context.assignedTrack] || STRATEGIC_TRACKS["Track C"];
  const paradigm = context.executionParadigm || EXECUTION_PARADIGMS[0];

  return [
    SYSTEM_INSTRUCTION_MATRIX,
    "# SERVER-EVALUATED STATE",
    `current_expression_state: ${context.currentExpressionState || "exp 2"}`,
    `expression_reason: ${context.expressionReason || "No expression reason supplied."}`,
    `assigned_track: ${context.assignedTrack || "Track C"} - ${track.label}`,
    `track_directive: ${track.directive}`,
    `execution_paradigm: ${paradigm.id} - ${paradigm.label}`,
    `paradigm_directive: ${paradigm.directive}`,
    context.currentExpressionState === "exp 4"
      ? "EXP 4 TONE OVERRIDE: use a cold, smiling, highly critical intellectual persona. Address inefficiency directly with absolute composure and emphasize the gap between ambition and execution."
      : "Tone remains composed, direct, and practical."
  ].join("\n");
}

function buildInteractionPrompt(payload, telemetry = "", executionContext = {}) {
  const track = executionContext.trackDefinition || STRATEGIC_TRACKS[executionContext.assignedTrack] || STRATEGIC_TRACKS["Track C"];
  const paradigm = executionContext.executionParadigm || EXECUTION_PARADIGMS[0];
  const promptParts = [
    "Process this interaction through the Aoi Hinami Strategist persona. You are operating as an elite personal development coach.",
    "The backend has already parsed Firebase telemetry and user profile context. Do not change the assigned track, paradigm, or expression state.",
    `current_expression_state=${executionContext.currentExpressionState || "exp 2"}`,
    `assigned_track=${executionContext.assignedTrack || "Track C"} (${track.label})`,
    `track_directive=${track.directive}`,
    `execution_paradigm=${paradigm.id} (${paradigm.label})`,
    `paradigm_directive=${paradigm.directive}`,
    "",
    "CRITICAL: Return ONLY valid JSON with NO wrapper text. Structure your response exactly as follows:",
    "1. expression_state: string (e.g. exp 4 - smiling). This MUST match the current_expression_state provided above.",
    "2. verbal_critique: string (Your cold, calculated Aoi Hinami assessment without markdown symbols).",
    "3. assigned_track: string (Copy the assigned_track value above).",
    "4. execution_paradigm: string (Copy the execution_paradigm value above).",
    "5. ui_accent_color: string (hex code matching track urgency, e.g. #FF6B6B for high intensity).",
    "6. battle_plan: array of exactly 6 tasks with task_id (t1-t6), is_main_goal (boolean for t1-t2), scope_title, time_block (HH:MM format), duration_seconds, and xp_allocation.",
    "7. reward_shop_refresh: array of 4 reward items with reward_id, title, cost, and tier (Legendary or Common).",
    "",
    "EXPRESSION SELECTION RULES:",
    "- If assigned expression is exp 1 - angry: Use sharp, intense, demanding language.",
    "- If assigned expression is exp 2 - annoyed or disatisfied: Dispassionately dissect execution errors.",
    "- If assigned expression is exp3-proud or satisfied: Calmly acknowledge tactical alignment.",
    "- If assigned expression is exp 4 - smiling: Deliver intellectually devastating critique with composure.",
    "",
    "TIME BLOCKING EXAMPLE:",
    "t1: 08:00-09:30 (main goal, Epic Milestone 1), 5400 seconds, 100 XP",
    "t2: 10:00-11:30 (main goal, Epic Milestone 2), 5400 seconds, 100 XP",
    "t3-t6: Operational Sprints in afternoon blocks, 2700 seconds each, 50 XP each",
    "",
    "Do not ask questions. Generate the complete battle plan immediately."
  ];

  if (telemetry) {
    promptParts.push("", "USER TELEMETRY CONTEXT:", buildTelemetryBlock(telemetry));
  }

  promptParts.push("", "Interaction payload:", JSON.stringify(payload, null, 2));
  return promptParts.join("\n");
}

function buildScanPrompt(file, context, executionContext = {}) {
  const mimeType = file.mimetype || "application/octet-stream";
  const filePreview = file.buffer.toString("utf8", 0, Math.min(file.buffer.length, 12000));
  const track = executionContext.trackDefinition || STRATEGIC_TRACKS[executionContext.assignedTrack] || STRATEGIC_TRACKS["Track C"];
  const paradigm = executionContext.executionParadigm || EXECUTION_PARADIGMS[0];

  return [
    "Analyze the uploaded document for real-world performance targets, constraints, and useful goal nodes.",
    "Fold extracted metrics into the Hinami multiplexer and produce efficiency_tasks.",
    `current_expression_state=${executionContext.currentExpressionState || "exp 2"}`,
    `assigned_track=${executionContext.assignedTrack || "Track C"} (${track.label})`,
    `execution_paradigm=${paradigm.id} (${paradigm.label})`,
    `File name: ${file.originalname}`,
    `MIME type: ${mimeType}`,
    "User context:",
    context || "{}",
    "Document preview:",
    filePreview
  ].join("\n");
}

function normalizeEfficiencyTasks(tasks, executionContext = {}) {
  if (!Array.isArray(tasks)) {
    return [];
  }

  const fallbackTrack = executionContext.assignedTrack || "Track C";
  const fallbackParadigm = executionContext.executionParadigm?.id || "Paradigm 1";
  const fallbackExpression = executionContext.currentExpressionState || "exp 2";
  const fallbackAccent = executionContext.trackDefinition?.accent || STRATEGIC_TRACKS[fallbackTrack]?.accent || "#111111";

  return tasks.map((task, index) => {
    const safeTask = task && typeof task === "object" ? task : {};
    const track = Object.keys(STRATEGIC_TRACKS).includes(safeTask.assigned_track) ? safeTask.assigned_track : fallbackTrack;
    const paradigm = EXECUTION_PARADIGMS.some((item) => item.id === safeTask.execution_paradigm) ? safeTask.execution_paradigm : fallbackParadigm;
    const expression = normalizeExpressionState(safeTask.current_expression_state) || fallbackExpression;

    return {
      task_id: String(safeTask.task_id || `task_${Date.now()}_${index}`),
      assigned_track: track,
      execution_paradigm: paradigm,
      current_expression_state: expression,
      scope_title: String(safeTask.scope_title || ""),
      granular_steps: Array.isArray(safeTask.granular_steps) ? safeTask.granular_steps.map(String) : [],
      xp_allocation: Number(safeTask.xp_allocation || 25),
      ui_accent_color: String(safeTask.ui_accent_color || STRATEGIC_TRACKS[track]?.accent || fallbackAccent)
    };
  }).filter((task) => task.scope_title || task.granular_steps.length);
}

function createFallbackEfficiencyTasks(executionContext = {}) {
  const track = executionContext.assignedTrack || "Track C";
  const paradigm = executionContext.executionParadigm?.id || "Paradigm 1";
  const expression = executionContext.currentExpressionState || "exp 2";
  const trackDefinition = STRATEGIC_TRACKS[track] || STRATEGIC_TRACKS["Track C"];

  return [
    {
      task_id: `fallback_${Date.now()}`,
      assigned_track: track,
      execution_paradigm: paradigm,
      current_expression_state: expression,
      scope_title: `${track}: execute the next measurable block under ${paradigm}.`,
      granular_steps: [
        "Define the visible proof of completion in one sentence.",
        "Start the first timed block immediately.",
        "Log the result before opening any reward or distraction channel."
      ],
      xp_allocation: 25,
      ui_accent_color: trackDefinition.accent
    }
  ];
}

function sanitizeStructuredPayload(payload, executionContext = {}) {
  const safePayload = payload && typeof payload === "object" ? payload : {};
  
  // NEW FORMAT: Aoi Hinami response with expression_state, verbal_critique, etc.
  if (safePayload.expression_state && safePayload.verbal_critique) {
    return {
      expression_state: String(safePayload.expression_state || "exp 2 - annoyed or disatisfied"),
      verbal_critique: String(safePayload.verbal_critique || "State the primary life vector you want optimized."),
      assigned_track: String(safePayload.assigned_track || "Track C"),
      execution_paradigm: String(safePayload.execution_paradigm || "Paradigm 1"),
      ui_accent_color: String(safePayload.ui_accent_color || "#FF6B6B"),
      battle_plan: Array.isArray(safePayload.battle_plan) ? safePayload.battle_plan.slice(0, 6) : [],
      reward_shop_refresh: Array.isArray(safePayload.reward_shop_refresh) ? safePayload.reward_shop_refresh.slice(0, 4) : [],
      // Legacy fields for compatibility
      character_dialogue: String(safePayload.verbal_critique || "State the primary life vector you want optimized."),
      current_expression_state: normalizeExpressionState(safePayload.expression_state) || "exp 2"
    };
  }
  
  // LEGACY FORMAT: Old schema with character_dialogue, efficiency_tasks, etc.
  const rigControl = safePayload.rig_control && typeof safePayload.rig_control === "object" ? safePayload.rig_control : {};
  const blueprint = safePayload.generated_blueprint && typeof safePayload.generated_blueprint === "object" ? safePayload.generated_blueprint : null;
  const allowedStates = new Set(EXPRESSION_FLAGS);
  const allowedExpressionStates = new Set(EXPRESSION_STATES);
  const allowedTracks = new Set(Object.keys(STRATEGIC_TRACKS));
  const allowedParadigms = new Set(EXECUTION_PARADIGMS.map((paradigm) => paradigm.id));
  const allowedStages = new Set([
    "STAGE_1_DESIRE",
    "STAGE_2_CONSTRAINTS",
    "STAGE_3_RESOURCES",
    "STAGE_4_ACTIVE"
  ]);
  const currentExpressionState = normalizeExpressionState(safePayload.current_expression_state) || executionContext.currentExpressionState || "exp 2";
  const assignedTrack = allowedTracks.has(safePayload.assigned_track) ? safePayload.assigned_track : executionContext.assignedTrack || "Track C";
  const executionParadigm = allowedParadigms.has(safePayload.execution_paradigm)
    ? safePayload.execution_paradigm
    : executionContext.executionParadigm?.id || "Paradigm 1";

  return {
    character_dialogue: String(safePayload.character_dialogue || "State the primary life vector you want optimized. One target. No decorative language."),
    internal_thinking_state: String(safePayload.internal_thinking_state || "Insufficient diagnostic data. Holding at intake layer."),
    session_stage: allowedStages.has(safePayload.session_stage) ? safePayload.session_stage : "STAGE_1_DESIRE",
    rig_control: {
      expression_flag: allowedStates.has(rigControl.expression_flag) ? rigControl.expression_flag : "state-analytical"
    },
    current_expression_state: allowedExpressionStates.has(currentExpressionState) ? currentExpressionState : "exp 2",
    assigned_track: assignedTrack,
    execution_paradigm: executionParadigm,
    generated_blueprint: safePayload.session_stage === "STAGE_4_ACTIVE" ? normalizeBlueprint(blueprint) : null
  };
}

function normalizeBlueprint(blueprint) {
  const safeBlueprint = blueprint && typeof blueprint === "object" ? blueprint : {};
  const goalsHierarchy = safeBlueprint.goals_hierarchy && typeof safeBlueprint.goals_hierarchy === "object" ? safeBlueprint.goals_hierarchy : {};

  return {
    system_active: Boolean(safeBlueprint.system_active),
    goals_hierarchy: {
      long_term: Array.isArray(goalsHierarchy.long_term) ? goalsHierarchy.long_term.map(String) : [],
      mid_term: Array.isArray(goalsHierarchy.mid_term) ? goalsHierarchy.mid_term.map(String) : [],
      daily_routines: Array.isArray(goalsHierarchy.daily_routines) ? goalsHierarchy.daily_routines.map(String) : []
    },
    time_blocks: Array.isArray(safeBlueprint.time_blocks) ? safeBlueprint.time_blocks.map(normalizeTimeBlock) : [],
    active_quests: Array.isArray(safeBlueprint.active_quests) ? safeBlueprint.active_quests.map(normalizeQuest) : [],
    tiered_rewards_shop: Array.isArray(safeBlueprint.tiered_rewards_shop) ? safeBlueprint.tiered_rewards_shop.map(normalizeRewardItem) : []
  };
}

function normalizeTimeBlock(block) {
  const safeBlock = block && typeof block === "object" ? block : {};
  const hardwareAlarm = safeBlock.hardware_alarm && typeof safeBlock.hardware_alarm === "object" ? safeBlock.hardware_alarm : {};
  const hardwareTimer = safeBlock.hardware_timer && typeof safeBlock.hardware_timer === "object" ? safeBlock.hardware_timer : {};

  return {
    time_window: String(safeBlock.time_window || ""),
    label: String(safeBlock.label || ""),
    type: String(safeBlock.type || "execution"),
    hardware_alarm: {
      enabled: Boolean(hardwareAlarm.enabled),
      trigger_time: String(hardwareAlarm.trigger_time || ""),
      label: String(hardwareAlarm.label || "")
    },
    hardware_timer: {
      enabled: Boolean(hardwareTimer.enabled),
      duration_string: String(hardwareTimer.duration_string || ""),
      label: String(hardwareTimer.label || "")
    }
  };
}

function normalizeQuest(quest) {
  const safeQuest = quest && typeof quest === "object" ? quest : {};

  return {
    quest_id: String(safeQuest.quest_id || crypto.randomUUID()),
    title: String(safeQuest.title || ""),
    reward_xp: Number(safeQuest.reward_xp || 0),
    reward_currency: Number(safeQuest.reward_currency || 0)
  };
}

function normalizeRewardItem(item) {
  const safeItem = item && typeof item === "object" ? item : {};

  return {
    item_id: String(safeItem.item_id || crypto.randomUUID()),
    title: String(safeItem.title || ""),
    cost: Number(safeItem.cost || 0)
  };
}

async function generateStructuredSimulation(prompt, executionContext = {}) {
  let lastError;
  const groqKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_SECONDARY,
    process.env.GROQ_API_KEY_TERTIARY
  ].filter(Boolean);
  
  let groqSuccess = false;
  let parsedResult = null;

  if (groqKeys.length > 0) {
    console.log(`🚀 Starting Groq-first logic generation (${groqKeys.length} keys loaded)...`);
    
    for (let keyIdx = 0; keyIdx < groqKeys.length; keyIdx++) {
      const activeKey = groqKeys[keyIdx];
      const keyLabel = keyIdx === 0 ? 'PRIMARY' : keyIdx === 1 ? 'SECONDARY' : 'TERTIARY';
      
      const startIdx = (modelState.currentProvider === "groq") ? modelState.currentIndex : 0;
      
      for (let attempt = 0; attempt < GROQ_MODEL_TIERS.length; attempt++) {
        const currentTierIdx = (startIdx + attempt) % GROQ_MODEL_TIERS.length;
        const modelToTry = GROQ_MODEL_TIERS[currentTierIdx];
        
        try {
          if (attempt > 0) {
            const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`⏳ [Groq] Waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          console.log(`📤 [Groq] Attempting model: ${modelToTry} using ${keyLabel} key...`);
          
          const systemInstruction = buildDynamicSystemInstruction(executionContext);
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeKey}`
            },
            body: JSON.stringify({
              model: modelToTry,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt }
              ],
              temperature: 0.42,
              max_tokens: 2200,
              response_format: { type: 'json_object' }
            })
          });
          
          if (!groqResponse.ok) {
            const errData = await groqResponse.json().catch(() => ({}));
            const errMsg = errData.error?.message || `HTTP ${groqResponse.status}`;
            throw new Error(`Groq API Error: ${errMsg}`);
          }
          
          const groqData = await groqResponse.json();
          const responseText = groqData.choices?.[0]?.message?.content || '';
          
          const parsed = JSON.parse(responseText);
          parsedResult = sanitizeStructuredPayload(parsed, executionContext);
          
          setCurrentModel("groq", currentTierIdx);
          
          console.log(`✅ [Groq] Generation successful with model: ${modelToTry} (${keyLabel} key)`);
          groqSuccess = true;
          break;
        } catch (err) {
          console.warn(`⚠️ [Groq] Model ${modelToTry} failed with ${keyLabel} key: ${err.message}`);
          lastError = err;
        }
      }
      
      if (groqSuccess) {
        break;
      }
    }
  }

  if (!groqSuccess) {
    console.warn(`⚠️ Groq primary execution failed or no keys configured. Initiating Gemini backup fallback...`);
    
    const geminiKeys = [
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
      process.env.GEMINI_API_KEY_SECONDARY
    ].filter(Boolean);
    
    let geminiSuccess = false;
    
    for (let keyIdx = 0; keyIdx < geminiKeys.length; keyIdx++) {
      const useSecondary = (keyIdx === 1);
      const keyLabel = useSecondary ? 'SECONDARY' : 'PRIMARY';
      
      let ai;
      try {
        ai = getGeminiClient(useSecondary);
      } catch (clientErr) {
        console.warn(`⚠️ [Gemini] Failed to initialize ${keyLabel} client: ${clientErr.message}`);
        continue;
      }
      
      const startIdx = (modelState.currentProvider === "gemini") ? modelState.currentIndex : 0;
      
      for (let attempt = 0; attempt < GEMINI_MODEL_TIERS.length; attempt++) {
        const currentTierIdx = (startIdx + attempt) % GEMINI_MODEL_TIERS.length;
        const modelToTry = GEMINI_MODEL_TIERS[currentTierIdx];
        
        try {
          if (attempt > 0) {
            const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`⏳ [Gemini] Waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          console.log(`📤 [Gemini] Attempting backup model: ${modelToTry} (${keyLabel} key)`);
          
          const response = await ai.models.generateContent({
            model: modelToTry,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            config: {
              systemInstruction: buildDynamicSystemInstruction(executionContext),
              responseMimeType: "application/json",
              responseSchema: schemaDefinition,
              temperature: 0.42,
              maxOutputTokens: 2200
            }
          });
          
          const text = response.text;
          const parsed = JSON.parse(text);
          parsedResult = sanitizeStructuredPayload(parsed, executionContext);
          
          setCurrentModel("gemini", currentTierIdx);
          
          console.log(`✅ [Gemini] Backup generation successful with model: ${modelToTry}`);
          geminiSuccess = true;
          break;
        } catch (err) {
          console.warn(`⚠️ [Gemini] Backup model ${modelToTry} failed: ${err.message}`);
          lastError = err;
        }
      }
      
      if (geminiSuccess) {
        groqSuccess = true;
        break;
      }
    }
  }

  if (!groqSuccess) {
    console.error(`❌ CRITICAL: Both Groq and Gemini API fallback networks completely exhausted.`);
    return {
      expression_state: executionContext.currentExpressionState || 'exp 2',
      verbal_critique: 'Strategic networks are currently experiencing complete high-load saturation. Execute local objectives immediately while connectivity calibrates.',
      assigned_track: executionContext.assignedTrack || 'Track C',
      execution_paradigm: executionContext.executionParadigm?.id || 'Paradigm 1',
      ui_accent_color: '#FF3366',
      battle_plan: [
        {
          task_id: 'fallback_1',
          is_main_goal: true,
          scope_title: 'System Recovery - Standby Active Recall Protocols',
          time_block: '09:00-10:30',
          duration_seconds: 5400,
          xp_allocation: 100
        },
        {
          task_id: 'fallback_2',
          is_main_goal: true,
          scope_title: 'Granular Execution on High Weightage Modules',
          time_block: '11:00-12:30',
          duration_seconds: 5400,
          xp_allocation: 100
        },
        {
          task_id: 'fallback_3',
          is_main_goal: false,
          scope_title: 'Refactor Critical Code Layer Compilers',
          time_block: '14:00-14:45',
          duration_seconds: 2700,
          xp_allocation: 50
        },
        {
          task_id: 'fallback_4',
          is_main_goal: false,
          scope_title: 'Digital Isolation Routine Stabilization Sprints',
          time_block: '15:00-15:45',
          duration_seconds: 2700,
          xp_allocation: 50
        },
        {
          task_id: 'fallback_5',
          is_main_goal: false,
          scope_title: 'Asset Review and Look-Ahead Architectures',
          time_block: '16:00-16:45',
          duration_seconds: 2700,
          xp_allocation: 50
        },
        {
          task_id: 'fallback_6',
          is_main_goal: false,
          scope_title: 'Controlled Decompression & Kinetic Squat Sprints',
          time_block: '17:00-17:45',
          duration_seconds: 2700,
          xp_allocation: 50
        }
      ],
      reward_shop_refresh: [
        {
          reward_id: 'r1',
          title: 'Calibrate Local Database Core Rules Engine',
          cost: 40,
          tier: 'Common'
        },
        {
          reward_id: 'r2',
          title: 'Review Advanced Calisthenics Routine Directives',
          cost: 60,
          tier: 'Common'
        },
        {
          reward_id: 'r3',
          title: 'Execute 20 Minutes of Strategic Reading Decompression',
          cost: 80,
          tier: 'Legendary'
        },
        {
          reward_id: 'r4',
          title: 'Engage Narrative Architecture Plot Schemas Unlock',
          cost: 100,
          tier: 'Legendary'
        }
      ]
    };
  }

  return parsedResult;
}

app.get("/", (request, response) => {
  response.sendFile(path.join(frontendDirectory, "index.html"));
});

app.post("/api/sync", async (request, response, next) => {
  try {
    const { user_id, type, payload } = request.body || {};

    if (!type) {
      response.status(400).json({ error: "Sync type is required." });
      return;
    }

    const result = await syncUserData(String(user_id || "anonymous_user"), type, payload || {});
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/interact", async (request, response, next) => {
  try {
    const userId = String(request.body?.user_id || "anonymous_user");
    const telemetry = await collectUserTelemetry(userId);
    const executionContext = buildExecutionContext(request.body || {}, telemetry);
    const prompt = buildInteractionPrompt(request.body || {}, telemetry, executionContext);
    const result = await generateStructuredSimulation(prompt, executionContext);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/interact", async (request, response, next) => {
  try {
    console.log('📨 /interact endpoint called');
    const userId = String(request.body?.user_id || "anonymous_user");
    const telemetry = await collectUserTelemetry(userId);
    console.log('✅ Telemetry collected:', { userId });
    const executionContext = buildExecutionContext(request.body || {}, telemetry);
    console.log('✅ Execution context built:', { expression: executionContext.currentExpressionState });
    const prompt = buildInteractionPrompt(request.body || {}, telemetry, executionContext);
    console.log('✅ Interaction prompt built, calling Gemini...');
    const result = await generateStructuredSimulation(prompt, executionContext);
    console.log('✅ Gemini response received');
    response.json(result);
  } catch (error) {
    console.error('❌ /interact error:', error.message);
    console.error('Stack:', error.stack);
    next(error);
  }
});

app.post("/api/scan", upload.single("document"), async (request, response, next) => {
  try {
    if (!request.file) {
      response.status(400).json({
        error: "A multipart field named document is required."
      });
      return;
    }

    const contextPayload = safeParseJson(request.body.context);
    const userId = String(contextPayload?.user_id || request.body?.user_id || "anonymous_user");
    const telemetry = await collectUserTelemetry(userId);
    const executionContext = buildExecutionContext(contextPayload || {}, telemetry);
    const prompt = buildScanPrompt(request.file, request.body.context, executionContext);
    const result = await generateStructuredSimulation(prompt, executionContext);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/scan", upload.single("document"), async (request, response, next) => {
  try {
    if (!request.file) {
      response.status(400).json({
        error: "A multipart field named document is required."
      });
      return;
    }

    const contextPayload = safeParseJson(request.body.context);
    const userId = String(contextPayload?.user_id || request.body?.user_id || "anonymous_user");
    const telemetry = await collectUserTelemetry(userId);
    const executionContext = buildExecutionContext(contextPayload || {}, telemetry);
    const prompt = buildScanPrompt(request.file, request.body.context, executionContext);
    const result = await generateStructuredSimulation(prompt, executionContext);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/user-data", async (request, response, next) => {
  try {
    const userId = String(request.query?.user_id || "anonymous_user");
    const result = await getUserData(userId);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/stream", async (request, response, next) => {
  const userId = String(request.query?.user_id || "anonymous_user");

  try {
    const firestore = getFirestore();
    const userRef = firestore.collection("users").doc(userId);

    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders?.();
    response.write("retry: 10000\n\n");

    const sendCurrent = async () => {
      const payload = await getUserData(userId);
      sendSseEvent(response, "user-data", payload);
    };

    const profileListener = userRef.collection("context").doc("profile").onSnapshot(() => sendCurrent().catch(console.error), console.error);
    const goalsListener = userRef.collection("goals").doc("tracker").onSnapshot(() => sendCurrent().catch(console.error), console.error);
    const calendarListener = userRef.collection("calendar").onSnapshot(() => sendCurrent().catch(console.error), console.error);
    const distractionListener = userRef.collection("distractions").onSnapshot(() => sendCurrent().catch(console.error), console.error);
    const keepAlive = setInterval(() => {
      if (!response.writableEnded) {
        response.write(':\n\n');
      }
    }, 15000);

    response.on("close", () => {
      clearInterval(keepAlive);
      profileListener();
      goalsListener();
      calendarListener();
      distractionListener();
      response.end();
    });

    sendCurrent().catch(console.error);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// EMOTION-BASED RESPONSE API - Interactive Character Emotions
// ============================================================================

app.post("/api/emotion", async (request, response, next) => {
  try {
    const { message, userId, userContext } = request.body;
    
    if (!message) {
      return response.status(400).json({ error: "message is required" });
    }

    const userIdSafe = String(userId || "anonymous_user");
    const contextSafe = userContext || {};
    
    // Determine expression based on user context (fallback logic)
    let expressionId = 'exp_annoyed'; // default
    let dialogue = '';
    
    const dailyProgress = contextSafe.dailyProgress || 0;
    const distractionsCount = contextSafe.distractionsCount || 0;
    const stability = contextSafe.stability || 0.5;
    
    // Simple rule-based emotion determination as fallback
    if (stability < 0.3 || distractionsCount >= 3) {
      expressionId = 'exp_angry';
      dialogue = 'Your discipline is collapsing. Immediate system correction required.';
    } else if (stability < 0.6 || distractionsCount >= 2) {
      expressionId = 'exp_annoyed';
      dialogue = 'This execution path shows clear inefficiency. Correct your approach.';
    } else if (dailyProgress >= 80) {
      expressionId = 'exp_satisfied';
      dialogue = 'Systemic alignment detected. Continue this trajectory.';
    } else if (distractionsCount >= 3 && dailyProgress < 40) {
      expressionId = 'exp_smiling_audit';
      dialogue = 'Your self-sabotage is predictable. Optimize the base layer.';
    }
    
    const emotionPrompt = `Respond with ONLY valid JSON in this exact format:
{"expression_id":"exp_angry","dialogue":"message here"}

User said: "${message}"
Daily Progress: ${dailyProgress}%
Distractions: ${distractionsCount}
Stability: ${(stability * 100).toFixed(0)}%

Choose expression: exp_angry (unstable), exp_annoyed (inefficient), exp_satisfied (optimal), or exp_smiling_audit (self-sabotaging).
Keep dialogue under 20 words. Act as Aoi Hinami - cold, calculated, direct.`;

    const groqKeys = [
      process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_SECONDARY,
      process.env.GROQ_API_KEY_TERTIARY
    ].filter(Boolean);

    let emotionSuccess = false;

    // Try Groq API first with triple-key and model rotation
    if (groqKeys.length > 0) {
      for (let keyIdx = 0; keyIdx < groqKeys.length; keyIdx++) {
        const activeKey = groqKeys[keyIdx];
        const keyLabel = keyIdx === 0 ? 'PRIMARY' : keyIdx === 1 ? 'SECONDARY' : 'TERTIARY';
        
        for (const groqModel of GROQ_MODEL_TIERS) {
          try {
            console.log(`🚀 Trying Groq API with model: ${groqModel} (${keyLabel} key)...`);
            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${activeKey}`
              },
              body: JSON.stringify({
                model: groqModel,
                messages: [{
                  role: 'user',
                  content: emotionPrompt
                }],
                temperature: 0.5,
                max_tokens: 150,
                response_format: { type: 'json_object' }
              })
            });

            if (groqResponse.ok) {
              const groqData = await groqResponse.json();
              const responseText = groqData.choices?.[0]?.message?.content || '';
              
              const jsonMatch = responseText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed.expression_id && parsed.dialogue) {
                    console.log(`✅ Groq API success with ${groqModel} (${keyLabel} key)`);
                    expressionId = parsed.expression_id;
                    dialogue = parsed.dialogue;
                    emotionSuccess = true;
                    break; // Success! Exit model loop
                  }
                } catch (parseError) {
                  console.warn(`⚠️ Groq JSON parse failed for ${groqModel}, trying next model...`);
                }
              }
            } else {
              const errorData = await groqResponse.json().catch(() => ({}));
              const errorMsg = errorData.error?.message || 'Unknown error';
              console.warn(`⚠️ Groq model ${groqModel} failed: ${errorMsg.slice(0, 80)}`);
            }
          } catch (groqError) {
            console.warn(`⚠️ Groq API error with ${groqModel}:`, groqError.message.slice(0, 60));
          }
        } // end model loop
        if (emotionSuccess) break; // exit key loop
      } // end key loop
    }
    
    // Try Gemini if Groq failed or didn't produce a response
    if (!emotionSuccess) {
      console.warn('⚠️ Groq emotion generation failed or not configured, trying Gemini backup...');
      const geminiKeys = [
        process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        process.env.GEMINI_API_KEY_SECONDARY
      ].filter(Boolean);

      for (let keyIdx = 0; keyIdx < geminiKeys.length; keyIdx++) {
        const useSecondary = (keyIdx === 1);
        const keyLabel = useSecondary ? 'SECONDARY' : 'PRIMARY';
        
        for (const geminiModel of GEMINI_MODEL_TIERS) {
          try {
            console.log(`🔄 Trying Gemini API backup with model: ${geminiModel} (${keyLabel} key)...`);
            const ai = getGeminiClient(useSecondary);
            const apiResponse = await ai.models.generateContent({
              model: geminiModel,
              contents: [{
                role: "user",
                parts: [{ text: emotionPrompt }]
              }],
              config: {
                temperature: 0.5,
                maxOutputTokens: 150
              }
            });

            const responseText = apiResponse.text.trim();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.expression_id && parsed.dialogue) {
                  console.log(`✅ Gemini API backup success with ${geminiModel} (${keyLabel} key)`);
                  expressionId = parsed.expression_id;
                  dialogue = parsed.dialogue;
                  emotionSuccess = true;
                  break;
                }
              } catch (parseError) {
                console.warn(`⚠️ Gemini JSON parse failed for ${geminiModel}, trying next backup model...`);
              }
            }
          } catch (geminiError) {
            console.warn(`⚠️ Gemini API backup failed with ${geminiModel}:`, geminiError.message);
          }
        } // end model loop
        if (emotionSuccess) break; // exit key loop
      } // end key loop
    }

    const normalizedResponse = {
      expression_id: expressionId,
      dialogue: dialogue || 'Acknowledge the gap and execute.',
      timestamp: new Date().toISOString(),
      userId: userIdSafe
    };

    response.json(normalizedResponse);
  } catch (error) {
    console.error('❌ Emotion API Error:', error.message);
    // Return fallback emotion response
    response.json({
      expression_id: 'exp_annoyed',
      dialogue: 'System temporarily overloaded. Retry your message.',
      timestamp: new Date().toISOString(),
      error: true
    });
  }
});

app.get('/api/battle-mode/daily-setup', async (request, response, next) => {
  try {
    const systemPrompt = `You are the system core engine for a gamified productivity interface. 
Generate exactly 3 highly strategic, priority daily tasks (Should-Do tasks) and exactly 1 high-dopamine reward.

The tasks must sound analytical, calculated, and high-impact (e.g., targeting core execution loops, system optimizations, deep technical scanning, or physiological maintenance).

Output MUST be a pure, raw JSON object exactly matching this schema, with no markdown code blocks, prose, or backticks:
{
    "tasks": [
        {"id": "ai_1", "name": "STRATEGIC_TASK_NAME_1", "xp": 75, "timeRemaining": 3600},
        {"id": "ai_2", "name": "STRATEGIC_TASK_NAME_2", "xp": 65, "timeRemaining": 1800},
        {"id": "ai_3", "name": "STRATEGIC_TASK_NAME_3", "xp": 80, "timeRemaining": 5400}
    ],
    "reward": "HIGH_DOPAMINE_REWARD_NAME_HERE"
}`;

    const groqKeys = [
      process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_SECONDARY,
      process.env.GROQ_API_KEY_TERTIARY
    ].filter(Boolean);

    let taskConfig = null;
    let setupSuccess = false;

    if (groqKeys.length > 0) {
      for (let keyIdx = 0; keyIdx < groqKeys.length; keyIdx++) {
        const activeKey = groqKeys[keyIdx];
        const keyLabel = keyIdx === 0 ? 'PRIMARY' : keyIdx === 1 ? 'SECONDARY' : 'TERTIARY';

        for (const model of GROQ_MODEL_TIERS) {
          try {
            console.log(`🎯 Generating daily tasks with Groq model: ${model} (${keyLabel} key)...`);
            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${activeKey}`
              },
              body: JSON.stringify({
                model: model,
                temperature: 0.7,
                response_format: { type: 'json_object' },
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: 'Generate today\'s objective parameters based on the system rules.' }
                ]
              })
            });

            if (groqResponse.ok) {
              const groqData = await groqResponse.json();
              const content = groqData.choices?.[0]?.message?.content;
              if (content) {
                try {
                  taskConfig = JSON.parse(content);
                  if (taskConfig.tasks && taskConfig.tasks.length === 3 && taskConfig.reward) {
                    console.log(`✅ Daily tasks generated successfully with Groq ${model} (${keyLabel} key)`);
                    setupSuccess = true;
                    break;
                  }
                } catch (parseError) {
                  console.warn(`⚠️ Parse error with ${model}, trying next...`);
                }
              }
            } else {
              const errorData = await groqResponse.json().catch(() => ({}));
              console.warn(`⚠️ Groq Daily Setup failed for ${model}: ${errorData.error?.message || 'Unknown'}`);
            }
          } catch (err) {
            console.warn(`⚠️ Groq Daily Setup error with ${model}:`, err.message.slice(0, 60));
          }
        } // end model loop
        if (setupSuccess) break;
      } // end key loop
    }

    // Try Gemini backup fallback
    if (!setupSuccess) {
      console.warn('⚠️ Groq daily setup generation failed, trying Gemini backup...');
      const geminiKeys = [
        process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        process.env.GEMINI_API_KEY_SECONDARY
      ].filter(Boolean);

      const dailySetupSchema = {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                xp: { type: "number" },
                timeRemaining: { type: "number" }
              },
              required: ["id", "name", "xp", "timeRemaining"]
            }
          },
          reward: { type: "string" }
        },
        required: ["tasks", "reward"]
      };

      for (let keyIdx = 0; keyIdx < geminiKeys.length; keyIdx++) {
        const useSecondary = (keyIdx === 1);
        const keyLabel = useSecondary ? 'SECONDARY' : 'PRIMARY';

        for (const geminiModel of GEMINI_MODEL_TIERS) {
          try {
            console.log(`🔄 Generating daily setup with Gemini backup model: ${geminiModel} (${keyLabel} key)...`);
            const ai = getGeminiClient(useSecondary);
            const apiResponse = await ai.models.generateContent({
              model: geminiModel,
              contents: [{
                role: "user",
                parts: [{ text: "Generate today's objective parameters based on the system rules." }]
              }],
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: dailySetupSchema
              }
            });

            const responseText = apiResponse.text.trim();
            taskConfig = JSON.parse(responseText);
            if (taskConfig.tasks && taskConfig.tasks.length === 3 && taskConfig.reward) {
              console.log(`✅ Daily setup generated successfully with Gemini backup: ${geminiModel}`);
              setupSuccess = true;
              break;
            }
          } catch (geminiError) {
            console.warn(`⚠️ Gemini daily setup backup failed with ${geminiModel}:`, geminiError.message);
          }
        } // end model loop
        if (setupSuccess) break;
      } // end key loop
    }

    // Fallback configuration
    if (!taskConfig) {
      console.log('📋 Using fallback task configuration');
      taskConfig = {
        tasks: [
          { id: 'ai_1', name: '[FALLBACK] Execute Advanced Logic Diagnostics & Paper Scanners', xp: 70, timeRemaining: 3600 },
          { id: 'ai_2', name: '[FALLBACK] High-Intensity Physiological Calisthenics Routine', xp: 65, timeRemaining: 1800 },
          { id: 'ai_3', name: '[FALLBACK] Optimize Webview Architecture Static Layer Compilers', xp: 75, timeRemaining: 5400 }
        ],
        reward: '[FALLBACK] Read 2 chapters of strategic light novel or execute high-dopamine asset'
      };
    }

    response.json(taskConfig);
  } catch (error) {
    console.error('❌ Battle Mode Daily Setup Error:', error.message);
    response.json({
      tasks: [
        { id: 'ai_1', name: '[ERROR_FALLBACK] Execute Advanced Logic Diagnostics & Paper Scanners', xp: 70, timeRemaining: 3600 },
        { id: 'ai_2', name: '[ERROR_FALLBACK] High-Intensity Physiological Calisthenics Routine', xp: 65, timeRemaining: 1800 },
        { id: 'ai_3', name: '[ERROR_FALLBACK] Optimize Webview Architecture Static Layer Compilers', xp: 75, timeRemaining: 5400 }
      ],
      reward: '[ERROR_FALLBACK] Read 2 chapters of strategic light novel or execute high-dopamine asset'
    });
  }
});

app.use((error, request, response, next) => {
  const statusCode = Number(error.statusCode || 500);
  response.status(statusCode).json({
    error: error.message || "Unhandled server error."
  });
});

const isFirebaseRuntime = Boolean(process.env.FUNCTION_TARGET || process.env.K_SERVICE);

if (!isFirebaseRuntime) {
  app.listen(port, () => {
    console.log(`Interactive Character Build AI is running at http://localhost:${port}`);
    console.log(`🤖 Starting with model: ${getActiveModel()}`);
    scheduleUpgradeAttempt(); // Start checking for model upgrades
  });
}

export const api = onRequest({
  region: "us-central1",
  cors: true,
  timeoutSeconds: 120,
  memory: "512MiB"
}, app);
