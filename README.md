# League of English (LoE)

> "우리 학원 선생님이 올린 지문 하나로, 학생 맞춤형 시험과 분석을 AI가 뚝딱 만들어 주자!" 😊

## 1. 한눈에 보기
- PDF/텍스트 지문 업로드 → 문제/해설/분석 자동 생성 (OpenAI + fallback 파이프라인)
- 학생은 웹에서 바로 문제를 풀고, 채점/해설/랭킹/신고 기능을 사용합니다.
- 관리자(선생님)는 지문 분석본을 검수하고, 마음에 들지 않는 변형을 삭제하거나 신고를 처리할 수 있습니다.

### 오늘의 Top 3 (2025-11-14)
1. 모의고사 다회차 – 관리자 업로드에서 `examId` 지정, 목록에서 회차 선택→응시 가능(18~45번 파싱, 실패 시 회차별 JSON 폴백). 📝
2. 문제 학습 품질 – 지문 선택 카드에 ✓ 배지, 선택된 지문만 사용해 문제 생성, 본문은 시험지 스타일(line-height 1.8, 양쪽 정렬). 📄
3. 쉬운 해설 톤 – 리뷰 영역 제목을 ‘💡 쉬운 해설’로 고정, 템플릿에 쉬운 한국어+이모지를 반영해 이해도를 높였어요. 😊

### 최근 업데이트
- 랭킹/통계 페이지 공통 히어로(CommonHero) 적용 → 홈/어휘/분석과 톤 통일, 고급스러운 첫 인상. ✨
- 빈칸 생성 안정화: `highTier` 참조 오류 수정으로 재시도/모델 승격 로직이 끊기지 않도록 보강. 🔧
- .env 예시 강화: `LOE_AIGEN_MAX_RETRIES=8`, `LOE_AIGEN_BUDGET_MS=30000`, `LOE_OPENAI_*` 계층 모델 예시 추가. ⚙️

### Known Issues
- Playwright E2E는 CI에서 돌아가지만, 샘플 문서/단어장을 자동 시드하지 않아 초기 환경이 비어 있으면 실패할 수 있습니다.
- 랭킹 API는 실제 학습 데이터가 적재되기 전까지는 데모 순위/티어 분포를 반환합니다.
- 지문 이름 변경 이력이 DB에 쌓이지만, 조회/롤백 UI가 없어 관리자 화면에서 바로 확인할 수 없습니다.
- 모의고사 PDF의 특이한 내장 글꼴/워터마크 때문에 일부 문장에 노이즈가 섞일 수 있습니다. 파서가 18~45번만 추출하고 일반적인 머리말/쪽번호는 제거하지만, 특수 케이스는 원문 교정이나 JSON 폴백을 권장합니다.
- Workbook bulk 생성 결과는 로그 중심이라 UI에서 실패 건수를 바로 확인하기 어렵습니다.
- SMTP 자격 증명이 없어 이메일 인증/비밀번호 초기화를 베타 우회 채널로 처리합니다.
 - 과거 생성분 중 일부는 새 인덱스 규칙이 미반영일 수 있습니다. 야간 재생성 큐로 순차 교체 예정입니다.

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

예시 인덱스 파일:
```
server/utils/data/golden/index.json
{
  "maps": {
    "blank": {
      "2-25-10": "blank/2-25-10.json",
      "고2 2024년 10월 모의고사": "blank/g12-2024-10.json"
    }
  }
}
```

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

## 6. 최근 업데이트 (2025-11-14)
- 모의고사: 다회차 업로드·목록·선택·응시 플로우 구축, 파서가 18~45번만 추출하도록 개선하고 실패 시 회차별 JSON 폴백을 사용합니다.
- 문제 학습: 3단계 지문 카드에 ‘✓ 선택됨’ 고정 배지, 선택한 지문만 서버로 전달해 해당 지문에서만 문제를 생성합니다.
- 출력 형식: 문단·줄간격(1.8)·양쪽 정렬로 시험지 스타일을 통일했습니다.
- 해설 톤: 리뷰 타이틀을 ‘💡 쉬운 해설’로 변경하고, 쉬운 한국어+이모지 규칙을 템플릿에 반영했습니다.
- 프로필: 학교명(이름+접미사 고/여고)·학년(1/2/3) 편집 UI/백엔드 API(`/users/profile`) 연결.
- 카카오 가입 후 학교가 고정되던 문제: 기본값을 비우고, 프로필 화면에서 학교/학년/이름을 바로 수정할 수 있도록 `/api/users/profile` API + UI를 추가했어요.
- 프로필: 학교명 입력을 "이름+접미사(고/여고)"로 단순화해 OO여고/OO고 표기를 자동화했습니다.
- 어휘: 히어로의 개수 표시 제거, 아래 목록을 가리키는 포인터 배너 추가로 시선 흐름을 정리했어요.
- 학습: 지문 선택 카드에 ✓ 배지가 떠서 무엇을 골랐는지 바로 보여요.
- 해설: 문제 템플릿에 쉬운 한국어+이모지를 반영, 폴백 해설도 같은 톤으로 맞췄습니다.
- 빈칸: 폴백 문제를 2문장 이상 본문+구/절 정답으로 재구성하고, 원문 보존 검사를 유지해 품질을 지켰어요.
- GitHub Actions CI에서 `npm run test:e2e`가 실행되도록 Playwright 전용 서버 스크립트와 브라우저 설치 단계를 추가했습니다.
- 단어장/모의고사 Playwright 시나리오가 새 테스트 ID를 활용해 업로드→선택→제출까지 완전 자동으로 검증합니다.
- 지문 이름 편집이 모달 UI와 감사 로그를 사용하도록 개선되어 모바일/IME 입력과 이력 추적이 모두 가능합니다.
- 모의고사 제출 결과가 `study_records`·랭킹 포인트·학습 통계(유형 `mock_exam`)에 즉시 반영됩니다.
- 랭킹 API가 DB에 데이터가 없거나 쿼리가 실패하더라도 안전한 폴백 순위표/티어 분포를 반환해 홈 위젯이 500 없이 동작합니다.
- 어휘 훈련: Day 카드에 체크(✓) 배지/플래시 효과를 추가하고, 우하단 플로팅 CTA 버튼으로 다음 단계 이동을 항상 보장합니다.
- 홈/어휘 히어로: 눈 깜빡임/날개 플랩/탭 점프 등 미세 애니메이션으로 첫 화면의 생동감을 높였습니다.
- 모의고사: 모바일 하단 고정 바(타이머+제출)를 추가했고, 하단 문항 네비 바는 그 위로 떠 있도록 위치를 조정했습니다.

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
