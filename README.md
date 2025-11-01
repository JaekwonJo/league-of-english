# League of English (LoE)

> "우리 학원 선생님이 올린 지문 하나로, 학생 맞춤형 시험과 분석을 AI가 뚝딱 만들어 주자!" 😊

## 1. 한눈에 보기
- PDF/텍스트 지문 업로드 → 문제/해설/분석 자동 생성 (OpenAI + fallback 파이프라인)
- 학생은 웹에서 바로 문제를 풀고, 채점/해설/랭킹/신고 기능을 사용합니다.
- 관리자(선생님)는 지문 분석본을 검수하고, 마음에 들지 않는 변형을 삭제하거나 신고를 처리할 수 있습니다.

### 오늘의 Top 3 (베타 직전)
1. **분석·워크북 교수님 포맷 E2E 캡처** – Playwright로 스냅샷/시나리오를 만들어 형식 회귀를 자동 차단
2. **Render/Vercel 자동 배포 시크릿 세팅** – GitHub Secrets와 PAT를 정리해 main 푸시 즉시 배포
3. **랭킹 API 500 디버깅** – leaderboard/tier-distribution 오류를 잡아 대시보드 신뢰도 확보

### Known Issues
- 분석/워크북 교수님 포맷을 검증하는 Playwright 스냅샷·시나리오가 아직 없어 사람이 직접 회귀를 확인해야 합니다.
- 랭킹 API(leaderboard, tier-distribution)가 샘플 데이터 부족 시 500을 반환해 대시보드 요청이 실패합니다.
- Render/Vercel 시크릿이 미설정이라 main 푸시 후 자동 배포가 멈춰 있습니다.
- SMTP 자격 증명이 없어 이메일 인증/비밀번호 초기화를 베타 우회 채널로 처리합니다.
- Google Translate 무료 API 호출 제한: 캐시 삭제 시 주의.
- 자동 분석은 기본 12초/1개 지문만 처리(환경 변수로 상향 가능). 환경이 느릴 때 부분 결과만 반환될 수 있습니다.

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

## 6. 최근 업데이트 (2025-11-01)
- 분석 생성 프롬프트와 폴백을 재작성해 문장별 해석·배경지식·사례·어법·어휘 포인트·응원 이모지가 항상 교수님 매뉴얼 포맷으로 출력됩니다.
- AnalysisPage 상세 화면을 ①~⑳ 번호, 배경/사례 강조 카드, 어휘 표(동의어·반의어·노트) UI로 리디자인했습니다.
- DocumentAnalyzer 메타 구조가 영어 제목 3개(의문문 1개 포함)·현대 실천 3개를 강제해 학생과 관리자가 같은 요약을 확인합니다.
- 워크북 서비스가 새 라벨(`이 문장에 필요한 배경지식/사례`, `어휘 포인트`)을 파싱해 자동 학습/테스트 흐름이 끊기지 않습니다.
- `npm test` 51개 케이스가 모두 통과해 새 포맷에 대한 회귀 없음을 확인했습니다.

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
