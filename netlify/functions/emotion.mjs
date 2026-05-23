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

// Keyword-based emotion detection for safety
const detectEmotionByKeywords = (message) => {
  const msgLower = message.toLowerCase();

  if (/depressed|down|sad|worthless|hopeless|crying|suicidal|anxious|overwhelmed|stressed/i.test(msgLower)) {
    return "exp_angry";
  }
  if (/excited|happy|enthusiastic|stoked|great|amazing|awesome|love it|incredible|fantastic|best/i.test(msgLower)) {
    return "exp_smiling";
  }
  if (/completed|finished|done|accomplished|achieved|passed|succeeded|nailed|workout|exercise|studied|learned/i.test(msgLower)) {
    return "exp_satisfied";
  }
  if (/procrastinat|wasting time|lazy|junk|eating|skipped|failed|gave up|excuse|quit|wasted|distracted|overthinking/i.test(msgLower)) {
    return "exp_annoyed";
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

    // Try keyword detection first (instant)
    const keywordMatch = detectEmotionByKeywords(message);
    if (keywordMatch) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expression_id: keywordMatch,
          dialogue: "Pattern recognized."
        })
      };
    }

    // If no keyword match, call Groq/Gemini
    const emotionPrompt = `Respond with ONLY valid JSON in this exact format:
{"expression_id":"exp_angry","dialogue":"message here"}

User said: "${message}"
Daily Progress: ${dailyProgress}%
Distractions: ${distractionsCount}
Stability: ${(stability * 100).toFixed(0)}%

Choose ONE emotion:
- exp_angry: User is depressed/anxious/overwhelmed
- exp_smiling: User is happy/excited/optimistic
- exp_satisfied: User completed task/accomplished goal
- exp_annoyed: User is procrastinating/wasting time

Keep dialogue under 20 words. Act as Aoi Hinami - cold, direct.`;

    let emotionText = "";
    try {
      emotionText = await callGroq(emotionPrompt);
    } catch (groqErr) {
      console.log("Groq failed, trying Gemini:", groqErr.message);
      try {
        emotionText = await callGemini(emotionPrompt);
      } catch (geminiErr) {
        return {
          statusCode: 503,
          body: JSON.stringify({ error: "APIs busy, using default emotion" })
        };
      }
    }

    let emotionData = { expression_id: "exp_annoyed", dialogue: "Processing..." };
    try {
      emotionData = JSON.parse(emotionText);
    } catch (parseErr) {
      console.warn("JSON parse failed:", parseErr.message, "Raw:", emotionText);
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
