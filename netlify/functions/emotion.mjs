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

// Keyword-based emotion detection
const detectEmotionByKeywords = (message) => {
  const msgLower = message.toLowerCase();

  // exp_angry: depressed, down, sad, anxious, overwhelmed, hopeless
  if (/depressed|down|sad|worthless|hopeless|crying|suicidal|anxious|overwhelmed|stressed/i.test(msgLower)) {
    return { expression_id: "exp_angry", dialogue: "Your instability is showing." };
  }

  // exp_smiling: happy, excited, enthusiastic, optimistic, great
  if (/excited|happy|enthusiastic|stoked|great|amazing|awesome|love it|incredible|fantastic|best/i.test(msgLower)) {
    return { expression_id: "exp_smiling", dialogue: "You're trending upward." };
  }

  // exp_satisfied: completed, finished, done, accomplished, exercised, studied
  if (/completed|finished|done|accomplished|achieved|passed|succeeded|nailed|workout|exercise|studied|learned/i.test(msgLower)) {
    return { expression_id: "exp_satisfied", dialogue: "Progress logged." };
  }

  // exp_annoyed: procrastinating, lazy, wasting time, junk, excuse, failed
  if (/procrastinat|wasting time|lazy|junk|eating|skipped|failed|gave up|excuse|quit|wasted|distracted|overthinking/i.test(msgLower)) {
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

    const emotionPrompt = `Respond with ONLY valid JSON:
{"expression_id":"exp_angry","dialogue":"response"}

User: "${message}"
Progress: ${dailyProgress}%, Distractions: ${distractionsCount}, Stability: ${(stability * 100).toFixed(0)}%

Pick ONE: exp_angry | exp_smiling | exp_satisfied | exp_annoyed
Keep dialogue under 15 words. Be Aoi Hinami - cold, direct.`;

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
    } catch (parseErr) {
      console.warn("Parse error:", parseErr.message, "Raw response:", emotionText);
      // Return what we got even if malformed
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
