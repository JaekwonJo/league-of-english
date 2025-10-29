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
- 어휘·학습·분석 화면을 단계별 URL(`/vocabulary/days`, `/study/solve`, `/analysis/detail`)로 분리해 브라우저 뒤로가기·딥링크를 지원합니다.
- 모바일 헤더를 ☰/✕ 토글과 중앙 🦉 제목으로 단순화해 메뉴/로고 혼선을 없앴습니다.
- StudyPage의 브라우저 히스토리 처리(`popstate`)를 안전한 순서로 재구성해 ReferenceError 없이 복귀/다시풀기 흐름이 동작합니다.
- 모바일 사이드바는 화면을 탭하면 닫히도록 outside-click 감지를 추가해 햄버거/부엉이 중복 표기를 없앴습니다.
- `/documents/:id` 업데이트 API를 추가해 관리자 문서 제목/카테고리가 실제 시험·어휘 목록에도 바로 반영됩니다.
- 문제 생성 한도를 유형별로 재조정(비AI 유형 10문, AI 유형 합산 5문)해 생성 중단/타임아웃을 줄였습니다.
- 빈칸 fallback은 KSAT형 질문 문구·3문장 이상 해설을 포함하도록 강화했습니다.

## 현재 단계 (2025-10-29 기준)
- 어휘/학습/분석 단계가 주소로 분리되어 모바일·데스크톱 모두 브라우저 네이티브 전환감을 제공합니다.
- 학습 페이지의 히스토리 이동이 ReferenceError 없이 작동하며, 저장된 세션 복원도 안정화되었습니다.
- 모바일 사이드바가 바깥 탭 시 닫혀 UX 혼란이 줄었고, 햄버거/부엉이 이중 노출이 사라졌습니다.
- 관리자 문서 수정이 실 DB에 반영되며, 학생 어휘/학습 목록도 최신 제목을 그대로 보여 줍니다.
- 문제 생성 요청에 유형별 상한이 적용되어 긴 요청에서도 안정적으로 완료됩니다.
- 빈칸 fallback 문제는 질문/해설이 KSAT 스타일에 맞춰 기본 품질을 보장합니다.
- Render/Vercel 배포는 최신 커밋 적용이 필요하고, fallback 분석 테스트 보정 작업이 남아 있습니다.

## Next 3 (오늘 우선순위)
1. fallback 분석(`analysisFallbackVariant`) 해석 prefix 보정 – 자동 분석 신뢰도↑
2. 어휘/학습/학습 히스토리 흐름에 대한 Playwright/통합 테스트 추가 – popstate 회귀 방지↑
3. Render/Vercel 재배포 후 모바일 사이드바/학습 시작 스모크 테스트 체크리스트 갱신 – 운영 안정성↑

## Known Issues
- `analysisFallbackVariant.test.js`가 fallback 해석 prefix 누락으로 여전히 실패 중 – 프롬프트/포맷 교정 필요.
- 일부 문서 grade/school 메타값이 비어 있을 때 학생 노출 정책이 과/소노출될 수 있음(정책 튜닝 예정).
- 이메일 발송(NEVER/SMTP) 미설정 시 가입은 베타 우회로 통과 – 운영 전 SMTP 필수 세팅 필요.
- UI 캡처(`npm run capture:ui`) 최초 실행 시 Playwright 설치 필요.
- 클라이언트 오류 리포트(`/api/errors/report`)는 아직 미구현이라 405가 반환됩니다 – 서버 라우트 보강 예정.

## Resolved – 2025-10-29 (오류 반복 방지)
- StudyPage의 `popstate` 로직을 재배치해 "Cannot access 'J' before initialization" 런타임이 더는 발생하지 않습니다.
- 모바일에서 메뉴를 연 뒤 화면을 탭하면 즉시 닫히도록 outside-click 감지를 추가했습니다.
- 햄버거 버튼과 🦉 로고가 겹쳐 보이던 현상을 제거했습니다.
- 관리자 문서 수정이 학습/어휘 목록에 실시간 반영되도록 `/documents/:id` 업데이트를 유지합니다.
- 문제 생성 한도/빈칸 fallback 개선으로 긴 요청과 기본 해설 품질을 안정화했습니다.
