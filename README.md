# League of English (LoE)

> "우리 학원 선생님이 올린 지문 하나로, 학생 맞춤형 시험과 분석을 AI가 뚝딱 만들어 주자!" 😊

## 1. 한눈에 보기
- PDF/텍스트 지문 업로드 → 문제/해설/분석 자동 생성 (OpenAI + fallback 파이프라인)
- 학생은 웹에서 바로 문제를 풀고, 채점/해설/랭킹/신고 기능을 사용합니다.
- 관리자(선생님)는 지문 분석본을 검수하고, 마음에 들지 않는 변형을 삭제하거나 신고를 처리할 수 있습니다.

### 오늘의 Top 3 (베타 직전)
1. **관리자 잔여 화면 토큰화** – DocumentShare, Inquiry 등 남은 하드코딩 색상을 토큰으로 정리하기
2. **Seed 스크립트 가이드 완성** – `scripts/seed-beta-data.js` 실행 순서를 README/체크리스트에 정리하기
3. **UI 회귀 캡처 세트 작성** – 분석/어휘/랭킹 화면 흐름을 캡처해 QA 자동화 토대를 만들기

### Known Issues
- 관리자 DocumentShare/Inquiry 등 일부 화면은 아직 색상이 직접 지정돼 다크 모드 대비가 낮아요.
- `scripts/seed-beta-data.js` 실행 시 WordNet 경고가 여러 줄 출력돼요. (결과는 curated 데이터로 보완)
- UI/API 통합은 수동 QA 위주로 확인했습니다. 자동 end-to-end 테스트는 아직 준비 중이에요.
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
- **테스트**: `npm test` (43개) – fallback 한글 변환, 문제 포맷, 신고 로직 등 검증
- **빌드**: `npm run build` – CRA 기반 프로덕션 빌드 (경고는 Known Issues 참고)
- **로그**: Render/Vercel 콘솔에서 실시간 확인, OpenAI 실패 시 fallback 로그 기록

## 6. 최근 업데이트 (2025-10-20)
- ProblemFeedback 배지·DocumentAnalysis 버튼을 테마 토큰으로 바꿔 다크 모드에서도 선명하게 보이게 했어요.
- `scripts/seed-beta-data.js`로 베타 교사/학생·분석본·어휘 샘플을 한 번에 넣을 수 있게 했어요.
- fallback 분석/어휘 결과가 빈칸을 남기지 않는지 Node 테스트(`analysisFallbackVariant.test.js`, `fallbackContent.test.js`)로 잠궜어요.
- README · PROJECT_STATE · BUILDLOG를 같은 정보로 맞춰 문서가 서로 다른 이야기를 하지 않게 했어요.

궁금한 점이 생기면 “어디에서 막혔어요?”라고 바로 알려 주세요. 함께 해결해 드릴게요! 😊
