# @forgegate/starlight

Local Astro presentation components for ForgeGate generated Starlight MDX.

This package is intentionally narrow today. It proves that generated pages can import `@forgegate/starlight` and build in a real Astro Starlight site. Generated MDX imports portable report objects from companion JSON report data files under `src/data/forgegate/components/`. Component reports are derived from component manifests, manual procedures, automated evidence, manual review records, findings, and exceptions that approve those findings; registry reports list the generated component inventory, and generated registry pages import per-component report data for their embedded status/evidence sections. The component manifest remains the source of truth: report data carries the manifest path, schema version, framework, adapter, source files, documentation targets, policy linkage when present, attachment references, and redaction posture. When a manifest authors both `policyId` and `policyVersion`, the report includes a policy snapshot entry that clearly identifies it as an authored manifest reference, not a full evaluated policy ruleset. The package components render that manifest provenance alongside status, states, tokens, API, accessibility requirements, registry summaries, and evidence summaries with publication-ready spacing, badges, metrics, and tables. Story, consumer-validation, and release-history components still provide stable not-connected presentation placeholders.

`FORGEGATE_REPORT_DATA_ROOT`, `forgeGateComponentReportDataPath()`, and `forgeGateRegistryReportDataPath()` are exported as the current data-file naming convention. `forgeGateStarlightIntegration()` and `forgeGateStarlightLifecycleStatus()` are also exported as the first real Astro integration entrypoint and lifecycle contract. They are intentionally minimal today — they establish the stable integration name, lifecycle stage, and configurable report-data root for future plugin discovery without changing generated MDX imports.

ForgeGate chooses the starting audience tier from `.forgegate/config.yaml` `adapterConfiguration.starlight` when present. Supported keys are `defaultAudience`, `organizationAudiences`, `libraryAudiences`, `packageAudiences`, and `componentAudiences`; accepted values are `designer-heavy`, `balanced`, and `developer-heavy`.

It does not yet provide a complete Starlight plugin lifecycle with component auto-registration or generated-data discovery. Target-repository build validation is available after approval when `.forgegate/config.yaml` defines `commandMappings.starlightBuild`; ForgeGate now records the detected Starlight project set in the validation diagnostic while still running the repository-authored command from the workspace root. The same Starlight assumptions were also validated manually against `D:/repos/public-sector-federation` by running its real `pnpm nx run starlight:build` target successfully on 2026-07-31. Broader automated arbitrary-repository coverage remains future work.

Run the package checks with:

```bash
pnpm nx run starlight:test
pnpm nx run starlight:typecheck
pnpm nx run starlight:lint
pnpm nx run starlight:fixture-build
```
