# ForgeGate Blueprint Studio

## Purpose

Blueprint Studio is ForgeGate's structured visual authoring environment for proposing new design-system components.

It gives designers a familiar, visual workflow for defining a component's contract, variants, states, anatomy, tokens, semantics, behavior, stories, tests, documentation, and handoff package without requiring them to begin in framework source code, YAML, or a blank repository.

Blueprint Studio is not a general-purpose drawing application. It is a governed component-specification studio whose visual controls map directly to portable component contracts and reviewable repository artifacts.

The product promise is:

> A designer can start from a trusted component pattern, visually define a new component, preview the real coded result, and hand engineering a complete, reviewable proposal that already understands accessibility, tokens, stories, tests, documentation, and release assurance.

## Relationship to the current MVP

Blueprint Studio is a first-class post-MVP initiative.

The current MVP still assures existing components. It must first prove that ForgeGate can:

1. Discover a coded component accurately.
2. Represent its contract and required states.
3. Map stories, tokens, tests, documentation, and evidence.
4. Run automated and manual assurance.
5. Explain readiness and stale evidence.
6. Generate reviewable supporting artifacts safely.

Blueprint Studio should use those proven contracts in the opposite direction:

```text
Blueprint requirements
        ↓
Visual component proposal
        ↓
Portable component contract
        ↓
Framework-adapter generation plan
        ↓
Reviewable repository artifacts
        ↓
Engineering approval and refinement
        ↓
ForgeGate assurance lifecycle
```

Full component creation must not move into the MVP merely because the interface is documented now. The documentation exists now so the architecture, schemas, adapter capabilities, and visual language do not accidentally block the future authoring workflow.

## Product boundary

### Blueprint Studio is

- A visual editor for structured component contracts.
- A blueprint-guided component proposal workflow.
- A live coded-preview environment.
- A state and variant matrix editor.
- A token-mapping and theme-coverage editor.
- An anatomy, slot, part, and content-model editor.
- A semantics and interaction-requirements editor.
- A generator of reviewable manifests, stories, tests, styles, documentation, and implementation scaffolds.
- A designer-to-engineer handoff workflow connected directly to Git and ForgeGate assurance.

### Blueprint Studio is not

- A freeform vector-graphics canvas.
- A replacement for Figma, Penpot, Illustrator, or Photoshop.
- A pixel-to-code screenshot converter.
- A system that silently rewrites implementation code.
- A promise that every framework adapter can generate every component.
- A way to bypass accessibility, engineering review, testing, or release policy.
- A proprietary format that traps the component definition inside ForgeGate.

### Why the boundary matters

A freeform design canvas allows arbitrary layers, positions, effects, and visual composition. A production component requires a much more constrained and testable definition:

- Semantic role
- Public properties and events
- States and variants
- Keyboard interaction
- Accessible naming and announcements
- Token relationships
- Responsive behavior
- Slots and composition rules
- Story coverage
- Test coverage
- Documentation requirements
- Release evidence

Blueprint Studio focuses on that structured definition. It may feel familiar to Figma users, but every visible control must map to an explicit component concept.

## Primary users

### Designer working in a coded design system

The primary Blueprint Studio user understands visual systems, variants, states, tokens, and component anatomy but may not want to author framework code directly.

They need to:

- Start from a recognized component pattern.
- See required accessibility and behavior before designing.
- Define the intended public options visually.
- Preview real coded output across states and themes.
- Use repository-approved design tokens.
- Communicate intent without rebuilding it in a separate engineering specification.
- Hand off a complete proposal whose gaps are visible.

### Design-system engineer

The engineer needs to:

- Review the contract rather than infer it from screenshots.
- Inspect every proposed file and diff.
- Choose or modify framework templates.
- Reject unsafe or unsupported combinations.
- Preserve repository conventions.
- Run formatting, tests, builds, and assurance gates.
- Return targeted feedback to the designer.

### Accessibility specialist

The specialist needs to:

- Review semantics and interaction requirements early.
- See which behaviors come from the selected blueprint.
- Add or refine manual-review procedures.
- Prevent visually attractive but inaccessible component proposals from reaching implementation unnoticed.

### Design-system lead

The lead needs to:

- Govern which blueprints and token sets are available.
- Approve organization-specific variants and policies.
- Understand proposal status and ownership.
- Ensure new components do not duplicate or fragment the library.

## Core lifecycle

```text
Choose pattern
    ↓
Define purpose and semantics
    ↓
Define contract
    ↓
Compose variants and states
    ↓
Map anatomy and tokens
    ↓
Preview coded behavior
    ↓
Review required coverage
    ↓
Generate proposed artifacts
    ↓
Inspect diffs
    ↓
Hand off to engineering
    ↓
Refine implementation
    ↓
Run assurance
    ↓
Approve for release
```

The creation workflow does not end when files are generated. The proposal becomes an ordinary ForgeGate component record and enters the same evidence, policy, documentation, and release system as an existing component.

## Information architecture

Blueprint Studio should be available through a prominent **Create component** action rather than becoming an isolated application.

Suggested routes:

```text
/studio
/studio/new
/studio/proposals/:proposalId
/studio/proposals/:proposalId/contract
/studio/proposals/:proposalId/variants
/studio/proposals/:proposalId/anatomy
/studio/proposals/:proposalId/tokens
/studio/proposals/:proposalId/behavior
/studio/proposals/:proposalId/artifacts
/studio/proposals/:proposalId/handoff
```

A proposal may also be opened from:

- Workspace priority actions
- Component inventory
- Blueprint catalog
- A missing-pattern recommendation
- A Git issue or product request
- A duplicate-component warning

## Studio shell

The Studio shell should use three primary regions.

### Left: component structure

- Proposal sections
- Anatomy tree
- Variant groups
- States
- Content examples
- Required coverage
- Validation findings

### Center: live coded preview

- Actual adapter-rendered component preview
- Theme controls
- Viewport controls
- State controls
- Content controls
- Interaction playback
- Focus visualization
- Forced-colors preview where supported
- Accessible-name and semantics summary

### Right: contextual inspector

- Contract property controls
- Token picker
- Anatomy settings
- Behavior decisions
- Blueprint rationale
- Validation messages
- Source mapping

The center should not become an arbitrary artboard. The preview renders a component produced by the active framework adapter or a clearly identified blueprint-preview adapter.

## Proposal creation

### Step 1: Choose a pattern

The user begins from a blueprint catalog, not a blank canvas.

Initial patterns include:

- Button
- Link
- Text input
- Textarea
- Checkbox
- Radio group
- Toggle or switch
- Select
- Alert or status message
- Dialog
- Tabs
- Accordion
- Tooltip
- Menu button
- Table
- Search

Each catalog entry shows:

- Purpose
- Native semantic preference
- Complexity
- Required interaction model
- Required states
- Expected review environments
- Adapter support
- Organization availability
- Similar existing components

Blueprint Studio should warn when a proposed component overlaps an existing component or when a simpler native pattern is likely sufficient.

### Step 2: Describe the component's job

Before visual styling, the designer answers concrete questions:

- What user action or task does the component support?
- Is it an action, navigation, input, disclosure, status, selection, or composite widget?
- Is it intended for one design system or multiple brands?
- Which products or consuming applications need it?
- What existing component does it extend, replace, or differ from?

This creates the proposal rationale and helps detect incorrect pattern selection.

### Step 3: Confirm semantics

Blueprint Studio presents the blueprint's preferred semantic foundation and explains it in plain language.

For a button:

- Preferred element: native `button`
- Primary job: trigger an immediate action
- Keyboard activation: Enter and Space
- Accessible name: required
- Form behavior: explicit type required where applicable

The designer can request an exception, but cannot silently remove required semantics. Exceptions require rationale and become visible review items.

## Contract designer

The contract designer defines the public choices that consumers will use.

For a button, the visual inspector might expose:

- Appearance: filled, outlined, subtle, text
- Tone: neutral, brand, positive, caution, destructive
- Size: small, medium, large
- Density: comfortable, compact
- Width: intrinsic, full
- Icon placement: none, leading, trailing, icon-only
- Loading: supported or unsupported
- Disabled: supported or unsupported
- Button type: button, submit, reset
- Content: text, icon plus text, icon-only

Each control must map to one of:

- Component manifest property
- Attribute
- Event
- Slot
- CSS part
- Token slot
- State
- Story argument
- Documentation example

The Studio must show the exact portable contract name beside friendly design language so designers and engineers share one vocabulary.

## Variant and state matrix

The matrix is the center of Blueprint Studio's Figma-like familiarity.

Example:

```text
                 Filled  Outlined  Subtle  Destructive
Default             ✓        ✓        ✓          ✓
Hover               ✓        ✓        ✓          ✓
Focus visible       ✓        ✓        ✓          ✓
Active              ✓        ✓        ✓          ✓
Disabled            ✓        ✓        ✓          ✓
Loading             ✓        —        —          ✓
Icon only           ✓        ✓        ✓          ✓
Long content        ✓        ✓        ✓          ✓
```

The matrix should distinguish:

- Required by blueprint
- Added by organization policy
- Added by designer
- Unsupported by adapter
- Intentionally excluded with rationale
- Missing preview
- Missing story
- Missing test

Selecting a matrix cell opens its coded preview and associated content fixture. Adding a state can propose a Storybook story, visual baseline, interaction test, and documentation example.

## Anatomy editor

The anatomy editor defines meaningful component parts rather than arbitrary layers.

A button may include:

- Root control
- Label
- Leading icon
- Trailing icon
- Loading indicator
- Focus indicator

A dialog may include:

- Surface
- Heading
- Description
- Content region
- Action region
- Close control
- Backdrop

Each anatomy part may map to:

- Internal implementation role
- Public slot
- CSS part
- Accessible relationship
- Token group
- Documentation annotation
- Test selector policy

The editor should show a synchronized anatomy tree and preview overlay. Hovering or focusing an anatomy item highlights the corresponding preview region without relying on color alone.

Blueprint Studio must prevent designers from exposing every internal element as a public slot or part without review. Public extensibility increases long-term API cost and requires explicit intent.

## Token mapping

The designer selects repository-approved semantic or component tokens rather than entering raw styling values by default.

Example:

```text
Button background
  → color.action.primary.background
  → color.blue.600

Button foreground
  → color.action.primary.foreground
  → color.neutral.0

Focus indicator
  → color.focus.ring
  → color.blue.300
```

The Studio should support:

- Primitive, semantic, and component-token views
- Light and dark themes
- Brands and modes
- Alias chains
- Token descriptions and ownership
- Contrast preview
- Hard-coded-value warnings
- Missing-theme warnings
- Unresolved aliases
- Deprecated tokens
- Token drift

Raw values may be used for exploration, but a proposal cannot be marked ready for engineering while required token slots remain unmapped unless policy explicitly permits it.

## Visual styling controls

Blueprint Studio may expose structured styling controls such as:

- Spacing tokens
- Sizing tokens
- Border width and radius tokens
- Typography tokens
- Color tokens
- Elevation tokens
- Motion duration and easing tokens
- Icon size tokens
- Focus-indicator tokens

Controls must be schema-driven by the selected blueprint and adapter. Blueprint Studio should not expose arbitrary CSS declarations as the primary experience.

An advanced panel may allow engineers to inspect or propose CSS, but visual styling decisions remain connected to tokens and component parts.

## Behavior and interaction editor

Behavior is defined through guided decisions rather than raw event-handler code.

Example button questions:

- Does activation trigger an action or submit a form?
- Is loading controlled externally?
- Does loading prevent repeat activation?
- Does the visible label remain available while loading?
- Is icon-only use permitted?
- Is disabled state native or accessibility-disabled?

Example dialog questions:

- What receives initial focus?
- Can Escape close the dialog?
- Is outside-click dismissal allowed?
- Where does focus return?
- Can dialogs be nested?
- What happens on small screens?

Every answer maps to:

- Contract requirements
- Story requirements
- Test requirements
- Manual-review requirements
- Documentation guidance
- Generated implementation hooks

Blueprint Studio should explain why a required behavior exists and identify which requirement comes from the base blueprint, organization policy, or designer choice.

## Content and localization fixtures

A component proposal should include meaningful content examples, not only `Label` and `Lorem ipsum`.

Fixture categories include:

- Typical content
- Short content
- Long content
- Empty content where valid
- Localized content
- Bidirectional text
- Error messages
- Loading content
- Icon-only accessible names
- High zoom and narrow viewport

Fixtures become reusable Storybook args, tests, documentation examples, and review scenarios.

## Live coded preview

The preview must clearly identify its source.

Possible preview modes:

- Framework adapter preview
- Existing repository implementation
- Generated temporary implementation
- Blueprint reference preview
- Static fallback preview

Blueprint Studio must never represent a static mock as the final coded component.

The preview toolbar should include:

- Theme
- Brand or mode
- Viewport
- Zoom
- Direction
- Locale
- State
- Variant
- Density
- Content fixture
- Focus simulation
- Reduced-motion mode
- Forced-colors mode where technically possible

The preview should expose an accessibility summary:

- Computed role
- Accessible name
- States and properties
- Keyboard model
- Focus order position
- Live-region behavior where relevant

## Blueprint guidance and validation

Guidance appears contextually throughout the Studio.

Validation levels:

### Blocking

The proposal cannot advance without resolution or an approved exception.

Examples:

- No accessible-name strategy
- Required keyboard behavior removed
- Required state omitted
- Token contrast below policy threshold
- Unsupported adapter capability
- Generated output would overwrite unreviewed files

### Warning

The proposal may advance but requires attention.

Examples:

- Variant count may be excessive
- Public slot increases API surface
- Similar component already exists
- One theme is incomplete
- Manual review will be required

### Information

Educational context or a recommendation.

Examples:

- Native semantics reduce implementation complexity
- This state will add three generated stories
- This token is deprecated

Every validation item must explain:

- What is wrong or notable
- Why it matters
- What requirement produced it
- How to resolve it
- Whether an exception is allowed

## Proposed artifact package

Blueprint Studio produces a generation plan before producing files.

Example:

```text
Proposed component: action-button
Target: packages/components/src/action-button
Adapter: Lit Web Component

Create
- action-button.ts
- action-button.styles.ts
- action-button.stories.ts
- action-button.spec.ts
- action-button.playwright.ts
- action-button.md
- action-button.manifest.yaml

Update
- package exports
- Custom Elements Manifest configuration
- component registry
- Starlight navigation

Generate later
- visual baselines
- manual review evidence
- release decision
```

Each artifact shows:

- Generator or template version
- Inputs used
- Blueprint version
- Adapter capability
- Confidence or unresolved decisions
- Expected validation commands
- Files that may conflict

## Generation safety

Generation follows a strict transaction.

1. Freeze the proposal version.
2. Resolve the target adapter and repository conventions.
3. Generate into a temporary directory.
4. Validate paths and file ownership.
5. Show every proposed file.
6. Show diffs for every modification.
7. Identify files containing user-authored protected regions.
8. Require explicit approval.
9. Write only approved changes.
10. Run formatter, lint, tests, type-check, build, and adapter-specific checks.
11. Show results and rollback options.
12. Create or update the ForgeGate component record.

Safety requirements:

- No silent write.
- No overwrite without current-file comparison.
- No broad repository permissions when a narrow path is sufficient.
- No generated command without visibility.
- No generated artifact represented as passing until its validation actually runs.
- No generated accessibility evidence.
- No automatic approval or release decision.
- No hidden AI-authored changes.

## Designer-to-engineer handoff

Proposal states:

- Draft
- Design review
- Accessibility review
- Ready for engineering
- Engineering in progress
- Changes requested
- Ready for assurance
- Withdrawn

A handoff package contains:

- Proposal rationale
- Blueprint and version
- Portable contract
- Variant and state matrix
- Anatomy
- Token mappings
- Content fixtures
- Behavior decisions
- Accessibility requirements
- Generated artifact plan
- Open questions
- Exceptions
- Preview link or local reference
- Repository diff when generated

Engineers can comment on individual contract fields, matrix cells, anatomy parts, token mappings, and generated files rather than relying only on a general comment thread.

## Engineering refinement

Blueprint Studio must accept that generated scaffolding is a starting point.

After engineering changes:

- The component record is re-read from repository truth.
- Differences from the proposal are shown.
- Intentional differences can be accepted into the proposal contract.
- Unintended drift becomes a finding.
- Story, test, token, and documentation coverage is recalculated.
- The component enters normal assurance.

The designer's proposal does not override the repository. Git and the component manifest remain durable truth.

## Portable authoring model

Blueprint Studio state must be exportable and repository-friendly.

Suggested proposal document:

```yaml
schemaVersion: 1
id: proposal.action-button
status: draft
blueprint:
  id: blueprint.button
  version: 1.1.0
target:
  package: '@example/components'
  adapter: web-components-lit
  path: packages/components/src/action-button
identity:
  name: Action Button
  tagName: ex-action-button
  purpose: Trigger a primary or secondary application action.
semantics:
  preferredNativeElement: button
  roleException: null
contract:
  properties:
    appearance: [filled, outlined, subtle]
    tone: [brand, neutral, destructive]
    size: [small, medium, large]
    disabled: [true, false]
    loading: [true, false]
  events: [activate]
  slots: [leading-icon, default, trailing-icon]
states:
  required: [default, hover, focus-visible, active, disabled, loading]
anatomy:
  - id: root
    kind: control
  - id: label
    kind: content
  - id: leading-icon
    kind: optional-slot
tokens:
  root.background: color.action.primary.background
  root.foreground: color.action.primary.foreground
  root.focusRing: color.focus.ring
fixtures:
  - id: typical
    label: Save changes
  - id: long-content
    label: Save changes and continue to the next section
coverage:
  stories: [default, outlined, destructive, disabled, loading, icon-only]
  tests: [activation, keyboard, disabled, accessible-name, axe, visual]
  manualReviews: [keyboard, screen-reader, forced-colors, zoom]
generation:
  adapterVersion: 0.1.0
  templateVersion: 0.1.0
  approvedFiles: []
```

This is illustrative, not yet the final schema. The final model must preserve unknown values, provenance, comments or rationale, and extension namespaces.

## Blueprint authoring metadata

Existing blueprints define what a complete component requires. Blueprint Studio also needs metadata describing how those requirements appear in the visual editor.

Required authoring metadata includes:

- Inspector groups
- Friendly labels and descriptions
- Contract field types
- Allowed values
- Defaults
- Required values
- Conditional visibility
- Dependencies among fields
- Invalid combinations
- State requirements
- Variant-group rules
- Anatomy definitions
- Public-slot eligibility
- Token slots and allowed token types
- Content fixture templates
- Preview controls
- Validation rules
- Generated artifact templates
- Framework capability requirements
- Documentation prompts
- Review checkpoints

Example:

```yaml
authoring:
  inspectorGroups:
    - id: appearance
      label: Appearance
      fields:
        - path: contract.properties.appearance
          control: segmented
          options: [filled, outlined, subtle]
          required: true
        - path: contract.properties.tone
          control: select
          options: [brand, neutral, positive, caution, destructive]
          required: true
  tokenSlots:
    - id: root.background
      label: Background
      types: [color]
      required: true
      visibleWhen: appearance != text
  constraints:
    - when: iconPlacement == icon-only
      require: accessibleLabel
```

## Adapter capability contract

Framework adapters must advertise authoring support honestly.

Suggested capabilities:

```text
canPreviewBlueprint
canGenerateComponent
canGenerateStyles
canGenerateStories
canGenerateUnitTests
canGenerateBrowserTests
canGenerateManifest
canGenerateDocumentation
canUpdatePackageExports
canRoundTripContract
canPreserveProtectedRegions
```

Each capability includes:

- Support level: unsupported, experimental, partial, supported
- Adapter version
- Supported blueprint versions
- Supported repository profiles
- Required tools
- Known limitations
- Fixture coverage

Blueprint Studio hides or disables unsupported actions and explains why. It must never imply that visual authoring guarantees complete framework output.

## Figma and design-tool relationship

Blueprint Studio complements Figma rather than replacing it.

### Level 1: current token bridge

- Import repository-controlled DTCG token exports.
- Map component token slots.
- Detect repository and design-tool export drift.
- Keep flow one-directional into ForgeGate.

### Level 2: linked design reference

- Associate a Figma component or component set with a ForgeGate proposal or component record.
- Store design node identity and source-file identity where available.
- Import or compare component property and variant metadata when reliable.
- Show designed-versus-coded differences without claiming perfect equivalence.
- Link Figma variants to ForgeGate states and Storybook stories.

### Level 3: structured interoperability

- Export a portable ForgeGate component specification suitable for a Figma plugin or Code Connect-style workflow.
- Map Figma component properties to manifest properties.
- Map Figma variants to state and story identifiers.
- Map design variables to DTCG token references.
- Preserve identity across updates.

### Level 4: optional governed synchronization

A future adapter may propose updates between ForgeGate and a design tool only when:

- The vendor API supports the operation reliably.
- Identity mapping is explicit.
- Every proposed update is previewable.
- The user chooses direction.
- Conflicts are visible.
- No design or repository content is overwritten silently.

Full bidirectional synchronization is not required for Blueprint Studio's first release.

## Accessibility of Blueprint Studio

Blueprint Studio itself must support:

- Complete keyboard operation
- Logical focus movement among structure, preview, and inspector
- Screen-reader-readable state and variant matrices
- Text alternatives for preview overlays and anatomy highlighting
- No drag-only operation
- High contrast and forced colors
- 200% and 400% zoom
- Reduced motion
- Accessible error summaries
- Undo and recovery
- No color-only validation state
- Semantic table alternatives for visual matrices

A designer using assistive technology must be able to create and review the same proposal without relying on the visual canvas.

## Motion and interaction

Motion should clarify relationships:

- Selecting a contract option updates the preview and highlights affected matrix cells.
- Selecting an anatomy part identifies the corresponding preview region.
- Adding a state reveals newly required stories and tests.
- Changing a token shows affected component parts and themes.
- Generating artifacts shows the proposal moving into a reviewable file package.

Motion must stop after communicating the change, respect reduced-motion settings, and never hide status changes.

## Undo, drafts, and recovery

Blueprint Studio needs proposal-level history independent of Git writes.

Requirements:

- Automatic local draft saving
- Named checkpoints
- Undo and redo
- Compare proposal revisions
- Restore a prior proposal revision
- Export proposal before generation
- Recover after application interruption
- Clearly distinguish uncommitted Studio drafts from repository truth

Once artifacts are written, Git becomes the primary implementation history.

## Collaboration model

The local-first first release may store proposals in the repository or export them as review packages.

Possible initial collaboration:

- Commit proposal documents to a proposal branch.
- Open a pull request containing only the proposal.
- Comment through GitHub or another repository provider.
- Generate implementation artifacts in a later commit.

A future coordination service may add live comments, assignments, and presence, but cloud collaboration is not required for the first Blueprint Studio slice.

## First Blueprint Studio vertical slice

The first implementation should create one button proposal for Lit or vanilla Web Components.

The slice succeeds when a designer can:

1. Open **Create component**.
2. Choose the Button blueprint.
3. Enter a name, purpose, tag name, and target package.
4. Confirm native button semantics.
5. Choose appearance, tone, size, icon placement, disabled, and loading support.
6. Review required states.
7. Add content fixtures.
8. Map required tokens for light and dark themes.
9. Inspect anatomy.
10. Preview real temporary coded output.
11. Review required stories, tests, manual reviews, and documentation.
12. Generate a proposal package to a temporary location.
13. Inspect every proposed file and diff.
14. Approve selected files.
15. Run formatting, type-check, tests, Storybook build, and package build.
16. Open the newly created component record.
17. See all remaining assurance work honestly marked pending or not evaluated.

The slice does not need:

- Freeform layer drawing
- Figma API write-back
- AI-generated custom implementation logic
- Multiple framework generation
- Cloud collaboration
- Automatic release approval
- Fully generated accessibility evidence

## Visual acceptance criteria

1. The screen feels familiar to component designers without imitating Figma's entire canvas.
2. A designer can understand the selected blueprint and required semantics before styling.
3. The live preview is clearly identified as coded, generated, reference, or static.
4. Variant and state coverage is visible as a matrix.
5. Required and optional states are distinguishable without color alone.
6. Anatomy selection synchronizes with the preview.
7. Token selection shows aliases, themes, and affected parts.
8. Behavior decisions explain resulting tests and review requirements.
9. Unsupported adapter capabilities remain visible.
10. The generation plan appears before any repository write.
11. Every proposed modification has a diff.
12. The workflow remains usable with keyboard, screen reader, zoom, high contrast, and reduced motion.
13. The resulting component enters the ordinary ForgeGate assurance lifecycle.
14. No generated output is represented as approved, accessible, tested, or releasable before evidence exists.

## Implementation sequence

### Phase A: proposal model

- Define portable proposal schema.
- Add blueprint authoring metadata.
- Add adapter authoring capabilities.
- Add proposal persistence and revision history.

### Phase B: read-only Studio

- Render blueprint catalog.
- Render contract controls.
- Render state matrix.
- Render anatomy and token mappings.
- Use a blueprint reference preview.

### Phase C: temporary coded preview

- Generate one Web Component into a temporary workspace.
- Run a local preview safely.
- Show generated source and styles.

### Phase D: artifact proposal and diff

- Generate manifest, component, stories, tests, and docs.
- Display proposed file package.
- Approve selected changes.
- Run targeted validation.

### Phase E: handoff and assurance

- Add proposal statuses.
- Create component record from repository output.
- Show proposal-to-implementation drift.
- Enter standard assurance workflow.

### Phase F: design-tool interoperability

- Link Figma references.
- Compare variants and properties.
- Add optional plugin or Code Connect-style export.
- Consider governed synchronization only after identity and conflict behavior are proven.

## Roadmap placement

Blueprint Studio should begin after the first commercially meaningful assurance slice and safe artifact generation are proven.

Recommended placement:

1. Complete existing-component assurance.
2. Validate one real component library and at least one real user.
3. Stabilize blueprint, manifest, token, and evidence contracts.
4. Implement safe generation for missing artifacts.
5. Build the first Blueprint Studio button proposal slice.
6. Validate designer-to-engineer handoff.
7. Expand to input and dialog.
8. Add a second framework generation adapter.
9. Add linked Figma metadata.
10. Consider advanced design-tool synchronization.

## Success measures

Blueprint Studio should eventually demonstrate:

- Reduced time from component request to engineering-ready contract.
- Fewer missing states during implementation.
- Fewer designer-engineer interpretation gaps.
- Greater token reuse and fewer hard-coded values.
- Earlier identification of accessibility requirements.
- More complete Storybook and test coverage at first implementation.
- Fewer post-handoff changes to public API.
- Faster movement from proposal to assurance-ready component.
- Traceable agreement among design intent, coded implementation, evidence, and documentation.

## Decision

ForgeGate will preserve Blueprint Studio as a first-class post-MVP product initiative.

It will provide a Figma-familiar but intentionally constrained environment for authoring governed component proposals. It will generate reviewable coded artifacts through framework adapters and then transition those artifacts into ForgeGate's ordinary assurance lifecycle.

ForgeGate will not become a general graphics editor, will not silently write repository code, and will not claim that generated components are complete until their actual evidence and reviews support that conclusion.
