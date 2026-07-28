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

- [X} Define internal ForgeGate semantic UI tokens for color, typography, spacing, radius, elevation, borders, focus, and motion. `apps/forgegate-desktop/src/styles/tokens.css` — `--fg-color-*`, `--fg-space-*`, `--fg-radius-*`, `--fg-shadow-*`, `--fg-type-*`, `--fg-motion-*`, matching the `fg.*` naming in `documentation/25-designer-ready-vertical-slice.md`. Status color tokens included; explicit non-color status treatment (icons/labels) is separate, still open below.
- [X} Define light and dark themes using the same semantic token contract. `prefers-color-scheme` default plus explicit `[data-theme="light"|"dark"]` override; every `:root` color token has a dark-theme counterpart, enforced by a contract test (not just visual review).
- [ ] Define explicit visual treatment for current, stale, warning, failed, blocked, unknown, unsupported, and not-connected states. Status _colors_ exist; icon/label pairing per document 25's "status is never color alone" rule is not implemented — no screen has status UI yet.
- [ ] Define reusable surface, card, panel, status, navigation, control, table, disclosure, and empty-state primitives. Only the current flat diagnostic screen has been restyled onto tokens; no reusable Angular primitive components exist yet.
- [ ] Establish typography hierarchy suitable for both designers and engineers. Only `sm/md/lg/xl` sizes defined; no applied hierarchy beyond h1/h2 on the one existing screen.
- [ ] Establish responsive desktop-window breakpoints rather than assuming a browser-sized viewport.
- [ ] Ensure status is never communicated by color alone.
- [X} Add visible keyboard focus that is distinct from selected state. Global `:focus-visible` rule in `styles.css` using `--fg-color-focus`, separate from the (not-yet-implemented) selected-state token.
- [X} Add forced-colors behavior. `@media (forced-colors: active)` maps focus/border/status tokens onto system colors (`Highlight`, `CanvasText`), verified by a contract test. Not yet manually reviewed in an actual forced-colors OS mode.
- [X} Add reduced-motion behavior. `@media (prefers-reduced-motion: reduce)` zeroes `--fg-motion-duration-*`, verified by a contract test.
- [ ] Add 200% and 400% zoom validation.
- [ ] Add visual regression coverage for the ForgeGate shell and primary states.

### P0.1 exit criteria

- [ ] Shared visual tokens are used by the shell, workspace, inventory, and component record. Only the existing single diagnostic screen consumes tokens so far — the shell/workspace/inventory/component-record screens themselves don't exist yet (P0.2–P0.5).
- [ ] Light, dark, forced-colors, reduced-motion, and narrow-window states are testable. Token-level contract tests exist (43 tests, `src/styles/tokens.spec.ts`); no rendered-screen visual regression coverage yet.
- [X} No production screen depends on prototype-only fixture styling. The one real screen (`app.html`/`app.css`) now reads token custom properties instead of being unstyled; verified visually in-browser (light theme, live dev server) with no console errors.

## P0.2 — Application shell and routes

- [X} Add persistent application navigation. `App` (`app.ts`/`app.html`/`app.css`) is now the shell: a left nav with Workspace/Components links, always present around `<router-outlet>`. Tests, Reviews, Documentation, and Releases are deliberately not in the nav yet — see the checklist item below.
- [X} Add a workspace context bar with repository, branch, commit, dirty state, and workspace actions. Shows workspace path, branch, short commit, and a dirty/clean indicator when a workspace is open, an explicit "No workspace open" state otherwise, and the "Open workspace…" action. Scan state (in-progress indicator) is not shown yet — `WorkspaceService` has no in-flight signal for the scan itself, only for CEM generation.
- [X} Add `/workspace` route. `WorkspacePage` (`app/workspace/workspace-page.ts`) — holds the scan detail, component inventory, CEM generation, and repository-config sections moved out of the old flat screen.
- [X} Add `/components` route. `ComponentsPage` — honest coming-soon placeholder; the real designer-ready inventory is P0.4.
- [X} Add `/components/:componentId` route. `ComponentDetailPage` — honest coming-soon placeholder reading `componentId` from the route; the real Button assurance record is P0.5.
- [ ] Keep Tests, Reviews, Documentation, and Releases visible only when they have a meaningful connected destination or honest coming-soon state. Not yet added to the nav at all (neither real nor coming-soon) — deferred until closer to P1/P2 work that would give them a destination.
- [ ] Move raw paths, commands, and adapter diagnostics behind progressive disclosure rather than removing them. `WorkspacePage` still shows all diagnostic detail flat, same as before — this is P0.3's real-data system map work, not done here.
- [ ] Preserve route state and selected component when scans refresh. Not yet applicable — no component selection state exists until P0.4.
- [X} Add route-change focus management. `App`'s constructor subscribes to `Router` `NavigationEnd` and moves focus to the `#main-content` landmark (`tabindex="-1"`), verified by an Angular test that navigates via `Router.navigateByUrl` and asserts `document.activeElement`, and confirmed live in a running dev server.
- [ ] Add loading, empty, error, partial, and unsupported layouts for every primary route. `WorkspacePage` has an explicit empty state; no loading/partial/unsupported states exist for any route yet.

### P0.2 exit criteria

- [X} The flat single-screen diagnostic console is no longer the primary application structure. Replaced by the shell + three real routes (`/workspace`, `/components`, `/components/:componentId`), verified visually in a live dev server (empty state, then a real route change with focus move, no console errors).
- [ ] A keyboard user can move through navigation, workspace context, inventory, and component detail without focus loss. Route-change focus management works; inventory and component-detail screens themselves don't exist yet to evaluate the rest of the flow.
- [X} Engineers can still reach raw diagnostics and exact source information. All prior diagnostic detail (scan results, manifest mapping failures, CEM generation output, repository-config errors) is preserved verbatim on `/workspace`, just relocated out of the old single screen.

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
- [ ] Preserve exact detected paths and adapter details in expandable diagnostics. Partially done: the raw scan `dl` is now behind a `<details>` disclosure on `/workspace`. Component inventory, CEM generation output, and repository-config detail are still shown flat, not yet moved behind disclosure.
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
- [ ] The primary table remains accessible and efficient for larger libraries. Basic accessibility (caption, scoped headers, row `<th>`) is in place; not load-tested against a large real library, and no virtualization/pagination exists — untested at scale.

## P0.5 — Button component assurance record

This slice generalizes to any component and is tested both with synthetic edge-case manifests and the deterministic Button fixture in `fixtures/acme-button-library/`.

- [X} Implement the component header and identity section. `ComponentDetailPage` (`app/components/component-detail-page.ts`) — name, full id, framework/adapter, source files, lifecycle, owner, all real fields from the matched `ComponentManifest`.
- [X} Implement the coded-preview surface with explicit source labeling. The component record embeds the mapped local Storybook story in a sandboxed iframe and labels its story ID, source import, index convention, target URL, runtime-verification limit, and open-in-Storybook action.
- [X} Distinguish live Storybook preview, static capture, blueprint reference, temporary generated preview, and unavailable preview. A typed preview model selects Live Storybook or an exact unavailable reason, while a semantic source-availability disclosure reports static, blueprint, and temporary sources as not connected or unsupported until real adapters exist.
- [X} Add the coverage strip for states, stories, tokens, tests, reviews, and documentation. Six real counts (`manifest.states.length`, `.storyMappings.length`, `.tokenMappings.length`, `.testRequirements.length`, `.manualReviewProcedureIds.length`, `.documentationTargets.length`) — all currently 0 for any CEM-only-mapped component, shown as real zeros, not hidden.
- [X} Add the readiness rail with explicit blocking reasons. Always "Unknown — no evidence connected" (honest — no findings/evidence pipeline exists) plus a real per-category list of why (no states declared, no Storybook connection, etc.), derived from the same manifest fields as the coverage strip. No "recommended next action" yet — that needs a policy engine that doesn't exist.
- [X} Add the required state/story matrix. Renders `manifest.states` as a real table when populated, an explicit "No required states declared" empty state otherwise (always the empty state today, since nothing populates `states` from a CEM).
- [X} Add anatomy and token-mapping sections. The existing repository-authored token table is paired with a contract-bounded anatomy view derived only from real CEM content slots and CSS parts. Every anatomy item links to its exact contract group; CSS custom properties are not misrepresented as structure, missing anatomy is explicit, and ForgeGate states that part-to-token relationships remain undeclared rather than inferring them.
- [X} Add contract detail. Inputs/outputs/content/public methods/style parts render as real tables from `manifest.contract`, which is the one genuinely rich, non-empty section — verified by a test using a manifest with real fields, a method, an event, a slot, and a CSS part. Evidence, accessibility, and release detail through progressive disclosure are not implemented — no evidence pipeline exists to disclose.
- [X} Show current commit and evidence freshness identity. The component record reads `WorkspaceService.gitStatus()` and shows branch, short commit, clean/dirty working-tree state, and an explicit per-commit freshness result. Until evidence records exist it reports “Not evaluated” with the exact commit and concrete reason rather than implying freshness.
- [X} Show unsupported and not-yet-connected sections honestly. Preview, token mapping, states, and documentation sections all read explicit "not connected/declared" text rather than blank space or a fabricated value.
- [X} Never display blueprint examples as repository implementation evidence. N/A by construction — there is no blueprint/example data path in this component at all yet (Blueprint Studio is P2).
- [ ] Add responsive layouts for wide, medium, and narrow desktop windows. Not implemented — single fixed-ish layout, not yet tested at narrow widths.

### P0.5 exit criteria

- [ ] A designer can understand what the Button is, what it looks like, what coverage exists, why it is blocked, and what to do next without opening source files. The live fixture preview, coverage, and blocking reasons are connected; a focused component-level next-action link is still missing.
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
- [ ] Validate that semantic alternatives contain the same meaningful information as graphical views. Partially validated by unit tests for the system map (table vs. SVG carry the same relationship/status/detail) and the component inventory (table vs. cards carry the same fields); not validated as a general principle across every screen.

### P0 definition of done

P0 is complete only when:

- [X} ForgeGate presents a coherent application shell rather than a single diagnostic page. Verified: persistent nav, workspace context bar, and real routes (P0.2), confirmed against the current build.
- [X} The workspace command center uses real repository scan data. Verified: `SystemMap` + real scan progress, no fixture data in the shipped path (P0.3).
- [X} The inventory presents real discovered components. Verified: `ComponentsPage` backed by `ComponentInventoryService`, tested and confirmed live (P0.4).
- [X} One Button has a usable component assurance record. Verified against the real `acme-button-library` fixture: header/identity, a live sandboxed Storybook preview, coverage strip, readiness rail with real reasons, states, anatomy, full contract, and commit/evidence freshness (P0.5). Not yet perfect — see P0.5's own exit criteria for the one still-open item (a focused per-component next-action link) — but genuinely usable, not a placeholder.
- [X} Storybook, state coverage, one token mapping, one test result, and one documentation state are connected or explicitly shown as unavailable with a concrete reason. The deterministic Button fixture now exercises every connection, and preview availability reports an exact reason instead of a generic placeholder.
- [ ] All primary screens pass the ForgeGate accessibility and quality gate. Automated coverage is now real and thorough (axe on every primary route, forced-colors/reduced-motion/narrow-window Chromium emulation, visual regression baselines in CI). The one remaining blocker is a human manual screen-reader pass (P0.7) — that cannot be completed by an agent, and semantic-alternative validation hasn't been generalized past the system map and inventory.

---

# P1 — Evidence-driven visualization and motion

P1 visualizations are not a later cosmetic redesign. They are introduced as soon as their underlying data is real and stable enough to support a decision.

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

- [ ] Visualize evidence creation, source changes, invalidation, reruns, reviews, and decisions over time.
- [ ] Explain the exact causal event that made evidence stale.
- [ ] Link timeline events to commits, files, runs, reviews, and raw evidence.
- [ ] Provide a chronological semantic list.

## P1.4 — Change-impact visualization

- [ ] Map changed files to affected components, stories, tests, reviews, documentation, and release decisions.
- [ ] Begin conservatively and show uncertainty.
- [ ] Never imply dependency precision the adapter does not possess.
- [ ] Provide an affected-items table.

## P1.5 — Token topology

- [ ] Visualize primitive, semantic, and component-token relationships.
- [ ] Show alias chains, unresolved references, theme/mode coverage, and hard-coded implementation values.
- [ ] Link tokens to anatomy parts and states.
- [ ] Provide an accessible token relationship table.

## P1.6 — Documentation drift map

- [ ] Compare repository contract, stories, tokens, tests, and published documentation.
- [ ] Show which source changed and which documentation sections are stale.
- [ ] Link to the generated diff or publication action.
- [ ] Provide a semantic drift list.

## P1.7 — Adapter constellation

- [ ] Show detected adapters and their declared capabilities.
- [ ] Distinguish supported, partial, unavailable, unconfigured, and failed capabilities.
- [ ] Link each capability to diagnostics and setup guidance.
- [ ] Avoid decorative vendor-logo walls.

## P1.8 — Motion system

- [ ] Implement shared motion tokens and choreography.
- [ ] Use motion for discovery, causality, selection, focus, transition, and freshness changes.
- [ ] Avoid endless background animation.
- [ ] Avoid motion that implies evidence was produced when only the UI changed.
- [ ] Respect operating-system and ForgeGate reduced-motion preferences.
- [ ] Test pause, interruption, rapid rescans, and route changes.

### P1 definition of done

P1 is complete only when:

- [ ] Each visualization answers a concrete user question.
- [ ] Each visualization is backed by real data and exposes unknowns.
- [ ] Each visualization has an equivalent semantic list or table.
- [ ] Motion remains understandable when disabled.
- [ ] No chart or animation replaces the explicit readiness decision or blocking explanation.

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

The detailed phased plan remains authoritative for the complete technical backlog. These areas continue in parallel where they unblock P0/P1 or protect the product:

- Desktop capability restrictions and content-security policy.
- SQLite persistence and migrations.
- Framework-neutral schema completion.
- Storybook adapter.
- Command streaming, cancellation, artifact preservation, and secret redaction.
- Test adapters and evidence normalization.
- Compliance profiles and guided manual review.
- Policy and release decisions.
- Starlight generation and documentation drift.
- Safe repository generation.
- Evidence export.

See [`TODO-DETAILED.md`](TODO-DETAILED.md) for the full task-level plan.

---

# Immediate next work queue

Work these in order unless a newly discovered safety or correctness defect blocks them:

1. [ ] Create ForgeGate semantic UI tokens and global visual foundation.
2. [ ] Introduce the persistent shell, workspace context bar, and primary routes.
3. [ ] Move existing real scan output into the workspace command-center structure.
4. [ ] Build the real-data workspace system map with semantic alternative.
5. [ ] Move the component inventory to `/components` and implement designer-ready identity/status presentation.
6. [ ] Add `/components/:componentId` and compose the Button header, preview area, coverage strip, and readiness rail.
7. [ ] Complete one Storybook index and Button story connection.
8. [ ] Populate one real state mapping and one real token mapping.
9. [ ] Add accessibility, responsive, dark-theme, forced-colors, reduced-motion, and visual-regression coverage.
10. [ ] Begin P1 assurance journey and evidence visualizations only as their real data streams become available.

---

# MVP definition of done

The first MVP is complete only when all of the following are true:

- [ ] ForgeGate installs and launches on Windows.
- [ ] A user can open a Web Components repository.
- [ ] ForgeGate detects Git, package manager, Web Components tooling, Storybook, tests, tokens, and Starlight.
- [ ] ForgeGate discovers a Button component.
- [ ] The workspace and Button record meet the P0 designer-ready requirements.
- [ ] ForgeGate associates the Button's stories, states, tokens, tests, and documentation mappings.
- [ ] ForgeGate runs configured unit, Storybook, Playwright, axe, lint, and build gates.
- [ ] ForgeGate normalizes results without discarding raw evidence.
- [ ] ForgeGate guides a manual keyboard and screen-reader review.
- [ ] ForgeGate ties evidence to the current commit.
- [ ] ForgeGate marks prior approval stale after a relevant source change.
- [ ] ForgeGate explains every blocking release condition.
- [ ] ForgeGate generates a Starlight page.
- [ ] ForgeGate exports a portable evidence package.
- [ ] ForgeGate itself passes its required accessibility and quality gates.

Blueprint Studio is not required for this MVP definition of done.
