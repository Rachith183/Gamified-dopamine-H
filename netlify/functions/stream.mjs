import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey });
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { message, character = "Aoi Hinami" } = JSON.parse(event.body || "{}");

    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: "message is required" }) };
    }

    const prompt = `You are ${character}. Respond naturally and concisely to: "${message}". Keep response under 30 words.`;

    const client = getGeminiClient();
    const stream = client.models.streamGenerateContent({
      model: "models/gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
      fullResponse += text;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: fullResponse })
    };
  } catch (error) {
    console.error("Stream endpoint error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
