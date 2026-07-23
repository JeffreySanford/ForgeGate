# ForgeGate Designer-Ready Vertical Slice

## Purpose

This document defines the first ForgeGate experience that should feel credible, useful, and visually intentional to a design-system designer.

It is not a redesign of the entire product. It is a narrow, implementable slice centered on one discovered button component and the evidence required to understand whether that button is ready for use.

The slice should prove that ForgeGate is more than a repository scanner, test launcher, or compliance spreadsheet. It should show that ForgeGate can connect design intent, coded implementation, Storybook states, tokens, tests, manual review, documentation, and release readiness in one understandable component record.

## Product outcome

After opening a supported repository, a user should be able to select the button component and understand, without reading raw configuration files:

1. What the component is and where it comes from.
2. What it looks like across required states and themes.
3. Which states, stories, tokens, tests, reviews, and documentation are present.
4. What is missing, stale, failing, or not yet connected.
5. Why the component is blocked or ready.
6. What the user should do next.

The experience should be attractive enough that designers willingly use it, but its visual polish must not hide incomplete evidence or imply certainty ForgeGate does not have.

## Primary user

The primary user for this slice is a design-system designer working with coded components.

They care about:

- Trustworthy visual examples tied to the actual implementation.
- Component anatomy and semantic purpose.
- Variant and state coverage.
- Primitive, semantic, and component-token relationships.
- Theme, viewport, density, and forced-color behavior.
- Accessibility requirements expressed in understandable language.
- Clear differences between designed, implemented, tested, documented, and approved states.
- A fast path to the next action rather than a wall of engineering metadata.

Engineers, accessibility specialists, technical writers, and release approvers remain important secondary users. The same screen should expose deeper evidence progressively rather than forcing every user to begin in raw logs.

## Why this slice should come next

ForgeGate already has meaningful backend and domain work:

- Local repository selection.
- Git branch, commit, and dirty-state detection.
- Workspace, Storybook, Starlight, token, test-runner, visual-provider, and CI discovery.
- Custom Elements Manifest discovery and generation.
- Mapping from a Custom Elements Manifest into real component manifests.
- A real component inventory.
- A repository configuration model.
- Framework-neutral evidence, policy, lifecycle, and readiness contracts.

The current desktop screen exposes much of that work as one unstyled document containing buttons, definition lists, alerts, command output, and a table. That is appropriate as an engineering proof, but it does not yet communicate the product category.

The next UI effort should not be a generic analytics dashboard. It should transform the existing data into a component-centered assurance workspace.

## Slice boundaries

### Included

- Persistent application shell.
- Workspace context and health summary.
- Component inventory suitable for selecting one component.
- One component detail route for a button.
- Live or clearly represented component preview.
- Required-state coverage.
- Story, token, test, manual-review, and documentation summaries.
- Release-readiness explanation.
- Honest empty, loading, unsupported, missing, stale, warning, failed, and blocked states.
- Accessible keyboard and screen-reader operation.
- Light and dark visual themes using shared ForgeGate tokens.
- Forced-colors compatibility.

### Excluded

- General-purpose visual design or vector editing.
- Full Figma replacement behavior.
- A complete workspace dashboard for every future capability.
- Full implementation of Storybook, test, review, documentation, or release adapters before the UI can be composed.
- Invented success data presented as if it came from the repository.
- A single readiness percentage that hides blocking conditions.
- Decorative charts without a concrete user decision.

## Core experience statement

> ForgeGate lets a designer open the coded button, see its actual states and tokens, understand what evidence exists, and immediately know why it is or is not ready for the design system.

## Information hierarchy

The interface should present information in this order:

1. **Component meaning** — name, purpose, lifecycle, implementation identity.
2. **Rendered behavior** — preview, states, variants, themes, viewports.
3. **Coverage** — stories, tokens, automated gates, manual review, documentation.
4. **Decision** — ready, warning, or blocked, with explicit reasons.
5. **Evidence** — detailed results, raw artifacts, commit identity, and history.
6. **Operations** — run, review, generate, export, or open source.

Repository plumbing should remain available, but it should not dominate the first visual impression.

## Application shell

### Layout

Use a desktop application layout with three stable regions:

1. **Navigation rail or sidebar**
2. **Workspace context bar**
3. **Route content area**

Recommended desktop proportions:

- Navigation: 232–256 pixels wide.
- Content maximum width: approximately 1,520 pixels, while still allowing wide evidence tables when needed.
- Main content padding: 24–32 pixels.
- Component detail grid: 12 columns with an 8-column primary area and 4-column assurance rail at wide widths.

At narrower widths, the assurance rail moves below the primary content. No critical information may disappear solely because the window is narrow.

### Navigation

The initial navigation should contain only destinations that help the vertical slice:

- Workspace
- Components
- Tests
- Reviews
- Documentation
- Releases

Policies, adapters, and settings may appear in a lower utility group. Future destinations should not appear as prominent empty areas.

Each navigation item requires:

- Text label.
- Recognizable icon.
- Visible current-route treatment.
- Keyboard focus treatment distinct from selection.
- Optional count only when the count has a clear meaning, such as three blocking findings.

### Workspace context bar

The top context bar should show:

- Repository name.
- Current branch.
- Short commit SHA.
- Clean or dirty working-tree status.
- Scan state.
- Workspace switcher.

The dirty state must use an icon and text, not color alone.

Example:

```text
UP Design System  /  main  /  7e3c91a  /  Working tree modified
```

Secondary actions:

- Rescan
- Open repository folder
- Workspace diagnostics

## Workspace route

The workspace route should replace the current long list of discovery facts with a structured onboarding and health view.

### Empty state

Before a repository is selected, show a centered but substantial welcome panel:

- ForgeGate mark and product statement.
- Short explanation of local-first access.
- Primary action: **Open repository**.
- Secondary link: **What ForgeGate reads and runs**.
- Three compact capability examples: discover components, verify evidence, publish documentation.

Avoid a tiny button floating in a blank window.

### Discovery summary

After a scan, group discoveries by user meaning rather than implementation order:

#### Repository

- Git branch and commit.
- Dirty state.
- Package manager.
- Workspace manager.

#### Design system

- Detected component libraries.
- Framework or adapter status.
- Component count.
- Token sources.

#### Assurance tools

- Storybook projects.
- Test runners.
- Visual regression providers.
- CI providers.

#### Documentation

- Starlight projects.
- Zeroheight connection status.

Each group should use a compact card with:

- Group title.
- Detected count.
- Two or three important values.
- An expandable details region for paths and diagnostics.

Long file paths should not dominate the card. Show the readable project name first and make the full path available through copy, tooltip, or details disclosure.

### Next-action panel

The workspace route should identify one recommended next step.

Examples:

- **Review 1 discovered component**
- **Generate a Custom Elements Manifest**
- **Confirm the Storybook mapping**
- **Create ForgeGate configuration**

The exact command and security-sensitive detail remain visible before execution, but they belong in a deliberate confirmation surface rather than in the middle of the discovery summary.

## Component inventory route

The inventory should feel like a design-system catalog with assurance status, not a database dump.

### Default presentation

Use a compact table on wide screens with an optional card view. The table remains the primary dense view because design systems may contain many components.

Recommended columns:

- Component
- Category or package
- Framework
- Lifecycle
- Readiness
- State coverage
- Review status
- Documentation status
- Owner

Do not make source paths and raw contract counts primary columns. Those belong in component detail or an expandable row.

### Component identity cell

The first cell should contain:

- Human-readable component name, such as **Button**.
- Technical tag or identifier, such as `up-button`.
- Optional small category label, such as Actions.

### Status language

Use explicit labels:

- Ready
- Ready with warnings
- Blocked
- Not evaluated
- Evidence stale
- Missing configuration

Every status should have an explanation available without leaving the route.

### Filters

The first slice needs only a few filters:

- Search by component name or tag.
- Lifecycle.
- Readiness.
- Missing evidence.

Do not build a large filter system before the inventory contains enough data to justify it.

## Button component detail route

Suggested route:

```text
/components/:componentId
```

The button detail route is the centerpiece of the designer-ready slice.

## Component header

The header should present:

- Breadcrumb: Components / Button.
- Component name: **Button**.
- Technical identity: `up.button.up-button` or the configured stable ID.
- Short purpose: “Triggers an immediate action.”
- Lifecycle badge: Candidate, Approved, Deprecated, or Retired.
- Framework and adapter.
- Package and version when known.
- Owner when known.
- Current commit identity.

Primary actions:

- Run required checks
- Start required review
- Generate or update documentation

Secondary actions:

- Open Storybook
- Open source
- Open manifest
- Export evidence

Only actions supported by connected adapters should be enabled. Disabled actions must explain what is missing.

## Main component layout

At wide widths, use an 8/4 split:

```text
┌────────────────────────────────────────────┬──────────────────────┐
│ Preview and design coverage                │ Readiness and next   │
│                                            │ actions              │
├────────────────────────────────────────────┼──────────────────────┤
│ States and stories                         │ Blocking findings    │
├────────────────────────────────────────────┼──────────────────────┤
│ Anatomy and tokens                         │ Required reviews     │
├────────────────────────────────────────────┼──────────────────────┤
│ Contract, evidence, documentation tabs     │ Evidence freshness   │
└────────────────────────────────────────────┴──────────────────────┘
```

The right rail should remain visible while the user examines the primary content when window height permits, but it must not become an inaccessible independently scrolling trap.

## Preview panel

### Purpose

The preview should immediately prove that ForgeGate is connected to the coded component.

### Preview surface

The panel should contain:

- A neutral canvas with sufficient breathing room.
- The live component or a clearly labeled unavailable state.
- Theme selector.
- Viewport selector.
- State selector.
- Density selector when supported.
- Direction selector when supported.
- Reduced-motion and forced-colors indicators where meaningful.

For the button slice, initial controls should include:

- Appearance: primary, secondary, outline, ghost, destructive where supported.
- Size: small, medium, large.
- State: default, hover representation, focus-visible representation, active representation, disabled, loading.
- Content: text, leading icon, trailing icon, icon-only.

ForgeGate must distinguish between:

- A genuinely interactive Storybook story.
- A static captured preview.
- A requirement example supplied by the blueprint.
- A preview that is not connected.

Never display a blueprint illustration as if it were the repository implementation.

### Preview metadata

Below or beside the canvas, show:

- Story name and story ID.
- Source of the preview.
- Commit or build identity.
- Last successful render time.
- Open-in-Storybook action.

## Coverage strip

Directly below the header or preview, show five coverage groups:

- States
- Stories
- Tokens
- Tests
- Documentation

Each group displays a plain-language status and count, for example:

```text
States          6 of 7 required
Stories         5 mapped, 1 missing
Tokens          12 mapped, 2 unresolved
Tests           4 passed, 1 not run
Documentation   Draft is stale
```

This is not a score. Selecting a group scrolls or routes to the relevant detail.

Use icon, label, and text together. Do not rely on red, amber, or green alone.

## Readiness rail

### Decision card

The first card in the rail should answer the release question.

Example:

```text
Release readiness

BLOCKED

2 required items prevent candidate approval.

• Screen-reader review is stale after a template change.
• Loading-state story is missing.
```

The card should also show:

- Policy name and version.
- Commit or dirty fingerprint evaluated.
- Decision date when a decision exists.
- Approver when applicable.
- Link: **Why is this blocked?**

### Next-action card

Show one recommended action, not a long unsorted queue.

Examples:

- Add the missing loading story.
- Repeat the Windows screen-reader review.
- Run stale Storybook checks.
- Confirm unresolved token mappings.

Additional actions may be shown under **Other required work**.

### Evidence freshness

Use specific freshness language:

- Current for commit `7e3c91a`.
- Stale because `button.ts` changed after approval.
- Unverified on the dirty working tree.
- No evidence has been recorded.

The user should be able to inspect the file or event that invalidated evidence.

## States and stories section

Use a matrix that connects requirements to repository evidence.

Recommended columns:

- Required state
- Visual example
- Story mapping
- Automated coverage
- Manual review
- Status

Button rows should include at least:

- Default
- Hover
- Focus visible
- Active
- Disabled
- Loading
- Icon only

A row may be:

- Complete
- Missing story
- Missing test
- Review required
- Stale
- Unsupported
- Not applicable with reason

The matrix should support a visual thumbnail where one exists, but text remains sufficient for screen-reader users.

## Anatomy section

Show a simple, labeled anatomy view for the actual component when metadata supports it.

For a button:

- Container
- Label
- Leading icon
- Trailing icon
- Loading indicator
- Focus indicator

The anatomy view may begin as a semantic diagram rather than a pixel-perfect design editor. Every part should link to its contract or token mapping.

If anatomy cannot be inferred, show **Anatomy not yet described** and offer a manifest or documentation action. Do not invent parts.

## Token mapping section

Designers should be able to follow the relationship from component styling to system intent.

Recommended columns:

- Component property
- Component token
- Semantic token
- Primitive token
- Theme values
- Source
- Status

Example:

```text
Background / default
button.primary.background
color.action.primary.background
color.blue.600
Light: #1457D9 · Dark: #8BB4FF
DTCG repository tokens
Mapped
```

Token status should distinguish:

- Mapped
- Inferred
- Hard-coded
- Missing
- Unresolved reference
- Theme gap
- Value drift

Token values need accessible names or text values; color swatches alone are insufficient.

## Contract section

Present the contract in designer-friendly groups before raw API detail:

- Content
- Appearance
- Behavior
- State
- Events
- Extension points

For engineers, provide expandable technical tables for:

- Inputs or properties
- Outputs or events
- Slots
- Methods
- CSS parts
- CSS custom properties

Avoid leading with eight numeric contract counts. Counts can summarize the section but should not replace the actual contract.

## Tests and evidence section

Group evidence by what it proves:

### Behavior

- Unit tests
- Interaction tests
- Browser tests

### Accessibility

- Automated accessibility checks
- Keyboard review
- Screen-reader review
- Forced-colors review
- Zoom and text-spacing review

### Visual quality

- Visual regression
- Theme coverage
- Viewport coverage

### Delivery quality

- Lint
- Type-check
- Build
- Package or contract checks

Each evidence item should show:

- Status.
- Tool or procedure.
- Commit identity.
- Freshness.
- Duration or review date.
- Owner or reviewer.
- Raw artifact or notes.
- Exact reason when blocked, incomplete, or stale.

## Documentation section

Provide a rendered preview first, then publication detail.

The generated button page should include:

- Overview and purpose.
- When to use and when not to use.
- Live or linked examples.
- Anatomy.
- Variants and states.
- Content guidance.
- Token mapping.
- API or contract.
- Keyboard behavior.
- Accessibility guidance.
- Assurance summary.
- Release status.

Show:

- Current target: Starlight, Storybook MDX, or Zeroheight adapter.
- Current, missing, stale, draft, or unpublished state.
- Last generated commit.
- User-authored regions that will be preserved.
- Proposed diff before write.

## Visual language

### Character

ForgeGate should feel:

- Precise.
- Calm.
- Trustworthy.
- Technical without looking like a terminal.
- Suitable for regulated and enterprise work without looking bureaucratic.
- Visually compatible with designers’ expectations for modern design tools.

Avoid:

- Excessive gradients.
- Large decorative illustrations inside work screens.
- Neon status colors.
- Dashboard walls of equal-weight cards.
- Tiny gray text.
- Status communicated only through color.
- Charts that do not answer a decision.

### Surface hierarchy

Use three primary surface levels:

1. Application canvas.
2. Section or panel surface.
3. Raised or selected control surface.

Borders should be subtle but visible in high-contrast conditions. Shadows should be restrained and must not be the only boundary between regions.

### Typography

Use a highly legible system or bundled application font with clear distinction among:

- Page title.
- Section heading.
- Component name.
- Body text.
- Metadata.
- Code identifiers.

Recommended starting scale:

- Page title: 28–32 pixels.
- Section title: 18–20 pixels.
- Body: 14–16 pixels.
- Metadata: 12–14 pixels, never below accessible reading comfort.
- Code: 13–14 pixels with horizontal overflow handled safely.

### Spacing

Use a 4-pixel base scale with common steps:

- 4, 8, 12, 16, 24, 32, 48.

Card padding should normally be 16–24 pixels. Major page regions should use 24–32 pixels of separation.

### Shape

Use moderate radii:

- Controls: 6–8 pixels.
- Cards: 10–12 pixels.
- Large preview surfaces: 12–16 pixels.

Pills should be reserved for tags, lifecycle labels, and compact filters. Do not turn every button into a pill.

## ForgeGate UI tokens

The slice should introduce a small internal token layer rather than hard-coded page colors.

Suggested semantic groups:

```text
fg.color.canvas
fg.color.surface
fg.color.surface.subtle
fg.color.surface.selected
fg.color.text
fg.color.text.muted
fg.color.text.inverse
fg.color.border
fg.color.border.strong
fg.color.action
fg.color.action.hover
fg.color.focus
fg.color.status.passed
fg.color.status.warning
fg.color.status.failed
fg.color.status.blocked
fg.color.status.stale
fg.color.status.unknown
fg.space.*
fg.radius.*
fg.shadow.*
fg.type.*
```

Status tokens do not remove the requirement for icons, labels, and explanatory text.

The light theme should be the visual reference implementation. The same semantic tokens must support a deliberate dark theme rather than a simple color inversion. Forced-colors mode must retain visible focus, selected state, boundaries, and status text.

## Motion

Motion should communicate state changes, not decorate the application.

Acceptable uses:

- Expanding detail regions.
- Updating scan progress.
- Moving focus to a newly created finding.
- Revealing a preview state change.

Requirements:

- Respect reduced motion.
- Avoid looping animation in work screens.
- Do not use motion as the only indication of a changed state.

## Loading and progress

Workspace scanning and gate execution should show progressive results when possible.

A scan should communicate stages such as:

```text
Reading repository
Detecting workspace
Finding component libraries
Finding Storybook and tests
Reading component manifests
Building inventory
```

Already-discovered content should remain visible while later stages continue. Avoid replacing the entire screen with a spinner.

## Empty, unsupported, and error states

Every major panel requires an honest non-success state.

### Missing integration

Example:

> Storybook was detected, but ForgeGate has not connected to its index yet.

Action:

- Connect Storybook
- View detected configuration

### Unsupported value

Example:

> This adapter found the `experimental-tone` property but does not yet understand its allowed values.

### Missing evidence

Example:

> No Windows screen-reader review has been completed for this component version.

### Stale evidence

Example:

> The prior review targeted commit `81ca2fe`. `src/button.ts` changed in the current commit.

### Command failure

Show:

- What ForgeGate attempted.
- Exact command and working directory.
- Exit code or timeout.
- Useful error excerpt.
- Full raw output action.
- A specific recovery action when known.

## Accessibility requirements for the slice

The designer-ready slice must itself demonstrate the product’s assurance values.

Required:

- Complete keyboard operation.
- Skip link or equivalent direct route to main content.
- Visible focus with sufficient contrast.
- Logical heading hierarchy.
- Navigation state and focus state announced distinctly.
- Data tables with correct headers and captions.
- Status icons hidden or labeled appropriately.
- No color-only meaning.
- Live-region announcements for scan and command completion.
- Accessible names for icon-only controls.
- Tooltips not required to understand essential content.
- 200% and 400% zoom support.
- Reflow without two-dimensional scrolling except where a true data table requires it.
- Forced-colors support.
- Reduced-motion support.
- Light and dark themes with tested contrast.

## Responsive and window behavior

ForgeGate is a desktop application, but users will resize the window and use zoom.

Recommended breakpoints are behavioral rather than device-branded:

- **Wide:** sidebar, 8/4 component grid, full table columns.
- **Medium:** compact sidebar, assurance rail below preview, fewer inventory columns.
- **Narrow:** drawer navigation, single-column component layout, tables become horizontally contained regions or summary cards.

The preview controls should wrap cleanly. Sticky regions must not cover focused content.

## Data mapping from current implementation

The first visual implementation can use existing real data immediately.

### Available now

- Workspace path.
- Branch.
- Commit.
- Dirty state.
- Package manager.
- Workspace manager.
- Storybook project paths.
- Starlight project paths.
- Zeroheight detected state.
- Token file paths.
- Test runners.
- Visual regression providers.
- CI providers.
- Custom Elements Manifest paths.
- Component IDs.
- Framework and adapter identity.
- Source files.
- Inputs.
- Outputs or events.
- Slots.
- Methods.
- Style parts and CSS properties.
- Repository configuration state.
- Command execution state for Custom Elements Manifest generation.

### Not yet available

- Live Storybook story index and preview.
- Required-state completion.
- Real token relationships from component to semantic and primitive tokens.
- Normalized test evidence connected to a component.
- Manual-review records.
- Evidence freshness from file changes.
- Policy evaluation connected to the displayed component.
- Generated documentation preview and diff.

The UI should render these as clear disconnected or not-evaluated states. Mock data may be used only in isolated visual-development stories and must be labeled as fixture data.

## Suggested Angular UI composition

The exact file organization may evolve, but the slice should decompose into coherent presentation and workflow units rather than continuing to grow the root `App` template.

Suggested responsibilities:

```text
App shell
├── Workspace context bar
├── Primary navigation
└── Router outlet

Workspace route
├── Open-workspace empty state
├── Discovery summary
├── Configuration status
└── Recommended next action

Component inventory route
├── Inventory toolbar
├── Inventory table or cards
└── Component status explanation

Component detail route
├── Component header
├── Preview panel
├── Coverage strip
├── Readiness rail
├── States and stories matrix
├── Anatomy panel
├── Token mapping table
├── Contract panel
├── Evidence panel
└── Documentation preview
```

Domain and adapter data should remain outside presentation components. Presentation components should receive explicit view models that already distinguish detected, inferred, unknown, unsupported, missing, stale, failed, and blocked values.

## Initial view models

The UI should avoid interpreting raw values repeatedly in templates. Create view models that make presentation decisions explicit.

Illustrative shape:

```ts
interface ComponentAssuranceViewModel {
  readonly identity: ComponentIdentityViewModel;
  readonly preview: PreviewViewModel;
  readonly coverage: readonly CoverageGroupViewModel[];
  readonly readiness: ReadinessViewModel;
  readonly states: readonly StateCoverageViewModel[];
  readonly tokens: readonly TokenMappingViewModel[];
  readonly evidence: readonly EvidenceGroupViewModel[];
  readonly documentation: DocumentationViewModel;
  readonly availableActions: readonly ComponentActionViewModel[];
}
```

This view model is a presentation contract. It must not replace the portable domain records or become a second center of truth.

## Storybook for ForgeGate’s own UI

ForgeGate should use Storybook or an equivalent isolated UI workbench for this slice even before the target-repository Storybook adapter is complete.

Create stories for:

- Application shell.
- Workspace empty state.
- Workspace scan in progress.
- Successful discovery summary.
- Partial discovery with warnings.
- Component inventory with mixed statuses.
- Button component ready.
- Button component blocked.
- Button component with stale evidence.
- Button component with missing Storybook.
- Token mapping with unresolved values.
- Long paths and long component names.
- Narrow window.
- Dark theme.
- Forced colors.

Fixture data in these stories must be clearly separate from connected repository data.

## Visual and interaction acceptance criteria

The slice is complete when:

1. Opening ForgeGate without a repository shows a deliberate onboarding state rather than an empty document.
2. Opening a repository produces a structured workspace summary with progressive and actionable discovery states.
3. The inventory presents human-readable component identity and assurance status.
4. Selecting the button opens a dedicated component route.
5. The button route leads with component meaning and preview rather than repository metadata.
6. The screen shows required state, story, token, test, review, and documentation coverage without using a misleading aggregate score.
7. The readiness card displays a clear decision and every blocking reason.
8. Missing integrations are labeled as missing or not connected rather than appearing successful.
9. Source paths, commands, logs, and raw records are available through progressive disclosure.
10. The UI remains usable with keyboard, screen reader, 200% zoom, narrow window, dark theme, reduced motion, and forced colors.
11. ForgeGate’s own UI stories cover ready, blocked, stale, missing, loading, error, and narrow-window states.
12. Automated accessibility and visual-regression checks run against the slice.
13. A designer can identify the button’s purpose, available states, token relationships, documentation status, and next required action without opening the source repository.
14. An engineer can still reach the exact source, command, manifest, and raw evidence behind every status.

## Recommended implementation sequence

This sequence deliberately reuses existing data before waiting for every adapter.

### Step 1 — Establish the shell

- Add navigation and workspace context.
- Add global semantic UI tokens.
- Implement light, dark, focus, and forced-colors foundations.
- Add accessible route structure.

### Step 2 — Redesign the existing workspace information

- Group current discovery output into meaningful cards.
- Add empty, scanning, partial, success, and failure states.
- Move raw paths into details surfaces.
- Preserve the current Custom Elements Manifest generation flow in a deliberate confirmation panel.

### Step 3 — Create the component inventory route

- Move the live mapped component manifests out of the root screen.
- Display human-readable identity and contract summary.
- Add the dedicated component route.

### Step 4 — Build the button detail composition

- Populate identity and contract from the real mapped manifest.
- Show unconnected coverage groups honestly.
- Add fixture-only Storybook stories for ready, blocked, and stale visual states.
- Add the readiness rail using existing domain result types where possible.

### Step 5 — Connect capabilities as adapters land

- Storybook index and preview.
- State and story mapping.
- Token relationships.
- Test evidence.
- Manual review.
- Freshness.
- Documentation generation and diff.
- Policy decision.

This sequence allows the product to become visually credible now without falsifying backend completion.

## Decision

ForgeGate should continue in its current architectural direction. The framework-neutral contracts, repository-owned truth, local-first desktop boundary, evidence model, stale-approval concept, and narrow button MVP are strong differentiators.

The UI direction now needs to change from **show every discovered field** to **help each user understand one component and its next decision**.

The designer-ready button record should become the reference screen for future ForgeGate work. Workspace, test, review, documentation, and release features should be judged by how clearly they strengthen that record rather than by how many standalone dashboard panels they add.
