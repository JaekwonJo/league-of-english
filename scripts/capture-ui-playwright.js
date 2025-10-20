#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

async function main() {
  const baseUrl = process.env.CAPTURE_BASE_URL || 'http://localhost:3000';
  const outputDir = buildOutputDir();
  const adminUsername = process.env.CAPTURE_ADMIN_USERNAME;
  const adminPassword = process.env.CAPTURE_ADMIN_PASSWORD;

  console.log(`[capture-ui] base URL: ${baseUrl}`);
  console.log(`[capture-ui] output directory: ${outputDir}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await takeScreenshot(page, outputDir, 'login-page.png');

    if (adminUsername && adminPassword) {
      console.log('[capture-ui] attempting login with provided credentials');
      await tryLogin(page, adminUsername, adminPassword, outputDir);
      await captureAuthenticatedViews(page, baseUrl, outputDir);
    } else {
      console.log('[capture-ui] admin credentials not provided, skipping authenticated captures');
    }
  } catch (error) {
    console.error('[capture-ui] failure:', error?.message || error);
  } finally {
    await browser.close();
    console.log('[capture-ui] done');
  }
}

async function tryLogin(page, username, password, outputDir) {
  try {
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await takeScreenshot(page, outputDir, 'login-filled.png');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);
    await takeScreenshot(page, outputDir, 'dashboard-after-login.png');
  } catch (error) {
    console.warn('[capture-ui] login sequence failed, continuing with public captures:', error?.message || error);
  }
}

async function captureAuthenticatedViews(page, baseUrl, outputDir) {
  const targets = [
    { path: '/analysis', name: 'analysis-page.png' },
    { path: '/study', name: 'study-page.png' },
    { path: '/ranking', name: 'ranking-page.png' },
    { path: '/vocabulary', name: 'vocabulary-page.png' }
  ];

  for (const target of targets) {
    try {
      await page.goto(`${baseUrl}${target.path}`, { waitUntil: 'networkidle' });
      await takeScreenshot(page, outputDir, target.name);
    } catch (error) {
      console.warn(`[capture-ui] failed to capture ${target.path}:`, error?.message || error);
    }
  }
}

async function takeScreenshot(page, outputDir, filename) {
  const filePath = path.join(outputDir, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`[capture-ui] saved ${filename}`);
}

function buildOutputDir() {
  const root = path.join(__dirname, '..', 'logs', 'ui-captures');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(root, stamp);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

main();
