# ForgeGate Phased TODO

This file is the primary work plan for ForgeGate. It is intentionally detailed so that work can be selected, implemented, tested, reviewed, and marked complete without losing the larger product direction.

## Status convention

- `[ ]` Work remains to be completed.
- `[X}` Work is completed.

The completed marker intentionally follows the project convention requested for this repository.

## Working rules

- A phase is not complete merely because code exists.
- Every implemented feature must include documentation, tests, error handling, and acceptance evidence appropriate to the phase.
- Framework-specific logic must live behind adapters unless the work is explicitly part of the initial Web Components proof of concept.
- Repository-controlled manifests and evidence exports remain the durable source of truth.
- Local SQLite state is a cache and workflow aid, not the only copy of critical data.
- Automated accessibility results must never be represented as complete legal compliance.
- Remote Storybook and documentation content must be treated as untrusted content.
- No process execution, filesystem write, credential use, or network access should occur without explicit capability boundaries and user-visible intent.

---

# Phase 0 — Product definition and repository foundation

## Product definition

- [X} Create the private ForgeGate repository.
- [X} Establish the ForgeGate product name.
- [X} Define the product as a local-first component assurance and governance platform.
- [X} Define Storybook as an execution and preview surface rather than the center of truth.
- [X} Define Astro Starlight as the preferred open documentation target.
- [X} Define Zeroheight as an optional enterprise adapter.
- [X} Define repository truth, execution truth, and review truth.
- [X} Define the initial vertical slice around one Web Components button component (Angular follows as the second framework target).
- [X} Establish support for all major modern web frameworks through adapters.
- [X} Establish Section 508 and WCAG-oriented compliance evidence as a core capability.
- [X} Create a verbose root README.
- [X} Create this phased TODO.

## Repository governance

- [ ] Select and document the repository license or proprietary licensing policy.
- [ ] Add a code of conduct if external collaborators will be invited.
- [ ] Add contribution guidelines.
- [ ] Add a security policy and vulnerability-reporting process.
- [ ] Add a decision-record template.
- [ ] Add an issue template for product decisions.
- [ ] Add an issue template for framework adapters.
- [ ] Add an issue template for component blueprints.
- [ ] Add a pull-request template with test and evidence requirements.
- [ ] Add branch-protection rules after the first CI workflow exists.
- [ ] Decide whether the default branch should remain `master` or be renamed to `main`.
- [ ] Decide whether roadmap work should be tracked only in this file, in GitHub Issues, or in both.

## Product validation

- [ ] Interview at least five design-system engineers.
- [ ] Interview at least three accessibility or Section 508 specialists.
- [ ] Interview at least three frontend platform or developer-experience leads.
- [ ] Interview at least two technical writers or design-system documentation owners.
- [ ] Validate the cost of current manual evidence collection.
- [ ] Validate whether stale approvals are a repeated and expensive problem.
- [ ] Validate whether teams will permit a desktop application to run repository commands.
- [ ] Validate the strongest initial buyer: design-system team, accessibility team, platform team, federal contractor, or consulting partner.
- [ ] Define measurable success criteria for the proof of concept.

### Phase 0 exit criteria

- [X} Product charter reviewed and accepted.
- [X} Initial buyer and primary user persona selected. See [`decisions/0001-primary-mvp-user.md`](../documentation/decisions/0001-primary-mvp-user.md) and [`decisions/0002-initial-buyer.md`](../documentation/decisions/0002-initial-buyer.md).
- [X} Initial vertical slice remains narrow enough for one developer. See [`decisions/0004-mvp-generation-scope.md`](../documentation/decisions/0004-mvp-generation-scope.md).
- [X} No unresolved architectural decision blocks Phase 1. See [`decisions/0005-workspace-architecture.md`](../documentation/decisions/0005-workspace-architecture.md). Note: [`decisions/0003-pilot-repository.md`](../documentation/decisions/0003-pilot-repository.md) still has an open tension (Web Components vs. Angular as the first pilot demo) that must be resolved before adapter work begins, not before Phase 1.

---

# Phase 1 — Monorepo and desktop shell foundation

## Workspace creation

- [X} Create a pnpm workspace.
- [X} Create an Nx monorepo or document the alternative workspace manager decision. See [`decisions/0005-workspace-architecture.md`](../documentation/decisions/0005-workspace-architecture.md).
- [X} Create the desktop UI application. `apps/forgegate-desktop`.
- [X} Create the Tauri 2 desktop shell. `apps/forgegate-desktop/src-tauri`.
- [X} Create framework-neutral core libraries. `packages/core/{domain,manifest,evidence,policy}` — currently empty scaffolds; content is Phase 2 work.
- [ ] Create adapter contract libraries. `packages/adapters/sdk` exists as an empty scaffold only; real contracts are Phase 12 work.
- [ ] Create evidence-model libraries. Scaffold only; schema content is Phase 2/6 work.
- [ ] Create manifest-schema libraries. Scaffold only; schema content is Phase 2/4 work.
- [ ] Create policy-engine libraries. Scaffold only; engine logic is Phase 2/8 work.
- [ ] Create shared test utilities.
- [X} Add strict TypeScript configuration. `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch` in `tsconfig.base.json`.
- [X} Add linting, formatting, and dependency-boundary rules. ESLint + Prettier + Nx `scope:core`/`scope:adapter`/`scope:desktop` module boundaries.
- [ ] Add commit and branch conventions.

## Desktop security foundation

- [ ] Define Tauri capabilities for filesystem reads. Currently only `core:default` and `dialog:allow-open`; no explicit fs read/write capability split yet.
- [ ] Define separate capabilities for filesystem writes.
- [ ] Define process-execution capabilities. `read_git_status` shells out to `git` directly rather than through a declared, scoped capability.
- [ ] Define network-access capabilities.
- [ ] Define credential-vault capabilities.
- [ ] Ensure remote preview windows have no privileged bridge.
- [ ] Add an origin allowlist for remote Storybook previews.
- [ ] Add a content-security policy. `security.csp` is currently `null` in `tauri.conf.json`.
- [ ] Add audit logging for privileged operations.
- [ ] Add user confirmation before writing or running commands. Not yet relevant — no write or arbitrary-command execution exists yet; `read_git_status` is read-only.
- [ ] Add cancellation and timeout behavior for long-running commands. Not yet relevant — no long-running commands exist yet.

## Local persistence

- [ ] Add SQLite.
- [ ] Define migrations.
- [ ] Store connected-workspace metadata.
- [ ] Store cached component indexes.
- [ ] Store command history.
- [ ] Store review drafts.
- [ ] Store adapter configuration metadata.
- [ ] Store no plaintext credentials.
- [ ] Add export and reset controls.

## Quality foundation

- [X} Add desktop unit tests. `app.spec.ts` and `workspace.service.spec.ts` (folder-cancel, success, and error paths, with `@tauri-apps/api/core` mocked).
- [X} Add Rust command tests. `src-tauri/src/lib.rs` `#[cfg(test)]` module — path validation and a live `read_git_status` check against this repository.
- [ ] Add desktop end-to-end smoke tests.
- [X} Add CI for lint, test, type-check, and build. `.github/workflows/ci.yml` also runs `cargo-test`.
- [ ] Produce unsigned development installers.

### Phase 1 exit criteria

- [X} ForgeGate launches on Windows. `pnpm desktop:dev` opens the window; "Open workspace…" selects a real folder via the native picker and displays live branch/commit/dirty state. Confirmed 2026-07-22.
- [X} A user can select a local folder. Native OS picker only, via `select_workspace`.
- [X} The application can read approved files without unrestricted filesystem access. `read_git_status` validates the path is absolute and resolves to a real directory before any process runs against it.
- [ ] Privileged operations are visible, cancellable, and auditable. Not yet — no audit log, no cancellation exists yet since there are no long-running operations.
- [X} CI passes from a clean checkout. Verified on GitHub Actions (run 29969275732, 2026-07-23): lint, test, build, typecheck, and cargo-test all green on a fresh Ubuntu runner.

---

# Phase 2 — Framework-neutral domain model

## Core entities

- [X} Define `Workspace`. `packages/core/domain/src/lib/entities.ts`.
- [X} Define `Repository`. `packages/core/domain/src/lib/entities.ts` — minimal (id, defaultBranch, remoteUrl); no dedicated factory yet.
- [X} Define `Project`. `packages/core/domain/src/lib/entities.ts`.
- [X} Define `Package`. `packages/core/domain/src/lib/entities.ts`.
- [X} Define `ComponentLibrary`. `packages/core/domain/src/lib/entities.ts`.
- [X} Define `Component`. `packages/core/domain/src/lib/entities.ts`, with `createComponent`.
- [X} Define `ComponentVersion`. `packages/core/domain/src/lib/entities.ts`, with `createComponentVersion` (validates semver and a full 40-char commit SHA).
- [X} Define `ComponentContract`. `packages/core/manifest/src/lib/contract.ts`.
- [X} Define `ComponentState`. `packages/core/manifest/src/lib/states.ts`.
- [X} Define `StoryReference`. `packages/core/manifest/src/lib/states.ts`.
- [X} Define `TokenReference`. `packages/core/manifest/src/lib/token-reference.ts`, DTCG-path-based per `23-design-tokens-and-figma-bridge.md`.
- [X} Define `TestRequirement`. `packages/core/manifest/src/lib/test-requirement.ts`.
- [X} Define `TestExecution`. `packages/core/evidence/src/lib/evidence.ts`.
- [X} Define `Finding`. `packages/core/evidence/src/lib/evidence.ts`, with `createFinding` (always starts `open`).
- [X} Define `ManualReview`. `packages/core/evidence/src/lib/evidence.ts`.
- [X} Define `Approval`. `packages/core/evidence/src/lib/evidence.ts`, with `createApproval` (always starts not stale).
- [X} Define `Exception`. `packages/core/evidence/src/lib/evidence.ts`.
- [X} Define `DocumentationTarget`. `packages/core/domain/src/lib/entities.ts`.
- [X} Define `ConsumerApplication`. `packages/core/domain/src/lib/entities.ts`.
- [X} Define `ReleaseDecision`. `packages/core/policy/src/lib/release-decision.ts`, with `createReleaseDecision` (cannot be `authorized-candidate` while blocking findings remain, per the stale-approval risk in `20-risks-and-decisions.md`).
- [X} Define `EvidencePackage`. `packages/core/evidence/src/lib/evidence.ts`, with `createEvidencePackage` (`includesCredentials` is hardcoded `false`, not a settable input).

Not yet split out as their own entities (currently folded into `TestExecution`/`ManualReview`): `AssuranceResult` (the normalized, policy-facing result distinct from a raw `TestExecution`) and `ManualProcedure` (the versioned procedure definition a `ManualReview` executes). Revisit when the policy engine (Phase 8) and manual-review UI (Phase 7) need them split.

## Lifecycle and status

- [X} Define proposal status.
- [X} Define candidate status.
- [X} Define approved status.
- [X} Define deprecated status.
- [X} Define retired status.
- [X} Define blocked and warning states independently from lifecycle. `ReadinessFlag` in `packages/core/domain/src/lib/lifecycle.ts`.
- [X} Define status transition rules. `isLifecycleTransitionAllowed`/`assertLifecycleTransitionAllowed`, tested.
- [X} Record who changed status and why. `LifecycleTransition` interface (`changedBy`, `reason`, `at`) — not yet wired to a persisted transition log.
- [ ] Tie release decisions to commit, build, and version. Needs the `ReleaseDecision` entity first.

## Internal result format

- [X} Define normalized statuses: passed, failed, warning, blocked, skipped, incomplete, not-applicable, and unknown. `ResultStatus` in `packages/core/domain/src/lib/result.ts`, plus `isBlockingResult`.
- [X} Define severity levels. `Severity` — critical/serious/moderate/minor/informational, matching the compliance-profile example in `07-compliance-testing.md`.
- [ ] Define evidence attachment types.
- [X} Define timestamps and source provenance. `Provenance` in `packages/core/domain/src/lib/provenance.ts`.
- [X} Define tool and adapter version metadata. Covered by `Provenance.sourceAdapter`/`adapterVersion`.
- [X} Define deterministic identifiers. `buildComponentId`, `buildProcedureId`, `generateRecordId` in `packages/core/domain/src/lib/identifiers.ts`.
- [X} Define JSON schemas for all portable records. Ajv schemas colocated with each entity (`schemas.ts` in each of `core-domain`/`core-manifest`/`core-evidence`/`core-policy`), validated against fixtures built through the `create*` factories — including a schema-level `if`/`then` rule mirroring `createReleaseDecision`'s "no authorized-candidate without an approver" invariant. Not yet covered: `Policy`, `Blueprint`, and `Compliance profile` schemas, since those entities don't exist in TypeScript yet.

Also done, not itemized above: the unknown/unsupported-value model (`ExtractedValue<T>`, `packages/core/domain/src/lib/extracted-value.ts`) from the "Unknown and unsupported values" section of `16-data-and-schema-model.md`.

## Reactive evidence bus

- [ ] Define the source stream contracts: file change, Git status, command output, workspace scan progress. Not started — these depend on real Tauri event sources, which don't exist until Phase 3 workspace discovery.
- [X} Define the domain stream contracts: affected components, evidence freshness, readiness, documentation drift. `readiness$`/`computeReadiness` and `documentationDrift$`/`computeDocumentationDrift` in `packages/core/reactive/src/lib/`. "Affected components" and a real freshness engine (as opposed to readiness from a fixed findings list) are not started — they need file-change/commit source streams from Phase 3.
- [X} Define subject usage rules: `BehaviorSubject` for current state, `ReplaySubject` for buffered command output, `Subject` for discrete events. `EvidenceBus` uses `BehaviorSubject` for current findings/component version/documentation target, per `documentation/22-reactive-data-flow.md`. `ReplaySubject` command-output buffering has no real command-streaming source yet (Phase 3+).
- [ ] Implement the Tauri-event-to-observable bridge. Deferred to Phase 3 — no real Tauri event source exists to bridge yet.
- [X} Implement `catchError` isolation so one failing adapter stream cannot break the shared evidence bus. `isolate()` in `packages/core/reactive/src/lib/isolation.ts`.
- [X} Implement `shareReplay` multicasting for shared domain streams consumed by multiple UI panels. `EvidenceBus.readiness$`/`documentationDrift$` both use `shareReplay({ bufferSize: 1, refCount: true })`; tested with two independent subscribers seeing consistent state.
- [X} Write marble tests for freshness and readiness recalculation. `readiness.spec.ts` and `documentation-drift.spec.ts`, using `TestScheduler`.

See [`22-reactive-data-flow.md`](../documentation/22-reactive-data-flow.md).

### Phase 2 exit criteria

- [X} Domain contracts compile independently of Angular, React, Vue, or other framework packages. `core-domain`/`core-manifest`/`core-evidence`/`core-policy`/`core-reactive` import no framework packages; enforced by the `scope:core` ESLint module-boundary rule.
- [X} Schemas validate example component and evidence records. 76 tests across the four `schemas.spec.ts` files, each validating both a real fixture (built through a `create*` factory) and a deliberately invalid record.
- [ ] The domain model can represent one Angular button and one framework-neutral Web Component without special cases. Not concretely demonstrated — no framework identity field exists on `Component`/`ComponentVersion` yet (framework/adapter identity is explicitly Phase 4 manifest-specification work), and no actual Angular or Web Component fixture has been run through the model.
- [X} Readiness and documentation-drift streams recompute correctly in marble tests when upstream sources change. `readiness.spec.ts`, `documentation-drift.spec.ts`, `isolation.spec.ts` (all `TestScheduler`-based).

---

# Phase 3 — Repository and workspace discovery

## Repository scanning

- [X} Detect Git repositories. `is_git_repository` in `lib.rs` checks for `.git` before running any `git` command; a non-repo folder now gets a clean "is not a Git repository" error instead of a raw `git` stderr dump.
- [X} Read current branch and commit SHA. `read_git_status` in `apps/forgegate-desktop/src-tauri/src/lib.rs`.
- [X} Detect dirty working trees. `read_git_status`'s `dirty` field.
- [X} Detect package manager from lockfiles and metadata. `detect_package_manager` in `workspace_scan.rs` — pnpm/yarn/bun/npm, by lockfile presence, top-level only.
- [X} Detect npm, pnpm, Yarn, and Bun projects. Same as above.
- [X} Detect Nx. `nx.json` presence, via `detect_workspace_manager`.
- [X} Detect Turborepo. `turbo.json` presence, via `detect_workspace_manager`.
- [X} Detect Rush. `rush.json` presence, via `detect_workspace_manager`.
- [X} Detect Lage. `lage.config.{js,json}` presence, via `detect_workspace_manager`.
- [X} Detect conventional workspace layouts. `package.json` `workspaces` field and `pnpm-workspace.yaml`, both via `detect_workspace_manager`. Priority order when more than one marker is present: Nx > Turborepo > Rush > Lage > pnpm-workspaces > package.json workspaces.
- [ ] Detect framework packages and versions. Deferred to the framework adapters themselves (Phase 5/12) rather than generic workspace scanning.
- [X} Detect Storybook configurations. `.storybook` directory at the workspace root or one level into `apps/*`/`packages/*` — real Nx monorepos put Storybook inside a project directory, not at the root; confirmed by testing against Public Sector Federation (`apps/qa-remote/.storybook`), which a root-only scan missed entirely before this fix. Still not story count or config validity.
- [X} Detect Astro Starlight configurations. `detect_starlight_projects` — same root-or-one-level-into-`apps`/`packages` search as Storybook, content-checked for "starlight". Also confirmed against Public Sector Federation (`apps/starlight`).
- [X} Detect Zeroheight configuration files or project mappings. `detect_zeroheight` — a `zeroheight.config.*` file, or a `zeroheight`-named key in `package.json` dependencies/devDependencies.
- [X} Detect token files and formats. `detect_token_files` is now content-aware, not filename-aware: a `.json` file counts if it's named `*.tokens.json`/`*.tokens` OR its contents contain a DTCG `"$value"`/`"$type"` marker. Searches each candidate project directory's top level plus one more level into `src/`, `tokens/`, `design-tokens/`. Re-tested against Public Sector Federation after the fix: now correctly finds `packages/tokens/src/design-tokens.json` (previously found nothing there at all). Still does not reach `packages/tokens/src/tokens/*.json` (primitives.json, themes.json, figma-dtcg.sample.json) — that's two extra levels deep, past this search's reach; left as a known remaining limit rather than chased further.
- [X} Detect unit and browser test runners. `detect_test_runners` — vitest/jest/playwright config file presence.
- [X} Detect visual-regression providers. `detect_visual_regression_providers` — Chromatic, Percy, BackstopJS, Loki, Applitools, by `package.json` dependency keys.
- [X} Detect CI provider files. `detect_ci_providers` — GitHub Actions (`.github/workflows` with at least one file), GitLab CI, Azure Pipelines.

All detection above stays shallow on purpose (workspace root, plus one level into `apps/*`/`packages/*` for Storybook and Starlight, plus one level into a couple of known token directories) to stay fast and avoid walking into `node_modules`. This one-level reach is confirmed sufficient for Storybook/Starlight against a real repository, but confirmed *insufficient* for tokens (see above).

## Workspace screen

- [X} Show repository path and Git state. `app.html` — path, branch, commit, dirty.
- [X} Show detected package manager and workspace manager. `app.html` — package manager and workspace manager (Nx/Turborepo/Rush/Lage/pnpm-workspaces/package.json-workspaces).
- [ ] Show detected frameworks. No framework detection exists yet (see above).
- [ ] Show component-library candidates.
- [X} Show Storybook targets. `app.html` now lists each detected Storybook project path (e.g. `apps/qa-remote/.storybook`), not just a boolean.
- [X} Show documentation targets. Starlight lists each project path found; Zeroheight remains detected/not-detected only (it has no meaningful per-project path).
- [X} Show testing tools. `app.html` — detected test runners, visual-regression providers, and CI providers.
- [ ] Show missing or unsupported configuration.
- [ ] Allow user correction of discovery results.
- [ ] Persist confirmed mappings in repository configuration.

## Repository configuration

- [X} Define `.forgegate/config.yaml`. `RepositoryConfig` type, YAML parse/serialize round-trip, and schema validation in the new `packages/core/config` library. 11 tests, including a round-trip test and both a malformed-YAML and a schema-violation rejection test.
- [X} Define project and package mappings. `ProjectMapping`/`PackageMapping` in `packages/core/config/src/lib/repository-config.ts`.
- [X} Define command mappings. `CommandMappings` — a plain gate-name-to-command-string record.
- [X} Define documentation mappings. `DocumentationMappings` — Starlight content root, Zeroheight workspace ID, Storybook config dir.
- [X} Define adapter configuration. `AdapterConfiguration` — deliberately opaque per-adapter blobs; each adapter owns and validates its own shape, consistent with the plugin SDK boundary in `17-plugin-and-adapter-sdk.md`.
- [X} Define ignore patterns. `ignorePatterns: readonly string[]`.
- [X} Define safe write locations. `safeWriteLocations` plus `isWithinSafeWriteLocation()`, a simple glob-prefix check (not a full glob engine yet).
- [X} Validate configuration against schema. `repositoryConfigSchema` (Ajv), tested against both a real config and deliberately invalid records.

**Reading is now wired end to end**: `read_repository_config_file` (Rust, `lib.rs`) reads the raw text of `.forgegate/config.yaml` if present — `None` if absent is a normal state, not an error — and `WorkspaceService` (Angular) parses/validates it through `@forgegate/core-config`'s `parseRepositoryConfig`. A malformed config file reports its own error without blanking out the Git status or workspace scan the user already sees. `app.html` shows configured/not-configured/invalid states. 2 new Rust tests, 3 new Angular tests (absent, valid, malformed).

**Still not done**: no *write* path exists yet — nothing lets a user create or edit `.forgegate/config.yaml` from the app. That needs the diff-and-approve UI from `documentation/02-system-architecture.md`'s "Repository write flow" (`prepare_file_changes`/`apply_approved_changes` Tauri commands), which is a real, separate feature, not a small follow-up.

### Phase 3 exit criteria

- [X} ForgeGate opens Public Sector Federation or a replacement fixture workspace. Validated 2026-07-23 by running `scan_workspace` directly against `D:/repos/public-sector-federation` (not committed as a test — that path only exists on this machine). Not yet clicked through the live GUI folder picker against it; do that with `pnpm desktop:dev` to fully confirm.
- [ ] The app identifies its Web Components project, Storybook, tests, tokens, and documentation targets. Mostly true against Public Sector Federation now: Storybook, Playwright, Astro Starlight, Chromatic, and (after the content-aware fix) design tokens are all correctly found. The remaining gap is framework identification — there is still no adapter to confirm "Web Components project" specifically, so this criterion stays open until Phase 5/12 adapter work exists.
- [X} Discovery errors are actionable rather than silent. `scan_workspace` now returns `Result<WorkspaceScan, String>`; a failure to read the workspace root itself produces a real error message rather than a silently empty scan. Nested, best-effort reads (an absent `apps/*` project, a missing `tokens/` folder) still come back empty without erroring the whole scan, deliberately — a missing optional thing is a normal result, not a discovery failure.

---

# Phase 4 — Component manifest and inventory

## Manifest specification

- [X} Define `.forgegate/components/<component-id>.yaml`. `ComponentManifest` type, `componentManifestPath()`, in `packages/core/manifest/src/lib/component-manifest.ts`. Not yet wired to a Tauri read/write command — same "types and schema exist, filesystem wiring doesn't yet" state as the Phase 3 repository config work.
- [X} Support JSON and YAML serialization. YAML via `parseComponentManifest`/`serializeComponentManifest` (round-trip tested); JSON works for free since a `ComponentManifest` is a plain object (`JSON.stringify`/`JSON.parse`) — no dedicated JSON codec needed.
- [X} Define component identity and package location. `id` (`organization.library.component`, pattern-validated) and `packagePath`.
- [X} Define framework and adapter identity. `framework`/`adapter` string fields.
- [X} Define source files. `sourceFiles: readonly string[]`.
- [X} Define public inputs, outputs, events, slots, parts, attributes, and CSS properties — with a known simplification: `ManifestContract` reuses the Phase 2 `ContractMember` shape (`inputs`/`outputs`/`content`/`publicMethods`/`styleParts`). Events fold into `outputs`; attributes and CSS custom properties fold into `styleParts` rather than getting their own fields. Documented as a simplification, not hidden.
- [X} Define states and variants. `ManifestState[]` (`states`).
- [X} Define themes, densities, viewports, and environments. Plain string arrays (`themes`, `densities`, `viewports`, `environments`).
- [X} Define token mappings. `ManifestTokenMapping[]` (`tokenMappings`).
- [X} Define story mappings. `ManifestStoryMapping[]` (`storyMappings`).
- [X} Define test requirements. `ManifestTestRequirement[]` (`testRequirements`).
- [X} Define manual review requirements. `manualReviewProcedureIds: readonly string[]` — procedure IDs only; the full `ManualProcedure` entity is still deferred (see Phase 2 notes).
- [X} Define documentation targets. `ManifestDocumentationTarget[]` (`documentationTargets`).
- [X} Define consumer-application mappings. `consumerApplicationIds: readonly string[]`.
- [X} Define ownership and reviewers. `owner?: string`, `reviewers: readonly string[]`.
- [X} Define release policy inheritance. `policyId?: string`.
- [X} Define deprecation and replacement metadata. `deprecatedInFavorOf?: string`, `deprecationNotice?: string`.

26 tests (`component-manifest.spec.ts`, `component-manifest-schema.spec.ts`, `component-manifest-yaml.spec.ts`), covering factory defaults/validation, schema acceptance/rejection, and a full YAML round-trip.

## Component discovery

- [ ] Discover Lit and Web Components. Real progress, still not end to end. What now works, wired through the actual app: `workspace_scan.rs`'s `detect_custom_elements_manifests` finds a package's CEM via its `package.json` `"customElements"` field (the spec-standard convention) or the conventional `custom-elements.json` filename, one level into `apps/*`/`packages/*`; a new generic `read_text_file` Tauri command (path-traversal-checked — the resolved file must canonicalize to somewhere still inside the workspace) reads it; `WorkspaceService` parses it (`parseCustomElementsManifest`, schema-checked) and the UI lists the discovered custom-element tag names. What's still missing: *producing* a CEM for the (much more common) case where a repository doesn't already publish one — that needs `@custom-elements-manifest/analyzer` run through the user-approved command-execution UI from `02-system-architecture.md`'s "Command execution flow", which doesn't exist yet. Real-world check: Public Sector Federation (the fixture used throughout Phase 3) doesn't publish a CEM at all — it's Angular/PrimeNG-based — so this round's validation used synthetic fixtures replicating the real `package.json` `"customElements"` pattern rather than a live hit; a genuine Web Components fixture is still needed to validate this for real.
- [ ] Discover Angular components.
- [ ] Discover React components.
- [ ] Discover Vue components.
- [ ] Discover Svelte components.
- [ ] Discover Solid components.
- [ ] Discover Qwik components.
- [ ] Discover Astro components.
- [ ] Discover framework-neutral packages.
- [ ] Detect exported versus internal components.
- [ ] Detect stories and tests by convention.
- [ ] Allow adapter-specific metadata extraction.

### What the CEM mapper actually does

`mapCustomElementsManifestToComponentManifests(manifest, options)` in `packages/adapters/web-components/src/lib/map-custom-elements-manifest.ts`:

- Finds every `customElement: true` declaration with a `tagName` across all modules (`customElementDeclarations`).
- Maps CEM fields → `contract.inputs` (public/no-privacy only; private/protected excluded), CEM methods → `contract.publicMethods` (same privacy filter), CEM events → `contract.outputs`, CEM slots → `contract.content` (empty-string default slot renamed to `"default"`), and CEM `cssParts` + `cssProperties` both → `contract.styleParts` (one bucket, not two — same simplification as the manifest schema itself).
- Builds the component id as `organization.library.tagName` via `buildComponentId`.
- Does **not** populate `states`, `themes`, `densities`, `viewports`, `tokenMappings`, `testRequirements`, or anything else outside the contract — a CEM only describes a component's API shape, not its required coverage. Populating the rest is manual authoring today; blueprint-driven completion checking (`14-component-blueprints.md`) is future work.
- This is a practical CEM subset (`custom-elements-manifest.ts`), not the full spec — no mixins, no superclass chains, no deprecation flags yet.
- `parseCustomElementsManifest` (new) parses and loosely schema-validates the raw JSON before mapping — loose on purpose, so unmodeled real-world CEM fields don't make a valid manifest fail to load.

`adapter-web-components` now has 9 tests (up from 5 in the initial mapper-only commit — the new `parseCustomElementsManifest` file added 4). Plus: 3 new Rust tests for `detect_custom_elements_manifests` (declared-path detection, filename fallback, declared-but-missing path is not reported) and 3 new Rust tests for `read_text_file` (reads a nested file, rejects a path escaping the workspace, rejects a missing file). 3 new `WorkspaceService` tests covering "no CEM found" (no extra read attempted), "CEM found and parsed", and "CEM read/parse failure doesn't blank the rest of the UI".

## Inventory user experience

- [ ] Show all components.
- [ ] Filter by package, framework, lifecycle, owner, readiness, and finding severity.
- [ ] Show missing manifests.
- [ ] Show missing stories.
- [ ] Show missing tests.
- [ ] Show stale evidence.
- [ ] Show documentation drift.
- [ ] Show consuming applications.
- [ ] Provide a component detail route.

### Phase 4 exit criteria

- [ ] One button component appears with source, story, token, test, and documentation mappings.
- [ ] Unregistered components are visible.
- [ ] Manifest changes can be previewed before writing.

---

# Phase 5 — Storybook adapter

## Storybook discovery and connectivity

- [ ] Detect local Storybook configuration.
- [ ] Detect static Storybook builds.
- [ ] Connect to hosted Storybook URLs.
- [ ] Read `index.json` where supported.
- [ ] Support version differences through adapter capability detection.
- [ ] Associate story IDs to component manifests.
- [ ] Detect unavailable, malformed, or protected Storybooks.
- [ ] Support authenticated Storybook configuration without exposing secrets.

## Story metadata

- [ ] Read titles, story IDs, tags, and component groupings.
- [ ] Read available args and arg types where exposed.
- [ ] Read parameters and documentation metadata where exposed.
- [ ] Detect accessibility and interaction tags.
- [ ] Detect test-runner configuration.
- [ ] Detect Chromatic or visual-provider metadata.
- [ ] Store Storybook version and source URL with evidence.

## Preview surface

- [ ] Open local stories.
- [ ] Open remote stories in an isolated webview.
- [ ] Prevent preview content from accessing privileged desktop APIs.
- [ ] Provide theme, viewport, locale, direction, reduced-motion, and forced-color controls where supported.
- [ ] Link preview state to required state matrices.

## Storybook test execution

- [ ] Configure project-defined Storybook test commands.
- [ ] Run interaction tests.
- [ ] Run accessibility tests.
- [ ] Capture machine-readable results.
- [ ] Normalize results into ForgeGate evidence.
- [ ] Preserve raw output as an attachment.
- [ ] Associate results with commit SHA and component stories.

### Phase 5 exit criteria

- [ ] The UP Button or fixture button shows its Storybook stories in ForgeGate.
- [ ] ForgeGate can run the configured Storybook checks and display normalized results.
- [ ] Remote preview content has no filesystem or process privileges.

---

# Phase 6 — Test orchestration and evidence normalization

## Command execution engine

- [ ] Define allowed commands in repository configuration.
- [ ] Display exact command and working directory before execution.
- [ ] Stream output.
- [ ] Support cancellation.
- [ ] Enforce timeout.
- [ ] Capture exit code, duration, environment, and tool versions.
- [ ] Redact secrets from logs.
- [ ] Preserve raw artifacts.
- [ ] Detect missing dependencies and offer actionable guidance.

## Test adapters

- [ ] Vitest adapter.
- [ ] Jest adapter.
- [ ] Karma adapter.
- [ ] Web Test Runner adapter.
- [ ] Playwright adapter.
- [ ] Cypress adapter.
- [ ] WebdriverIO adapter.
- [ ] Storybook test adapter.
- [ ] Axe result adapter.
- [ ] Chromatic adapter.
- [ ] Percy adapter.
- [ ] Applitools adapter.
- [ ] Generic JUnit XML adapter.
- [ ] Generic JSON result adapter.
- [ ] Generic command-only adapter.

## Additional quality gates

- [ ] Lint gate.
- [ ] Type-check gate.
- [ ] Build gate.
- [ ] Package-export gate.
- [ ] API contract gate.
- [ ] Bundle-size gate.
- [ ] Dependency audit gate.
- [ ] License policy gate.
- [ ] SBOM gate.
- [ ] Documentation completeness gate.
- [ ] Token mapping gate.

## Evidence freshness

- [ ] Store commit SHA for every execution.
- [ ] Store dirty-worktree fingerprint when execution occurs on uncommitted code.
- [ ] Mark evidence stale when relevant files change.
- [ ] Begin with conservative component-level invalidation.
- [ ] Add dependency-aware invalidation later.
- [ ] Explain why evidence became stale.

### Phase 6 exit criteria

- [ ] Unit, Storybook, Playwright, axe, build, and lint results normalize into one component record.
- [ ] Raw tool output remains available.
- [ ] Stale evidence is visibly separated from current evidence.

---

# Phase 7 — Compliance profiles and Section 508 evidence

## Compliance model

- [ ] Define compliance profiles as repository-controlled policy files.
- [ ] Create a Section 508 web-component profile.
- [ ] Create a WCAG 2.2 AA internal profile.
- [ ] Support organization-defined profiles.
- [ ] Separate automated, manual, hybrid, and application-context requirements.
- [ ] Record standard, version, method, scope, and applicability.
- [ ] Avoid legal certification language.

## Automated checks

- [ ] Run axe across required stories and states.
- [ ] Capture violations, incomplete findings, passes, and inapplicable rules.
- [ ] Preserve rule IDs and tool versions.
- [ ] Map findings to stories, states, and environments.
- [ ] Add keyboard automation where reliable.
- [ ] Add focus-placement assertions.
- [ ] Add focus-restoration assertions.
- [ ] Add accessible-name assertions.
- [ ] Add error-message and live-region assertions.
- [ ] Add forced-colors and contrast-oriented visual checks where supported.

## Manual review procedures

- [ ] Keyboard-only review framework.
- [ ] Focus order and visibility review.
- [ ] JAWS procedure support.
- [ ] NVDA procedure support.
- [ ] VoiceOver procedure support.
- [ ] TalkBack procedure support.
- [ ] 200% zoom review.
- [ ] 400% zoom and reflow review.
- [ ] Text-spacing review.
- [ ] Forced-colors/high-contrast review.
- [ ] Reduced-motion review.
- [ ] Responsive and orientation review.
- [ ] Localization and bidirectional-text review.
- [ ] Cognitive and error-prevention review prompts.
- [ ] Component-specific expected-result templates.

## Review evidence

- [ ] Capture tester identity.
- [ ] Capture date and timezone.
- [ ] Capture operating system.
- [ ] Capture browser and version.
- [ ] Capture assistive technology and version.
- [ ] Capture procedure version.
- [ ] Capture pass, fail, blocked, not applicable, and observation states.
- [ ] Capture screenshots, recordings, notes, and links.
- [ ] Capture reviewer approval.
- [ ] Capture expiration or re-review policy.

## Application-context compliance

- [ ] Distinguish isolated component conformance from composition conformance.
- [ ] Link component versions to consuming applications.
- [ ] Define application integration scenarios.
- [ ] Record theme and container context.
- [ ] Detect conflicting focus traps, duplicate names, landmark problems, and theme regressions through application tests.
- [ ] Show consumer-specific pass and fail status.

### Phase 7 exit criteria

- [ ] A button can complete automated and guided manual review.
- [ ] Evidence identifies test method, environment, result, and reviewer.
- [ ] ForgeGate never equates axe success with full compliance.
- [ ] The current commit can be distinguished from previously approved code.

---

# Phase 8 — Policy engine and release readiness

## Policy hierarchy

- [ ] Organization policy.
- [ ] Workspace policy.
- [ ] Library policy.
- [ ] Package policy.
- [ ] Component-type blueprint policy.
- [ ] Component override policy.
- [ ] Consumer-application policy.
- [ ] Document inheritance and override behavior.

## Gate rules

- [ ] Required test categories.
- [ ] Required state coverage.
- [ ] Required environment coverage.
- [ ] Severity thresholds.
- [ ] Required manual reviews.
- [ ] Required documentation sections.
- [ ] Required token mappings.
- [ ] Required visual approval.
- [ ] Required consumer validations.
- [ ] Required evidence freshness.
- [ ] Required approver roles.

## Findings and exceptions

- [ ] Finding lifecycle.
- [ ] Owner and due date.
- [ ] Accepted risk.
- [ ] Temporary exception.
- [ ] Permanent documented exception.
- [ ] Not-applicable rationale.
- [ ] Expiration and renewal.
- [ ] Link finding to source evidence.
- [ ] Prevent silent suppression.

## Readiness calculation

- [ ] Calculate category statuses.
- [ ] Calculate blocking reasons.
- [ ] Present readiness without hiding failed gates behind a percentage.
- [ ] Explain every score and status.
- [ ] Support warning-only policies.
- [ ] Tie release approval to exact evidence set.
- [ ] Invalidate approval when policy or relevant source changes.

### Phase 8 exit criteria

- [ ] ForgeGate can explain why a component is ready or blocked.
- [ ] All blocking decisions are traceable to policy and evidence.
- [ ] Accepted exceptions are visible and expire as configured.

---

# Phase 9 — Starlight and documentation generation

## Documentation model

- [ ] Define required component documentation sections.
- [ ] Define overview and purpose.
- [ ] Define anatomy.
- [ ] Define usage and non-usage guidance.
- [ ] Define API and events.
- [ ] Define states and variants.
- [ ] Define token mappings.
- [ ] Define accessibility behavior.
- [ ] Define keyboard interactions.
- [ ] Define compliance evidence summary.
- [ ] Define examples and Storybook references.
- [ ] Define release status and changelog.
- [ ] Define migration and deprecation guidance.

## Astro Starlight adapter

- [ ] Detect Starlight projects.
- [ ] Configure documentation root.
- [ ] Generate Markdown.
- [ ] Generate MDX.
- [ ] Generate frontmatter.
- [ ] Generate sidebar metadata where needed.
- [ ] Generate component status blocks.
- [ ] Generate manifest and evidence tables.
- [ ] Generate Storybook embeds or links.
- [ ] Generate token references.
- [ ] Show Git diff before writing.
- [ ] Preserve user-authored protected regions.
- [ ] Validate Starlight build after generation.
- [ ] Create a reusable Starlight plugin package.

## Audience-tier templates

- [ ] Define the designer-heavy, balanced, and developer-heavy section compositions.
- [ ] Add `audience` to generated frontmatter and manifest-linked policy.
- [ ] Implement tier-aware rendering for each Starlight plugin component.
- [ ] Support per-organization, per-library, and per-page tier overrides.
- [ ] Support optional dual-page publication with cross-linked companion pages.
- [ ] Verify the same underlying evidence produces identical facts across tiers in tests.

## Storybook documentation output

- [ ] Generate or update MDX.
- [ ] Generate autodocs metadata.
- [ ] Generate story coverage recommendations.
- [ ] Avoid duplicating canonical guidance unnecessarily.
- [ ] Link Storybook docs back to the canonical component record.

## Documentation drift

- [ ] Compare manifest version with published documentation metadata.
- [ ] Detect missing pages.
- [ ] Detect stale pages.
- [ ] Detect removed stories still referenced in docs.
- [ ] Detect undocumented public API changes.
- [ ] Detect token mapping drift.

### Phase 9 exit criteria

- [ ] ForgeGate generates a complete Starlight page for the button.
- [ ] The page includes live example references, API, tokens, accessibility guidance, test status, and release state.
- [ ] The generated documentation builds successfully.

---

# Phase 10 — Zeroheight adapter

## Capability discovery

- [ ] Document Zeroheight plan and API prerequisites.
- [ ] Define authentication storage.
- [ ] Read styleguide and page metadata where supported.
- [ ] Read page statuses where supported.
- [ ] Map Zeroheight pages to component manifests.
- [ ] Detect unavailable write operations.
- [ ] Never assume arbitrary content writes are supported.

## Synchronization workflows

- [ ] Show linked Zeroheight page.
- [ ] Show status mismatch.
- [ ] Synchronize supported status fields.
- [ ] Generate Storybook embed details.
- [ ] Generate copy-ready component documentation packages.
- [ ] Generate review checklists for manual publication.
- [ ] Detect stale Zeroheight pages.
- [ ] Record publication evidence.

## Enterprise behavior

- [ ] Support multiple styleguides.
- [ ] Support multiple environments.
- [ ] Support organization-controlled credentials.
- [ ] Support read-only mode.
- [ ] Support offline operation when Zeroheight is unavailable.

### Phase 10 exit criteria

- [ ] Zeroheight is useful but optional.
- [ ] A team without Zeroheight retains the complete ForgeGate workflow.
- [ ] Unsupported API behavior is clearly identified rather than simulated.

---

# Phase 11 — Component blueprint library

## Blueprint engine

- [ ] Define blueprint schema.
- [ ] Separate framework-neutral requirements from implementation templates.
- [ ] Support organization overrides.
- [ ] Version blueprints.
- [ ] Record blueprint version in generated manifests and evidence.
- [ ] Add migration behavior when a blueprint changes.

## Foundation blueprints

- [ ] Button.
- [ ] Link.
- [ ] Text input.
- [ ] Textarea.
- [ ] Checkbox.
- [ ] Radio group.
- [ ] Toggle.
- [ ] Select.
- [ ] Alert/status message.
- [ ] Dialog.
- [ ] Tabs.
- [ ] Pagination.

## Advanced blueprints

- [ ] Combobox/autocomplete.
- [ ] Tooltip.
- [ ] Popover.
- [ ] Menu/menu button.
- [ ] Toast.
- [ ] Accordion/disclosure.
- [ ] Breadcrumb.
- [ ] Stepper.
- [ ] Table.
- [ ] Data grid.
- [ ] Tree/tree grid.
- [ ] Listbox.
- [ ] Date picker.
- [ ] Time picker.
- [ ] File upload.
- [ ] Search.
- [ ] Navigation and application shell.

## Blueprint content requirements

- [ ] Semantic purpose.
- [ ] Public contract.
- [ ] Required states.
- [ ] Required stories.
- [ ] Keyboard behavior.
- [ ] Accessibility expectations.
- [ ] Token categories.
- [ ] Automated tests.
- [ ] Manual procedures.
- [ ] Documentation sections.
- [ ] Known anti-patterns.
- [ ] Consumer integration tests.

### Phase 11 exit criteria

- [ ] At least three blueprints are production-quality.
- [ ] Button, input, and dialog demonstrate increasing complexity.
- [ ] Blueprint requirements remain framework-neutral.

---

# Phase 12 — Framework adapters

## Adapter SDK

- [ ] Define discovery interface.
- [ ] Define metadata extraction interface.
- [ ] Define source dependency interface.
- [ ] Define code-generation interface.
- [ ] Define test-generation interface.
- [ ] Define documentation-generation interface.
- [ ] Define package-export interface.
- [ ] Define capability declarations.
- [ ] Define adapter compatibility and versioning.
- [ ] Define adapter test harness.

## Web Components and Lit adapter (first target — MVP framework)

- [ ] Custom Elements Manifest support.
- [ ] Attributes, properties, events, slots, parts, and CSS custom properties.
- [ ] Lit metadata extraction.
- [ ] Vanilla Custom Elements metadata extraction without a manifest.
- [ ] Framework-neutral Storybook mapping.
- [ ] Test mappings.
- [ ] Initial templates.

## Angular adapter (second target — validates a compiler-driven framework)

- [ ] Angular CLI workspace discovery.
- [ ] Nx Angular project discovery.
- [ ] NgModule and standalone component support.
- [ ] Inputs, outputs, host bindings, content projection, and signals metadata.
- [ ] Angular Storybook mapping.
- [ ] Jasmine, Jest, Vitest, and Playwright mappings.
- [ ] Angular package export validation.
- [ ] Initial code and test templates.

## React adapter

- [ ] React project discovery.
- [ ] Function and class component metadata where practical.
- [ ] Props and event extraction.
- [ ] React Storybook mapping.
- [ ] Testing Library and browser-test mappings.
- [ ] Package export validation.
- [ ] Initial templates.

## Vue adapter

- [ ] Vue project discovery.
- [ ] Single-file component metadata.
- [ ] Props, emits, slots, and exposed API extraction.
- [ ] Vue Storybook mapping.
- [ ] Vue Test Utils and browser-test mappings.
- [ ] Initial templates.

## Svelte adapter

- [ ] Svelte and SvelteKit discovery.
- [ ] Props, events, slots, snippets, and bindable metadata.
- [ ] Svelte Storybook mapping.
- [ ] Test mappings.
- [ ] Initial templates.

## Additional adapters

- [ ] Solid.
- [ ] Qwik.
- [ ] Astro components.
- [ ] Framework-neutral HTML/CSS/JS.
- [ ] Community adapter documentation.

### Phase 12 exit criteria

- [ ] Web Components adapter supports the complete MVP path.
- [ ] The Angular adapter validates the same contracts against a compiler-driven framework.
- [ ] Adapter failures do not destabilize the core application.

---

# Phase 13 — Safe generation and repository modification

## Generation workflow

- [ ] Generate into temporary workspace.
- [ ] Show file-by-file changes.
- [ ] Show unified diff.
- [ ] Detect existing files.
- [ ] Prevent accidental overwrite.
- [ ] Support protected user-authored regions where appropriate.
- [ ] Support dry run.
- [ ] Support rollback.
- [ ] Run formatter after user approval.
- [ ] Run targeted tests after writing.
- [ ] Report partial failures.

## Generated artifacts

- [ ] Component implementation templates.
- [ ] Story templates.
- [ ] Unit-test templates.
- [ ] Browser-test templates.
- [ ] Accessibility-test templates.
- [ ] Manual-review templates.
- [ ] Manifest templates.
- [ ] Token templates.
- [ ] Starlight templates.
- [ ] Storybook MDX templates.

## Git integration

- [ ] Show changed files.
- [ ] Show current branch.
- [ ] Recommend a branch name.
- [ ] Support optional branch creation.
- [ ] Support optional commit creation only after explicit confirmation.
- [ ] Generate commit message proposal.
- [ ] Never push without explicit confirmation.
- [ ] Link evidence to resulting commit.

### Phase 13 exit criteria

- [ ] ForgeGate can add one missing button story and test without overwriting custom code.
- [ ] The user can inspect and reject every proposed change.
- [ ] Targeted validation runs after accepted changes.

---

# Phase 14 — Evidence export and auditability

## Evidence package

- [ ] Define package directory structure.
- [ ] Export component manifest.
- [ ] Export policy snapshot.
- [ ] Export test summary.
- [ ] Export raw automated results.
- [ ] Export manual reviews.
- [ ] Export findings and exceptions.
- [ ] Export screenshots and recordings.
- [ ] Export documentation metadata.
- [ ] Export release decision.
- [ ] Export tool, browser, OS, and assistive-technology versions.
- [ ] Export commit, branch, build, and component version.
- [ ] Generate HTML report.
- [ ] Generate JSON report.
- [ ] Generate optional PDF report later.
- [ ] Create checksums.
- [ ] Sign evidence packages later where required.

## Provenance

- [ ] Record who initiated each run.
- [ ] Record which adapter produced each record.
- [ ] Record source file fingerprints.
- [ ] Record evidence transformations.
- [ ] Preserve raw source artifact references.
- [ ] Detect tampering or missing files.

### Phase 14 exit criteria

- [ ] A reviewer can understand the component, methods, results, exceptions, and release decision without opening ForgeGate.
- [ ] Evidence can be archived with a release.

---

# Phase 15 — Team and enterprise capabilities

## Team collaboration

- [ ] Shared repository-hosted review records.
- [ ] Conflict-safe review updates.
- [ ] Reviewer assignment.
- [ ] Approval roles.
- [ ] Comments and resolution.
- [ ] Notifications.
- [ ] Review queues.
- [ ] Component ownership rules.

## Enterprise identity and policy

- [ ] SSO architecture.
- [ ] Role-based access control.
- [ ] Organization policy bundles.
- [ ] Signed policy distribution.
- [ ] Private adapter registry.
- [ ] Private blueprint registry.
- [ ] Audit retention policy.
- [ ] Restricted/offline update channels.
- [ ] Self-hosted coordination service if required.

## CI integration

- [ ] Headless ForgeGate CLI.
- [ ] CI policy evaluation.
- [ ] GitHub Actions integration.
- [ ] GitLab CI integration.
- [ ] Azure DevOps integration.
- [ ] Jenkins integration.
- [ ] Pull-request status checks.
- [ ] Evidence artifact upload.
- [ ] Release-gate API.

### Phase 15 exit criteria

- [ ] Desktop and CI evaluate the same policies and schemas.
- [ ] Enterprise features do not break local-first operation.

---

# Phase 16 — Product packaging and commercialization

## Editions

- [ ] Define free local edition.
- [ ] Define professional edition.
- [ ] Define team edition.
- [ ] Define enterprise edition.
- [ ] Define feature boundaries without crippling the core open workflow.
- [ ] Decide which schemas, adapters, and blueprints may be open source.
- [ ] Decide whether the desktop core remains proprietary, source-available, or open source.

## Commercial capabilities

- [ ] Licensing mechanism.
- [ ] Trial behavior.
- [ ] Offline license support.
- [ ] Signed application updates.
- [ ] Windows code signing.
- [ ] macOS notarization.
- [ ] Linux packaging.
- [ ] Crash reporting with consent.
- [ ] Privacy documentation.
- [ ] Support diagnostics export.

## Pilot offer

- [ ] Define a paid Component Assurance Sprint.
- [ ] Define pilot prerequisites.
- [ ] Define installation and onboarding steps.
- [ ] Define pilot deliverables.
- [ ] Define success metrics.
- [ ] Define pricing hypothesis.
- [ ] Identify initial design partners.
- [ ] Prepare demonstration repository.
- [ ] Prepare demonstration video.
- [ ] Prepare one-page sales narrative.

### Phase 16 exit criteria

- [ ] A customer can install, evaluate, and understand the product safely.
- [ ] One paid or committed design partner validates the workflow.

---

# Cross-cutting backlog

## Security

- [ ] Threat model desktop application.
- [ ] Threat model remote previews.
- [ ] Threat model adapter plugins.
- [ ] Threat model command execution.
- [ ] Threat model repository writes.
- [ ] Threat model credential storage.
- [ ] Add dependency scanning.
- [ ] Add SBOM generation.
- [ ] Add release signing.
- [ ] Add secure update validation.

## Accessibility of ForgeGate itself

- [ ] Keyboard-operable desktop UI.
- [ ] Visible focus.
- [ ] Screen-reader labels and announcements.
- [ ] High-contrast support.
- [ ] 200% and 400% zoom support.
- [ ] Reduced-motion support.
- [ ] Error prevention and recovery.
- [ ] Accessible data visualizations.
- [ ] Automated and manual review of ForgeGate releases.
- [ ] Dogfood ForgeGate against ForgeGate components.

## Performance

- [ ] Incremental repository scanning.
- [ ] File-watch debouncing.
- [ ] Cached adapter results.
- [ ] Background indexing that remains cancellable.
- [ ] Large monorepo benchmarks.
- [ ] Large Storybook index benchmarks.
- [ ] Evidence database size controls.
- [ ] Artifact retention controls.

## Observability

- [ ] Structured local logs.
- [ ] Per-adapter diagnostics.
- [ ] Command execution timing.
- [ ] Scan timing.
- [ ] Redaction tests.
- [ ] User-controlled support bundle.

## Internationalization

- [ ] Externalize desktop UI strings.
- [ ] Support locale-aware dates and numbers.
- [ ] Support RTL interface layout.
- [ ] Support localized manual-review procedures.
- [ ] Support localized documentation templates.

## Open standards

- [ ] Evaluate Design Tokens Community Group format.
- [ ] Evaluate Custom Elements Manifest.
- [ ] Define ForgeGate manifest JSON Schema.
- [ ] Define ForgeGate evidence JSON Schema.
- [ ] Define ForgeGate policy JSON Schema.
- [ ] Publish schemas with semantic versions.
- [ ] Document backward compatibility.

---

# Immediate next work queue

These are the first items to work in order.

- [ ] Finalize the product charter in `documentation/00-product-overview.md`.
- [ ] Finalize architecture decisions in `documentation/02-system-architecture.md`.
- [ ] Create the initial manifest schema proposal.
- [ ] Create the initial evidence schema proposal.
- [ ] Create the initial release-policy schema proposal.
- [ ] Scaffold the Tauri and Angular desktop applications.
- [ ] Implement local folder selection.
- [ ] Implement Git repository discovery.
- [ ] Implement package manager and Nx discovery.
- [ ] Detect one local Storybook.
- [ ] Read one Storybook story index.
- [ ] Display one component inventory record.
- [ ] Run one configured test command.
- [ ] Normalize one axe or Storybook accessibility result.
- [ ] Complete one guided keyboard review.
- [ ] Generate one Starlight component page.
- [ ] Export one evidence package.

# MVP definition of done

The first MVP is complete only when all of the following are true:

- [ ] ForgeGate installs and launches on Windows.
- [ ] A user can open a Web Components repository.
- [ ] ForgeGate detects Git, package manager, Web Components tooling, Storybook, tests, tokens, and Starlight.
- [ ] ForgeGate discovers a button component.
- [ ] ForgeGate associates its stories and tests.
- [ ] ForgeGate runs configured unit, Storybook, Playwright, axe, lint, and build gates.
- [ ] ForgeGate normalizes results without discarding raw evidence.
- [ ] ForgeGate guides a manual keyboard and screen-reader review.
- [ ] ForgeGate ties evidence to the current commit.
- [ ] ForgeGate marks prior approval stale after a relevant source change.
- [ ] ForgeGate explains every blocking release condition.
- [ ] ForgeGate generates a Starlight page.
- [ ] ForgeGate exports a portable evidence package.
- [ ] ForgeGate itself passes its required accessibility and quality gates.
