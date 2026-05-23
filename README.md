# 🎭 Interactive Character Build AI

Interactive Character Build AI is a gamified, real-world performance target builder and productivity system. Guided by an Aoi Hinami-style analytical coaching engine, it converts vague personal aspirations into rigorous, hierarchical targets, daily habits, real-time quests, currency rewards, alarms, and countdown timers.

---

## 🔗 Project Links

* **Live GitHub Pages Onboarding & Client:** [https://rachith183.github.io/dual-persona-simulator/](https://rachith183.github.io/dual-persona-simulator/)
* **Code Repository:** [https://github.com/Rachith183/dual-persona-simulator](https://github.com/Rachith183/dual-persona-simulator)

---

## ✨ System Features

### 1. Layered 2.5D Character Rig
* **Multi-Layer Vector Rendering Engine:** Consists of 8 standalone visual DOM layers (Base + Eyes + Mouth + Hair + Expressions) layered harmoniously via HSL-accented dark designs.
* **subtleBreathing Micro-Animation:** Standard modern CSS breathing applied smoothly to the avatar canvas to keep the interface responsive and alive.
* **Automatic Expression Switching:**
  * **Angry Expression (`exp 1 - angry`):** Triggered when daily progress is 0% and task completion is critically low (<30%).
  * **Annoyed Expression (`exp 2 - annoyed or disatisfied`):** Triggered when distractions accumulate (≥3 logs) or overall progress remains low (<40%).
  * **Proud/Satisfied (`exp3-proud or satisfied`):** Activated automatically upon achieving high metrics (≥70% progress) or establishing deep session context.
  * **Smiling/Sardonic (`exp 4 - smiling`):** Triggered if excessive distractions (≥3) occur alongside low performance metrics.
* **Seamless Blinking Animation:** A frame-rate independent blink loop (slowed 50% for composure) utilizing a 5-phase transition (Open → Half-Closed → Closed → Half-Closed → Open) every 8 seconds, with smart state persistence to avoid disappearing eyes.
* **Audio-Driven Lip Sync:** Deliberate 3-phase phonetic mouth cycle (Opening → Transition → Consonant) synchronized automatically with native Web Speech synthesis.

### 2. Gamified Diagnostics & Onboarding
* **Four-Stage Onboarding Engine:** 
  1. `STAGE_1_DESIRE`: Establishes primary long-term personal aspirations.
  2. `STAGE_2_CONSTRAINTS`: Processes fixed routines, school/work duties, sleep boundaries, and friction.
  3. `STAGE_3_RESOURCES`: Assesses exact productive hour blocks.
  4. `STAGE_4_ACTIVE`: Generates full execution blueprint (goals, quest cards, reward shops, alarms).
* **Robust Offline Fallback:** If API keys are absent or the backend is offline, a local diagnostic engine handles onboarding, rendering standard targets, quests, and timers gracefully.

### 3. Integrated Performance Tools
* **Circular Progress Goal Indicators:** Real-time SVG stroke calculations presenting daily, midterm, and end-goal progress.
* **Distraction Telemetry Dashboard:** Tracks and groups logs dynamically to feed emotional metrics directly to Aoi's posture.
* **Calendar Task Grid:** Heatmap indicators marking completed days in Emerald Mint (`✓`) and incomplete days in Vivid Coral (`✗`).
* **Active Quest Cards:** Complete sprints to unlock global XP and redeemable points.
* **Dynamic Reward Shop:** Redeem points for custom privileges (Premium Focus Sessions, Analytics Packs, Custom Badges).

### 4. Enterprise-Grade Failover
* **Backend Dual API Key Failover:** Lazy client initialization that tries the primary key (`AIzaSyDD...`), catches failures (like 429 quota exhaustion), swaps to the secondary key (`AIzaSyBg...`), and gracefully cycles through available models to prevent user disruptions.
* **Frontend Client Failover:** Implemented client-side retry loops inside `callGeminiAPI` to ensure seamless offline or local-browser failover.

---

## 🛠 Technology Stack

### Frontend Canvas
* **Core:** Semantic HTML5, Vanilla ES6+ Javascript (Zero external visual frameworks for maximum control)
* **Styling:** Curated Glassmorphic HSL dark theme with smooth micro-animations (`subtleBreathing`)
* **Databases:** Firebase SDK v10 (Auth, Real-time Firestore Sync)

### Optional Backend
* **Runtime:** Node.js + Express.js
* **Integration:** Google Gen AI SDK (`@google/genai`)

---

## 📁 Project Structure

```text
.
├── backend/
│   └── server.js                 # Node/Express API Key Failover Gateway
├── frontend/
│   ├── app.js                    # Character rig, blinking loops, & Firestore handlers
│   ├── config.js                 # Dual-key client credentials & Firebase links
│   ├── index.html                # Dark Glassmorphic canvas and metrics layout
│   └── style.css                 # Premium styling, variables, & breathing keyframes
├── layers expression/            # Organized avatar source assets (Angry, Smiling, etc.)
├── scripts/
│   └── prepare-pages.mjs         # Optimized packaging compiler for static builds
├── dist/                         # Output destination for prepared builds
├── package.json                  # System configuration and scripts
├── .env                          # Local credentials storage
└── README.md                     # Centralized project documentation
```

---

## 📋 Getting Started

### 1. Prerequisites
* **Node.js:** v20.0.0 or higher
* **Credentials:** Firebase Project ID & Gemini API Keys (primary and secondary)

### 2. Installation
Navigate to the project root and install all dependencies:
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the project root:
```env
PORT=3000
GEMINI_API_KEY=your_primary_gemini_key
GEMINI_API_KEY_SECONDARY=your_secondary_gemini_key
```

### 4. Running the Local Servers
Start the local server gateway:
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

If Port 3000 is occupied, launch on a custom port:
```powershell
$env:PORT="3001"
npm run dev
```

---

## 🚀 Static GitHub Pages Deployment

To build a zero-cost static deployment:

1. Compile the build bundle:
   ```bash
   npm run prepare:pages
   ```
2. The prepared static files (with flattened relative folders) will compile under:
   ```text
   dist/github-pages/
   ```
3. Push changes to the repository's `main` branch. The pre-configured GitHub Action `.github/workflows/pages.yml` will compile and host the files on GitHub Pages.

---

## 🛡 Security and Development Rules

1. **Never commit `.env` or credentials** directly to GitHub.
2. **Key Restriction:** Restrict your Gemini keys in Google AI Studio / Google Cloud console to your authorized hosted domains (e.g. `https://rachith183.github.io/*`).
3. **No-Paid Fallback:** Always allow clients to input temporary browser-level keys inside the UI (saved locally to their `localStorage` buffer) to maintain cost efficiency.
