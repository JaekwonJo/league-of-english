# League of English - CSAT English Practice Suite

League of English is a web application that helps students and teachers generate, solve, and analyse CSAT-style English problems. The project consists of a Node/Express API and a React front-end.

## Main Features
- Upload English passages (PDF/TXT) and generate CSAT problem sets (order, insertion, grammar, vocab, etc.).
- Generate manual-aligned grammar questions (circled-digit options, underlined passages) in five-question batches via the OpenAI pipeline.
- Generate summary problems with (A)/(B) blanks, circled-digit options, and Korean source labels in five-question batches.
- Solve problems with timers, automatic scoring, and result dashboards.
- Analyse passages sentence-by-sentence with AI-generated explanations.
- Track personal progress with a stats dashboard (type accuracy + weekly trend).
- Redeem membership coupons to unlock premium limits and perks.
- Teachers issue class codes so students can link their accounts for shared analytics.
- Teachers can review class analytics with 기간/학년/멤버십 필터와 CSV export to support coaching.
- Admin tools for document management, ranking, and vocab exercises.

## Tech Stack
- **Frontend**: React 19, CRA, lucide-react
- **Backend**: Node 20, Express, sql.js
- **Tooling**: Windows PowerShell, npm scripts (`dev`, `client`, `build`, `lint`)

## Prerequisites
- Windows 10/11 with the built-in Windows PowerShell (preferably run as Administrator when managing ports).
- Node.js 20 LTS installed on Windows (via the official installer or nvm-windows).
- npm 10+ (bundled with the Node.js installer).

## Quick Start (PowerShell)
1. **Open Windows PowerShell.**
   ```powershell
   cd C:\Users\jaekw\Desktop\league-of-english
   ```
2. **Install dependencies (first time only).**
   ```powershell
   npm install
   cd client
   npm install
   cd ..
   ```
3. **Run the full stack.**
   ```powershell
   npm run dev:all
   ```
   - This launches the API on port 5000 and the React app on port 3000.
   - Visit `http://localhost:3000` in your browser.
   - API health check: `http://localhost:5000/health`.
4. **Stop the servers.** Press `Ctrl + C` in the PowerShell window.

## Common Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Run Express API only (port 5000). |
| `npm run client` | Run React dev server only (port 3000). |
| `npm run dev:all` | Run both API and client concurrently from the repository root. |
| `npm run build` | Build the React client. |
| `npm run lint` | Lint server-side JS files. |
| `node scripts/update-problem-manuals.js` | Refresh the authoring manuals from the latest source PDFs. |

## Manual Sync Workflow
When you refresh the authoring manuals from the latest PDFs, run the script and then walk through these checks so the AI keeps using clean guidance.

1. **Run the converter.** `node scripts/update-problem-manuals.js` regenerates each `problem manual/*.md` from the PDFs that share the same base name.
2. **Confirm the diffs.** Run `git diff "problem manual"` to make sure the updates match the intended PDF changes and spot any garbled characters early.
3. **Spot-check in the app.** Start the stack (`npm run dev:all`) and create at least one AI grammar question so you can verify the regenerated text renders correctly.
4. **Capture any follow-up fixes.** If a manual needs hand edits, make them after the script finishes. Re-run the script only when you re-export the PDFs so automation stays the source of truth.

Once the checks pass, commit the updated manuals alongside any fixes so teammates inherit the same state.

## Troubleshooting
- **Port already in use**: Close other apps using ports 3000 or 5000. You can run `Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess` in PowerShell (with admin rights) to identify and stop them.
- **React keeps pointing to the wrong API**: Delete `client/.env`, then restart using `npm run dev:all` so the client falls back to `http://localhost:5000/api`.
- **Grammar problem shows no underlines**: make sure you are on the latest branch; the front-end now parses `<u>...</u>` spans.
- **PowerShell execution policy blocks scripts**: temporarily allow scripts by running `Set-ExecutionPolicy -Scope Process RemoteSigned` before starting the dev servers.

## Repository Structure (high-level)
```
client/   # React front-end
server/   # Express API & AI problem generation services
docs/     # ADRs, decision logs, session notes
scripts/  # Local development helpers
```

## Contributing
1. Fork and clone the repository.
2. Run `npm install` in the root and in `client/`.
3. Create a feature branch, make changes, and run lint/tests when applicable.
4. Submit a pull request describing the changes and testing steps.

## License
This project is proprietary. Do not distribute without permission.

## Project Roadmap

### Latest Update (2025-09-25)
- Enforced 5-question batch generation and wired the summary (A/B) template end-to-end (prompt → validator → UI).
- Docs (PROJECT_STATE.md, BUILDLOG.md) refreshed to reflect the new summary pipeline and count sanitiser.

| Step | Description | Status |
|------|-------------|--------|
| 01 | 개발 도구 설치 (Node.js, VS Code, Git) | ? 완료 |
| 02 | 프로젝트 폴더 구조 구성 | ? 완료 |
| 03 | React 앱 기본 설정 | ? 완료 |
| 04 | 기존 React 컴포넌트 적용 | ? 완료 |
| 05 | 라우팅 설정 (페이지 이동) | ? 완료 |
| 06 | 스타일링 (그라데이션/반응형) | ? 완료 |
| 07 | Express 서버 구축 | ? 완료 |
| 08 | 데이터베이스 전환 준비 (PostgreSQL) | ?? 계획 |
| 09 | 데이터베이스 테이블 생성 (SQL.js) | ? 완료 |
| 10 | 핵심 API 엔드포인트 구현 | ? 완료 |
| 11 | 회원가입·로그인 시스템 | ? 완료 |
| 12 | 파일 업로드 확장 (PDF → DOCX/CSV) | ?? 예정 |
| 13 | AI 연동 (OpenAI API) | ? 완료 |
| 14 | 문제 자동 생성 로직 | ? 완료 |
| 15 | 점수·랭킹 시스템 | ? 완료 |
| 16 | 멤버십 결제/업그레이드 흐름 | ?? 보강 필요 |
| 17 | 관리자 대시보드 | ? 완료 |
| 18 | 통계·분석 대시보드 | ?? 확장 필요 |
| 19 | 일일 제한 관리 | ? 완료 |
| 20 | 환경 변수 설정 | ? 완료 |
| 21 | 보안 강화 (역할·JWT·CORS) | ?? 진행 중 |
| 22 | 에러 처리 (전역 핸들러, API별 예외) | ?? 진행 중 |
| 23 | 클라우드 서버 선택 (Render/Vercel) | ? 완료 |
| 24 | 도메인 연결 | ? 완료 |
| 25 | 최종 테스트 및 런칭 | ?? Smoke 테스트/QA 예정 |





