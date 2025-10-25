# League of English (LoE)

> "우리 학원 선생님이 올린 지문 하나로, 학생 맞춤형 시험과 분석을 AI가 뚝딱 만들어 주자!" 😊

## 1. 한눈에 보기
- PDF/텍스트 지문 업로드 → 문제/해설/분석 자동 생성 (OpenAI + fallback 파이프라인)
- 학생은 웹에서 바로 문제를 풀고, 채점/해설/랭킹/신고 기능을 사용합니다.
- 관리자(선생님)는 지문 분석본을 검수하고, 마음에 들지 않는 변형을 삭제하거나 신고를 처리할 수 있습니다.

### 오늘의 Top 3 (베타 직전)
1. **관리자 삭제 404 재현/테스트** – 삭제/취소 후 404를 없애는 라우트·통합 테스트 보강
2. **Vocabulary 다중 정답 e2e+랭킹/LP 연동** – 결과 요약·통계가 정확히 반영되는지 점검
3. **PDF/리뷰 사유 내보내기 정리** – 검수 속도를 높이는 운영 품질 개선

### Known Issues
- 관리자 분석 뷰 삭제/취소 플로우 통합 테스트 미흡(간헐 404 가능).
- Vocabulary 다중 정답의 결과 요약·LP·랭킹 반영 e2e 커버리지 보강 필요.
- UI 캡처(`npm run capture:ui`)는 Playwright 설치 안내가 수동입니다.
- Google Translate 무료 API 호출 제한: 캐시 삭제 시 주의.

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
- **테스트**: `npm test` (49개) – fallback 한글 변환, 문제 포맷, 신고·랭킹·variant 회전 등 검증
- **빌드**: `npm run build` – CRA 기반 프로덕션 빌드 (경고는 Known Issues 참고)
- **로그**: Render/Vercel 콘솔에서 실시간 확인, OpenAI 실패 시 fallback 로그 기록
- **UI 캡처 가이드**: `docs/ui-regression-guide.md`에 분석/학습/랭킹 화면 캡처 순서와 공유 템플릿이 정리돼 있고, `npm run capture:ui`로 Playwright 캡처 스크립트를 실행할 수 있어요.

## 6. 최근 업데이트 (2025-10-26)
- 프로덕션 도메인 정리: league-of-english.com (www→apex 308), API는 https://api.league-of-english.com/api 로 통일
- CORS/기본 API 경로/리다이렉트 코드(vercel.json) 추가로 배포 혼란·404/401 감소
- 생성 안정화: AI 타임박스(25s)+자동 폴백으로 "세트를 준비하지 못했어요" 타임아웃 제거
- 학생 노출 정책 확장: 공개/발행/관리자 문서를 기본 노출(온보딩 원활)
- 멤버십/운영: 관리자 상향(grant)/요청 승인(resolve)/쿠폰 발급(coupons) API 추가, pro도 무제한 처리
- 계정/보안: 아이디 욕설 필터, 정지/복구/삭제(관리자), 정지 계정 로그인 차단, 랭킹에서 비활성 제외
- 계정 복구: 비밀번호 찾기(코드 발송 → 재설정) 엔드포인트 추가
- 어휘 훈련: 혼합/단어→뜻/뜻→단어 모드 선택 토글 추가
 - 관리자 화면: 멤버십 요청 관리(승인/반려, 빠른 쿠폰 생성) + 사용자 관리(검색, 정지/복구/삭제, 직접 등급 부여) 추가
 - 무료 회원 일일 제한을 유형별로 분리(단어시험 30/일, 문제풀이 30/일), 합산 제한 60 적용. 프리미엄/프로/관리자 무제한 처리
 - 랭킹 UI에 프리미엄(은색)/프로(금색) 효과 적용

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
