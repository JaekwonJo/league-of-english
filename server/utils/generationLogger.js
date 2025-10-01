const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'tmp');
const IMPLICIT_LOG_FILE = path.join(LOG_DIR, 'implicit-retries.log');

function ensureLogDir() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (error) {
    // noop: directory already exists or cannot be created
  }
}

function appendLogLine(filePath, payload) {
  try {
    ensureLogDir();
    const line = `${JSON.stringify(payload)}\n`;
    fs.appendFileSync(filePath, line, 'utf8');
  } catch (error) {
    console.warn('[generationLogger] failed to append log:', error?.message || error);
  }
}

function logImplicitAttempt(entry = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    type: 'implicit',
    ...entry,
  };
  appendLogLine(IMPLICIT_LOG_FILE, record);
}

module.exports = {
  logImplicitAttempt,
};
