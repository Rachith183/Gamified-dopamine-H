#!/usr/bin/env node
/**
 * Concurrent Development Server Runner
 * Starts backend (Node.js/Express) and serves frontend simultaneously
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendFile = path.join(__dirname, 'backend', 'server.js');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const logWithColor = (color, label, message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors.dim}[${timestamp}]${colors.reset} ${color}${label}${colors.reset} ${message}`);
};

console.log(`\n${colors.bright}${colors.cyan}🚀 Starting Interactive Character Build AI${colors.reset}\n`);

// Start Backend Server
const backendProcess = spawn('node', [backendFile], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
});

backendProcess.on('error', (error) => {
    logWithColor(colors.red, '[BACKEND ERROR]', error.message);
    process.exit(1);
});

backendProcess.on('exit', (code) => {
    if (code !== 0) {
        logWithColor(colors.red, '[BACKEND]', `Server exited with code ${code}`);
    }
});

// Graceful shutdown
const shutdown = () => {
    logWithColor(colors.yellow, '[SHUTDOWN]', 'Closing all servers...');
    backendProcess.kill();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logWithColor(colors.green, '[SERVER]', '✅ All servers are running');
logWithColor(colors.blue, '[FRONTEND]', 'Serving on http://localhost:3000');
logWithColor(colors.cyan, '[API]', 'Backend available at http://localhost:3000/api');
