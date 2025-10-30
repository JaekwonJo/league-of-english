# League of English (LoE)

> "우리 학원 선생님이 올린 지문 하나로, 학생 맞춤형 시험과 분석을 AI가 뚝딱 만들어 주자!" 😊

## 1. 한눈에 보기
- PDF/텍스트 지문 업로드 → 문제/해설/분석 자동 생성 (OpenAI + fallback 파이프라인)
- 학생은 웹에서 바로 문제를 풀고, 채점/해설/랭킹/신고 기능을 사용합니다.
- 관리자(선생님)는 지문 분석본을 검수하고, 마음에 들지 않는 변형을 삭제하거나 신고를 처리할 수 있습니다.

### 오늘의 Top 3 (베타 직전)
1. **워크북 자동 생성 E2E 테스트** – 카드 흐름을 Playwright로 확인해 회귀를 예방
2. **Render/Vercel 자동 배포 마무리** – GitHub Secrets로 완전 자동화
3. **라이트 테마/Study/분석 스모크** – 최신 빌드 반영 확인

### Known Issues
- `analysisFallbackVariant.test.js`가 fallback 해석 prefix 누락으로 실패 중 – 프롬프트/포맷 교정 예정.
- 일부 문서 grade/school 메타가 비어 있을 때 학생 노출 정책이 과/소노출될 수 있음(정책 튜닝 예정).
- 워크북 자동 생성이 fallback만 사용될 때 품질 검수가 필요합니다.
- Google Translate 무료 API 호출 제한: 캐시 삭제 시 주의.
- 자동 분석은 기본 12초/1개 지문만 처리(환경 변수로 상향 가능). 환경 느릴 때 부분 결과만 반환될 수 있음.

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

### 멤버십 플랜(프로필 → 멤버십)
- 무료: 단어시험 30/일 + 문제풀이 30/일
- 프리미엄(월 12,900원): 단어/문제 무제한 + 학습 통계 + 프리미엄 뱃지
- 프로(월 19,900원): 단어/문제 무제한 + 학습 통계 + 분석 자료 무제한 + 프로 뱃지
- 오프라인 입금 안내: 계좌 1002557648547 (예금주: 조재권) – 입금 후 “입금 확인 요청” 버튼 클릭 → 관리자가 승인하면 즉시 적용

### 랭킹 배지/이펙트
- 프리미엄: 닉네임 은색 오라(부드러운 글로우)
- 프로: 닉네임 금색 오라(강한 글로우)
- 무료: 기본 스타일

## 5. 품질 전략
- **테스트**: `npm test` (50개) – fallback 한글 변환, 문제 포맷, 신고·랭킹·variant 회전 등 검증
- **E2E**: `npm run test:e2e` (Playwright) – 로컬에서 `npm run dev:all` 실행 후, 기본 관리자(`admin`/`admin123`)로 워크북 생성·카드 학습 플로우를 자동 점검합니다. API/앱 주소는 `PLAYWRIGHT_API_URL`, `PLAYWRIGHT_BASE_URL` 환경변수로 조정할 수 있어요.
- **빌드**: `npm run build` – CRA 기반 프로덕션 빌드 (경고는 Known Issues 참고)
- **로그**: Render/Vercel 콘솔에서 실시간 확인, OpenAI 실패 시 fallback 로그 기록
- **UI 캡처 가이드**: `docs/ui-regression-guide.md`에 분석/학습/랭킹 화면 캡처 순서와 공유 템플릿이 정리돼 있고, `npm run capture:ui`로 Playwright 캡처 스크립트를 실행할 수 있어요.

## 6. 최근 업데이트 (2025-10-29)
- 워크북 학습 메뉴가 `/api/workbooks` + `workbook_sets`를 통해 자동 생성·저장되고, 10단계 카드 학습 플로우로 바로 이어집니다.
- 라이트 모드 팔레트를 재정비해 사이드바·단계 안내문·카드가 모두 높은 대비로 표시됩니다.
- StudyPage의 히스토리 핸들러를 재구성해 "Cannot access 'J' before initialization" 오류 없이 복귀/재시작이 됩니다.
- 모바일 헤더를 단일 토글(☰/✕)과 중앙 🦉 제목으로 정리하고, 메뉴 바깥을 누르면 즉시 닫히도록 outside-click 감지를 넣었습니다.
- `/documents/:id` PUT API로 관리자 문서 제목·학년을 수정하면 학습/어휘 목록에 즉시 반영됩니다.
- 문제 생성 한도를 유형별로 재조정(AI 합산 5문, 비AI 유형 10문)해 긴 요청에서 타임아웃이 크게 줄었습니다.
- 서버에 `/api/teacher`를 마운트하고 반 코드·학생 목록 API를 활성화, 프로필 깜빡임/무한 재시도를 해소했습니다.
- 클라이언트 오류 리포트 `/api/errors/report`를 추가해 브라우저 오류 스택을 수집, 405 콘솔 오류를 제거했습니다.
- 자동 분석 기본 예산을 12초/1개로 보수 조정(환경에서 늘릴 수 있음).
- Fallback 분석 라벨/어휘/메타를 보정해 테스트를 통과하고, 학생용 설명 가독성을 높였습니다.

배포 자동화 자세한 가이드는 `DEPLOY_RENDER_VERCEL.md`를 참고하세요.

궁금한 점이 생기면 “어디에서 막혔어요?”라고 바로 알려 주세요. 함께 해결해 드릴게요! 😊

## 7. GitHub 푸시가 멈출 때 (PAT 설정)
GitHub는 비밀번호로 `git push`를 막습니다. 비밀번호를 물어보는 프롬프트에서 입력이 막힌 것처럼 보일 수 있어요. 아래 중 하나로 해결하세요.

1) Personal Access Token(PAT) 사용
```bash
# https://github.com/settings/tokens 에서 repo 권한으로 토큰 생성
git config credential.helper store  # 선택: 로컬에 저장
git remote set-url origin \
  https://<YOUR_GH_ID>:<YOUR_PAT>@github.com/JaekwonJo/league-of-english.git
git push origin main
```

2) GitHub CLI(gh) 사용
```bash
npm i -g gh  # 또는 OS 패키지로 설치
gh auth login   # 안내에 따라 로그인(HTTPS, GitHub.com, 브라우저/토큰)
git push origin main
```
