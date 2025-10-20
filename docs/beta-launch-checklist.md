# 베타 출시 체크리스트

> 😊 순서대로 따라가면 배포 전에 꼭 확인해야 할 항목을 놓치지 않게 도와줘요.

## 1. 코드 & 테스트
- [ ] `npm install` (루트 + `client/`)을 다시 실행해서 잠긴 의존성이 없는지 확인
- [ ] `npm test` (서버 테스트 43개) → 모두 PASS 확인
- [ ] `npm run build` → 경고가 남아 있으면 README의 Known Issues에 기록하고, 치명적 오류는 해결
- [ ] Renovate/Dependabot 등이 켜져 있다면 PR 상태 점검

## 2. 환경 변수 정리
- [ ] `.env` (로컬)와 `.env.example`가 최신인지 확인
- [ ] Render: `OPENAI_API_KEY`, `JWT_SECRET`, `DB_FILE=/var/data/loe.db`, 필요 시 `CORS_ORIGIN`
- [ ] Vercel: `REACT_APP_API_URL=https://<render-url>/api`
- [ ] 이메일 기능을 쓴다면 `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`

## 3. 데이터베이스/스토리지
- [ ] Render Disk(1GB)가 `/var/data`에 마운트되어 있는지 확인 (SQLite 보존용)
- [ ] 초기 베타 계정(관리자/교사/학생) 목록을 Notion 등에서 관리
- [ ] 베타 더미 데이터가 필요하면 `DB_FILE=/var/data/loe.db node scripts/seed-beta-data.js` 실행 (로컬 테스트는 DB_FILE 생략 가능)
- [ ] 실행 후 `logs/beta-seed-last.json` 확인, 필요 시 `SEED_WEBHOOK_URL`로 Slack 알림 테스트
- [ ] 스크립트 실행 후 `metadata.seedTag`가 `beta-seed-20251020`인지 확인해 중복 데이터를 방지

## 4. 기능 점검 (QA 스모크 테스트)
| 구분 | 필수 시나리오 |
|------|---------------|
| 로그인 | 관리자/교사/학생 각각 로그인 → 대시보드 로딩 |
| 문서 관리 | PDF 업로드 → 분석 생성 → 분석 삭제 버튼 클릭 |
| 분석 열람 | 학생 계정으로 분석 보기 → 문장별 해석/배경/어휘 표시 확인 |
| 문제 학습 | 학습 화면에서 문제 로딩 → 풀이/채점 → 요약 화면 확인 |
| 신고/좋아요 | 문제 화면과 분석 화면에서 👍/🚨 버튼 작동 확인 |
| 이메일(선택) | 계정 인증 메일 또는 알림 메일이 정상 발송되는지 테스트 |
| 다크 모드 | 학습/분석/랭킹/어휘 화면을 `ThemeProvider`로 라이트 ↔ 다크 전환하며 텍스트 대비와 버튼 색상을 캡처로 확인 |
| UI 캡처 | `docs/ui-regression-guide.md`에 있는 순서대로 화면을 캡처하고 `npm run capture:ui`로 Playwright 결과를 보관 |

## 5. 모니터링 & 알림
- [ ] Render Logs 탭을 열고 500 에러가 없는지 확인 (OpenAI 미설정 시 fallback 로그만 나오는지 확인)
- [ ] Vercel Analytics 또는 Sentry(설정한 경우)에서 프런트 에러 모니터링
- [ ] Slack/Discord 등 알림 채널이 있다면 배포 알림 설정

## 6. 커뮤니케이션 준비
- [ ] 베타 초대 대상자 목록 + 연락처 정리
- [ ] 시작 안내 메일/카카오톡 메시지 초안 작성 (계정 생성 방법, 지원 채널 안내 포함)
- [ ] 피드백 수집 폼(Google Form 등) 준비 → README/서비스 내에 링크 배치

## 7. 롤백/대응 플랜
- [ ] Render에서 이전 배포 버전으로 Re-deploy 하는 방법 숙지
- [ ] Vercel "Revert to Deployment" 버튼 사용법 숙지
- [ ] 치명적 버그 발생 시 안내 문구/공지 템플릿 준비

체크리스트를 전부 ✅ 하면 배포 버튼을 눌러도 좋아요! 궁금한 점이 생기면 언제든지 “어디서 막혔어요?”라고 물어봐 주세요. 😊
