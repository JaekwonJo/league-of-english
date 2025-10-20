# League of English (LoE)

> "우리 학원 선생님이 올린 지문 하나로, 학생 맞춤형 시험과 분석을 AI가 뚝딱 만들어 주자!" 😊

## 1. 한눈에 보기
- PDF/텍스트 지문 업로드 → 문제/해설/분석 자동 생성 (OpenAI + fallback 파이프라인)
- 학생은 웹에서 바로 문제를 풀고, 채점/해설/랭킹/신고 기능을 사용합니다.
- 관리자(선생님)는 지문 분석본을 검수하고, 마음에 들지 않는 변형을 삭제하거나 신고를 처리할 수 있습니다.

### 오늘의 Top 3 (베타 직전)
1. **분석 API 404 재현** – 관리자 뷰에서 삭제 후 발생하는 404를 재현하고 통합 테스트를 추가하기
2. **Vocabulary 결과 QA** – 채점 요약·LP 상승·랭킹 반영이 UI/서버 모두에서 정상 동작하는지 e2e로 확인하기
3. **Variant 회전 회귀 테스트** – grammar/vocabulary 라운드로빈 큐가 배포 후에도 깨지지 않도록 자동 테스트 보강하기

### Known Issues
- 관리자 분석 뷰에는 삭제/취소 후 404를 막을 통합 테스트가 아직 없어요.
- Vocabulary 시험 결과 화면이 새 점수 데이터를 표시하지만 LP·랭킹 반영은 추가 QA가 필요합니다.
- UI 캡처(`npm run capture:ui`)는 여전히 수동 실행이 필요하고 Playwright 설치 안내가 자동화돼 있지 않아요.
- Google Translate 무료 API 호출 제한이 있으니 Render 배포 시 캐시 파일 삭제에 주의해야 해요.

## 2. 빠른 시작 (로컬 개발)
```bash
# 1) 의존성 설치 (루트 + 프런트)
npm install
npm --prefix client install

# 2) 개발 서버 실행 (백엔드 5000, 프런트 3000)
npm run dev:all

# 3) 테스트 / 린트
npm test
npm run lint
```
- 환경 변수 템플릿: `.env.example`, `client/.env.example`
- 핵심 변수: `OPENAI_API_KEY`, `JWT_SECRET`, `REACT_APP_API_URL`

### 베타 용 샘플 데이터 한 번에 넣기
1. 로컬 SQLite를 따로 두고 싶다면 `DB_FILE=server/tmp/beta-seed.db node scripts/seed-beta-data.js`
2. Render 같은 실서버에서는 `DB_FILE=/var/data/loe.db node scripts/seed-beta-data.js`
3. 스크립트가 관리자/학생 계정과 분석·어휘 샘플을 자동으로 넣고, `metadata.seedTag`로 표시해 줘요.
4. 실행 결과는 `logs/beta-seed-last.json`(또는 `SEED_LOG_FILE` 지정 경로)에 저장되고, `SEED_WEBHOOK_URL`을 세팅하면 Slack 등으로 알림을 보낼 수 있어요.
5. 추가 override 덕분에 WordNet 경고 없이 실행됩니다.


## 3. 배포 가이드 (Render + Vercel)
- 자세한 순서는 **`DEPLOY_RENDER_VERCEL.md`** 참고
- 베타 출시 전 점검표는 **`docs/beta-launch-checklist.md`**에서 확인 가능
- Render 디스크(`/var/data/loe.db`)에 SQLite를 저장하고, Vercel은 `REACT_APP_API_URL`만 Render 주소로 맞추면 됩니다.

## 4. 주요 기능
| 구분 | 설명 |
|------|------|
| 지문 분석 | OpenAI 또는 fallback으로 해석·배경·예시·문법·어휘를 모두 생성, 관리자 화면에서 탭으로 확인 |
| 문제 학습 | 학생용 학습 화면에서 문제 로딩 → 풀이 → 채점 → 요약/랭킹, 신고/좋아요 버튼 제공 |
| 관리자 운영 | 지문 목록, 분석 생성, 분석본 삭제, 신고 처리, 문서 공유(학교/학년/그룹) |

## 5. 품질 전략
- **테스트**: `npm test` (49개) – fallback 한글 변환, 문제 포맷, 신고·랭킹·variant 회전 등 검증
- **빌드**: `npm run build` – CRA 기반 프로덕션 빌드 (경고는 Known Issues 참고)
- **로그**: Render/Vercel 콘솔에서 실시간 확인, OpenAI 실패 시 fallback 로그 기록
- **UI 캡처 가이드**: `docs/ui-regression-guide.md`에 분석/학습/랭킹 화면 캡처 순서와 공유 템플릿이 정리돼 있고, `npm run capture:ui`로 Playwright 캡처 스크립트를 실행할 수 있어요.

## 6. 최근 업데이트 (2025-10-21)
- Grammar/Vocabulary 생성기가 variant 라운드로빈 큐를 사용해 1·2·3개 틀린 문제와 옳은 것 문제가 균등하게 나오고, 메타데이터에 목표 정답 수를 기록합니다.
- `documentProblemFallback.js` 어법 규칙을 수능형 오류 중심으로 재작성해 "you is" 같은 초급 오류를 제거하고, 학습 화면 밑줄을 토큰 기반 하이라이트로 교체했어요.
- `DocumentAnalyzer` fallback이 문장별 번역·배경·실생활 예시·어법 설명을 실제 내용으로 채워 템플릿 문구 반복 문제를 해소했습니다.
- README · PROJECT_STATE · BUILDLOG를 최신 정보로 동기화하고 `npm test`(49개) 회귀가 모두 통과했습니다.

궁금한 점이 생기면 “어디에서 막혔어요?”라고 바로 알려 주세요. 함께 해결해 드릴게요! 😊
