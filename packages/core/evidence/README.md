# core-evidence

Framework-neutral evidence contracts and import adapters for ForgeGate.

## Test Evidence Import

`.forgegate/evidence/*.json` files may use one of these supported shapes:

- ForgeGate-native `TestExecution` JSON.
- `playwright-json` envelope with raw Playwright JSON plus ForgeGate provenance.
- `axe-json` envelope with raw axe-core JSON plus ForgeGate provenance.
- `storybook-interactions-json` envelope with raw Storybook interaction result JSON plus ForgeGate provenance.

Imported tool envelopes must include `componentVersionId`, `commitOrFingerprint`,
`toolVersion`, and a raw `report`. `rawArtifactRef` is optional. The parser
normalizes one `TestExecution` for readiness and preserves the raw report so the
desktop app can export it under the documented `automated/` evidence-package
files.

## Running Unit Tests

Run `pnpm nx test core-evidence` to execute the unit tests via
[Vitest](https://vitest.dev/).
