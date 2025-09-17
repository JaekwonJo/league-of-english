# TODO (Working Plan) — 2025-09-17

Now
- Render Deploy Stability
  - [x] Sync package-lock with package.json (sqlite3 → sql.js) to satisfy `npm ci`
  - [x] Add `server/utils/grammarSpanGenerator.js` and include `choices` in `grammar_span` routes
  - [x] Remove fragile unicode fallback for choices (prevent parse errors)

- Phase 2 — PDF Parser (in progress)
  - [ ] Marker-first segmentation: robust `N. pX-no.Y(~Z)`
  - [ ] Enforce passage count = max(N); fill sources
  - [ ] Merge short lines for textbook layout
  - [ ] Expand source detection; fallback `???? N`
  - [ ] Parser unit tests for provided samples

Soon (Phase 3)
- [ ] CSAT normalizers for title/theme/summary/blank
- [ ] Strict 5-choice enforcement, standardized question texts
- [ ] Retry pipeline on normalizer fail; save validated only

Next (Phase 4)
- [ ] UI unify for all types; safe inline `<u>` rendering

Deploy
- [ ] Render Starter + Disk; `DB_FILE=/var/data/loe.db` (persistence)
- [ ] Vercel: Root=`client`, Build=`npm run build`, Output=`build`
- [ ] Env (client): `REACT_APP_API_URL = https://<render>/api`

Later
- [ ] Full set generation script + dashboard check
- [ ] Compact student mode + i18n cleanup
- [ ] Admin: problem reports triage view
