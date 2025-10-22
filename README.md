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

## 5. 품질 전략
- **테스트**: `npm test` (49개) – fallback 한글 변환, 문제 포맷, 신고·랭킹·variant 회전 등 검증
- **빌드**: `npm run build` – CRA 기반 프로덕션 빌드 (경고는 Known Issues 참고)
- **로그**: Render/Vercel 콘솔에서 실시간 확인, OpenAI 실패 시 fallback 로그 기록
- **UI 캡처 가이드**: `docs/ui-regression-guide.md`에 분석/학습/랭킹 화면 캡처 순서와 공유 템플릿이 정리돼 있고, `npm run capture:ui`로 Playwright 캡처 스크립트를 실행할 수 있어요.

## 6. 최근 업데이트 (2025-10-22)
- Vocabulary가 단일/복수 정답을 모두 지원합니다. `answerMode/answerIndices/optionStatuses` 메타데이터와 질문 변형 인식을 추가했어요.
- 분석(fallback)을 문장별 라벨(한글 해석/분석/배경/사례/어법/어휘 포인트)로 채우고 최소 길이를 강제해 빈 템플릿을 방지했습니다.
- 학습 마무리 UX를 개선해 미답 문항에서도 버튼으로 부족한 번호를 안내받을 수 있고, 렌더링 useMemo 최적화로 성능이 안정화됐어요.
- 정규식 공백 처리 보강으로 밑줄 치환이 안정화되었습니다. 관련 테스트/유틸도 업데이트했어요.

궁금한 점이 생기면 “어디에서 막혔어요?”라고 바로 알려 주세요. 함께 해결해 드릴게요! 😊
