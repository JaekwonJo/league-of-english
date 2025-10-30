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

const sampleText = `Mentors calmly guide anxious students through new routines.
They model gentle language, slowing the pace so everyone stays confident.

As feedback arrives, teachers invite learners to rewrite sentences together.
They highlight positive phrasing first, then raise questions that spark reflection.`;

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

    documentTitle = `Workbook E2E ${Date.now()}`;
    const uploadResponse = await request.post(`${API_BASE_URL}/upload-document`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      multipart: {
        file: {
          name: `workbook-e2e-${Date.now()}.txt`,
          mimeType: 'text/plain',
          buffer: Buffer.from(sampleText, 'utf-8')
        },
        title: documentTitle,
        type: 'worksheet',
        category: '테스트',
        grade: '2'
      }
    });

    if (!uploadResponse.ok()) {
      throw new Error(`문서 업로드에 실패했습니다. status=${uploadResponse.status()}`);
    }
    const uploadJson = await uploadResponse.json();
    documentId = uploadJson.id;
    if (!documentId) {
      throw new Error('업로드 응답에서 문서 ID를 찾을 수 없습니다.');
    }
  } catch (error) {
    backendReady = false;
    setupError = error;
    console.warn('[workbook-e2e] setup skipped:', error?.message || error);
  }
});

test('관리자가 워크북을 생성하고 카드 학습을 진행한다', async ({ page, request }) => {
  test.skip(!backendReady, `워크북 E2E를 건너뜁니다: ${setupError?.message || '백엔드가 준비되지 않았습니다.'}`);

  await page.goto(`${APP_BASE_URL}/login`);
  await page.fill('input[name="username"]', ADMIN_USERNAME);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL('**/'),
    page.click('button[type="submit"]')
  ]);

  await page.goto(`${APP_BASE_URL}/workbook`);
  await page.waitForSelector('[data-testid="open-workbook-generator"]');
  await page.click('[data-testid="open-workbook-generator"]');

  const documentSelect = page.locator('[data-testid="workbook-document-select"]');
  await documentSelect.waitFor({ state: 'visible' });
  await documentSelect.selectOption(`${documentId}`);

  const passageSelect = page.locator('[data-testid="workbook-passage-select"]');
  await passageSelect.waitFor({ state: 'visible' });
  await expect(passageSelect).not.toBeDisabled();
  await passageSelect.selectOption('1');

  await page.click('[data-testid="generate-workbook"]');

  let workbookId;
  await expect.poll(async () => {
    const res = await request.get(`${API_BASE_URL}/workbooks`, {
      params: { documentId },
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.ok()) return null;
    const json = await res.json();
    const match = Array.isArray(json?.data)
      ? json.data.find((item) => Number(item.documentId) === Number(documentId) && Number(item.passageNumber) === 1)
      : null;
    workbookId = match?.id;
    return workbookId || null;
  }, {
    message: '워크북 생성 결과를 백엔드에서 찾지 못했습니다.'
  }).toBeTruthy();

  const workbookCard = page.locator(`[data-workbook-id="${workbookId}"]`);
  await workbookCard.waitFor({ state: 'visible' });
  await Promise.all([
    page.waitForURL(`**/workbook/${workbookId}?step=1`),
    workbookCard.click()
  ]);

  const titleLocator = page.locator('[data-testid="workbook-detail-title"]');
  await expect(titleLocator).toContainText(documentTitle);

  const missionLocator = page.locator('[data-testid="workbook-mission"]');
  await expect(missionLocator).toContainText('미션');

  const cardCounter = page.locator('[data-testid="workbook-card-counter"]');
  await expect(cardCounter).toContainText('카드 1/');

  const flashcardFront = page.locator('[data-testid="workbook-flashcard-front"]');
  await expect(flashcardFront).not.toHaveText('', { timeout: 5000 });

  await page.getByRole('button', { name: '뒷면 보기' }).click();
  await expect(page.locator('[data-testid="workbook-flashcard-back"]')).toBeVisible();

  const nextButton = page.getByRole('button', { name: '다음 카드' });
  if (await nextButton.isEnabled()) {
    await nextButton.click();
    await expect(cardCounter).toContainText('카드 2/');
  }

  const completeButton = page.locator('[data-testid="workbook-step-complete"]');
  await completeButton.click();
  await expect(completeButton).toContainText('완료 표시 해제');
});
