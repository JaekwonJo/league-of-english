# PROJECT_STATE.md

## 우리가 만드는 것
- PDF나 텍스트 지문을 업로드하면 **수능 스타일 문제·해설·분석**을 자동으로 만들어 주는 학습 플랫폼.
- 학생은 웹에서 문제를 풀고 채점·해설·랭킹·신고 기능을 이용할 수 있어요.
- 선생님(관리자)은 분석본을 검수하고, 마음에 들지 않는 변형을 삭제하거나 신고를 처리할 수 있어요.

## 기술 스택 & 핵심 명령어
- **백엔드**: Node.js 20 + Express, SQLite(sql.js) / OpenAI API (fallback은 WordNet + 자체 로직)
- **프런트엔드**: React 19 (CRA), Zustand + SWR
- **공통 명령**
  - 개발: `npm run dev:all` (백엔드 5000, 프런트 3000)
  - 테스트: `npm test`
  - 프런트 빌드: `npm run build`
  - 린트: `npm run lint`

## 최근 결정/하이라이트
- WordNet + 번역 캐시를 묶은 **분석 fallback 파이프라인**을 안정화해 해석·배경·예시·어법·어휘가 빈칸 없이 채워집니다.
- 관리자 신고 센터·분석·문서 공유 모달까지 **테마 토큰 팔레트**로 통일해 라이트/다크 모드 대비를 확보했습니다.
- `scripts/seed-beta-data.js`와 README/체크리스트를 연동해 베타 계정·분석·어휘 샘플을 스크립트 한 번으로 주입할 수 있어요.
- `docs/ui-regression-guide.md`를 추가해 분석/학습/랭킹 화면을 캡처하는 회귀 QA 절차를 문서화했습니다.
- fallback 분석/어휘 데이터가 텅 비지 않도록 **노드 테스트**를 추가해 품질 기준을 자동으로 검증합니다.

## 현재 단계 (2025-10-20 기준)
- 핵심 기능(MVP) 구현 완료, 관리자 검수·신고·분석 삭제까지 실사용 수준.
- fallback 기반 문제/분석 생성 품질이 월고 기출 스펙과 맞춰지며, 베타 서비스 QA를 진행 중입니다.
- Vercel(프런트) + Render(백엔드) 배포 가이드를 따라 베타 테스트 준비에 들어갔어요.

## Next 3 (오늘 우선순위)
1. **WordNet 경고 줄이기** – seed 스크립트/QA에서 반복되는 lookup 경고를 사용자 사전으로 정리.
2. **UI 캡처 자동화 PoC** – `docs/ui-regression-guide.md` 흐름을 Playwright나 Percy로 스크립트화.
3. **Seed 로그 대시보드** – seed 스크립트 실행 결과를 Notion/Slack으로 공유하는 webhook 정리.

## Known Issues
- `scripts/seed-beta-data.js` 실행 시 WordNet이 인식하지 못한 단어 경고가 다수 출력돼요. (최종 결과는 curated 데이터로 보완됨)
- UI/API 통합 테스트는 수동 QA로만 점검했습니다. 자동화된 end-to-end 테스트는 아직 준비 중이에요.
- UI 캡처는 아직 수동 캡처 가이드에 의존합니다. 자동 회귀 도구는 PoC 단계예요.
- Google Translate 무료 API는 호출 제한이 있으므로 Render 배포 시 캐시 파일 삭제에 주의해야 해요.

## Resolved – 2025-10-20 (오류 반복 방지)
- ProblemFeedback 배지·DocumentAnalysis/DocumentShare 모달 버튼을 테마 토큰으로 교체해 다크 모드 대비 이슈를 해소했어요.
- README · `docs/beta-launch-checklist.md`에 seed 스크립트 실행 절차를 명시해 베타 데이터 세팅이 표준화됐어요.
- `docs/ui-regression-guide.md`를 작성해 UI 캡처 범위와 공유 규칙을 팀원이 동일하게 따라갈 수 있게 했어요.
- `analysisFallbackVariant.test.js`, `fallbackContent.test.js`로 fallback 해석·어휘 결과가 텅 비지 않는지 회귀 테스트로 잠궜어요.
