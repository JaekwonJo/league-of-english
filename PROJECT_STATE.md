# PROJECT_STATE.md

## What we're building
- League of English CSAT English practice suite (React 19 + Express API) covering authoring, study, and teacher analytics.
- Fully manual-aligned CSAT problem generators where every type mirrors official exam wording, passage layout, and source metadata (starting with the Eobeop/grammar type).

## Stack & Commands
- Node.js 20 Express backend with React 19 (CRA) frontend; lucide-react for icons.
- SQL.js persists content today; PostgreSQL migration follows after manual-aligned generators stabilize.
- Preferred dev command: `npm run dev:all` (runs API 5000 + client 3000). `npm run dev` and `npm run client` remain available for single-target work.
- Refresh manuals via `node scripts/update-problem-manuals.js` so prompts stay faithful to the latest PDFs.

## Decisions (key)
- Each problem type gets a locked template spec derived from `problem manual/*.md` (2024 Wolgo mock exam series) and checked into the repo next to its generator.
- Generators must display the English passage, Korean stem text, source metadata (exam/year/round/page), and five choices labeled with circled numbers (U+2460..U+2464) exactly as the manuals dictate.
- Eobeop (grammar) rollout leads; we retain cached `<u>...</u>` spans for highlights and require distractor pattern tagging for review mode.
- Prompt builders will emit deterministic sections: passage -> question stem -> choices (5) -> answer/explanation placeholders, so the UI can render without post-cleanup.
- API base URL continues to come from `client/.env` (`REACT_APP_API_URL`), and auth tokens live in `localStorage` until the auth refresh lands.

## Current Stage
- Parsing the 2024 Wolgo mock exam grammar manual to lock down stem wording, choice construction, error labeling, and source formatting before touching generator code.

## Next 3 (priority)
1) Document the Eobeop template (stem phrasing, choice layout, answer/source fields, representative distractor patterns) in markdown for dev + prompt reference.
2) Prototype the Eobeop prompt builder + validator so AI outputs emit complete five-choice JSON and flag any template violations.
3) Draft the same template blueprint for the summary type to queue immediately after grammar stabilizes.

## Known issues
- Grammar template spec is still only in PDF form; markdown reference doc is not written yet.
- Prompt builder/validator work is pending, so generators still rely on loosely formatted AI output.
- Summary-type requirements remain undocumented, making downstream implementation a guess.

## Resolved (today)
- 2025-09-25: Realigned PROJECT_STATE to highlight the Wolgo-based grammar template plan after comparing with README/BUILDLOG.
- 2025-09-25: Document sync unblocked manual-alignment tasks so stakeholders see the CSAT-first focus in every status doc.
- 2025-09-25: Captured follow-up actions (template doc, prompt builder, summary prep) to keep the rollout sequenced.
