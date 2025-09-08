League of English — 2025-09-09

Overview
- 학습용 영어 리딩/문법/어휘 문제를 문서에서 자동 생성하고, 게임처럼 LP/티어/랭킹으로 동기부여하는 웹앱입니다.
- 관리자/교사가 PDF/TXT를 업로드하면 자동으로 지문(passages) 추출 → 다양한 문제 유형 생성 → 학생은 즉시 학습/채점/통계를 확인합니다.

What’s Included (This Version)
- 문제 생성 안정화: 문법(어법) 최소 1문제 보장, 생성 실패 시 다중 안전장치(서비스/라우트/생성기).
- 전 유형 지원 확대: blank, vocabulary, title, theme, summary + order(순서배열), insertion(문장삽입), grammar(문법/개수형).
- 관리자 개별 지문 분석: 총 지문 수 검출 보강, 범위 보정, UI 한글 정리, 분석 실패 원인 해결.
- UI 한글/인코딩 정리: 주요 화면, 설정 JSON의 모지바케 제거(UTF‑8), 자연스러운 한글 문구.
- 랭킹/티어/포인트: 서버에 LP(포인트) 반영, 티어 분포/내 랭킹/리더보드 API 제공.

Key Paths
- client/src/components/study/ProblemDisplay.js: 문제 화면 UI(타이머/네비/옵션/라벨)
- client/src/components/study/GrammarProblemDisplay.js: 문법/개수형 UI(밑줄 표기 지원)
- client/src/components/admin/PassageAnalysisRefactored.js: 관리자 개별 지문 분석 모달
- client/src/components/analysis/PassageSelector.js: 지문 선택(분석 완료 체크 ✓)
- client/src/config/problemTypes.json: 유형명/지시문/아이콘/설명(한글화)
- client/src/config/appConfig.json: 앱/모드/설명(한글화)
- server/services/ultraSimpleProblemService.js: 스마트 문제 생성(모든 유형 연계)
- server/services/aiProblemService.js: AI/규칙 기반 문제 생성기(빈칸/어휘/제목/주제/요약)
- server/utils/csatGrammarGenerator.js: 문법 문제 생성기(안정화)
- server/routes/problem.routes.js: 문제 API(표준 타입, 안전장치, 메시지 한글화)
- server/routes/analysis/*: 문서/지문 분석 API
- server/routes/ranking.routes.js: 랭킹/티어/분포 API

Run Locally
- Server: `cd server && npm install && node server.js`
- Client: `cd client && npm install && npm start`
- Admin account: `admin / admin123`
- Server env: `server/.env` 참고 (JWT_SECRET, OPENAI_API_KEY 등)

Core APIs
- Auth: `POST /api/auth/login`
- 문서: `GET /api/documents`, `GET /api/documents/:id`, `POST /api/upload-document`
- 스마트 문제: `POST /api/get-smart-problems` (documentId, types, count, difficulties)
- AI 문제(개별):
  - `POST /api/generate/blank|vocab|title|topic|summary` (문자열 표준화: vocab→vocabulary, topic→theme 내부 처리)
- 제출/기록/통계: `POST /api/problems/submit`, `GET /api/problems/history`, `GET /api/problems/stats`
- 분석: `GET /api/analysis/:documentId/passages`, `POST /api/analysis/:documentId/analyze-passage`, `GET /api/analysis/:documentId/passage/:n`
- 랭킹: `GET /api/ranking/my-rank`, `GET /api/ranking/leaderboard`, `GET /api/ranking/tier-distribution`

Game System (LP/Tier/Ranking)
- LP 획득/차감: 정답 +10, 오답 −5, (옵션) 콤보/일일 보너스/주간 보너스 확장 가능.
- Tier: Iron → Challenger (server/config/tierConfig.json), 분포/내 랭킹/리더보드 API 제공.

Stability Fixes
- 문법 생성기: 문장 필터 완화, 밑줄 보장, 샘플 fallbacks.
- 서비스/라우트 레벨 최소 1문제 보장(프런트가 0개로 에러를 던지지 않도록 보장).
- 관리자 분석: passages 검출 → 범위 보정 → 분석 실패(유효 범위) 해결.

Known Items (Next)
- ScoreHUD(학습 헤더): 현재 LP/세션 LP/티어/진행률 바 표시.
- 결과 화면: 내 랭킹/다음 티어까지 남은 LP, 주변 5명 리더보드.
- tierConfig 한글/아이콘 정리(일부 깨진 nameKr 등).
- AI 문제 품질 튜닝(보기 난도/오답 품질/설명 강화), 난이도 선택 UI 연동.
- 프런트 전역 인코딩 재점검(일부 컴포넌트 문자열 남은 깨짐 수동 보정).

Release Tag (2025-09-09)
- 로컬 태그 생성: `git tag -a v2025-09-09 -m "Release 2025-09-09"`
- 원격 푸시(태그 포함): `git push origin main --tags`
  - 인증 필요 시 GitHub PAT 사용 권장.

Troubleshooting
- DB 초기화: `cd server && del database.db && node server.js`
- 캐시 정리: `npm cache clean --force`
- 재설치: `rd /s /q node_modules && npm install`

License
- Proprietary. (명시적 라이선스가 필요하면 추후 업데이트)

