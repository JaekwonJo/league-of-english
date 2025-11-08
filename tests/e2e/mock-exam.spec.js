const { test, expect } = require('@playwright/test');

const APP_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:5000/api';
const ADMIN_USERNAME = process.env.PLAYWRIGHT_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || 'admin123';

let backendReady = true;
let setupError;

test.beforeAll(async ({ request }) => {
  try {
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD }
    });
    if (!loginResponse.ok()) {
      throw new Error(`관리자 로그인에 실패했습니다. status=${loginResponse.status()}`);
    }
  } catch (error) {
    backendReady = false;
    setupError = error;
    console.warn('[mock-exam-e2e] setup skipped:', error?.message || error);
  }
});

async function loginThroughUI(page) {
  await page.goto(`${APP_BASE_URL}/login`);
  await page.fill('input[name="username"]', ADMIN_USERNAME);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL('**/'),
    page.click('button[type="submit"]')
  ]);
}

test('모의고사 시작 · 제출 · 결과 확인 흐름이 동작한다', async ({ page }) => {
  test.skip(!backendReady, `Mock exam E2E를 건너뜁니다: ${setupError?.message || '백엔드가 준비되지 않았습니다.'}`);

  await loginThroughUI(page);
  await page.goto(`${APP_BASE_URL}/mock-exam`);

  await page.getByTestId('mock-start-button').click();
  await page.getByTestId('mock-question').waitFor();

  await page.getByTestId('mock-choice').first().click();
  await page.getByTestId('mock-submit').click();

  const resultCard = page.getByTestId('mock-result');
  await expect(resultCard).toContainText('정답률', { timeout: 15000 });
});
