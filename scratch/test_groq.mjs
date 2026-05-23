import "dotenv/config";

const keys = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_SECONDARY,
  process.env.GROQ_API_KEY_TERTIARY
];

console.log("Starting Groq API Key Diagnostic Check...");
console.log(`Loaded ${keys.filter(Boolean).length} keys from .env\n`);

for (let i = 0; i < keys.length; i++) {
  const key = keys[i];
  const label = i === 0 ? "PRIMARY" : i === 1 ? "SECONDARY" : "TERTIARY";
  
  if (!key) {
    console.log(`❌ ${label} Key: Missing in .env`);
    continue;
  }
  
  console.log(`Testing ${label} Key (prefix: ${key.substring(0, 10)}...)...`);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 10
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${label} Key: VALID. Response: "${data.choices?.[0]?.message?.content?.trim()}"`);
    } else {
      const errText = await response.text();
      console.log(`❌ ${label} Key: FAILED. Status: ${response.status}. Error: ${errText}`);
    }
  } catch (err) {
    console.log(`❌ ${label} Key: ERROR:`, err.message);
  }
  console.log("-----------------------------------------");
}
