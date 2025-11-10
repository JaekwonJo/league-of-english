const { defineConfig, devices } = require('@playwright/test');

const isCI = !!process.env.CI;
const FRONTEND_PORT = Number(process.env.PLAYWRIGHT_PORT || process.env.E2E_FRONTEND_PORT || 3010);
const BACKEND_PORT = Number(process.env.PLAYWRIGHT_BACKEND_PORT || process.env.E2E_BACKEND_PORT || 5010);
const explicitBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const explicitApiURL = process.env.PLAYWRIGHT_API_URL;
const derivedBaseURL = explicitBaseURL || `http://127.0.0.1:${FRONTEND_PORT}`;
const derivedApiURL = explicitApiURL || `http://127.0.0.1:${BACKEND_PORT}/api`;

process.env.PLAYWRIGHT_BASE_URL = derivedBaseURL;
process.env.PLAYWRIGHT_API_URL = derivedApiURL;

const shouldLaunchLocalServers = !explicitBaseURL && !process.env.PLAYWRIGHT_SKIP_WEBSERVER;

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 5000,
  },
  retries: isCI ? 1 : 0,
  fullyParallel: false,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || derivedBaseURL,
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: 'off',
    video: 'off',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: shouldLaunchLocalServers
    ? [{
        command: 'node scripts/e2e-server.js',
        port: FRONTEND_PORT,
        timeout: 120 * 1000,
        reuseExistingServer: !isCI,
        env: {
          ...process.env,
          E2E_FRONTEND_PORT: String(FRONTEND_PORT),
          E2E_BACKEND_PORT: String(BACKEND_PORT),
          E2E_API_URL: derivedApiURL,
          BROWSER: 'none'
        }
      }]
    : undefined,
});
