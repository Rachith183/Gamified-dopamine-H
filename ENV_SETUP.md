# Environment Variables Setup Guide

## Overview
This project uses environment variables to store sensitive API keys and configuration. They are **never committed to GitHub** for security.

---

## Local Development Setup

### Step 1: Copy the template
```bash
cp .env.example .env.local
```

### Step 2: Fill in your API keys
Open `.env.local` and replace placeholders with your actual keys:

```env
GROQ_API_KEY=sk_live_your_actual_key_here
GROQ_API_KEY_SECONDARY=sk_live_your_secondary_key_here
GEMINI_API_KEY=your_google_genai_key_here
GEMINI_API_KEY_SECONDARY=your_google_genai_secondary_here
```

### Step 3: Run locally
```bash
npm run dev
```

The backend will automatically load `.env.local` via `dotenv/config` in `backend/server.js`.

---

## Production (Vercel) Setup

**NEVER push .env.local to GitHub!** It's already in `.gitignore`.

Instead, add environment variables directly in Vercel:

### Step 1: Go to Vercel Project Settings
- Visit: https://vercel.com/rachith183s-projects/gamified-dopamine-h/settings/environment-variables

### Step 2: Add Each Variable
Click "Add Variable" and enter:

| Key | Value | Environment |
|-----|-------|-------------|
| `GROQ_API_KEY` | `sk_live_...` | Production |
| `GROQ_API_KEY_SECONDARY` | `sk_live_...` | Production |
| `GEMINI_API_KEY` | `AIza...` | Production |
| `GEMINI_API_KEY_SECONDARY` | `AIza...` | Production |

### Step 3: Redeploy
After adding variables, push a new commit to trigger redeployment:
```bash
git commit --allow-empty -m "Trigger: Activate environment variables" && git push origin main
```

---

## Security Notes

✅ **GOOD:** `.env.local` is in `.gitignore` (won't be pushed)  
✅ **GOOD:** `.env.example` is committed (shows structure only)  
✅ **GOOD:** Vercel encrypts environment variables  
✅ **GOOD:** `.env.*` files excluded from Git  

❌ **NEVER:** Commit `.env` or `.env.local`  
❌ **NEVER:** Share API keys in chat or code  
❌ **NEVER:** Push actual keys to GitHub  

---

## Fallback System

If API keys are not set, the system has fallback behavior:

- **Groq not configured** → Falls back to Gemini
- **Gemini not configured** → System will error (requires at least one API service)
- **Multiple keys per service** → Automatic fallback on quota errors

---

## Troubleshooting

### Keys not working locally?
- Ensure `.env.local` exists in root directory
- Restart your dev server: `npm run dev`
- Check that keys are valid (not expired)

### Keys not working on Vercel?
- Verify variables are added to Vercel dashboard
- Trigger a redeploy (push empty commit or click "Redeploy")
- Check Vercel deployment logs for errors

### 404 errors on /api/emotion?
- This means backend isn't getting requests properly
- Verify `api/index.js` exists
- Check that `frontend/config.js` has correct API base URL
