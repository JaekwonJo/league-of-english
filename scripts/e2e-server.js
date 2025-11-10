#!/usr/bin/env node
/**
 * e2e-server.js
 * Spin up backend + CRA dev server on deterministic ports for Playwright.
 */
const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || process.env.PLAYWRIGHT_PORT || 3010);
const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT || process.env.PLAYWRIGHT_BACKEND_PORT || 5010);
const API_URL = process.env.E2E_API_URL || process.env.PLAYWRIGHT_API_URL || `http://127.0.0.1:${BACKEND_PORT}/api`;

const serverEnv = {
  ...process.env,
  PORT: String(BACKEND_PORT),
  NODE_ENV: process.env.NODE_ENV || 'development'
};

const clientEnv = {
  ...process.env,
  PORT: String(FRONTEND_PORT),
  REACT_APP_API_URL: API_URL,
  BROWSER: process.env.BROWSER || 'none'
};

console.log(`[e2e-server] starting backend on ${BACKEND_PORT}, frontend on ${FRONTEND_PORT}, API ${API_URL}`);

const server = spawn(process.execPath, ['server/server.js'], {
  stdio: 'inherit',
  env: serverEnv
});

const client = spawn(isWin ? 'npm.cmd' : 'npm', ['start'], {
  cwd: path.join(__dirname, '..', 'client'),
  stdio: 'inherit',
  env: clientEnv
});

const shutdown = (code = 0) => {
  if (server && !server.killed) server.kill('SIGINT');
  if (client && !client.killed) client.kill('SIGINT');
  process.exit(code);
};

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`[e2e-server] backend exited with code ${code}`);
    shutdown(code || 1);
  }
});

client.on('exit', (code) => {
  if (code !== 0) {
    console.error(`[e2e-server] frontend exited with code ${code}`);
    shutdown(code || 1);
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
