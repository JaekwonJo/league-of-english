# ADR Addendum — 2025-09-16

28) Render Deploy Robustness (DB layer)
- Problem: sqlite3 native bindings failed on Render (free), even with rebuild-from-source.
- Decision: Replace native `sqlite3` with pure JS `sql.js` (WASM) at the DB wrapper layer to remove native dependency risk.
- Scope: Server-only change in `server/models/database.js` while preserving the same public API (connect/run/get/all/close).
- Persistence: Writes DB bytes to `DB_FILE` (free-tier=/tmp/loe.db). Data is ephemeral on free tier (reset on restart/deploy). Use Starter tier + disk for persistence.
- CORS: Keep env-driven override `CORS_ORIGIN` for Vercel domain.

Rationale
- Avoids native compilation, binding path, and ABI mismatches between build/runtime.
- Enables immediate deploy on Render Free without extra system deps.

Impact
- No app-level API changes; all route/service code continues to call `database.run/get/all` as before.
- Slightly different perf profile (in-memory DB with periodic flush). Suitable for MVP/demo; migrate to managed DB (Postgres) when scaling.

29) Build Pipeline Simplification
- render.yaml: `buildCommand: npm ci --omit=dev` (sqlite rebuild removed).
- Node: pinned to 20 via env `NODE_VERSION`.

30) Client Submit Flow Safety
- Server now accepts `/api/problems/submit` for ephemeral items and returns 200 without failing UX.

