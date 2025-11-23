# League of English (LoE)

> "우리 학원 선생님이 올린 지문 하나로, 학생 맞춤형 시험과 분석을 AI가 뚝딱 만들어 주자!" 😊

## 1. 한눈에 보기
- PDF/텍스트 지문 업로드 → 문제/해설/분석 자동 생성 (OpenAI + fallback 파이프라인)
- 학생은 웹에서 바로 문제를 풀고, 채점/해설/랭킹/신고 기능을 사용합니다.
- 관리자(선생님)는 지문 분석본을 검수하고, 마음에 들지 않는 변형을 삭제하거나 신고를 처리할 수 있습니다.

### 오늘의 Top 3 (2025-11-23)
1. **서버 테스트 복구**: `npm test`가 바로 실패하던 경로 오류를 고쳐 모든 서버 단위 테스트를 다시 돌릴 수 있어요. 🧪
2. **QA 루틴 재가동**: 상태 문서/로그/README를 오늘 날짜로 맞춰 품질 점검 흐름을 재정비했습니다. 🗒️
3. **AI 출제 품질 유지**: 기존의 기출 파서/문제 품질·UI 리뉴얼 개선 사항을 유지한 채 테스트까지 정상화했습니다. ✅

### 최근 업데이트
- **테스트 러너 Fix**: Node 22에서 `server/tests` 디렉터리를 찾지 못하던 `npm test`를 `server/tests/*.test.js` 패턴으로 수정해 정상 실행됩니다.
- **문서 동기화**: PROJECT_STATE/BUILDLOG/README를 최신 상태로 맞춰 QA 흐름을 이어갈 수 있게 정리했습니다.
- **이전 개선 유지**: AI 파서/문제 품질/크리스마스 테마 리뉴얼을 그대로 유지하며 안정성을 높였습니다.

### Known Issues
- AI 생성 문제는 매번 새로 만들지만, 입력 시드(Seed)가 고정되면 같은 문제가 나올 수 있어 확인이 필요합니다.
- 서버 단위 테스트 4건은 데이터/프롬프트 정합성 보정이 필요해 현재 실패로 남아 있습니다.
- Playwright E2E 테스트용 샘플 데이터가 자동 시드되지 않아 초기 환경에서 실패할 수 있습니다.
- 랭킹 API는 실제 학습 데이터가 적재되기 전까지는 데모 순위/티어 분포를 반환합니다.

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

#### 옵션 환경 변수
- `LOE_STRICT_BLANK=1` → 빈칸 생성 시 `targetSpan {start,end}`가 누락되면 거절 후 재시도합니다. 서버는 해당 인덱스만 `____`로 바꿔 원문을 그대로 보존합니다.
- Golden Set(사전 제작 문제) → `server/utils/data/golden/index.json`에 문서 코드/제목을 JSON 파일로 매핑하면, 캐시/AI보다 먼저 해당 문제를 제공합니다.
- `LOE_ENFORCE_AI_ONLY=1` → 캐시 다음 단계에서 Golden Set/폴백을 모두 비활성화하고, 반드시 OpenAI로만 생성합니다. OpenAI 미가용·부분생성 시 5xx 에러로 알려줍니다.
- `LOE_AIGEN_BUDGET_MS=30000` → AI 생성 시간 예산(기본 12000ms)을 조정합니다.
- `LOE_AIGEN_MAX_RETRIES=8` → 각 문항 생성의 재시도 횟수(기본 6)를 조정합니다.
- 문제 출제 모델 계층(권장)
   - `LOE_OPENAI_SECONDARY_MODEL=gpt-4o-mini` (속도/비용 우선)
   - `LOE_OPENAI_PRIMARY_MODEL=gpt-4o` (품질 우선 1차 상향)
   - `LOE_OPENAI_PREMIUM_MODEL=gpt-4.1` (마지막 시도만 사용; 비용 주의)
   - 동작: 1~2회차는 secondary, 중간은 primary, 마지막 시도에서만 premium으로 자동 승격합니다.

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
| 모의고사 | 여러 회차 중 선택해 응시, 50분 타이머, 채점/복습, (프로 전용) AI 해설 — 서버가 PDF를 못 읽을 때는 기본 JSON으로 즉시 시작 |

### 멤버십 플랜(프로필 → 멤버십)
- 무료: 단어시험 30/일 + 문제풀이 30/일
- 프리미엄(월 12,900원): 단어/문제 무제한 + 학습 통계 + 프리미엄 뱃지
  - 추가 혜택: 워크북 학습 가능, 모의고사 실전 풀이 가능
- 프로(월 19,900원): 단어/문제 무제한 + 학습 통계 + 분석 자료 무제한 + 프로 뱃지
- 오프라인 입금 안내: 계좌 1002557648547 (예금주: 조재권) – 입금 후 “입금 확인 요청” 버튼 클릭 → 관리자가 승인하면 즉시 적용

### 랭킹 배지/이펙트
- 프리미엄: 닉네임 은색 오라(부드러운 글로우)
- 프로: 닉네임 금색 오라(강한 글로우)
- 무료: 기본 스타일

## 5. 품질 전략
- **테스트**: `npm test` (50개) – fallback 한글 변환, 문제 포맷, 신고·랭킹·variant 회전 등 검증
- **E2E**: `npm run test:e2e` (Playwright) – 로컬에서 `npm run dev:all` 실행 후 자동 점검. 빈칸/어휘 인덱스 규칙과 줄바꿈 보존을 스냅샷으로 검증합니다.
- **빌드**: `npm run build` – CRA 기반 프로덕션 빌드 (경고는 Known Issues 참고)
- **로그**: Render/Vercel 콘솔에서 실시간 확인, OpenAI 실패 시 fallback 로그 기록
- **UI 캡처 가이드**: `docs/ui-regression-guide.md`에 분석/학습/랭킹 화면 캡처 순서와 공유 템플릿이 정리돼 있고, `npm run capture:ui`로 Playwright 캡처 스크립트를 실행할 수 있어요.

## 6. 최근 업데이트 (2025-11-23)
- **테스트 실행 안정화**: `npm test`가 더 이상 경로 오류로 중단되지 않고 모든 서버 테스트 파일을 정상 로딩합니다.
- **운영 문서 갱신**: 상태/로그/README를 오늘 날짜로 정리해 QA·운영 히스토리를 이어갑니다.
- **기존 개선 유지**: AI 파서, 문제 품질 보강, 크리스마스 테마 UI 변경 사항을 그대로 유지합니다.

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

### 아이디가 기억나지 않을 때
- 로그인 화면의 “아이디·비밀번호 찾기” → 이메일 입력 → “아이디 찾기” 버튼을 누르면, 서버가 아이디를 메일로 보내거나(메일 미설정 시) 화면에 마스킹된 아이디를 보여줍니다.
- API: `POST /api/auth/find-id` (body: `{ email }`) → `{ username, masked, sent }`