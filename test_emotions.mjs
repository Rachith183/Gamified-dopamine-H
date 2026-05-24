// Test emotion detection locally
const test_messages = [
  'I am so excited!',
  'I completed my workout',
  'I am so annoyed with procrastinating',
  'I feel so sad and depressed'
];

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

console.log('Testing emotion detection:\n');
test_messages.forEach(msg => {
  const result = detectEmotionByKeywords(msg);
  console.log(`Message: "${msg}"`);
  console.log(`Result: ${JSON.stringify(result)}\n`);
});
