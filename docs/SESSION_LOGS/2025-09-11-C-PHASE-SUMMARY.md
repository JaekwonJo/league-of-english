# 2025-09-11 — Phase C Batch Parse Summary

What ran
- Script: `node server/scripts/batch-parse-pdfs.js`
- Target: `pdfsample/`

Results
- LOE_고1_25년_9월.pdf: passages=21, sources=21, chars≈21,863
- LOE_고1_올림포스2_2학기중간.pdf: passages=24, sources=24, chars≈22,271
- LOE_고2_25년_9월.pdf: passages=21, sources=21, chars≈20,384
- LOE_고2_하루6개1등급_Day11_15.pdf: passages=29, sources=29, chars≈27,984

Observations
- All files parsed OK (non-zero passages); sources matched counts.
- No marker gaps detected; max(N) enforcement can remain a pending safeguard.
- Sample previews show short-line merging produced coherent paragraphs.

Parser updates (B & A from today)
- Marker regex: more flexible (spaces/hyphens/en–em dashes; case-insensitive `no.`).
- Merge rules: comma/semicolon/colon/dash soft-end; abbreviation-aware periods; soft-start connectors.
- Fallback source label: `지문 N` when unknown.
- Unit tests: `server/scripts/test-marker-flex.js`, `server/scripts/test-merge-rules.js` (both OK).

Next suggested
- Implement strict max(N) passage enforcement only if gap samples appear.
- Expand tests with additional textbook PDFs if available.

