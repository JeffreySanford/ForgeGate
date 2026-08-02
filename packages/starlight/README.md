# @forgegate/starlight

Local Astro presentation components for ForgeGate generated Starlight MDX.

This package is intentionally narrow today. It proves that generated pages can import `@forgegate/starlight` and build in a real Astro Starlight site. Generated MDX imports portable report objects from companion JSON report data files under `src/data/forgegate/components/`. Component reports are derived from component manifests, manual procedures, automated evidence, manual review records, findings, exceptions that approve those findings, and release-decision workflow records when they are available from verified evidence packages; registry reports list the generated component inventory, and generated registry pages import per-component report data for their embedded status/evidence sections. The component manifest remains the source of truth: report data carries the manifest path, schema version, framework, adapter, source files, documentation targets, policy linkage when present, attachment references, and redaction posture. When a manifest authors both `policyId` and `policyVersion`, the report includes a policy snapshot entry that clearly identifies it as an authored manifest reference, not a full evaluated policy ruleset. The package components render that manifest provenance alongside status, states, tokens, API, accessibility requirements, registry summaries, evidence summaries, imported release-workflow authorization metadata, and test-harness approval warnings with publication-ready spacing, badges, metrics, and tables. Story, consumer-validation, and release-history components still provide stable not-connected presentation placeholders.

`FORGEGATE_REPORT_DATA_ROOT`, `forgeGateComponentReportDataPath()`, `forgeGateRegistryReportDataPath()`, `forgeGateReportDataDiscovery()`, `classifyForgeGateReportDataPath()`, `discoverForgeGateReportDataFiles()`, and `registerForgeGateReportData()` are exported as the current data-file naming, discovery, and route-registration convention. `forgeGateStarlightIntegration()`, `forgeGateStarlightLifecycleStatus()`, `forgeGateStarlightFilesystemDiscovery()`, `forgeGateStarlightReportDataRegistration()`, `forgeGateStarlightInjectReportDataRoutes()`, and `forgeGateStarlightCompatibilityDiagnostics()` are also exported as the first real Astro integration lifecycle contract. They establish the stable integration name, configurable report-data root, generated-data globs, registry/component report classification, filesystem-backed report scanning, deterministic report route entries, optional generated Astro route injection, and Astro/Starlight compatibility diagnostics without changing generated MDX imports.

ForgeGate chooses the starting audience tier from `.forgegate/config.yaml` `adapterConfiguration.starlight` when present. Supported keys are `defaultAudience`, `organizationAudiences`, `libraryAudiences`, `packageAudiences`, and `componentAudiences`; accepted values are `designer-heavy`, `balanced`, and `developer-heavy`.

## Astro integration wiring

The local Acme fixture installs the integration from the source plugin entrypoint until `@forgegate/starlight` becomes a published workspace package:

```js
import { forgeGateStarlightIntegration } from '../../packages/starlight/src/lib/plugin.ts';

export default defineConfig({
  integrations: [
    starlight({ title: 'Component Library' }),
    forgeGateStarlightIntegration({
      filesystemDiscovery: true,
      routeInjection: true,
      routeBase: 'forgegate/reports',
      reportDataRoot: 'src/data/forgegate/components',
    }),
  ],
});
```

When `filesystemDiscovery` is enabled, the integration scans the configured report-data root during the Astro config lifecycle and logs discovered registry/component report JSON plus deterministic route-registration entries. When `routeInjection` is also enabled, it writes package-owned generated `.astro` route entrypoints into Astro's codegen directory and injects prerendered report routes from the discovered JSON. The injected component route renders the same ForgeGate report components used by generated MDX pages inside Starlight's page frame, so the page remains polished and manifest-backed without requiring a handwritten target-repository page.

The Acme fixture now builds two checked-in Button report routes, designer and developer, from two companion JSON artifacts plus three injected routes under `/forgegate/reports/`, so fixture validation covers both manual generated-MDX publication and plugin-owned route injection without inventing a second component source. Target-repository build validation is available after approval when `.forgegate/config.yaml` defines `commandMappings.starlightBuild`; ForgeGate now records the detected Starlight project set in the validation diagnostic while still running the repository-authored command from the workspace root. The same Starlight assumptions were also validated manually against `D:/repos/public-sector-federation` by running its real `pnpm nx run starlight:build` target successfully on 2026-07-31. Broader automated arbitrary-repository coverage remains future work.

Run the package checks with:

```bash
pnpm nx run starlight:test
pnpm nx run starlight:typecheck
pnpm nx run starlight:lint
pnpm nx run starlight:fixture-build
```
