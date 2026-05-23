console.log("Querying local backend API at http://localhost:3000/api/emotion...");

try {
  const response = await fetch("http://localhost:3000/api/emotion", {
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
    console.log("✅ Backend API success! Response:");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(`❌ Backend API failed with status ${response.status}:`);
    const errText = await response.text();
    console.log(errText);
  }
} catch (err) {
  console.log("❌ Request error:", err.message);
}
