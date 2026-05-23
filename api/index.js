// Vercel serverless function handler
import app from '../backend/server.js';

// Vercel expects either a default export that's an Express app or a handler function
// Express apps can be directly exported as the handler
export default app;
