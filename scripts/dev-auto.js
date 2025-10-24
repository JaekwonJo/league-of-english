#!/usr/bin/env node
/*
 * dev-auto.js
 * - 빈 포트를 자동으로 골라 백엔드/프런트를 동시에 실행합니다.
 * - 백엔드 기본 5000, 프런트 기본 3000. 이미 사용 중이면 +1, +2로 시도합니다.
 */
const net = require('net');
const { spawn } = require('child_process');
const path = require('path');

function findFreePort(preferred, maxTries = 5) {
  return new Promise((resolve) => {
    let attempt = 0;
    const tryPort = (port) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => {
        attempt += 1;
        if (attempt >= maxTries) return resolve(null);
        tryPort(port + 1);
      });
      server.listen(port, () => {
        const picked = server.address().port;
        server.close(() => resolve(picked));
      });
    };
    tryPort(preferred);
  });
}

async function main() {
  const backendPort = await findFreePort(5000, 8) || 5000;
  const frontendPort = await findFreePort(3000, 8) || 3000;
  const apiUrl = process.env.REACT_APP_API_URL || `http://localhost:${backendPort}/api`;

  console.log(`\n[dev:auto] backend: ${backendPort}, frontend: ${frontendPort}, REACT_APP_API_URL: ${apiUrl}\n`);

  const nodemonBin = path.join(__dirname, '..', 'node_modules', 'nodemon', 'bin', 'nodemon.js');

  const server = spawn(process.execPath, [nodemonBin, 'server/server.js'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(backendPort) }
  });

  const client = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['start'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..', 'client'),
    env: { ...process.env, PORT: String(frontendPort), REACT_APP_API_URL: apiUrl }
  });

  const shutdown = () => {
    if (!server.killed) server.kill('SIGINT');
    if (!client.killed) client.kill('SIGINT');
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[dev:auto] failed:', err);
  process.exit(1);
});
