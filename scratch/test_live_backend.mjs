console.log("Querying live backend API at https://gamified-dopamine-h.vercel.app/api/emotion...");

try {
  const response = await fetch("https://gamified-dopamine-h.vercel.app/api/emotion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Why is the character build system so important?",
      userId: "user_test_123",
      userContext: {
        dailyProgress: 10,
        distractionsCount: 1,
        stability: 0.5
      }
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log("✅ Live Backend API success! Response:");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(`❌ Live Backend API failed with status ${response.status}:`);
    const errText = await response.text();
    console.log(errText);
  }
} catch (err) {
  console.log("❌ Request error:", err.message);
}
