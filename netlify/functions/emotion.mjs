import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey });
};

const callGemini = async (prompt) => {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: "models/gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

const callGroq = async (prompt) => {
  const groqKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_SECONDARY,
    process.env.GROQ_API_KEY_TERTIARY
  ].filter(Boolean);

  if (!groqKeys.length) throw new Error("No Groq API keys configured");

  for (const key of groqKeys) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 100
        })
      });

      if (!response.ok) {
        console.warn(`Groq key failed (${response.status}), trying next...`);
        continue;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      console.warn("Groq error, trying next key:", err.message);
    }
  }

  throw new Error("All Groq keys exhausted");
};

// Keyword-based emotion detection for safety fallback
const detectEmotionByKeywords = (message) => {
  const msgLower = message.toLowerCase();

  // Angry: depressed, down, sad, worthless, hopeless, crying, suicidal, anxious
  if (/depressed|down|sad|worthless|hopeless|crying|suicidal|anxious|overwhelmed|stressed/i.test(msgLower)) {
    return { expression_id: "exp_angry", confidence: 0.9 };
  }

  // Smiling: excited, happy, enthusiastic, stoked, great, amazing, awesome, love it
  if (/excited|happy|enthusiastic|stoked|great|amazing|awesome|love it|incredible|fantastic|best/i.test(msgLower)) {
    return { expression_id: "exp_smiling", confidence: 0.85 };
  }

  // Proud/Satisfied: completed, finished, done, accomplished, achieved, passed, succeeded, nailed it
  if (/completed|finished|done|accomplished|achieved|passed|succeeded|nailed|workout|exercise|studied|learned/i.test(msgLower)) {
    return { expression_id: "exp_satisfied", confidence: 0.8 };
  }

  // Annoyed/Dissatisfied: procrastinating, wasting time, lazy, junk food, eating, skipped, failed, gave up, excuse
  if (/procrastinat|wasting time|lazy|junk|eating|skipped|failed|gave up|excuse|quit|wasted|distracted|overthinking/i.test(msgLower)) {
    return { expression_id: "exp_annoyed", confidence: 0.75 };
  }

  return null; // No strong keyword match, let Groq decide
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { message, userId, userContext } = JSON.parse(event.body || "{}");

    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: "message is required" }) };
    }

    const dailyProgress = userContext?.dailyProgress || 0;
    const distractionsCount = userContext?.distractionsCount || 0;
    const stability = userContext?.stability || 0.5;

    // Check for strong keyword matches first (safety fallback)
    const keywordMatch = detectEmotionByKeywords(message);

    const emotionPrompt = `You are Aoi Hinami, a cold, calculated character that assesses user behavior and responds with appropriate expressions.

Analyze this user input and select the most appropriate emotion:

User said: "${message}"
Daily Progress: ${dailyProgress}%
Distractions: ${distractionsCount}
Stability: ${(stability * 100).toFixed(0)}%

EMOTION CATEGORIES (pick ONE):
- exp_angry: User is depressed, down, overwhelmed, anxious, or emotionally struggling
- exp_smiling: User is enthusiastic, happy, optimistic, or excited about something
- exp_satisfied: User completed/finished a task, accomplished a goal, studied, exercised, or did something productive
- exp_annoyed: User is procrastinating, wasting time, making excuses, eating junk, or complaining

${keywordMatch ? `KEYWORD HINT: Message contains keywords suggesting "${keywordMatch.expression_id}" (confidence: ${keywordMatch.confidence})` : "No strong keyword markers detected - use contextual analysis."}

Respond with ONLY valid JSON:
{"expression_id":"exp_angry","dialogue":"message here"}

Keep dialogue under 20 words. Match Aoi Hinami's cold, direct personality.`;

    let emotionText = "";

    // Try Groq first, fall back to Gemini
    try {
      emotionText = await callGroq(emotionPrompt);
    } catch (groqErr) {
      console.log("Groq failed, using Gemini:", groqErr.message);
      emotionText = await callGemini(emotionPrompt);
    }

    let emotionData = { expression_id: "exp_annoyed", dialogue: "Processing..." };
    try {
      emotionData = JSON.parse(emotionText);
      
      // Validate expression_id is one of the allowed emotions
      const allowedEmotions = ["exp_angry", "exp_smiling", "exp_satisfied", "exp_annoyed"];
      if (!allowedEmotions.includes(emotionData.expression_id)) {
        console.warn(`Invalid emotion "${emotionData.expression_id}", falling back to keyword match or default`);
        if (keywordMatch) {
          emotionData.expression_id = keywordMatch.expression_id;
        }
      }
    } catch {
      console.warn("Failed to parse emotion JSON, using keyword fallback or default");
      if (keywordMatch) {
        emotionData.expression_id = keywordMatch.expression_id;
        emotionData.dialogue = "Pattern recognized.";
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emotionData)
    };
  } catch (error) {
    console.error("Emotion endpoint error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
