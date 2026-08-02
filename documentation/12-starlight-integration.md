# ForgeGate Astro Starlight Integration

## Position

Astro Starlight is ForgeGate’s preferred open documentation destination because it supports repository-owned Markdown and MDX, version control, ordinary build pipelines, custom components, and plugin extension.

ForgeGate should work without Starlight, but Starlight provides the clearest default path for teams that do not want an enterprise documentation subscription.

## Goals

- Detect existing Starlight sites
- Create a new documentation target only after explicit approval
- Generate component pages from manifests and evidence
- Produce polished, designer-level reports that a design-system team could publish without rewriting the generated structure
- Preserve user-authored guidance
- Embed or link Storybook examples
- Show component release state and evidence freshness
- Generate token and API tables
- Detect drift
- Validate the Starlight build
- Provide a reusable ForgeGate Starlight plugin

## Proposed content layout

```text
src/content/docs/
├── index.mdx
├── foundations/
│   ├── color.mdx
│   ├── typography.mdx
│   ├── spacing.mdx
│   └── tokens.mdx
├── components/
│   ├── index.mdx
│   ├── button.mdx
│   ├── input.mdx
│   └── dialog.mdx
├── patterns/
├── accessibility/
├── evidence/
└── releases/
```

## Generated component page

A generated page may include:

```mdx
---
title: Button
description: Triggers an immediate action.
forgegate:
  componentId: up-design-system.button
  manifestPath: .forgegate/components/up-design-system.button.yaml
  manifestSchemaVersion: 0.2.0
  version: 1.2.0
  lifecycle: candidate
  evidenceCommit: b91d20e
  reportData: src/data/forgegate/components/button.json
---

import { ComponentStatus, StoryPreview, TokenTable, EvidenceSummary } from '@forgegate/starlight';
import forgegateReport from '../../../data/forgegate/components/button.json';

<ComponentStatus component="up-design-system.button" report={forgegateReport} />

## Overview

{/* forgegate:user-content:start overview */}

User-authored purpose and guidance.

{/* forgegate:user-content:end overview */}

## Examples

<StoryPreview storyId="components-button--default" />

## API

{/* generated */}

## Tokens

<TokenTable component="up-design-system.button" report={forgegateReport} />

## Accessibility

{/* generated requirements plus protected guidance */}

## Assurance

<EvidenceSummary component="up-design-system.button" report={forgegateReport} />
```

The generated page is a view of the component manifest, not a replacement for
it. The component manifest remains the source of truth for states, story
mappings, token mappings, public contract, documentation targets, lifecycle,
policy linkage, and required manual-review procedures. Generated report data
therefore carries manifest provenance (`manifest.path`, `manifest.schemaVersion`,
framework, adapter, source files, documentation targets, and policy id/version
when present), and rendered Starlight components surface that provenance so a
reviewer can trace a polished page back to the exact `.forgegate/components/*.yaml`
record that produced it.

## Audience-tier output

The Starlight adapter is the primary implementation of the audience-tier templates defined in [`10-documentation-publishing.md`](10-documentation-publishing.md). The same manifest, evidence, and token data can render as designer-heavy, balanced, or developer-heavy Starlight pages.

Frontmatter records the active tier so drift detection and regeneration stay consistent:

```mdx
---
title: Button
description: Triggers an immediate action.
forgegate:
  componentId: up-design-system.button
  version: 1.2.0
  lifecycle: candidate
  evidenceCommit: b91d20e
  audience: designer-heavy
---
```

Representative differences per tier:

- **Designer-heavy** — leads with `StateMatrix` and `TokenTable`, includes annotated visual examples of each state, summarizes API as plain-language capabilities, omits code blocks, expands usage and content guidance, and surfaces accessibility requirements as behavior descriptions rather than ARIA attribute tables.
- **Balanced** — the current default page shape: overview, examples, API, tokens, accessibility, assurance, in the order already shown above.
- **Developer-heavy** — leads with `ApiTable` and installation and import snippets, expands `EvidenceSummary` with raw gate detail and links to CI runs, includes full prop, event, and slot signatures, includes copyable code examples per state, and expands migration and changelog detail.

Repository config can choose the starting tier without hardcoding a UI choice.
ForgeGate reads Starlight-owned adapter configuration from
`.forgegate/config.yaml` and applies overrides in this order: component id,
library id (`organization.library`), organization id, package path, then
repository default. Unknown values are ignored rather than converted into
undocumented templates.

```yaml
adapterConfiguration:
  starlight:
    defaultAudience: designer-heavy
    organizationAudiences:
      acme: balanced
    libraryAudiences:
      acme.design-system: designer-heavy
    packageAudiences:
      packages/forms: developer-heavy
    componentAudiences:
      acme.design-system.acme-button: balanced
```

Sites may publish one tier per component, or publish two linked pages, for example `components/button.mdx` for the balanced default and `components/button--for-developers.mdx` for the developer-heavy companion, cross-linked in frontmatter. ForgeGate should never fork the underlying facts between linked pages; only presentation differs.

The current `@forgegate/starlight` presentation components (`ComponentStatus`, `StoryPreview`, `StateMatrix`, `TokenTable`, `ApiTable`, `AccessibilityRequirements`, `EvidenceSummary`, `ConsumerValidation`, `ReleaseHistory`, and `ComponentRegistry`) accept the active tier where relevant. A future fuller plugin can add components such as `DeprecationNotice` and richer evidence-backed rendering without changing the generated page import path.

## Report quality bar

ForgeGate Starlight output should read as a finished design-system report, not as exported diagnostics. Generated pages should use concise frontmatter, clear section order, strong hierarchy, scannable summaries, status badges, well-spaced tables, and explicit not-connected states. The designer-heavy template should help designers understand states, token usage, accessibility expectations, and release confidence without reading raw schema fields.

The report components should remain sober and publication-ready: no decorative one-off artwork, no marketing hero, no fabricated claims, and no hidden evidence gaps. If data is missing, the report should say so in the relevant section while preserving the overall page quality.

## Protected content

ForgeGate needs a safe way to update generated sections without destroying user-authored content.

Possible strategies:

- Explicit protected markers
- Separate generated data files consumed by MDX components
- Frontmatter-only updates
- AST-aware MDX transforms
- Template regions with deterministic IDs

The preferred long-term approach is to keep frequently changing status and evidence in generated JSON consumed by stable Starlight components. The current implementation stages that JSON under `src/data/forgegate/components/` and imports it into the generated MDX as `forgegateReport`. Human guidance stays in MDX.

Generated MDX uses MDX comment markers (`{/* forgegate:user-content:start overview */}`) for protected regions. ForgeGate still reads legacy HTML comment markers during regeneration so older generated pages can preserve human-authored content.

## ForgeGate Starlight package

ForgeGate now includes a first local package at `packages/starlight`, imported as `@forgegate/starlight` by generated MDX. This is intentionally a narrow presentation package today: it exports Astro components matching the generated page contract and proves those imports in the buildable Acme fixture. Generated component pages import a manifest-backed `forgegateReport` object from `src/data/forgegate/components/`, and generated registry pages import `forgegateRegistry` plus the per-component report data needed for embedded summaries from the same data root. The components render real manifest provenance, status, state, token, API, accessibility, automated-evidence, manual-review, finding, documentation drift, release-decision, attachment-reference/redaction posture, and registry data from those objects with report-grade spacing, badges, metrics, and table styling. When the manifest authors both `policyId` and `policyVersion`, report data includes a `policySnapshot` entry that is deliberately labeled as a manifest-authored policy reference rather than a full evaluated ruleset snapshot. Page generation records each data path in frontmatter as `forgegate.reportData`, so future plugin consumption has a stable generated-data location while the current MDX stays buildable through ordinary Astro/Vite JSON imports.

The package exports `FORGEGATE_REPORT_DATA_ROOT`, `forgeGateComponentReportDataPath()`, `forgeGateRegistryReportDataPath()`, `forgeGateReportDataDiscovery()`, and `classifyForgeGateReportDataPath()` as the current naming and generated-data discovery convention. It also exports `forgeGateStarlightIntegration()`, `forgeGateStarlightLifecycleStatus()`, and `forgeGateStarlightCompatibilityDiagnostics()` as a machine-readable lifecycle boundary with the stable integration name `@forgegate/starlight`, a configurable report-data root, registry/component report classification, discovery globs, and Astro/Starlight compatibility diagnostics. That is now a real discovery-contract lifecycle slice, not the final plugin: it does not yet scan the filesystem or auto-register components.

Build validation currently runs through:

```bash
pnpm nx run starlight:fixture-build
```

That command builds `fixtures/acme-button-library` with Astro Starlight and a checked-in generated MDX page.

## Remaining Starlight work

The current Starlight path is real enough to generate and validate polished component and registry reports, but it is not the final Starlight integration model. The next work should stay focused on the following planning and implementation steps before treating this as complete:

1. **External policy document snapshot loading.** Generated reports carry manifest-authored `policyId`/`policyVersion` provenance, and ForgeGate now reads a matching `RepositoryConfig.policyMappings` entry when present. The mapped workspace-relative policy document is snapshotted into report data with path, format, size, SHA-256, excerpt, commit, and explicit limitations. This is provenance loading, not a full external policy engine: organization-specific rule evaluation, control catalogs, expiry calendars, waiver logic, and reviewer-role matrices remain future work.
2. **Richer evidence loading.** Report-data assembly now includes release-decision summaries, documentation drift status, a manifest-authored policy reference snapshot, matching exception records, attachment-reference/redaction posture, explicit not-connected reasons, and curated automated evidence details alongside automated evidence, manual reviews, and findings. Evidence export writes a built-in release-policy `policy-snapshot.json`, `redaction-plan.json`, `attachments/index.json`, redacted `attachments/files/*.txt` copies for safe workspace-relative text artifact refs, raw imported automated artifacts under `automated/`, and a bounded `automated/details.json` summary for Playwright, axe, Storybook interaction, Jest, and Vitest reports. Starlight report data links matching normalized executions to those details so designer-facing pages can show metrics, notable observations, and limitations without embedding raw logs, screenshots, traces, coverage, node HTML, or attachment contents. `loadStarlightEvidencePackageRecords()` can now reload Starlight-relevant records from an already-read evidence package file map and reports missing/invalid sections as limitations. Next, add workspace UI import, checksum verification, and direct Starlight regeneration from exported packages. Missing evidence must continue to render as a polished "not connected" state rather than an empty or optimistic section.
3. **Real plugin lifecycle.** The first Astro integration entrypoint, lifecycle-status helper, generated-data discovery convention, report-data classifier, and compatibility diagnostic helper exist. Next, turn the discovery contract into filesystem-backed generated-data auto-discovery, component auto-registration, installation docs, broader fixture coverage, and migration guidance. The current generated MDX import path should remain stable so existing generated pages do not need to be rewritten when the plugin matures.
4. **Arbitrary target-repo build validation after approval.** Keep the current `commandMappings.starlightBuild` behavior, now backed by a testable validation plan that records the detected Starlight project set and validation matrix in diagnostics. The matrix classifies root vs nested Starlight projects, multiple detected projects, no detected project, npm vs pnpm command shape, and Nx vs non-Nx command shape beside the actual command result. Next, validate that matrix across more repository shapes after approved writes: non-Nx Starlight sites, missing commands, failing builds, and generated import/path failures. ForgeGate should report validation as passed, failed, or skipped without rolling back an already approved write unless a later rollback workflow is explicitly designed.
5. **Binary, absolute-path, and temporary attachment capture.** Broad raw attachment capture is not part of the current Starlight report contract. Evidence export now classifies raw refs by source class, media class, consent status, copy status, and copy blocker, so generated reports can distinguish copied redacted text from pending-consent and binary-redaction blockers. Actual copying of absolute, temporary, binary, or archive refs still needs an explicit consent UI, binary-safe streaming, size limits, redaction/review rules, retention policy, and safe target paths before generated reports or evidence packages should claim to include those files.

These are planned follow-ups, not blockers for the current P2 report slice. The active bar for this slice remains: generated pages are designer-level, manifest-provenanced, evidence-honest, protected-content-safe, and build-validated in the fixture plus selected real target repositories.

## Future ForgeGate Starlight plugin

A plugin could provide:

- `ComponentStatus`
- `StoryPreview`
- `StateMatrix`
- `TokenTable`
- `ApiTable`
- `AccessibilityRequirements`
- `EvidenceSummary`
- `ConsumerValidation`
- `ReleaseHistory`
- `DeprecationNotice`

The plugin should read portable ForgeGate manifests and evidence summaries.

## Storybook previews

ForgeGate should support:

- Link to story
- Embedded iframe where safe and allowed
- Static screenshot fallback
- Local-development preview
- Hosted Storybook preview

Documentation should remain useful when the Storybook is temporarily unavailable.

## Navigation

The adapter should support:

- Autogenerated navigation from content structure
- Explicit sidebar configuration
- Component grouping by category
- Lifecycle filters
- Deprecated sections
- Versioned documentation strategies

ForgeGate should show proposed navigation changes before writing.

## Search and metadata

Generated pages should include meaningful:

- Titles
- Descriptions
- Keywords
- Component IDs
- Package names
- Versions
- Lifecycle
- Last reviewed commit

## Evidence presentation

Public documentation should not necessarily expose every raw test artifact.

The publication policy should define which information appears:

- Summary only
- Finding counts
- Release decision
- Evidence date
- Link to internal evidence
- Full public report

Sensitive evidence should remain private.

## Drift detection

ForgeGate should compare:

- Manifest component version
- Page frontmatter version
- Story IDs
- API contract
- Token mappings
- Required sections
- Release status
- Evidence commit

## Validation

After writing, ForgeGate should run the configured Starlight build and report:

- Build success
- Broken links
- Missing imports
- Invalid frontmatter
- Missing Storybook targets
- Plugin compatibility errors

Current implementation: after a generated page is approved and committed,
ForgeGate looks for `commandMappings.starlightBuild` in `.forgegate/config.yaml`.
When present, the command is parsed into executable plus arguments and run through
ForgeGate's existing no-shell workspace command runner from the repository root.
The page remains written whether validation passes or fails; the validation result
is reported separately. When the mapping is absent, ForgeGate reports validation
as skipped rather than guessing a build command for an arbitrary repository.

Example:

```yaml
commandMappings:
  starlightBuild: pnpm nx run docs:build
```

## MVP acceptance

The first Starlight adapter should:

- Detect one existing Starlight site
- Generate one button page
- Preserve one user-authored section
- Include one Storybook link or embed
- Include API, states, tokens, accessibility, and assurance summary
- Show a diff
- Build successfully
