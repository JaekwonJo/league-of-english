const fs = require('fs');
const path = require('path');

const dotenvPath = path.join(__dirname, '..', '.env');
const requiredKeys = ['REACT_APP_API_URL'];
const loadedEnv = {};

if (fs.existsSync(dotenvPath)) {
  try {
    const raw = fs.readFileSync(dotenvPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...rest] = trimmed.split('=');
      loadedEnv[key] = rest.join('=').trim();
    });
  } catch (error) {
    console.warn('[prestart] Failed to read .env:', error.message);
  }
}

const missing = requiredKeys.filter((key) => !(process.env[key] || loadedEnv[key]));

if (missing.length) {
  console.warn('[prestart] Missing env keys:', missing.join(', '));
  console.warn('[prestart] For local dev you can add them to client/.env. Continuing anyway...');
}

console.log('[prestart] Environment check passed.');