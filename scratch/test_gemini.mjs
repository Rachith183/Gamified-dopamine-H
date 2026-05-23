import "dotenv/config";

const keys = [
  "AIzaSyDD48qPt3gRpvfnWxY_6Zo8nW1JIRdL4Y8", // Primary from config.js
  "AIzaSyBgqQB51TRk69PxqrvP4tPfQtvaqjEwj34", // Secondary from config.js
  process.env.GEMINI_API_KEY // From .env
].filter(Boolean);

console.log("Starting Gemini API Key Diagnostic Check...");
console.log(`Loaded ${keys.length} keys to check\n`);

for (let i = 0; i < keys.length; i++) {
  const key = keys[i];
  const label = i === 0 ? "CONFIG PRIMARY" : i === 1 ? "CONFIG SECONDARY" : "ENV KEY";
  
  console.log(`Testing ${label} Key (prefix: ${key.substring(0, 10)}...)...`);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello" }] }]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${label} Key: VALID. Response text: "${data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}"`);
    } else {
      const errText = await response.text();
      console.log(`❌ ${label} Key: FAILED. Status: ${response.status}. Error: ${errText}`);
    }
  } catch (err) {
    console.log(`❌ ${label} Key: ERROR:`, err.message);
  }
  console.log("-----------------------------------------");
}
