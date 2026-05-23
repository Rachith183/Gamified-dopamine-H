// Vercel serverless function - imports and exports the Express app with CORS headers
import app from '../backend/server.js';

// Handle CORS preflight requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://rachith183.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Strip /api prefix from route path for Express routing
  if (req.path.startsWith('/api/')) {
    req.url = req.url.replace(/^\/api/, '');
  }
  
  next();
});

export default app;
