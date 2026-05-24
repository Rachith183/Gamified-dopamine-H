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

const parseEmotionJson = (text) => {
  const jsonMatch = String(text || "").match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object in emotion response");
  const emotionData = JSON.parse(jsonMatch[0]);
  if (!emotionData.expression_id || !emotionData.dialogue) {
    throw new Error("Emotion response missing expression_id or dialogue");
  }
  return emotionData;
};

const normalizeEmotionExpressionId = (expressionId) => {
  const expressionAliases = {
    exp_angry: "exp_angry",
    exp_smiling: "exp_smiling",
    exp_smiling_audit: "exp_smiling",
    exp_satisfied: "exp_satisfied",
    exp_annoyed: "exp_annoyed"
  };

  return expressionAliases[String(expressionId || "").trim()] || "exp_annoyed";
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
          temperature: 0.5,
          max_tokens: 150,
          response_format: { type: "json_object" }
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
  if (/depress|down|sad|worthless|hopeless|cry|tears|lonely|alone|anxious|anxiety|panic|scared|afraid|worried|overwhelmed|stress|burnt out|burnout|exhausted|tired|miserable|terrible|awful|hate myself|devastated|broken|dying|painful|hurting|struggl|suffer|lost|empty|numb|demotivat|can't do this|cant do this/i.test(msgLower)) {
    return { expression_id: "exp_angry", dialogue: "Your instability is showing." };
  }

  // exp_smiling: user is enthusiastic, happy, optimistic, excited
  if (/excited|happy|joy|glad|enthusiastic|stoked|great|amazing|awesome|love it|love this|incredible|fantastic|best|optimistic|thrilled|pumped|hyped|blessed|grateful|thankful|proud|confident|motivated|lets go|let's go|yay|nice|cool|excellent|perfect|win|winning/i.test(msgLower)) {
    return { expression_id: "exp_smiling", dialogue: "You're trending upward." };
  }

  // exp_satisfied: user completed task, planning academics, workout, finishing important task
  if (/completed|complete|finishing|finished|done|accomplished|achieved|passed|succeeded|nailed|workout|exercise|gym|trained|training|pushup|pullup|squat|run|ran|studied|study|revised|revision|learned|practiced|delivered|executed|submitted|implemented|built|created|shipped|solved|fixed|cleaned|organized|productive|consistent|streak/i.test(msgLower)) {
    return { expression_id: "exp_satisfied", dialogue: "Progress logged." };
  }

  // exp_annoyed: user wasting time, eating junk, not completing task, excuses, procrastinating, complaining
  if (/procrastinat|wasting time|waste time|lazy|junk food|junk|overeating|ate too much|skipped|failed|gave up|excuse|quit|wasted|distracted|distraction|can't focus|cant focus|unfocused|overthinking|complain|annoyed|angry|mad|pissed|frustrated|irritated|bothered|fed up|bored|stuck|delay|later|scrolling|doomscroll|reels|shorts|instagram|youtube|social media|netflix|gaming|game all day/i.test(msgLower)) {
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

    let emotionData = null;
    let source = "groq";

    // Try Groq first, then Gemini, then keyword fallback.
    try {
      emotionData = parseEmotionJson(await callGroq(emotionPrompt));
    } catch (groqErr) {
      console.log("Groq failed:", groqErr.message);
      try {
        emotionData = parseEmotionJson(await callGemini(emotionPrompt));
        source = "gemini";
      } catch (geminiErr) {
        console.error("Gemini also failed:", geminiErr.message);
        source = "keyword";
      }
    }

    if (!emotionData) {
      emotionData = detectEmotionByKeywords(message) || { expression_id: "exp_annoyed", dialogue: "Response received." };
      source = "keyword";
    }

    emotionData.expression_id = normalizeEmotionExpressionId(emotionData.expression_id);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...emotionData, source })
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
