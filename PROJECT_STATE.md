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
- 관리자 신고 센터·분석 패널에 **테마 토큰 배지/버튼**을 적용해 라이트/다크 모드 모두에서 시인성을 확보했습니다.
- `scripts/seed-beta-data.js`로 베타 교사/학생 계정과 분석·어휘 샘플을 한 번에 주입할 수 있는 루틴을 마련했습니다.
- fallback 분석/어휘 데이터가 텅 비지 않도록 **노드 테스트**를 추가해 품질 기준을 자동으로 검증합니다.
- Render + Vercel 배포 매뉴얼, 베타 체크리스트, seed 스크립트 흐름을 문서로 정리했습니다.

## 현재 단계 (2025-10-20 기준)
- 핵심 기능(MVP) 구현 완료, 관리자 검수·신고·분석 삭제까지 실사용 수준.
- fallback 기반 문제/분석 생성 품질이 월고 기출 스펙과 맞춰지며, 베타 서비스 QA를 진행 중입니다.
- Vercel(프런트) + Render(백엔드) 배포 가이드를 따라 베타 테스트 준비에 들어갔어요.

## Next 3 (오늘 우선순위)
1. **관리자 잔여 화면 토큰화** – DocumentShare, Inquiry 등 남은 하드코딩 색상을 테마 변수로 교체.
2. **Seed 스크립트 가이드 완성** – 베타 운영자가 실DB에 적용하기 쉽게 README와 체크리스트에 사용 순서를 추가.
3. **UI 회귀 캡처 세트 작성** – 분석/어휘/랭킹 화면의 핵심 흐름을 스크린샷·영상으로 남겨 QA 자동화 토대를 마련.

## Known Issues
- 관리자 DocumentShare/Inquiry 등 일부 화면은 여전히 색상을 직접 지정해 다크 모드 대비가 부족합니다.
- `scripts/seed-beta-data.js` 실행 시 WordNet이 인식하지 못한 단어 경고가 다수 출력돼요. (최종 결과는 curated 데이터로 보완됨)
- UI/API 통합 테스트는 수동 QA로만 점검했습니다. 자동화된 end-to-end 테스트는 아직 준비 중이에요.
- Google Translate 무료 API는 호출 제한이 있으므로 Render 배포 시 캐시 파일 삭제에 주의해야 해요.

## Resolved – 2025-10-20 (오류 반복 방지)
- ProblemFeedback 배지·DocumentAnalysis 버튼을 테마 토큰으로 교체해 다크 모드 대비 이슈를 해소했어요.
- `scripts/seed-beta-data.js`를 추가해 베타 계정·문서·어휘 문제를 한 번에 세팅하고, fallback vocabulary는 curated 데이터로 보완했어요.
- `documentProblemFallback`에서 누락된 `escapeRegex`를 불러와 어휘 생성 시 밑줄 추출 오류가 더 이상 나지 않아요.
- `analysisFallbackVariant.test.js`, `fallbackContent.test.js`를 추가해 해석·어휘 필드가 텅 비지 않는지 회귀 테스트로 잠궜어요.
