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
- [ ] Define explicit visual treatment for current, stale, warning, failed, blocked, unknown, unsupported, and not-connected states. Status *colors* exist; icon/label pairing per document 25's "status is never color alone" rule is not implemented — no screen has status UI yet.
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

- [ ] Add persistent application navigation.
- [ ] Add a workspace context bar with repository, branch, commit, dirty state, scan state, and workspace actions.
- [ ] Add `/workspace` route.
- [ ] Add `/components` route.
- [ ] Add `/components/:componentId` route.
- [ ] Keep Tests, Reviews, Documentation, and Releases visible only when they have a meaningful connected destination or honest coming-soon state.
- [ ] Move raw paths, commands, and adapter diagnostics behind progressive disclosure rather than removing them.
- [ ] Preserve route state and selected component when scans refresh.
- [ ] Add route-change focus management.
- [ ] Add loading, empty, error, partial, and unsupported layouts for every primary route.

### P0.2 exit criteria

- [ ] The flat single-screen diagnostic console is no longer the primary application structure.
- [ ] A keyboard user can move through navigation, workspace context, inventory, and component detail without focus loss.
- [ ] Engineers can still reach raw diagnostics and exact source information.

## P0.3 — Workspace command center

- [ ] Replace the flat discovery output with a structured workspace command center.
- [ ] Group repository, design-system, assurance-tool, and documentation discoveries by user meaning.
- [ ] Show one policy-driven or discovery-driven recommended next action.
- [ ] Implement a real-data system map for currently detected relationships: repository, projects, component library candidates, components, Storybook, tokens, tests, documentation, and CI.
- [ ] Clearly label unknown, unsupported, missing, and not-connected nodes.
- [ ] Provide a semantic list or table equivalent for the system map.
- [ ] Add discovery/scan progress that explains what ForgeGate is checking.
- [ ] Animate relationship discovery only when it improves comprehension.
- [ ] Stop animation when the scan completes; no endless decorative movement.
- [ ] Preserve exact detected paths and adapter details in expandable diagnostics.
- [ ] Use only live scan data in production; fixture values remain confined to the reference prototype.

### P0.3 exit criteria

- [ ] A designer can understand what ForgeGate found without reading a raw definition list.
- [ ] A developer can inspect every underlying path, command, and adapter result.
- [ ] The system map remains understandable with motion disabled and through its semantic alternative.

## P0.4 — Designer-ready component inventory

- [ ] Replace the engineering-only inventory table with the designer-ready inventory defined in document 25.
- [ ] Show human-readable component name and technical tag or identifier together.
- [ ] Show framework, package/category, lifecycle, readiness, state coverage, review status, documentation status, and owner when known.
- [ ] Add search by component name or tag.
- [ ] Add initial filters for lifecycle, readiness, and missing evidence.
- [ ] Keep unknown values explicit instead of substituting optimistic defaults.
- [ ] Add optional compact card presentation without removing the dense accessible table.
- [ ] Add understandable empty states for no components, no manifest, mapping failure, and unsupported adapter.
- [ ] Link each component to its detail route.

### P0.4 exit criteria

- [ ] The inventory reads as a design-system catalog with assurance status, not a database dump.
- [ ] Mapping failures remain visible and do not remove valid sibling components.
- [ ] The primary table remains accessible and efficient for larger libraries.

## P0.5 — Button component assurance record

- [ ] Implement the Button component header and identity section.
- [ ] Implement the coded-preview surface with explicit source labeling.
- [ ] Distinguish live Storybook preview, static capture, blueprint reference, temporary generated preview, and unavailable preview.
- [ ] Add the coverage strip for states, stories, tokens, tests, reviews, and documentation.
- [ ] Add the readiness rail with explicit blocking reasons and one recommended next action.
- [ ] Add the required state/story matrix.
- [ ] Add anatomy and token-mapping sections.
- [ ] Add contract, evidence, accessibility, documentation, and release detail through progressive disclosure.
- [ ] Show current commit and evidence freshness identity.
- [ ] Show unsupported and not-yet-connected sections honestly.
- [ ] Never display blueprint examples as repository implementation evidence.
- [ ] Add responsive layouts for wide, medium, and narrow desktop windows.

### P0.5 exit criteria

- [ ] A designer can understand what the Button is, what it looks like, what coverage exists, why it is blocked, and what to do next without opening source files.
- [ ] An engineer can reach the manifest, source, story IDs, commands, evidence, and raw artifacts.
- [ ] No readiness percentage conceals a blocking condition.

## P0.6 — P0 data connections required for credibility

These are functional dependencies that must advance with the P0 interface. The UI may render honest disconnected states before each adapter is complete, but the first polished vertical slice is not credible until these connections work for one Button.

- [ ] Confirm one Lit or vanilla Web Components fixture repository for deterministic development and CI.
- [ ] Complete Web Components framework and adapter identity detection.
- [ ] Read one Storybook `index.json` and associate stories with the Button manifest.
- [ ] Connect one real Button story to the preview surface.
- [ ] Populate one required-state/story mapping.
- [ ] Populate one token mapping from repository-controlled DTCG data.
- [ ] Connect one configured test result to the Button record.
- [ ] Connect one documentation target and drift state.
- [ ] Preserve all raw adapter output and failures for diagnostics.

## P0.7 — P0 quality and accessibility gate

- [ ] Add Angular component tests for shell, routes, workspace cards, inventory, component header, coverage, and readiness states.
- [ ] Add keyboard navigation tests.
- [ ] Add automated accessibility checks for primary routes.
- [ ] Add manual screen-reader review for the shell, workspace, inventory, and Button record.
- [ ] Add forced-colors review.
- [ ] Add reduced-motion review.
- [ ] Add zoom and narrow-window review.
- [ ] Add visual regression baselines for supported themes and key states.
- [ ] Validate that semantic alternatives contain the same meaningful information as graphical views.

### P0 definition of done

P0 is complete only when:

- [ ] ForgeGate presents a coherent application shell rather than a single diagnostic page.
- [ ] The workspace command center uses real repository scan data.
- [ ] The inventory presents real discovered components.
- [ ] One Button has a usable component assurance record.
- [ ] Storybook, state coverage, one token mapping, one test result, and one documentation state are connected or explicitly shown as unavailable with a concrete reason.
- [ ] All primary screens pass the ForgeGate accessibility and quality gate.

---

# P1 — Evidence-driven visualization and motion

P1 visualizations are not a later cosmetic redesign. They are introduced as soon as their underlying data is real and stable enough to support a decision.

Primary reference:

- [`documentation/26-workspace-visualization-and-motion.md`](documentation/26-workspace-visualization-and-motion.md)

## P1.1 — Assurance journey

- [ ] Implement Discover → Specify → Preview → Test → Review → Document → Release journey status.
- [ ] Derive each stage from real connected capabilities and evidence.
- [ ] Let users open the work blocking a stage.
- [ ] Provide a semantic ordered-list alternative.

## P1.2 — Component landscape and readiness distribution

- [ ] Visualize components by lifecycle and readiness without collapsing them into a single health score.
- [ ] Show blocked, warning, stale, unknown, and not-evaluated components distinctly.
- [ ] Allow selection and filtering to update the accessible inventory.
- [ ] Provide a semantic table equivalent.

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
