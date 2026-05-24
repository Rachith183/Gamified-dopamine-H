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
          max_tokens: 150
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

// Keyword-based emotion detection - with comprehensive keyword coverage
const detectEmotionByKeywords = (message) => {
  const msgLower = message.toLowerCase();

  // exp_angry: user is down, depressed, sad, emotional, whining, anxious, overwhelmed
  if (/depressed|down|sad|worthless|hopeless|crying|suicidal|anxious|overwhelmed|stressed|miserable|terrible|awful|hate|devastated|broken|dying|bleeding|painful|hurting|struggling|suffering/i.test(msgLower)) {
    return { expression_id: "exp_angry", dialogue: "Your instability is showing." };
  }

  // exp_smiling: user is enthusiastic, happy, optimistic, excited
  if (/excited|happy|enthusiastic|stoked|great|amazing|awesome|love it|incredible|fantastic|best|optimistic|thrilled|pumped|hyped|blessed|grateful|thankful|grateful|proud/i.test(msgLower)) {
    return { expression_id: "exp_smiling", dialogue: "You're trending upward." };
  }

  // exp_satisfied: user completed task, planning academics, workout, finishing important task
  if (/completed|finishing|finished|done|accomplished|achieved|passed|succeeded|nailed|workout|exercise|studied|learned|finished|delivered|executed|submitted|implemented|built|created/i.test(msgLower)) {
    return { expression_id: "exp_satisfied", dialogue: "Progress logged." };
  }

  // exp_annoyed: user wasting time, eating junk, not completing task, excuses, procrastinating, complaining
  if (/procrastinat|wasting time|lazy|junk food|eating|skipped|failed|gave up|excuse|quit|wasted|distracted|overthinking|complain|annoyed|frustrated|irritated|bothered|fed up|scrolling|social media|netflix|gaming/i.test(msgLower)) {
    return { expression_id: "exp_annoyed", dialogue: "Predictable inefficiency." };
  }

  return null;
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

    // Try keyword detection first (instant, no API call)
    const keywordMatch = detectEmotionByKeywords(message);
    if (keywordMatch) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keywordMatch)
      };
    }

    const emotionPrompt = `You are Aoi Hinami - cold, direct, and perceptive. Analyze the user's message and respond with ONLY valid JSON.

Respond with: {"expression_id":"EMOTION","dialogue":"response"}

EMOTION DETECTION GUIDE:
- exp_angry: User is down, depressed, sad, emotional, whining, overwhelmed, anxious, or struggling
- exp_smiling: User is enthusiastic, happy, optimistic, excited, or pumped
- exp_satisfied: User completed/finished a task, exercise, academics, or important goal
- exp_annoyed: User is procrastinating, wasting time, making excuses, eating junk, or complaining

User message: "${message}"
Daily progress: ${dailyProgress}%, Distractions: ${distractionsCount}, Stability: ${(stability * 100).toFixed(0)}%

CRITICAL: Pick ONLY ONE emotion. Response under 15 words. Be cold and direct like Aoi Hinami.`;

    let emotionText = "";
    let usedGemini = false;

    // Try Groq first
    try {
      emotionText = await callGroq(emotionPrompt);
    } catch (groqErr) {
      console.log("Groq failed:", groqErr.message);
      // Fall back to Gemini
      try {
        emotionText = await callGemini(emotionPrompt);
        usedGemini = true;
      } catch (geminiErr) {
        console.error("Gemini also failed:", geminiErr.message);
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expression_id: "exp_annoyed", dialogue: "APIs temporarily unavailable." })
        };
      }
    }

    let emotionData = { expression_id: "exp_annoyed", dialogue: "Processing..." };
    try {
      emotionData = JSON.parse(emotionText);
      // Validate expression_id
      const validExpressions = ['exp_angry', 'exp_smiling', 'exp_satisfied', 'exp_annoyed'];
      if (!validExpressions.includes(emotionData.expression_id)) {
        console.warn("Invalid expression_id returned:", emotionData.expression_id);
        emotionData.expression_id = 'exp_annoyed';
      }
    } catch (parseErr) {
      console.warn("Parse error:", parseErr.message, "Raw response:", emotionText);
      emotionData = { expression_id: "exp_annoyed", dialogue: "Response received." };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emotionData)
    };
  } catch (error) {
    console.error("Emotion endpoint error:", error);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression_id: "exp_annoyed", dialogue: "Error processing emotion." })
    };
  }
};
