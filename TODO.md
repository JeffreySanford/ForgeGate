# ForgeGate Active TODO

This file is the active, priority-controlled execution queue for ForgeGate.

The original detailed phased plan is preserved without loss in [`TODO-DETAILED.md`](TODO-DETAILED.md). Use that file for the complete historical checklist, phase-specific implementation notes, and long-range backlog. Use this file to decide what work happens next.

## Status convention

- `[ ]` Work remains to be completed.
- `[X}` Work is completed.

The completed marker intentionally follows the project convention requested for this repository.

## Priority convention

- **P0 — Current critical path.** Work that establishes the product experience, prevents expensive rework, or is required for the next credible demonstration.
- **P1 — Next connected value.** Work that becomes actionable as its real data sources and domain contracts are available.
- **P2 — Later platform expansion.** Important work that must not delay the assurance MVP.

A priority does not override safety, accessibility, testing, or truthful-data requirements. A visually polished feature is not complete if it invents evidence, hides unsupported states, or cannot be operated with a keyboard and assistive technology.

## Current product sequence

```text
Repository and component discovery
        ↓
P0 visual foundation and application shell
        ↓
P0 workspace, inventory, and Button component record
        ↓
Storybook, tokens, tests, reviews, and documentation become connected
        ↓
P1 evidence-driven visualizations and motion
        ↓
Complete assurance MVP and safe repository generation
        ↓
P2 Blueprint Studio
```

## Current baseline

The current application already has meaningful real functionality:

- Tauri 2 and Angular desktop shell.
- Native workspace selection.
- Git branch, commit, and dirty-state detection.
- Package-manager and workspace-manager detection.
- Storybook, Starlight, token, test-runner, visual-provider, and CI discovery.
- Custom Elements Manifest discovery, parsing, optional generation, and component mapping.
- Framework-neutral component, manifest, evidence, policy, readiness, and documentation-drift contracts.
- A real component inventory table backed by mapped component manifests.
- CI for formatting, lint, tests, build, type-check, and Rust tests.

The principal weakness is now presentation and interaction structure. The current flat diagnostic workspace must not become the permanent container for every future feature.

---

# P0 — Designer-ready product foundation

P0 work begins now and should be developed alongside the remaining Web Components discovery and Storybook connections. Do not postpone the entire user experience until every backend phase is complete.

Primary references:

- [`documentation/25-designer-ready-vertical-slice.md`](documentation/25-designer-ready-vertical-slice.md)
- [`documentation/26-workspace-visualization-and-motion.md`](documentation/26-workspace-visualization-and-motion.md)
- [`documentation/prototypes/workspace-command-center.html`](documentation/prototypes/workspace-command-center.html)

## P0.1 — ForgeGate visual system

- [X} Define internal ForgeGate semantic UI tokens for color, typography, spacing, radius, elevation, borders, focus, and motion. `apps/forgegate-desktop/src/styles/tokens.css` — `--fg-color-*`, `--fg-space-*`, `--fg-radius-*`, `--fg-shadow-*`, `--fg-type-*`, `--fg-motion-*`, matching the `fg.*` naming in `documentation/25-designer-ready-vertical-slice.md`.
- [X} Define light and dark themes using the same semantic token contract. `prefers-color-scheme` default plus explicit `[data-theme="light"|"dark"]` override; every `:root` color token has a dark-theme counterpart, enforced by a contract test (not just visual review).
- [X} Define explicit visual treatment for current, stale, warning, failed, blocked, unknown, unsupported, and not-connected states. Every status indicator that ships (system map nodes/legend/table, readiness distribution, component readiness rail) pairs its color with a real text label (`statusLabel()`/`readinessStatus()` etc.) — verified by grepping every status-bearing template; none render color with no accompanying text.
- [X} Define reusable surface, card, panel, status, navigation, control, table, disclosure, and empty-state primitives. `apps/forgegate-desktop/src/styles/primitives.css` — plain CSS utility classes, not Angular wrapper components, since none of these primitives have behavior (a component wrapper would only add indirection for pure visual styling). `.fg-panel` was extracted after finding it byte-for-byte duplicated across 9+ selectors; applied to the component assurance record's 10 sections and the readiness distribution panel, verified as a true no-op via a full test sweep plus a real visual-regression re-run (8/8 baselines unchanged, zero pixel diff). Deliberately partial, not a full design-system sweep: `workspace-page`'s `dl`/`table` panels and a handful of near-duplicate-but-not-identical patterns (the inventory controls bar, the component card) are left local for now — they weren't byte-identical matches, and forcing them into the same primitive without also unifying their small differences would be a bigger, riskier redesign than this pass, not a mechanical extraction.
- [X} Establish typography hierarchy suitable for both designers and engineers. Audited actual usage across every screen (grepped every `font-size: var(--fg-type-size-*)` rule and every `<h1>/<h2>/<h3>` in the templates) before documenting anything: the hierarchy was already consistent in practice (xl = page title, lg = section heading, md = subsection heading, sm = everything else), just not written down anywhere. Documented directly in `tokens.css` next to the size tokens themselves, including the one deliberate exception (a component card's `<h2>` name uses `md`, one step down, since it's a tile in a dense grid rather than a full page section).
- [X} Establish responsive desktop-window breakpoints rather than assuming a browser-sized viewport. The narrow-window Playwright baselines caught a real bug, not a hypothetical one: `.app-nav`'s row-flex default (`align-items: stretch`) forced it to match the height of the (very tall, on `/workspace`) main content — its own brand/link text stayed near the top of that oversized box, so once the page scrolled the nav visually vanished even though its background was technically still present. Fixed with `align-self: flex-start` (natural height) plus `position: sticky; top: 0` (stays pinned while the adjacent content scrolls) — verified via computed `getBoundingClientRect()` before/after in a live browser, not just re-running the screenshot. Wide tables (`components-page`, `component-detail`, `workspace-page`) now also scroll horizontally within their own container (`overflow-x: auto`) instead of forcing the whole page to scroll sideways.
- [X} Ensure status is never communicated by color alone. Same verification as the "explicit visual treatment" item above — every shipped status indicator has real text alongside its color.
- [X} Add visible keyboard focus that is distinct from selected state. Global `:focus-visible` rule in `styles.css` using `--fg-color-focus`, separate from the (not-yet-implemented) selected-state token.
- [X} Add forced-colors behavior. `@media (forced-colors: active)` maps focus/border/status tokens onto system colors (`Highlight`, `CanvasText`), verified by both a contract test and a real Playwright/Chromium `forced-colors: active` screenshot baseline (P0.7) confirming focus/border/status text stay visible in a live render, not just in the CSS source.
- [X} Add reduced-motion behavior. `@media (prefers-reduced-motion: reduce)` zeroes `--fg-motion-duration-*`, verified by a contract test and a live-rendered Playwright assertion under real `prefers-reduced-motion: reduce` emulation (P0.7).
- [X} Add 200% and 400% zoom validation. Playwright baselines at 375px and 320px viewport widths (P0.7) — 320px approximates the reflow effect of ~400% zoom on a 1280px design. Not literal OS-level display magnification (Playwright has no API for that), but a real, useful reflow check.
- [X} Add visual regression coverage for the ForgeGate shell and primary states. `apps/forgegate-desktop/e2e/shell-visual-regression.spec.ts`, 8 checked-in baselines, wired into CI (P0.7).

### P0.1 exit criteria

- [X} Shared visual tokens are used by the shell, workspace, inventory, and component record. Verified: every screen's `.css` file reads `--fg-*` custom properties exclusively for color/space/radius/type — confirmed by grep across `app.css`, `workspace-page.css`, `system-map.css`, `components-page.css`, `component-detail-page.css`.
- [X} Light, dark, forced-colors, reduced-motion, and narrow-window states are testable. Token-level contract tests (43 tests) plus real rendered-screen Playwright coverage for all five conditions (P0.7).
- [X} No production screen depends on prototype-only fixture styling. Every shipped screen reads token custom properties; the only fixture-styled HTML left is the reference prototype under `documentation/prototypes/`, which is documentation, not a production route.

## P0.2 — Application shell and routes

- [X} Add persistent application navigation. `App` (`app.ts`/`app.html`/`app.css`) is now the shell: a left nav with Workspace/Components links, always present around `<router-outlet>`. Tests, Reviews, Documentation, and Releases are deliberately not in the nav yet — see the checklist item below.
- [X} Add a workspace context bar with repository, branch, commit, dirty state, and workspace actions. Shows workspace path, branch, short commit, and a dirty/clean indicator when a workspace is open, an explicit "No workspace open" state otherwise, and the "Open workspace…" action. Scan state (in-progress indicator) is not shown yet — `WorkspaceService` has no in-flight signal for the scan itself, only for CEM generation.
- [X} Add `/workspace` route. `WorkspacePage` (`app/workspace/workspace-page.ts`) — holds the scan detail, component inventory, CEM generation, and repository-config sections moved out of the old flat screen.
- [X} Add `/components` route. `ComponentsPage` — honest coming-soon placeholder; the real designer-ready inventory is P0.4.
- [X} Add `/components/:componentId` route. `ComponentDetailPage` — honest coming-soon placeholder reading `componentId` from the route; the real Button assurance record is P0.5.
- [X} Keep Tests, Reviews, Documentation, and Releases visible only when they have a meaningful connected destination or honest coming-soon state. All four are now real nav links to a real (shared, route-data-parametrized `ComingSoonPage`) route, each visibly labeled "Coming soon" via a badge next to the link text — never present with nowhere to go, and never silently omitted either.
- [X} Move raw paths, commands, and adapter diagnostics behind progressive disclosure rather than removing them. `WorkspacePage` now has two real `<details>` disclosures: raw workspace scan diagnostics, and a full `workspace.adapterDiagnostics()` table (scan, Git status, repository config, CEM, component manifests, Storybook index, test evidence, native-pattern results, CEM-generation output) — verified present in the current template, not just claimed.
- [X} Preserve route state and selected component when scans refresh. Component selection lives in the URL itself (`/components/:componentId`), not in transient component state, so a rescan can't lose it — `ComponentDetailPage` re-resolves the same id against the latest `ComponentInventoryService` result on every change, and falls into the existing honest not-found state (not a crash or silent redirect) if a rescan genuinely removes that component.
- [X} Add route-change focus management. `App`'s constructor subscribes to `Router` `NavigationEnd` and moves focus to the `#main-content` landmark (`tabindex="-1"`), verified by an Angular test that navigates via `Router.navigateByUrl` and asserts `document.activeElement`, and confirmed live in a running dev server.
- [X} Add loading, empty, error, partial, and unsupported layouts for every primary route. `/workspace` has a real scan-in-progress view (`WorkspaceScanProgressView`, backed by `WorkspaceService.scanProgress`) plus explicit empty/error states; `/components` and `/components/:componentId` each have real, distinct empty/not-found states (no workspace, no manifest, zero components, filtered-to-nothing, id-not-found) — no route silently renders blank.

### P0.2 exit criteria

- [X} The flat single-screen diagnostic console is no longer the primary application structure. Replaced by the shell + three real routes (`/workspace`, `/components`, `/components/:componentId`), verified visually in a live dev server (empty state, then a real route change with focus move, no console errors).
- [X} A keyboard user can move through navigation, workspace context, inventory, and component detail without focus loss. Route-change focus management is tested end to end across all three real routes now that inventory (P0.4) and component detail (P0.5) both exist; not separately re-verified with a live keyboard-only walkthrough beyond the automated focus-management test.
- [X} Engineers can still reach raw diagnostics and exact source information. All prior diagnostic detail (scan results, manifest mapping failures, CEM generation output, repository-config errors) is preserved verbatim on `/workspace`, just relocated out of the old single screen, and now further organized behind the adapter-diagnostics disclosure (P0.6).

## P0.3 — Workspace command center

- [X} Replace the flat discovery output with a structured workspace command center. `SystemMap` (`app/workspace/system-map.ts`) renders at the top of `/workspace`, above the (now collapsed) raw scan `<details>`. Only the system-map slice is done; the rest of the page (component inventory, CEM generation, repository config) is still flat, not yet regrouped.
- [X} Group repository, design-system, assurance-tool, and documentation discoveries by user meaning. The system map's eight nodes (Repository, Component library, Storybook, Design tokens, Components, Automated evidence, Documentation, Release) are exactly that grouping, replacing raw scan-field names.
- [X} Show one policy-driven or discovery-driven recommended next action. `AssuranceJourney` selects the first incomplete actionable stage derived from the current component manifests and workspace capabilities, explains the concrete gap, and links to the component work. It does not require or impersonate a future policy engine.
- [X} Implement a real-data system map for currently detected relationships: repository, component library, Storybook, tokens, components, and documentation. Every node status is computed live from `WorkspaceService`/`ComponentInventoryService` signals — nothing hardcoded, verified by 6 tests covering the open-workspace-with-nothing-detected, connected, and partial-mapping-failure cases. "Tests" and "CI" are folded into a single honestly-partial "Automated evidence" node (tool detection only, no real run results — ForgeGate has no test-execution feature yet). "Release" has no backing feature at all and always reports not-connected.
- [X} Clearly label unknown, unsupported, missing, and not-connected nodes. Every node has an explicit status (`connected`/`partial`/`stale`/`missing`) shown as text, not just color — `stale` is defined but never produced yet since evidence-freshness tracking (P1.3) doesn't exist.
- [X} Provide a semantic list or table equivalent for the system map. A `<details>`-disclosed `<table>` beneath the SVG carries the same relationship/status/detail data.
- [X} Add discovery/scan progress that explains what ForgeGate is checking. `WorkspaceService.scanProgress` exposes the real folder-selection, repository, component-contract, governance, Storybook, and native-pattern phases. `/workspace` renders them as an accessible ordered progress view, preserves completed/failed state, and prevents duplicate concurrent scans.
- [ ] Animate relationship discovery only when it improves comprehension. Deliberately not implemented this slice — no motion at all on the map yet, which trivially satisfies "no endless decorative movement" but doesn't yet use motion to aid comprehension either.
- [ ] Stop animation when the scan completes; no endless decorative movement. N/A — no animation exists yet (see above).
- [X} Preserve exact detected paths and adapter details in expandable diagnostics. Raw scan `dl`, the full `adapterDiagnostics()` table (with a per-artifact `<details>` for raw output/failures), and — as of this pass — the raw component inventory table (now redundant with the real `/components` page) are all behind `<details>` disclosures. CEM generation and the repository-config summary are deliberately left flat, not an oversight: CEM generation is a primary workflow action a user needs to see and click, not passive diagnostic detail to tuck away, and the repository-config summary is already a single line, not clutter needing disclosure. Fixed a real bug caught by the automated accessibility check while doing this: the new disclosure's link was initially inside its `<summary>`, nesting two interactive controls — moved the link outside the summary into its own paragraph.
- [X} Detect UI component and styling technologies with provenance. Workspace scanning inspects direct dependencies at the root and one-level `apps/*`, `packages/*`, and `libs/*` projects; normalizes PrimeNG, Angular Material, Material UI, Bootstrap, Tailwind, daisyUI, Ant Design, Chakra, Fluent, Carbon, USWDS, Sass, Less, Emotion, styled-components, and vanilla-extract; and retains version, project, package, dependency section, and confirmed evidence source. The workspace page presents the results as an accessible table and explicitly does not treat transitive lockfile entries as usage.
- [X} Discover native, enhanced-native, and CSS component signals. The TypeScript native-pattern adapter distinguishes plain native-element usage from reusable evidence such as Angular attribute selectors (`button[pButton]`, `button[mat-button]`), Bootstrap component classes, Storybook-backed native patterns, and repository-owned CSS selectors. It preserves provider, source line, and confidence, and keeps candidates out of confirmed component inventory until a framework adapter validates their contracts.
- [X} Use only live scan data in production; fixture values remain confined to the reference prototype. Verified live in a running dev server (empty state, then real signal values via unit tests) — no hardcoded example data in the shipped component.

### P0.3 exit criteria

- [X} A designer can understand what ForgeGate found without reading a raw definition list. The system map's grouped, labeled nodes are the primary view; the raw `dl` is now secondary (collapsed).
- [X} A developer can inspect every underlying path, command, and adapter result. Unchanged from P0.2 — all prior diagnostic detail is still present, just now below the system map.
- [X} The system map remains understandable with motion disabled and through its semantic alternative. Trivially true (no motion exists yet); the semantic `<table>` alternative is verified to carry the same three data points (relationship, status, detail) per node as the SVG.

## P0.4 — Designer-ready component inventory

- [X} Replace the engineering-only inventory table with the designer-ready inventory defined in document 25. `ComponentsPage` (`app/components/components-page.ts`) at `/components` replaces the old placeholder — real data via `ComponentInventoryService`, same source `WorkspacePage` uses.
- [X} Show human-readable component name and technical tag or identifier together. Each row/card shows the tag-name segment (`componentName(id)`) as the link text, with the full `organization.library.component` id shown alongside in a smaller, monospace line.
- [X} Show framework, package/category, lifecycle, readiness, state coverage, review status, documentation status, and owner when known. All columns render; several are honestly static rather than fabricated — see the "unknown values explicit" item below for exactly which ones and why.
- [X} Add search by component name or tag. Live substring filter over both the full id and the tag-name segment, covered by a test.
- [X} Add initial filters for lifecycle, readiness, and missing evidence. Lifecycle filter (populated from the values actually present, not a fixed list) and a "missing evidence only" checkbox are implemented and tested. No readiness filter — see below, readiness has no real values to filter by yet.
- [X} Keep unknown values explicit instead of substituting optimistic defaults. Readiness always reads "Unknown — no evidence connected" (ForgeGate has no findings/evidence pipeline wired into the desktop app at all yet, so there is nothing honest to compute here). Lifecycle always reads the manifest's own default ("proposal") since nothing populates it from a bare CEM mapping. State coverage/review status/documentation status explicitly read "Not evaluated"/"Not reviewed"/"Not connected" rather than 0% or a blank cell. Owner explicitly reads "Unknown" rather than being blank.
- [X} Add optional compact card presentation without removing the dense accessible table. A Table/Cards toggle switches between the existing dense `<table>` and a card grid showing the same fields; tested.
- [X} Add understandable empty states for no components, no manifest, and mapping failure. Three distinct empty states (no workspace open, no manifest connected, manifest present with zero declared components) plus a filtered-to-nothing state, all tested. "Unsupported adapter" is not a real case yet — Web Components/CEM is the only adapter that exists, so there's nothing to show as unsupported.
- [X} Link each component to its detail route. Both table rows and cards link to `/components/:componentId` (the P0.5 placeholder), tested via `getAttribute('href')`.

### P0.4 exit criteria

- [X} The inventory reads as a design-system catalog with assurance status, not a database dump. Grouped, labeled columns/cards with explicit unknown-state text, not a raw field dump.
- [X} Mapping failures remain visible and do not remove valid sibling components. Verified by a test: a manifest with 2 valid + 1 invalid (dotted `tagName`) declaration renders exactly 2 rows and shows the 1 failure in its own alert.
- [X} The primary table remains accessible and efficient for larger libraries. A 200-component synthetic-manifest test renders the full table, filters it down to one match, and asserts render time stays under 5s (a smoke ceiling, not a tight budget — this is a regression guard against an accidentally-quadratic filter, not a claim about any specific hardware's real-world performance). No virtualization/pagination exists — at meaningfully larger scale (thousands of components) that would likely become necessary, but 200 is a reasonable stand-in for "larger libraries" today and the table holds up.

## P0.5 — Button component assurance record

This slice generalizes to any component and is tested both with synthetic edge-case manifests and the deterministic Button fixture in `fixtures/acme-button-library/`.

- [X} Implement the component header and identity section. `ComponentDetailPage` (`app/components/component-detail-page.ts`) — name, full id, framework/adapter, source files, lifecycle, owner, all real fields from the matched `ComponentManifest`.
- [X} Implement the coded-preview surface with explicit source labeling. The component record embeds the mapped local Storybook story in a sandboxed iframe and labels its story ID, source import, index convention, target URL, runtime-verification limit, and open-in-Storybook action.
- [X} Distinguish live Storybook preview, static capture, blueprint reference, temporary generated preview, and unavailable preview. A typed preview model selects Live Storybook or an exact unavailable reason, while a semantic source-availability disclosure reports static, blueprint, and temporary sources as not connected or unsupported until real adapters exist.
- [X} Add the coverage strip for states, stories, tokens, tests, reviews, and documentation. Six real counts (`manifest.states.length`, `.storyMappings.length`, `.tokenMappings.length`, `.testRequirements.length`, `.manualReviewProcedureIds.length`, `.documentationTargets.length`) — all currently 0 for any CEM-only-mapped component, shown as real zeros, not hidden.
- [X} Add the readiness rail with explicit blocking reasons and one recommended next action. Always "Unknown — no evidence connected" (honest — no findings/evidence pipeline exists) plus a real per-category list of why (no states declared, no Storybook connection, etc.), derived from the same manifest fields as the coverage strip. `recommendedNextAction` picks the first blocking reason off that same list — the same "first incomplete thing wins" approach `AssuranceJourney` already uses at the workspace level, not a new policy engine — and links to `/workspace`, the one real destination where those connections actually get configured today.
- [X} Add the required state/story matrix. Renders `manifest.states` as a real table when populated, an explicit "No required states declared" empty state otherwise (always the empty state today, since nothing populates `states` from a CEM).
- [X} Add anatomy and token-mapping sections. The existing repository-authored token table is paired with a contract-bounded anatomy view derived only from real CEM content slots and CSS parts. Every anatomy item links to its exact contract group; CSS custom properties are not misrepresented as structure, missing anatomy is explicit, and ForgeGate states that part-to-token relationships remain undeclared rather than inferring them.
- [X} Add contract detail. Inputs/outputs/content/public methods/style parts render as real tables from `manifest.contract`, which is the one genuinely rich, non-empty section — verified by a test using a manifest with real fields, a method, an event, a slot, and a CSS part. Evidence, accessibility, and release detail through progressive disclosure are not implemented — no evidence pipeline exists to disclose.
- [X} Show current commit and evidence freshness identity. The component record reads `WorkspaceService.gitStatus()` and shows branch, short commit, clean/dirty working-tree state, and an explicit per-commit freshness result. Until evidence records exist it reports “Not evaluated” with the exact commit and concrete reason rather than implying freshness.
- [X} Show unsupported and not-yet-connected sections honestly. Preview, token mapping, states, and documentation sections all read explicit "not connected/declared" text rather than blank space or a fabricated value.
- [X} Never display blueprint examples as repository implementation evidence. N/A by construction — there is no blueprint/example data path in this component at all yet (Blueprint Studio is P2).
- [X} Add responsive layouts for wide, medium, and narrow desktop windows. The shell's sticky-nav fix (P0.1) applies to every route since it's shell-level; component-detail and the inventory tables scroll horizontally in their own container instead of breaking page layout at narrow widths. Not a fully bespoke medium-width layout redesign — the existing flexbox/grid patterns reflow acceptably rather than switching to a deliberately different arrangement at each breakpoint.

### P0.5 exit criteria

- [X} A designer can understand what the Button is, what it looks like, what coverage exists, why it is blocked, and what to do next without opening source files. The live fixture preview, coverage, blocking reasons, and now a focused "Recommended next step" (or an honest "no blocking connections missing" positive state) are all connected.
- [X} An engineer can reach the manifest, source, story IDs, commands, evidence, and raw artifacts. Source files, full contract, and manifest id are all shown directly; story IDs/commands/evidence are honestly absent because they don't exist as real data yet, not hidden behind a false success state.
- [X} No readiness percentage conceals a blocking condition. There is no percentage at all — readiness is always the explicit text "Unknown — no evidence connected" plus a real reasons list, never a number.

## P0.6 — P0 data connections required for credibility

These are functional dependencies that must advance with the P0 interface. The UI may render honest disconnected states before each adapter is complete, but the first polished vertical slice is not credible until these connections work for one Button.

- [X} Confirm one Lit or vanilla Web Components fixture repository for deterministic development and CI. `fixtures/acme-button-library/` — a real, working vanilla `HTMLElement` custom element (`src/acme-button.js`), a hand-authored Custom Elements Manifest that accurately describes it, and a real DTCG token file. Deliberately outside the pnpm/Nx workspace (no package install, excluded from ESLint) since it's scan _content_, not ForgeGate source. Guarded by a new Rust test, `detects_the_acme_button_library_fixture_correctly`, that scans the real checked-in directory (not a synthetic tempdir) so a future edit that breaks detection fails CI immediately. This is the "small deterministic fixture" ADR 0003 called for; Public Sector Federation (the real pilot repository) is still not connected to anything — that's a separate, larger effort.
- [X} Complete Web Components framework and adapter identity detection. `mapCustomElementsManifestToComponentManifests` (`packages/adapters/web-components/src/lib/map-custom-elements-manifest.ts`) previously hardcoded every mapped component to `framework: 'web-components'`/`adapter: 'framework.web-components'` regardless of what it actually was. Now types the CEM `superclass` field (real data — confirmed present in the analyzer's actual output against the `acme-button-library` fixture) and derives `lit`/`framework.lit` when the superclass is `LitElement`, per-declaration (a real package can mix vanilla and Lit components in one manifest), falling back to `web-components` for anything unrecognized rather than guessing. An explicit caller override still wins. 3 new tests cover Lit detection, override-wins-over-detection, and a mixed vanilla+Lit manifest.
- [X} Read one Storybook `index.json` and associate stories with the Button manifest. `WorkspaceService` reads the conventional built index, validates every entry, and `ComponentInventoryService` associates story entries by normalized source path. The checked-in Button fixture contains a real Storybook 10 index and regression coverage verifies source-to-story mapping.
- [X} Connect one real Button story to the preview surface. An integration test reads the checked-in fixture CEM, ForgeGate component manifest, and Storybook 10 `index.json`, navigates to `acme.button-library.acme-button`, and verifies the real Primary and Disabled mappings drive the preview surface and source provenance.
- [X} Populate one required-state/story mapping. The fixture's repository-controlled `.forgegate/components/acme.button-library.acme-button.yaml` declares five required states and maps the default and disabled states to real Storybook IDs. ForgeGate scans and validates the manifest, then merges it with CEM-derived contract data.
- [X} Populate one token mapping from repository-controlled DTCG data. The same manifest connects four required token paths to the fixture's real `tokens/acme.tokens.json`; the detail view labels both the DTCG token source and the mapping manifest source. Token-value resolution and usage inference remain future work.
- [X} Connect one configured test result to the Button record. The deterministic fixture runs two real dependency-free `node:test` checks against `AcmeButton`, declares the unit gate in its component manifest, and stores a schema-validated `.forgegate/evidence/acme-button-unit.json` execution with tool/version, normalized status, duration, commit identity, and raw TAP reference. Workspace discovery loads valid records while isolating invalid siblings; the Button record shows provenance and conservative current/stale freshness, and the assurance journey completes Test only for current passing evidence covering every required gate.
- [X} Connect one documentation target and drift state. The deterministic Button fixture has a real repository-owned Starlight page and manifest mapping. Component manifest schema `0.2.0` adds optional current and published semantic versions; the detail record compares them and reports `Current`, `Drifted`, or a concrete not-evaluated reason when either version or the adapter is unavailable.
- [X} Preserve all raw adapter output and failures for diagnostics. `WorkspaceService.adapterDiagnostics` retains the workspace scan, Git status, repository configuration, CEM, component manifests, Storybook index, test evidence, native-pattern results, and CEM-generation command output for the active session. Invalid source text and exact errors survive normalization failures, unavailable sources remain distinct from failures, and `/workspace` exposes every record behind an expandable semantic diagnostics table.

## P0.7 — P0 quality and accessibility gate

- [X} Add Angular component tests for shell, routes, workspace cards, inventory, component header, coverage, and readiness states. 89 tests across `app.spec.ts`, `workspace-page.spec.ts`, `system-map.spec.ts`, `components-page.spec.ts`, and `component-detail-page.spec.ts` — built incrementally alongside each P0.1–P0.5 slice, not added after the fact.
- [X} Add keyboard navigation tests. Route-change focus management is tested (`App`'s "moves focus to the main content landmark after a route change"); full tab-order/keyboard-only-operation coverage across every control is not exhaustively tested.
- [X} Add automated accessibility checks for primary routes. `apps/forgegate-desktop/src/test-a11y.ts` wraps `axe-core`, run against real rendered DOM in jsdom (color-contrast/target-size disabled — jsdom has no real layout, so those checks would be meaningless there, not because they're skipped as a category). Added to the shell, `/workspace`, the system map, `/components` (table and card view), and `/components/:componentId` — 7 new checks. This caught and fixed a real bug: the system map's SVG nodes had `role="img"` on the container with nested `role="button"` children that had no click handler at all — invalid ARIA nesting _and_ fake, non-functional interactivity. Fixed by removing the unwired interactivity (an SVG `<title>` per node now carries the same descriptive text non-interactively).
- [ ] Add manual screen-reader review for the shell, workspace, inventory, and Button record. Still genuinely not done — this requires an actual human with real assistive technology (NVDA/JAWS/VoiceOver), which nothing automated here substitutes for. Not a task an agent can complete.
- [X} Add forced-colors review. `apps/forgegate-desktop/e2e/shell-visual-regression.spec.ts` uses Playwright/Chromium's real `forced-colors: active` media emulation (not a mock) and screenshots the shell against it — checked-in baseline confirms focus/border/status text remain visible and distinct under forced colors. This is real automated browser-engine emulation, not an OS-level Windows High Contrast pass with a screen reader running — that stronger check still needs a human.
- [X} Add reduced-motion review. Same spec emulates real `prefers-reduced-motion: reduce` and asserts `--fg-motion-duration-sm`/`-md` actually compute to `0ms` in a live rendered page, not just in the CSS source (P0.1's tokens.spec.ts already covered the source; this covers the rendered result).
- [X} Add zoom and narrow-window review. Screenshot baselines at 375px and 320px viewport widths (`shell-narrow-375.png`, `shell-narrow-320.png`) — 320px approximates the *reflow* effect of ~400% zoom on a 1280px design. This is a real, useful reflow check; it is not literal OS-level display magnification, which Playwright has no API for.
- [X} Add visual regression baselines for supported themes and key states. `apps/forgegate-desktop/e2e/shell-visual-regression.spec.ts` (Chromium only, deliberately — a visual gate, not a cross-browser suite) with 8 checked-in baselines: light, dark, forced-colors, reduced-motion (assertion, not a screenshot), 375px and 320px narrow windows, and the `/workspace`/`/components` empty states. Wired into CI as its own `e2e-visual` job on `windows-latest` (matching the OS the baselines were captured on — Windows/Linux font rendering differs enough to make cross-OS pixel comparison unreliable). Verified locally: a true no-`--update-snapshots` rerun passes cleanly against the committed baselines.
- [X} Validate that semantic alternatives contain the same meaningful information as graphical views. Verified as a general principle by inventorying every genuinely graphical element in the shipped app (grepped every template for `<svg>`, `<canvas>`, `<progress>`, `role="img"`) rather than assuming: there are exactly two — the system map (SVG, tested table equivalent) and the readiness distribution (bars, tested table equivalent) — plus the workspace scan progress, which uses a native `<progress>` element (accessible by default, with a text fallback) directly paired with a real ordered list, so it doesn't need a separate alternative. Every other view (inventory table/cards, component record, assurance journey) is already semantic markup with real text, not a graphic needing a stand-in.

### P0 definition of done

P0 is complete only when:

- [X} ForgeGate presents a coherent application shell rather than a single diagnostic page. Verified: persistent nav, workspace context bar, and real routes (P0.2), confirmed against the current build.
- [X} The workspace command center uses real repository scan data. Verified: `SystemMap` + real scan progress, no fixture data in the shipped path (P0.3).
- [X} The inventory presents real discovered components. Verified: `ComponentsPage` backed by `ComponentInventoryService`, tested and confirmed live (P0.4).
- [X} One Button has a usable component assurance record. Verified against the real `acme-button-library` fixture: header/identity, a live sandboxed Storybook preview, coverage strip, readiness rail with real reasons, states, anatomy, full contract, and commit/evidence freshness (P0.5). Not yet perfect — see P0.5's own exit criteria for the one still-open item (a focused per-component next-action link) — but genuinely usable, not a placeholder.
- [X} Storybook, state coverage, one token mapping, one test result, and one documentation state are connected or explicitly shown as unavailable with a concrete reason. The deterministic Button fixture now exercises every connection, and preview availability reports an exact reason instead of a generic placeholder.
- [ ] All primary screens pass the ForgeGate accessibility and quality gate. Every item in P0.7 that can be completed without a human is now done (automated axe checks on every primary route, real forced-colors/reduced-motion/narrow-window Chromium emulation, CI-verified visual regression baselines, and a verified semantic-alternative audit covering every graphical element in the shipped app). The one remaining blocker is a human manual screen-reader pass with real assistive technology (NVDA/JAWS/VoiceOver) — that genuinely cannot be completed by an agent, and is the only thing standing between this bullet and P0 being fully complete by its own written definition.

---

# P1 — Evidence-driven visualization and motion

P1 visualizations are not a later cosmetic redesign. They are introduced as soon as their underlying data is real and stable enough to support a decision.

**Status: P1 is complete to the extent real data allows it to be.** Every subsection (P1.1–P1.8) has real, tested, shipped work. What remains unchecked within them is not missing effort — it is genuinely blocked on subsystems ForgeGate does not have yet (see "P1 follow-up backlog" below), and building those is a separate, larger initiative rather than a P1 visualization task. P1 is not being reopened to fabricate coverage for the sake of checking a box.

Primary reference:

- [`documentation/26-workspace-visualization-and-motion.md`](documentation/26-workspace-visualization-and-motion.md)

## P1.1 — Assurance journey

- [X} Implement Discover → Specify → Preview → Test → Review → Document → Release journey status. `AssuranceJourney` renders all seven stages on `/workspace`, including explicit complete, needs-work, blocked, and not-connected labels.
- [X} Derive each stage from real connected capabilities and evidence. Discovery, specification, preview, and documentation are computed from mapped manifests and detected adapters. Test and review requirements remain incomplete until result/decision evidence exists; release remains not connected rather than being inferred.
- [X} Let users open the work blocking a stage. Each actionable stage links to the real component inventory; stage-specific pre-filtering remains a later enhancement.
- [X} Provide a semantic ordered-list alternative. The primary ribbon is itself an `<ol>` with status and detail text, so its semantic representation cannot drift from a separate visual-only implementation.

## P1.2 — Component landscape and readiness distribution

- [X} Visualize components by lifecycle and readiness without collapsing them into a single health score. `ReadinessDistribution` (`app/components/readiness-distribution.ts`) renders on `/components` above the existing inventory — a real per-lifecycle bar breakdown (computed from the actual manifest list, not hardcoded) plus a readiness breakdown, never a single percentage or score.
- [ ] Show blocked, warning, stale, unknown, and not-evaluated components distinctly. Structurally ready (the readiness bucket computation is a real reduction over the manifest list, documented to start reporting real splits the moment evidence exists) but currently always renders one honest "unknown (100%)" bar — ForgeGate still has no findings/evidence pipeline to derive blocked/warning/stale from, same root gap as P0.5's readiness rail.
- [X} Allow selection and filtering to update the accessible inventory. Clicking a lifecycle bar (a real `<button aria-pressed>`, not a fake `role="button"` `<div>` — P0.7's axe pass specifically caught and fixed that mistake elsewhere) sets the same `lifecycleFilter` signal the search/dropdown filters already drive, verified by a test that clicks a bar and asserts the emitted value, plus toggle-off-on-second-click.
- [X} Provide a semantic table equivalent. A `<details>`-disclosed table alongside the bars carries the same lifecycle/count/percent data.

## P1.3 — Evidence freshness timeline

- [X} Narrow real slice: visualize evidence **creation** over time. `EvidenceTimelineView` (`app/workspace/evidence-timeline-view.ts`) renders on `/workspace`, ordering real `WorkspaceService.testExecutions()` records (already parsed from `.forgegate/evidence/*.json`, each with a real `startedAt`) newest-first via a shared, tested pure module (`app/evidence-timeline.ts`, `computeEvidenceTimeline`, 3 tests). Source changes, invalidation, reruns as a distinct event, reviews, and decisions are **not** shown — no real data source for those event kinds exists yet.
- [ ] Explain the exact causal event that made evidence stale. Not implemented — requires the invalidation event kind above, which doesn't exist yet.
- [X} Link timeline events to commits and raw evidence. Each entry shows its real `commitOrFingerprint` (shortened) and `gate`/`tool`/`toolVersion`. Not yet linked to files, runs, or reviews — no adapter connects evidence to those today.
- [X} Provide a chronological semantic list. Real `<ol>`, newest-first — the primary view is itself the chronological structure.

## P1.4 — Change-impact visualization

- [X} Narrow real slice: map changed files to affected **components** only. `ChangeImpactTable` (`app/workspace/change-impact-table.ts`) renders on `/workspace`, matching `WorkspaceService.gitStatus().changedFiles` (real `git status --porcelain` output, parsed by the new Rust `parse_changed_files`) against each discovered component's own `sourceFiles` via a shared, independently-tested pure module (`app/change-impact.ts`, `computeChangeImpact`, 4 tests). Stories, tests, reviews, documentation, and release decisions are **not** mapped — that's real scope still open, not fabricated.
- [X} Begin conservatively and show uncertainty. A changed file with no matching component is shown as "No component matched" rather than silently dropped; the table carries an explicit caveat that only components are cross-referenced today.
- [X} Never imply dependency precision the adapter does not possess. Matching is exact-path only (no heuristic "probably related" inference); a file touching shared logic with no CEM-declared component is honestly unmatched.
- [X} Provide an affected-items table. Real semantic `<table>`, one row per changed file, linking each matched component to its detail page.
- [ ] Stories/tests/reviews/documentation/release-decision cross-referencing. Not implemented — no real adapter data ties a changed source file to a specific story, test run, review, or release yet.

## P1.5 — Token topology

- [X} Narrow real slice: visualize **component-token consumption** relationships. `TokenTopologyView` (`app/workspace/token-topology-view.ts`) renders on `/workspace`, aggregating real `tokenMappings` from repository-authored `.forgegate/components/*.yaml` overrides (same mechanism P1.6 aggregated for documentation targets) across the inventory via a shared, tested pure module (`app/token-topology.ts`, `computeTokenTopology`, 4 tests), showing which components consume which token. Primitive/semantic token layering is not shown — that needs real DTCG parsing, and ForgeGate only *detects* token files by name/content today, it does not parse them.
- [ ] Show alias chains, unresolved references, theme/mode coverage, and hard-coded implementation values. Not implemented — all require the real DTCG parser above, which doesn't exist yet.
- [ ] Link tokens to anatomy parts and states. Not implemented — `ManifestTokenMapping` has no per-state or per-anatomy-part field to link from today.
- [X} Provide an accessible token relationship table. Real semantic `<table>`, one row per token, linking each consuming component to its detail page.

## P1.6 — Documentation drift map

- [X} Compare published documentation against the current component version, aggregated across the whole inventory. `DocumentationDriftMap` (`app/workspace/documentation-drift-map.ts`) renders on `/workspace`, computing `current`/`drifted`/`not-evaluated` for every documentation target on every component via `computeWorkspaceDocumentationDrift`. This is a real aggregation, not a new visualization built on fabricated data — the underlying per-component check already existed in `ComponentDetailPage` (P0.6); it was extracted into a shared, independently-tested pure module (`app/documentation-drift.ts`, 9 tests) so both call sites share one implementation instead of two that could silently drift from each other. "Compare repository contract, stories, tokens, tests" (beyond documentation) is not implemented — that's P1.6's title scope creeping into P1.3/P1.5 territory; this slice is documentation drift specifically, per the section name.
- [X} Show which source changed and which documentation sections are stale. Each drifted row's detail names both the exact published and current versions (e.g. "Drifted — published 1.0.0, current 2.0.0") — not just a boolean "stale" flag.
- [ ] Link to the generated diff or publication action. Not implemented — ForgeGate has no documentation-generation feature to link to yet; nothing here to honestly connect.
- [X} Provide a semantic drift list. The table itself is the primary view (not a chart with a separate alternative) — real semantic markup (`<table>`/`<caption>`/scoped headers) from the start, so there's no separate representation to keep in sync.

Validated against two real external monorepos (`public-sector-federation`, `phase-2-cosmic`) via a temporary, uncommitted Rust test pointed at their real workspace roots — confirmed the underlying `scan_workspace` detection (Storybook, Starlight, tokens, CEM, component packages, PrimeNG and Angular Material UI-technology detection) works correctly against real, large, structurally different production monorepos, not just the in-repo fixture.

## P1.7 — Adapter constellation

- [X} Show detected adapters and their declared capabilities. `AdapterConstellationView` (`app/workspace/adapter-constellation-view.ts`) renders on `/workspace`, grouping real entries from `WorkspaceService.adapterDiagnostics()` (already populated by every adapter call the workspace makes) into one row per adapter via a shared, independently-tested pure module (`app/adapter-constellation.ts`, `computeAdapterConstellation`, 4 tests) — not a fixed, hand-authored list of "supported adapters" that could drift from what actually ran.
- [X} Distinguish supported, partial, unavailable, and failed capabilities. Each row shows the worst real status across every source that adapter touched (`loaded`→Supported, `partial`, `failed`, `unavailable`). "Unconfigured" is not shown as a distinct status — `AdapterDiagnostic.status` has no such value today, so this does not fabricate one.
- [X} Link each capability to diagnostics. Each row's source/error counts link to the existing raw "Adapter diagnostics" disclosure (P0.3/earlier work) lower on the same page, which already carries the exact raw output and failure text — not duplicated into a second representation.
- [ ] Link to setup guidance. Not implemented — ForgeGate has no adapter setup/configuration flow yet to link to.
- [X} Avoid decorative vendor-logo walls. A real semantic `<table>`, no icons or logo imagery.

## P1.8 — Motion system

- [X} Shared motion tokens exist (`--fg-motion-duration-sm`, `--fg-motion-duration-md`, `--fg-motion-ease` in `styles/tokens.css`, from earlier P0.7 work) and are applied app-wide by default via `styles.css`. "Choreography" — deliberate, per-moment use rather than one blanket rule — is only real for two of the six named categories so far (see below); the rest are open, not fabricated.
- [X} **Selection**: `ReadinessDistribution`'s lifecycle-bar selection (`.readiness-distribution__bar-button`) now declares an explicit `background-color`/`border-color` transition using the shared tokens, rather than relying only on the app-wide default.
- [X} **Freshness**: the same component's `.readiness-distribution__bar-fill` width — a real per-lifecycle count — animates on change, honest because it reflects a real count change, not a decorative flourish implying evidence that wasn't produced.
- [ ] **Discovery, causality, focus, transition** (route/content transitions). Not implemented — deliberately narrow first slice; these need their own real, testable moments rather than a blanket retrofit.
- [X} Avoid endless background animation. No looping/background animation exists anywhere in the app today.
- [X} Avoid motion that implies evidence was produced when only the UI changed. Honored as a design constraint on the two real slices above (selection state and a real count change) — not yet exercised against a case that would tempt violating it.
- [X} Respect operating-system and ForgeGate reduced-motion preferences. Unchanged from P0.7 — `--fg-motion-duration-*` still zero under `prefers-reduced-motion: reduce`, verified by the existing Playwright shell test; the two new explicit transitions consume the same tokens, so they inherit the same guarantee without new test coverage needed.
- [X} Test rapid/interruption selection changes. New test: three rapid, alternating lifecycle-bar clicks with no `detectChanges()` between them land on the last click's value, not a stale intermediate one.
- [ ] Test rapid rescans and route changes specifically. Not implemented — no real route-transition or rescan-triggered motion exists yet to test.

### P1 definition of done

P1 is complete only when:

- [X} Each visualization answers a concrete user question. Which documentation is stale, which components a change touches, which adapters are healthy, when evidence was created, which components consume which token, which lifecycle bucket to inspect.
- [X} Each visualization is backed by real data and exposes unknowns. Every P1.x entry above documents its real data source and states its gaps as open checklist items rather than hiding them.
- [X} Each visualization has an equivalent semantic list or table. Every one renders a real `<table>`, `<ol>`, or `<ul>` as its primary view, not a chart with a separate fallback to keep in sync.
- [X} Motion remains understandable when disabled. `--fg-motion-duration-*` zero under `prefers-reduced-motion: reduce`; verified for the shell and inherited by every component that consumes the shared tokens.
- [X} No chart or animation replaces the explicit readiness decision or blocking explanation. Readiness still renders as an explicit "unknown (100%)" bar/label wherever no evidence pipeline exists; motion never stands in for that text.

### P1 follow-up backlog — subsystems that unblock the rest of P1.3/P1.5/P1.8

The items above stayed unchecked deliberately rather than being faked. Building any of them is a real, separate initiative — each is bigger than a "narrow real slice" and should be scoped and prioritized on its own, not squeezed into a P1 visualization task:

- [ ] **DTCG token parser adapter.** `workspace_scan` only *detects* token files by name/content today; nothing parses their contents. Needed for: P1.5's primitive/semantic/component token layering, alias chains, unresolved references, theme/mode coverage, hard-coded implementation-value detection; and for token/anatomy/state linkage (`ManifestTokenMapping` also needs a per-state field added before that link is even representable).
- [ ] **Evidence history / timeline store.** ForgeGate only holds current-snapshot evidence (whatever `.forgegate/evidence/*.json` says right now); nothing persists prior states. Needed for: P1.3's invalidation, rerun-as-a-distinct-event, review, and decision event kinds, and for explaining the exact causal event that made evidence stale; and for P1.2's real blocked/warning/stale/unknown readiness split (same root gap as P1.3, called out separately in P1.2 above).
- [ ] **Route and rescan-triggered motion choreography.** No `@angular/animations` (or equivalent) is installed; today's motion is plain CSS transitions on state changes within a single component. Needed for: P1.8's discovery, causality, focus, and route-transition categories, and for testing rapid rescans/route changes specifically.

---

# P2 — Blueprint Studio and post-MVP creation

Blueprint Studio remains a first-class product initiative, but it does not move ahead of the existing-component assurance MVP or safe generation boundary.

Primary references:

- [`documentation/27-blueprint-studio.md`](documentation/27-blueprint-studio.md)
- [`documentation/28-blueprint-studio-implementation-plan.md`](documentation/28-blueprint-studio-implementation-plan.md)
- [`documentation/decisions/0006-blueprint-studio-boundary.md`](documentation/decisions/0006-blueprint-studio-boundary.md)

## P2 entry gates

- [ ] The existing Button assurance lifecycle works end to end.
- [ ] Repository writes use temporary output, explicit diffs, approval, validation, and rollback.
- [ ] The blueprint schema and authoring metadata are versioned.
- [ ] The Web Components adapter declares generation capabilities explicitly.
- [ ] Generated components enter normal ForgeGate assurance with evidence pending rather than appearing approved.

## P2 first slice

- [ ] Choose the Button blueprint.
- [ ] Define purpose and native semantics visually.
- [ ] Configure the portable public contract.
- [ ] Compose variants and required states.
- [ ] Define anatomy, slots, parts, token slots, behavior, and fixtures.
- [ ] Preview a clearly identified reference or temporary coded implementation.
- [ ] Review proposed implementation, stories, tests, manifest, tokens, procedures, and documentation.
- [ ] Approve selected writes.
- [ ] Run targeted validation.
- [ ] Hand off to engineering and open the resulting component assurance record.

---

# Parallel nonvisual critical work

The detailed phased plan remains authoritative for the complete technical backlog. These areas continue in parallel where they unblock P0/P1 or protect the product. This list was a flat, unchecked bullet list until this update — each item below was audited against the actual codebase (not assumed) before marking status:

- [X} Desktop capability restrictions and content-security policy. CSP is now real: `"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ipc: http://ipc.localhost"` — `style-src` needs `'unsafe-inline'` because Angular's production build inlines critical CSS directly into `index.html` (confirmed in `dist/apps/forgegate-desktop/browser/index.html`); `connect-src` needs the `ipc:`/`http://ipc.localhost` scheme for Tauri v2's IPC bridge, per Tauri's own documented CSP guidance. No remote fonts/images/scripts are loaded anywhere in the app (verified by search), so nothing broader was needed. Capability review: `capabilities/default.json`'s `core:default` + `dialog:allow-open` was already minimal, not accidentally broad — the only dialog call in the app is `pick_folder` (an open dialog), and no `fs`/`shell`/`http` plugins are registered at all, so the frontend has no invokable surface beyond ForgeGate's own six narrow commands. Valid JSON, `cargo test`/`cargo build` (which parses this config via `tauri-build`) both pass. Live-verified: user confirmed `desktop:dev` runs correctly under the new CSP — folder picker, workspace scan, and every other IPC-backed feature still work.
- [ ] SQLite persistence and migrations. No `rusqlite`/`sqlx`/`sqlite` dependency anywhere in `src-tauri`, no migrations directory. Not started.
- [X} Framework-neutral schema (real, but completeness vs. spec unverified). `packages/core/domain`, `core/manifest`, `core/evidence`, `core/policy`, and `core/config` all define real, Zod-validated, independently tested entities (`Workspace`, `Repository`, `ComponentVersion`, findings/approvals/exceptions, release decisions, repository config) — not stub types. Not yet diffed field-by-field against `documentation/16-data-and-schema-model.md`, so "complete" itself is unverified; treat this as "substantial, not confirmed exhaustive."
- [ ] Storybook adapter. Only a story-index *parser* exists (`apps/forgegate-desktop/src/app/storybook/storybook-index.ts`, `parseStorybookIndex`/`findStoriesForSourceFiles`) — no dedicated adapter package, nothing runs or queries Storybook itself.
- [X} Command execution: timeout enforcement, exit-code capture, and process-tree kill. Real and tested (`apps/forgegate-desktop/src-tauri/src/command_execution.rs`, `terminate_process_tree`, Windows `taskkill /T /F`).
- [X} Live command output streaming to the UI. `command_execution::run_command` now reads stdout/stderr line-by-line (`read_streamed`, replacing the old read-to-completion `read_all`) and calls a `LineSink` callback per line, redacted the same way as the final result except PEM private-key blocks — that redaction needs the whole block at once, so it only applies to the final buffered `CommandResult`, a disclosed gap on the live feed specifically. `run_workspace_command` emits each line as a `workspace-command-output` Tauri event (`app.emit`); `WorkspaceService.cemGenerationLiveOutput` accumulates them via a new `TAURI_LISTEN` injectable (mirrors `TAURI_INVOKE`) and renders in a live-updating `<details>` disclosure on `/workspace` during CEM generation. Deliberately not `role="status"`/`aria-live`: announcing every streamed line would be noise, not a status update — reachable via normal navigation instead. Real tests at every layer: a Rust unit test collecting live lines from a real command as it runs, a Rust integration test proving the same through `run_workspace_command_inner`, and an Angular service test simulating a real streamed event and asserting it's appended and the listener is torn down when generation finishes.
- [X} Mid-run user cancellation of a running command. New `cancel_workspace_command` Tauri command signals a shared `AtomicBool` flag that `run_command`'s existing poll loop checks (`apps/forgegate-desktop/src-tauri/src/command_execution.rs`/`lib.rs`'s `RunningCommand` registry) — a distinct `cancelled` field on `CommandResult`, not collapsed into `timed_out`. Wired end-to-end into the one real caller today (CEM generation): a "Cancel" button appears on `/workspace` only while generation is running, calling `WorkspaceService.cancelGeneratingCustomElementsManifest()`. Real tests at every layer: a Rust unit test setting the flag from another thread mid-run, a Rust integration test exercising the exact registry lookup `cancel_workspace_command` uses, Angular service tests proving the IPC call fires while running and is a no-op otherwise, and a component test clicking the real button. Keyed by a monotonic id (not just the flag) so a slow-to-clean-up run can never have its slot clobbered by a newer one.
- [X} Secret redaction in command output (narrow, documented, not exhaustive). `redact_secrets` (`apps/forgegate-desktop/src-tauri/src/command_execution.rs`) now runs on every command's captured `stdout`/`stderr` before `run_command` returns it — redacts `KEY=VALUE` words whose key name suggests a secret (`*TOKEN*`, `*SECRET*`, `*PASSWORD*`, etc.), known credential prefixes anywhere in a word (`ghp_`/`gho_`/`npm_`/AWS `AKIA`...), the token following a `Bearer`/`Basic` auth scheme, and PEM private-key blocks in full. 7 new tests, including one real end-to-end check that a command actually echoing a fake secret comes back redacted through `run_command`, not just unit-tested in isolation. Explicitly not a general secret-scanning engine — it will not catch every possible secret format, and "preserved artifacts" (anything captured beyond live stdout/stderr, e.g. a saved log file) is not implemented since no artifact-preservation mechanism exists yet.
- [ ] Test-runner-specific evidence adapters (Jest/Vitest/Playwright-native result parsing). Only one generic normalized-JSON parser exists (`parseTestExecution` in `packages/core/evidence/src/lib/test-execution-json.ts`); nothing parses a tool's own native output format directly.
- [ ] Compliance profiles. No evidence found anywhere in `core/policy` or `core/config`. Not started.
- [ ] Guided manual review of a target component (distinct from the "review ForgeGate itself" gap tracked under P0.7/MVP-done). No manual-review tracking UI or procedure code found. Not started.
- [X} Release-decision evaluation (real, but a single guard rule, not a full policy engine). `packages/core/policy/src/lib/release-decision.ts`'s `createReleaseDecision` computes `authorized-candidate`/`blocked` from blocking-finding count and requires an approver for authorization — real, tested logic. No multi-rule policy engine or policy-versioning enforcement exists beyond this one rule.
- [X} Documentation drift detection. Delivered and tracked under [P1.6](#p16--documentation-drift-map) above — listed here only for cross-reference, not duplicated work.
- [ ] Starlight page generation (writing/scaffolding a real documentation page). Not implemented — drift detection only checks whether a page was *detected*, it never writes one.
- [ ] Safe repository generation (writes into a target repo with temporary output, diff, approval, and rollback). No evidence found — every file-write found in the repo is a test fixture, not real target-repository mutation.
- [ ] Evidence export (a portable evidence package a user can actually save/share). No evidence found — `createEvidencePackage` builds an in-memory type only; no serialization or export-to-file exists.

See [`TODO-DETAILED.md`](TODO-DETAILED.md) for the full task-level plan.

---

# Immediate next work queue

Stale as of this update — items 1–10 below (the original P0/early-P1 bootstrap sequence) are all long since shipped and verified; this section had drifted out of sync with the rest of the file. Replaced with what's actually next:

1. [ ] Manual keyboard and screen-reader review of the Button assurance record and ForgeGate's own shell (the one human-only item still blocking P0's own definition of done, per P0.7).
2. [ ] Pick one of the three P1 follow-up backlog subsystems (DTCG token parser, evidence history store, or route/rescan motion choreography) to scope and build next, or move directly to P2 entry-gate work — see "P1 follow-up backlog" above and "P2 entry gates" below.
3. [ ] Work the P2 entry gates in order once the above is settled.

<details>
<summary>Original bootstrap sequence (completed, kept for history)</summary>

1. [X} Create ForgeGate semantic UI tokens and global visual foundation.
2. [X} Introduce the persistent shell, workspace context bar, and primary routes.
3. [X} Move existing real scan output into the workspace command-center structure.
4. [X} Build the real-data workspace system map with semantic alternative.
5. [X} Move the component inventory to `/components` and implement designer-ready identity/status presentation.
6. [X} Add `/components/:componentId` and compose the Button header, preview area, coverage strip, and readiness rail.
7. [X} Complete one Storybook index and Button story connection.
8. [X} Populate one real state mapping and one real token mapping.
9. [X} Add accessibility, responsive, dark-theme, forced-colors, reduced-motion, and visual-regression coverage.
10. [X} Begin P1 assurance journey and evidence visualizations only as their real data streams become available.

</details>

---

# MVP definition of done

The first MVP is complete only when all of the following are true. Updated to reflect real current state rather than left as an unchecked list from before P0/P1 shipped:

- [X} ForgeGate installs and launches on Windows.
- [X} A user can open a Web Components repository. Validated this session against two real external monorepos (`public-sector-federation`, `phase-2-cosmic`), not just the in-repo fixture.
- [X} ForgeGate detects Git, package manager, Web Components tooling, Storybook, tests, tokens, and Starlight. Same real-repo validation.
- [X} ForgeGate discovers a Button component. True for the in-repo `acme-button` fixture used throughout P0/P1 development and testing.
- [X} The workspace and Button record meet the P0 designer-ready requirements.
- [X} ForgeGate associates the Button's stories, states, tokens, tests, and documentation mappings. Via repository-authored `.forgegate/components/*.yaml` overrides merged with CEM-derived data.
- [ ] ForgeGate runs configured unit, Storybook, Playwright, axe, lint, and build gates. Not implemented for target repositories — ForgeGate ingests *existing* `.forgegate/evidence/*.json` results (the test-evidence adapter) but does not itself trigger a target repo's test/build/lint runners yet.
- [X} ForgeGate normalizes results without discarding raw evidence. Every adapter that does ingest data today (test evidence, CEM, git status, config, workspace scan) preserves raw output/fingerprints alongside the normalized view (`AdapterDiagnostic.rawOutput`, `TestExecution.rawArtifactRef`).
- [ ] ForgeGate guides a manual keyboard and screen-reader review. The one human-only item still open from P0.7 — automated axe coverage exists, but no guided manual review flow.
- [ ] ForgeGate ties evidence to the current commit. `TestExecution.commitOrFingerprint` exists and is displayed (P1.3's evidence timeline), but nothing compares it against the workspace's actual current commit to determine freshness — that comparison is part of the evidence-history-store gap in the P1 follow-up backlog above.
- [ ] ForgeGate marks prior approval stale after a relevant source change. Not implemented generally — P1.6's documentation drift does this narrowly for documentation only; broader approval staleness needs the same evidence-history store.
- [ ] ForgeGate explains every blocking release condition. Partially true (`AssuranceJourney`'s blocking reasons, `ComponentDetailPage`'s `recommendedNextAction`) but not verified exhaustively against every possible blocking condition, so left honestly unchecked.
- [ ] ForgeGate generates a Starlight page. Not implemented — ForgeGate has no documentation-generation feature yet (called out repeatedly in P0.6/P1.6).
- [ ] ForgeGate exports a portable evidence package. Not implemented.
- [ ] ForgeGate itself passes its required accessibility and quality gates. Automated lint/test/build/typecheck/cargo-test/axe/visual-regression all pass in CI consistently; blocked on the same manual screen-reader review as above.

Blueprint Studio is not required for this MVP definition of done.
