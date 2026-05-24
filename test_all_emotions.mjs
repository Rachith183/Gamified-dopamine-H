// Test all emotions
import fetch from 'node-fetch';

const API_URL = 'https://stupendous-tartufo-549cf4.netlify.app/api/emotion';

const testCases = [
  { message: 'I completed my workout today!', expectedEmotion: 'exp_satisfied' },
  { message: 'I am so excited and pumped!', expectedEmotion: 'exp_smiling' },
  { message: 'I wasted the whole day scrolling', expectedEmotion: 'exp_annoyed' },
  { message: 'I feel so depressed and sad', expectedEmotion: 'exp_angry' }
];

async function testEmotion(message, expectedEmotion) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        userId: 'test_user',
        userContext: { dailyProgress: 50, distractionsCount: 0, stability: 0.5 }
      })
    });
    
    const data = await response.json();
    const match = data.expression_id === expectedEmotion ? '✅' : '❌';
    console.log(`${match} "${message}"`);
    console.log(`   Expected: ${expectedEmotion}, Got: ${data.expression_id}`);
    console.log(`   Dialogue: "${data.dialogue}"\n`);
  } catch (err) {
    console.error(`Error testing "${message}":`, err.message);
  }
}

console.log('Testing all emotions:\n');
for (const test of testCases) {
  await testEmotion(test.message, test.expectedEmotion);
}
