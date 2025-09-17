# League of English ??CSAT-Perfect Pipeline

?숈깮쨌援먯궗瑜??꾪븳 ?곸뼱 ?숈뒿/臾명빆 ?앹꽦 ?뚮옯?쇱엯?덈떎. PDF/TXT ?낅줈????遺꾩꽍/?뚰겕?쒗듃/?숈뒿源뚯? ??踰덉뿉 吏꾪뻾?⑸땲?? CSAT ?ㅽ???5吏?좊떎/臾몄젣 臾멸뎄 ?듭씪/利앷굅 ?쇱씤) 洹쒖튃??吏?ㅻ뒗 寃껋쓣 ?듭떖 紐⑺몴濡??⑸땲??

## 기여 안내
- 처음 참여하는 분은 [AGENTS.md](AGENTS.md) 문서에서 작업 순서와 규칙을 확인하세요.


## ?듭떖 湲곕뒫
- ?낅줈?? PDF/TXT ?낅줈?????뚯꽌媛 passage/?뚯뒪 留??앹꽦
- ?숈뒿: `POST /api/generate/csat-set` 湲곕컲 ?명듃 ?앹꽦 ???????寃곌낵(Gamified)
- 遺꾩꽍: 臾몄옣蹂??댁꽕/?붿빟/?댄쐶移??대え吏/媛뺤“ ?ы븿)
- ?댄쐶: ?⑥뼱???낅줈???쒗뿕 ?앹꽦(愿由ъ옄 ?꾩슜 ?낅줈??

## ?ㅽ뻾 諛⑸쾿
- ?섏〈???ㅼ튂: `npm run install-all`
- ?쒕쾭留??ㅽ뻾: `npm run dev`
- ?대씪留??ㅽ뻾: `npm run client` (異⑸룎 ??`npm run client:alt` ??3001 ?ы듃)
- ?쒕쾭+?대씪 ?숈떆 ?ㅽ뻾(沅뚯옣): `npm run dev:all`
- ?곹깭 ?뺤씤: `http://localhost:5000/health` (OK)

?ы듃/?붾뱶?ъ씤??Quick Fix
- 5000 ?ъ슜 以????꾨줈?몄뒪 醫낅즺 ???ъ떆???먮뒗 `server/.env`??`PORT`瑜?5001濡?蹂寃?- 3000 ?ъ슜 以???`npm run client:alt` ?ъ슜(?ы듃 3001)
- `/api/generate/csat-set` 404 ???쒕쾭 ?ъ떆?? `server/routes/problem.routes.js`媛 紐⑤뱺 ?쇱슦???뺤쓽 ?ㅼ뿉 `module.exports = router`瑜??대낫?댁빞 ?⑸땲??
## ?꾩옱 ?④퀎 (2025-09-13)
- CSAT 臾몄젣???쏛PI ?꾩슜??(title/theme(topic)/summary/blank/vocabulary/irrelevant/implicit). 遺議깊븯硫?503?쇰줈 ?묐떟, ?대씪?먯꽌 ?ъ떆???덈궡
- ?숈뒿/?뚰겕?쒗듃??`POST /api/generate/csat-set`留??ъ슜
- 寃곌낵 ?붾㈃: 諭껋?/肄섑럹????겕???곗뼱 吏꾪뻾???꾩씠??梨뚮┛?)
- 遺꾩꽍 ?붾㈃: ?대え吏/援듦린/諛묒쨪/?섏씠?쇱씠??+ ?댄쐶移?
?ㅻ뒛 ?덉젙??臾몄젣 ?щ컻 諛⑹? ?ы븿)
- `/api/generate/csat-set` 404 ?섏젙: `problem.routes.js` ?대낫?닿린 ?쒖꽌 ?뺣━(?쇱슦???뺤쓽 ??`module.exports`)
- ?댄쐶 ?쇱슦???섏젙: `requireRole` ??`requireAdmin` (愿由ъ옄 ?꾩슜 ?낅줈??紐⑸줉)
- ?ы듃 異⑸룎 ?닿껐: 3000/5000 ?먯쑀 ?꾨줈?몄뒪 醫낅즺, `client:alt`(3001) 媛?대뱶 異붽?
- ?쒓? UI ?泥?냼: Admin/Upload/Category/Edit/DocumentList/Study ?섏씠吏 ?띿뒪???뺣━, 移쒖젅???ㅻ쪟 ?덈궡(404/503/401)
- ?몄퐫???뺣━ ?ㅽ뻾: `npm run encoding:apply-basic` (紐⑥?諛붿? ?쒓굅). ?댄썑 pre-commit ?낆쑝濡?李⑤떒 ?덉젙

吏꾪뻾瑜????
- 二쇱슂 ?먮쫫(?낅줈?쒋넂?명듃 ?앹꽦?믫??닳넂寃곌낵) ?숈옉 ?뺤씤, `/api/generate/csat-set` 200 OK 寃利??꾨즺
- ?덉쭏/?덉젙???몄퐫???꾩깮, i18n, UX ?대━?? 吏꾪뻾 以?????70%

?ㅼ쓬 3?④퀎 ?쒖븞
1) pre-commit ?낆뿉 ?몄퐫???ㅼ틦??異붽?(紐⑥?諛붿? ?ы븿 ??而ㅻ컠 李⑤떒)
2) i18n 由ъ냼??以묒븰???쒓? ?띿뒪?몃? 而댄룷?뚰듃 諛뽰쑝濡??뺣━)
3) Evidence UX: 寃곌낵/蹂몃Ц??evidenceLines ?쒖떆 + 蹂몃Ц ?섏씠?쇱씠???좉?

## API ?붿빟
- ?명듃 ?앹꽦: `POST /api/generate/csat-set` ??{ documentId, counts }
- ?ㅻ쭏??臾몄젣(?덇굅??: `POST /api/get-smart-problems`
- ?댄쐶 ?쒗뿕 ?앹꽦: `POST /api/vocab-exam/generate` ??{ docId, count }
- 遺꾩꽍: `/api/analysis/*` (passage analysis ??

## ?뚯씪 ?덈궡(以묒슂 寃쎈줈)
- ?쒕쾭 ?붾뱶?ъ씤?? `server/routes/problem.routes.js:394` (csat-set)
- ?댄쐶 ?쇱슦?? `server/routes/vocab.routes.js`
- ?숈뒿 ?섏씠吏: `client/src/pages/StudyPage.js`
- 愿由ъ옄 ?섏씠吏: `client/src/pages/AdminPage.js`
- ?낅줈??移댄뀒怨좊━/?몄쭛 紐⑤떖: `client/src/components/admin/*`
- ?꾨＼?꾪듃/?ㅽ럺: `PROBLEM_PROMPTS_*.md`, `docs/SPECS/*`

## ?몄퐫??臾몄옄 源⑥쭚 諛⑹?
- ????몄퐫?⑹? UTF-8, 以꾨컮轅?LF 沅뚯옣(`.editorconfig` ?ы븿)
- 寃?? `npm run encoding:report`
- ?먮룞 ?뺣━(湲곕낯): `npm run encoding:apply-basic`
- 異뷀썑 pre-commit ?낆쑝濡?而ㅻ컠 李⑤떒 ?덉젙

## Troubleshooting: Windows Console Mojibake
- 원인: Windows 콘솔 기본 코드페이지가 UTF-8이 아니어서 한글 로그가 깨집니다.
- 해결(택1):
  - cmd에서 `chcp 65001` 후 실행
  - PowerShell에서 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`
  - 임시 회피: `LOE_ASCII_LOG=1 npm run dev` (로그만 ASCII, UI/DB 한글은 유지)

## Roadmap & ETA (Concerns)
- 목표: 문제풀기/단어시험/분석이 안정적으로 동작하고, 오류가 재발하지 않도록 방지 장치 포함.
- 다음 3단계 완료 예상: 약 2일 (i18n 2차 적용, Evidence UX 최소, 라우트 구조화) + 0.5~1일 버퍼(QA/회귀)
- 품질 기준:
  - 문제풀기: 세트 생성 200 OK, 503은 드물게(재시도 안내), 오답/해설/근거라인 정상
  - 단어시험: 업로드→시험 생성→정답 검증 1회전 무중단
  - 분석: 문장별 해설 JSON 스키마/이모지/어휘칩 정상, 인쇄 스타일 점검

## Snapshot ? 2025-09-14 20:32

### What was done (today)
- Encoding guard: pre-commit hook + mojibake scanner (scripts/scan-mojibake.js, 
pm run encoding:check)
- i18n: KR resource + helper and applied to Admin/Study core screens
- Evidence UX (minimal): show evidenceLines + mainText highlight toggle in results
- Console fallback: LOE_ASCII_LOG=1 for ASCII-only logs on Windows consoles
- Stability: fixed csat-set route export ordering and vocab admin middleware (requireAdmin)

### Where we are (phase)
- Stabilization & polish: ~70?75% complete (core flows work; finishing i18n/Evidence UX/routes structure + QA)

### Your requests captured
- Never see broken Korean again → enforced by pre-commit + i18n centralization + Windows console guide
- Evidence lines visible in results → implemented (toggle highlight)
- Clear ETA & plan → provided below

### Next 3 steps
1) i18n pass 2 ? remaining screens; light snapshot tests
2) Evidence UX polish ? highlight quality/labels; small UI touches
3) Route refactor ? split problem.routes into controller/service for safer edits

### ETA to “stable use”
- 2?3 days to stable usage (then 1?2 days QA/bugfix)

## Deployment Status (2025-09-17)
- Server: Render blueprint ready (Node 20). DB uses sql.js (no native bindings).
- Lockfile synced (sqlite3 → sql.js) so `npm ci --omit=dev` is stable on Render.
- Added grammar span generator util; routes now include `choices` for `grammar_span` items.
- Removed unicode fallback in routes to avoid parse errors.
- DB file path: `DB_FILE=/tmp/loe.db` on free tier (ephemeral). Use Starter+disk for persistence.
- Client: Deploy to Vercel with `REACT_APP_API_URL` pointing to Render URL + `/api`.

## Production (Persistent DB)
- Want data to persist across restarts? Use Render Starter + disk.
- Quick guide: `docs/DEPLOY_PRODUCTION_CHECKLIST.md`
- Or use `render.starter.yaml` blueprint (plan: starter, disk at `/var/data`).

## Today’s Changes (2025-09-17)
- Fix: Render build error (`npm ci` mismatch) by syncing `package-lock.json`.
- Fix: Runtime crash (MODULE_NOT_FOUND) by adding `server/utils/grammarSpanGenerator.js`.
- Fix: SyntaxError from unicode fallback; now using generator-provided `choices` only.

## Where We Are (Phase)
- Server up with sql.js; grammar routes stable.
- Client pending: set Root=`client`, Build=`npm run build`, Output=`build`, and `REACT_APP_API_URL` before redeploy.

## Next 3 Steps
1) Render: switch to Starter + attach Disk; set `DB_FILE=/var/data/loe.db`.
2) Vercel: confirm Root=`client`, Build=`npm run build`, Output=`build`; set `REACT_APP_API_URL` and redeploy latest commit.
3) Parser Phase 2 tasks (markers/sources/merge) + begin CSAT normalizers.

## What Changed (Today)
- Removed sqlite3 native module; added sql.js; rewrote DB wrapper with same API.
- Simplified render.yaml (no rebuild hooks). Kept dynamic CORS via CORS_ORIGIN.
- Added resilient submit/report endpoints (avoid 404).

## Your Requests
- Quick real deployment (Render + Vercel) → done, configured.
- Minimal, compact app → current UI works; compact mode planned next.
- No more deploy errors → removed native binaries; Render-friendly now.

## Next 3 Steps
1) Vercel: set REACT_APP_API_URL = https://<your-render>/api and deploy.
2) (Option A) Keep free tier (demo): understand data resets on restart; or (Option B) enable persistence: upgrade Render plan, set DB_FILE=/var/data/loe.db and attach disk.
3) Compact student mode + i18n cleanup (hide admin menus, fix mojibake labels).
