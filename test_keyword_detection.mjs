// Quick test to verify emotion detection is working
const keywords_test = [
  'I completed my workout',
  'I am so excited', 
  'I wasted time today',
  'I feel depressed'
];

// Test locally
keywords_test.forEach(msg => {
  const msgLower = msg.toLowerCase();
  
  if (/depressed|down|sad|worthless|hopeless|crying|suicidal|anxious|overwhelmed|stressed|miserable|terrible|awful|hate|devastated|broken|dying|bleeding|painful|hurting|struggling|suffering/i.test(msgLower)) {
    console.log(`✅ ANGRY: "${msg}"`);
  } else if (/excited|happy|enthusiastic|stoked|great|amazing|awesome|love it|incredible|fantastic|best|optimistic|thrilled|pumped|hyped|blessed|grateful|thankful|grateful|proud/i.test(msgLower)) {
    console.log(`✅ SMILING: "${msg}"`);
  } else if (/completed|finishing|finished|done|accomplished|achieved|passed|succeeded|nailed|workout|exercise|studied|learned|finished|delivered|executed|submitted|implemented|built|created/i.test(msgLower)) {
    console.log(`✅ SATISFIED: "${msg}"`);
  } else if (/procrastinat|wasting time|lazy|junk food|eating|skipped|failed|gave up|excuse|quit|wasted|distracted|overthinking|complain|annoyed|frustrated|irritated|bothered|fed up|scrolling|social media|netflix|gaming/i.test(msgLower)) {
    console.log(`✅ ANNOYED: "${msg}"`);
  } else {
    console.log(`❌ NO MATCH: "${msg}"`);
  }
});
