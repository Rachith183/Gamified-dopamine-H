// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyAZlNop-8raJchjHhzp-DzgMylGnZSKxsU",
  authDomain: "intai-a71d8.firebaseapp.com",
  projectId: "intai-a71d8",
  storageBucket: "intai-a71d8.firebasestorage.app",
  messagingSenderId: "445587475962",
  appId: "1:445587475962:web:a13987c58207d02a98a843",
  measurementId: "G-JYWEGCBPRM"
};

// ============================================================================
// GEMINI API CONFIGURATION — PRIMARY / SECONDARY FALLBACK
// ============================================================================

// API Base URL: use current origin (works on Netlify, localhost, GitHub Pages)
window.AOI_API_BASE_URL = window.location.origin;

// API keys are server-side only (not exposed in frontend)
window.AOI_GEMINI_MODEL = "gemini-2.5-flash";

// ============================================================================
// INITIALIZE FIREBASE
// ============================================================================

if (typeof firebase !== 'undefined') {
  try {
    firebase.initializeApp(firebaseConfig);
    window.firebaseDB = firebase.firestore();
    window.firebaseAuth = firebase.auth();
    console.log("✅ Firebase initialized with project:", firebaseConfig.projectId);
  } catch (error) {
    console.warn("⚠️  Firebase initialization error:", error.message);
    window.firebaseDB = null;
    window.firebaseAuth = null;
  }
} else {
  console.warn("⚠️  Firebase SDK not loaded. Chat will work with fallback mode.");
  window.firebaseDB = null;
  window.firebaseAuth = null;
}
console.log("✅ Gemini API key configured with primary/secondary fallback");
