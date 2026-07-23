# Acme Button Library (ForgeGate fixture)

A small, real, deterministic Web Components package — not a demo product. It exists so ForgeGate's own development and automated tests have a real workspace to point at, per [`documentation/decisions/0003-pilot-repository.md`](../../documentation/decisions/0003-pilot-repository.md):

> Build a small, purpose-built, deterministic fixture repository later, specifically for ForgeGate's own CI. The fixture exists to keep ForgeGate's automated tests reliable and independent of an external repository's drift.

Contents:

- [`src/acme-button.js`](src/acme-button.js) — a real, working vanilla `HTMLElement` custom element (no build step, no framework).
- [`custom-elements.json`](custom-elements.json) — a hand-authored Custom Elements Manifest that accurately describes `acme-button.js` (kept in sync by hand; there's exactly one component here).
- [`tokens/acme.tokens.json`](tokens/acme.tokens.json) — a real DTCG-format token file.

This package is intentionally outside the pnpm/Nx workspace (no `pnpm-workspace.yaml` entry, excluded from ESLint via `fixtures/**` in `eslint.config.mjs`) — it is content ForgeGate scans, not code ForgeGate builds. `apps/forgegate-desktop/src-tauri/src/workspace_scan.rs`'s `detects_the_acme_button_library_fixture_correctly` test scans this directory for real and asserts on the result, so any future edit here that breaks detection fails CI immediately.
