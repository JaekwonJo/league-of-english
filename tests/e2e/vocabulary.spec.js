const { test, expect } = require('@playwright/test');

const APP_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:5000/api';
const ADMIN_USERNAME = process.env.PLAYWRIGHT_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || 'admin123';

let backendReady = true;
let setupError;
let adminToken;
let documentId;
let documentTitle;

const vocabularySample = [
  'Day 01',
  'focus',
  '집중하다; 주의를 한곳에 모으다',
  'spark',
  '불꽃; 영감을 불러일으키다',
  'Day 02',
  'anchor',
  '버팀목; 단단히 고정하다',
  'flight',
  '비행; 도약'
].join('\n');

test.beforeAll(async ({ request }) => {
  try {
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD }
    });
    if (!loginResponse.ok()) {
      throw new Error(`관리자 로그인에 실패했습니다. status=${loginResponse.status()}`);
    }
    const loginJson = await loginResponse.json();
    adminToken = loginJson.token;

    documentTitle = `Vocabulary E2E ${Date.now()}`;
    const uploadResponse = await request.post(`${API_BASE_URL}/upload-document`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      multipart: {
        file: {
          name: `vocab-e2e-${Date.now()}.txt`,
          mimeType: 'text/plain',
          buffer: Buffer.from(vocabularySample, 'utf-8')
        },
        title: documentTitle,
        type: 'vocabulary',
        category: '테스트',
        grade: '2'
      }
    });

    if (!uploadResponse.ok()) {
      throw new Error(`단어장 업로드에 실패했습니다. status=${uploadResponse.status()}`);
    }

    const uploadJson = await uploadResponse.json();
    documentId = uploadJson.id;
  } catch (error) {
    backendReady = false;
    setupError = error;
    console.warn('[vocabulary-e2e] setup skipped:', error?.message || error);
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

test('단어장 선택 후 시험을 제출하면 결과가 표시된다', async ({ page }) => {
  test.skip(!backendReady, `Vocabulary E2E를 건너뜁니다: ${setupError?.message || '백엔드가 준비되지 않았습니다.'}`);

  await loginThroughUI(page);
  await page.goto(`${APP_BASE_URL}/vocabulary`);

  const categoryToggle = page.locator('[data-testid="vocab-category-toggle"][data-category-key="other"]').first();
  await categoryToggle.waitFor();
  const expanded = await categoryToggle.getAttribute('aria-expanded');
  if (expanded === 'false') {
    await categoryToggle.click();
  }

  const setCard = page.locator('[data-testid="vocab-set-card"]', { hasText: documentTitle }).first();
  await setCard.waitFor();
  await setCard.click();

  const dayCard = page.locator('[data-testid="vocab-day-card"]').first();
  await dayCard.waitFor();
  await dayCard.click();

  const proceedButton = page.getByTestId('vocab-go-to-setup');
  await expect(proceedButton).toBeEnabled();
  await proceedButton.click();

  await page.getByTestId('vocab-start-quiz').click();
  const question = page.getByTestId('vocab-question');
  await question.waitFor();

  await page.getByTestId('vocab-option').first().click();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByTestId('vocab-exit').click();

  const summary = page.getByTestId('vocab-summary');
  await expect(summary).toContainText('정답률', { timeout: 15000 });
});
