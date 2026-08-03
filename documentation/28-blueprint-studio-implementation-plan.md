# Blueprint Studio Implementation Plan

## Purpose

This document turns [`27-blueprint-studio.md`](27-blueprint-studio.md) into staged engineering work while preserving ADR [`decisions/0004-mvp-generation-scope.md`](decisions/0004-mvp-generation-scope.md): the current MVP assures existing components and does not yet generate new ones.

Blueprint Studio implementation begins only after ForgeGate demonstrates the existing-component assurance lifecycle and safe supporting-artifact generation.

## Entry criteria

Do not begin production Blueprint Studio implementation until all of the following are true:

- A real Web Component can be discovered and represented accurately.
- A component manifest can round-trip without losing required data.
- Story, token, test, documentation, and evidence mappings are functional.
- Repository writes use temporary generation, explicit diffs, approval, validation, and rollback.
- A real user has reviewed the existing-component workflow.
- Adapter capability reporting distinguishes unsupported, experimental, partial, and supported features.

Documentation prototypes and schema exploration may proceed before these criteria, but must remain clearly labeled as future work.

## Workstream 1 — Portable proposal domain

### Outcome

ForgeGate can store, validate, version, export, and reopen a component proposal without generating framework files.

### Deliverables

- `ComponentProposal` domain model
- Proposal identity and lifecycle status
- Blueprint identity and version
- Target package, adapter, and destination path
- Purpose and semantic decisions
- Contract properties, events, slots, methods, and parts
- Variant groups and states
- Anatomy
- Token mappings
- Content fixtures
- Coverage requirements
- Exceptions and rationale
- Generation plan metadata
- Revision history
- Unknown-value and provenance support

### Suggested entities

```text
ComponentProposal
├── ProposalIdentity
├── BlueprintReference
├── TargetDefinition
├── SemanticDecision[]
├── ContractDraft
├── VariantGroup[]
├── StateRequirement[]
├── AnatomyPart[]
├── TokenSlotMapping[]
├── ContentFixture[]
├── CoverageRequirement[]
├── ProposalFinding[]
├── ProposalException[]
├── GenerationPlan
└── ProposalRevision[]
```

### Storage

Initial storage should be repository-friendly YAML or JSON under a configurable path such as:

```text
.forgegate/proposals/<proposal-id>.yaml
```

Local drafts may be cached in the optional PostgreSQL-backed history/workflow store or a future local store, but the user must be able to export them and critical state must not exist only in the database.

### Acceptance criteria

- A proposal can be created, saved, reopened, exported, and compared with a prior revision.
- Unknown adapter or blueprint fields are preserved.
- Validation errors identify exact proposal paths.
- Proposal state is distinguishable from component manifest state.
- No repository implementation files are created.

**Implementation status**: a real, narrower first slice of `ComponentProposal` exists (`packages/core/manifest/src/lib/component-proposal.ts`), covering proposal identity/lifecycle, blueprint reference, target definition, purpose, native semantic confirmation, contract draft, required states, variant selections, anatomy parts, token-slot mappings, behavior decisions, and a real, named content-fixture list (id/label/value) — staged/approved into `.forgegate/proposals/<proposal-id>.yaml` through the same discipline every other domain write uses. Coverage requirements, findings, exceptions, generation plan metadata, and revision history remain real, named gaps, not yet built.

## Workstream 2 — Blueprint authoring metadata

### Outcome

A blueprint can describe both assurance requirements and how Blueprint Studio should render its editor.

### Deliverables

- Inspector groups
- Friendly labels and descriptions
- Field control types
- Allowed values and defaults
- Conditional visibility
- Cross-field constraints
- State and variant rules
- Anatomy definitions
- Token slots and allowed DTCG types
- Fixture templates
- Preview-control definitions
- Validation messages
- Generation capability requirements
- Review checkpoints

### Validation principles

- The authoring schema is declarative.
- Framework-neutral requirements remain separate from adapter templates.
- Organization overrides can extend but not silently weaken base semantics.
- Unsupported controls remain visible in diagnostics.
- Blueprint versions can migrate proposals explicitly.

### Acceptance criteria

- The Button blueprint renders a complete read-only inspector from metadata.
- Required fields and invalid combinations are enforced.
- The authoring model can represent input and dialog without schema redesign.
- Blueprint changes show migration impact on existing proposals.

## Workstream 3 — Studio navigation and shell

### Outcome

The Angular desktop application provides an accessible Studio workspace.

### Deliverables

- `/studio` proposal inventory
- `/studio/new` blueprint catalog
- Proposal route and section navigation
- Three-region structure, preview, and inspector layout
- Responsive window behavior
- Keyboard navigation
- Error summary
- Local draft status
- Undo and redo
- Revision comparison

### Acceptance criteria

- The complete workflow is usable without drag-and-drop.
- The layout works at 1280px desktop width and at narrow desktop windows.
- Zoom, forced colors, and reduced motion do not hide functionality.
- Proposal validation is readable by a screen reader.
- Navigation warns before discarding unsaved local changes.

**Implementation status**: `/studio` exists with a real blueprint catalog and a proposal form (`apps/forgegate-desktop/src/app/studio/studio-page.ts`). `/studio/new`, a separate proposal-inventory view, three-region layout, undo/redo, and revision comparison are not built — today the form is a single scrollable panel under the selected blueprint, and there is exactly one proposal draft in flight at a time.

## Workstream 4 — Button contract editor

### Outcome

A designer can define one Button proposal without editing YAML.

### Deliverables

- Name, purpose, tag name, package, and path fields
- Native semantic confirmation
- Appearance, tone, size, density, width, icon placement, disabled, loading, and type options
- Friendly labels paired with portable field names
- Contextual blueprint rationale
- Duplicate-component warning
- Organization-policy inheritance

### Acceptance criteria

- Every inspector control maps to a proposal field.
- Required semantic decisions cannot disappear silently.
- Invalid combinations are explained.
- Changes update dependent state and coverage requirements.
- The proposal can be exported and reopened without loss.

**Implementation status**: name, purpose, package path, adapter, and native semantic confirmation are real form fields. The portable contract (inputs/outputs/content/public methods/style parts) is editable as a generic add/remove/edit member list, not yet Button-specific inspector controls (appearance/tone/size/density/width/icon placement/disabled/loading/type). Friendly labels mapped from the blueprint's own `inspectorGroups`, contextual rationale, duplicate-component warnings, invalid-combination explanations, and organization-policy inheritance are not built.

## Workstream 5 — State and variant matrix

### Outcome

Designers can visually define and inspect component coverage.

### Deliverables

- Matrix of variants by states
- Blueprint-required indicators
- Organization-required indicators
- Designer-added indicators
- Unsupported combinations
- Exclusion rationale
- Missing story, test, preview, or documentation markers
- Keyboard-accessible cell interaction
- Semantic table alternative

### Acceptance criteria

- Selecting a cell updates the current preview context.
- Adding or removing a state recalculates coverage requirements.
- Color is never the only status indicator.
- Large matrices remain navigable.
- Matrix data is portable in the proposal document.

**Implementation status**: required states default from the blueprint and are toggleable, plus a free-text "add a custom state" affordance; each blueprint inspector field gets one text input for its chosen variant value. This is a flat portable list (`requiredStates`, `variantSelections` on `ComponentProposal`), not a matrix — no blueprint/organization/designer indicator distinction, unsupported-combination exclusion rationale, per-cell story/test/preview/documentation markers, or preview-context selection on cell click.

## Workstream 6 — Anatomy editor

### Outcome

Designers can define meaningful component parts and public extensibility.

### Deliverables

- Anatomy tree
- Preview overlay synchronization
- Part type and role
- Optional and required parts
- Public slot and CSS part designation
- Accessible relationships
- Token-slot associations
- Public API cost warning

### Acceptance criteria

- Button anatomy supports root, label, leading icon, trailing icon, loading indicator, and focus indicator.
- Preview highlighting has a text equivalent.
- Public exposure requires explicit confirmation.
- Anatomy changes update token and documentation requirements.

**Implementation status**: a real, flat add/remove/edit list of named anatomy parts (id/label/required/public-slot/public-part) exists on `ComponentProposal.anatomyParts`. No anatomy tree, preview overlay, part type/role, accessible-relationship graph, token-slot association per part, or public-API cost warning is built yet.

## Workstream 7 — Token mapping

### Outcome

A designer can map required component slots to approved DTCG tokens.

### Deliverables

- Token browser
- Search and filtering
- Primitive, semantic, and component layers
- Alias-chain display
- Theme and brand modes
- Token descriptions and ownership
- Contrast implications
- Deprecated and missing-token warnings
- Raw exploratory value state

### Acceptance criteria

- Required token slots are known from the blueprint.
- Light and dark coverage is visible.
- Unresolved aliases remain visible.
- A hard-coded value cannot masquerade as a governed token.
- Token mappings can be used by the generation adapter.

**Implementation status**: `ComponentProposal.tokenMappings` maps each of the blueprint's own required token slots to a real, discovered DTCG token path (`WorkspaceService.designTokens`), offered via a `<datalist>` of every token this workspace found. No token browser, search/filtering, alias-chain display, theme/brand mode awareness, contrast implications, or deprecated/missing-token warnings exist — a mapping's chosen path is not yet validated against the slot's declared `types`.

## Workstream 8 — Behavior and accessibility editor

### Outcome

The proposal captures behavior early enough to drive stories, tests, reviews, and implementation hooks.

### Deliverables

- Guided semantic decisions
- Keyboard behavior summary
- Accessible-name strategy
- Focus behavior
- Loading and disabled behavior
- Announcement strategy
- Interaction consequences
- Required manual-review environments
- Exception request workflow

### Acceptance criteria

- Button activation requirements are inherited from the blueprint.
- Icon-only use requires an accessible-name strategy.
- Loading decisions produce test and documentation requirements.
- Exceptions retain rationale and approver requirements.
- The UI explains why each behavior matters.

**Implementation status**: a real, narrow first slice exists — `ComponentProposal.behavior` (`ProposalBehaviorDecisions`) captures five free-text decisions (keyboard behavior summary, accessible-name strategy, focus behavior, loading/disabled behavior, announcement strategy) in `StudioPage`'s "Define behavior and accessibility decisions" fieldset. Not yet built: guided semantic decisions with structured options, cross-field validation (icon-only requiring an accessible-name strategy is not enforced), interaction consequences, required manual-review environments, and the exception-request workflow.

## Workstream 9 — Reference preview

### Outcome

The Studio can demonstrate proposal changes before framework generation exists.

### Deliverables

- Blueprint reference renderer
- Clear `Reference preview` label
- Theme, state, variant, viewport, locale, direction, and content controls
- Anatomy overlay
- Accessibility summary
- Static fallback when a control cannot render

### Acceptance criteria

- The reference renderer never claims to be repository implementation.
- All preview states are derived from proposal data.
- Unsupported behavior is labeled.
- Preview controls work with keyboard and screen reader.

**Implementation status**: a real, narrow first slice exists in `StudioPage`'s "Reference preview" panel, built entirely from the in-progress proposal form's own data — a labeled preview surface (never claiming to be repository implementation), real resolved-DTCG-token color application for the `background`/`foreground` slot-name convention, a real state selector over the proposal's own required states, a semantic anatomy-parts list, and a real accessibility summary. Not yet built: theme/brand mode, viewport/locale/direction controls, spatial anatomy-overlay coordinates, and per-state visual variation (today's state selector only labels which state is being inspected — it does not change what renders, since the proposal model has no per-state token data yet).

## Workstream 10 — Temporary coded preview

### Outcome

One Web Components adapter creates a temporary implementation and runs a safe local preview.

### Deliverables

- Lit or vanilla Custom Elements generator
- Temporary workspace
- Generated component and styles
- Temporary Storybook or isolated preview
- Safe process execution
- Exact command visibility
- Source inspection
- Cleanup

### Acceptance criteria

- No repository file is written during preview.
- The preview clearly says `Generated temporary implementation`.
- Generation errors are actionable.
- Temporary output can be inspected.
- Cleanup does not remove user files.

## Workstream 11 — Artifact generation plan

### Outcome

The designer and engineer can see exactly what ForgeGate proposes before generation.

### Deliverables

- File create/update list
- Template and adapter versions
- Target paths
- Conflict detection
- Protected-region analysis
- Required commands
- Unsupported artifact notices
- Per-file approval state

### Acceptance criteria

- The plan precedes file generation.
- Existing files are never assumed safe to replace.
- Partial adapter support is visible.
- The user can exclude optional files.
- The plan can be exported for review.

## Workstream 12 — Reviewable generation transaction

### Outcome

Approved artifacts can be written safely and validated.

### Deliverables

- Temporary generation
- File and path validation
- Diff viewer
- Explicit approval
- Selective write
- Formatting
- Lint
- Type-check
- Unit tests
- Storybook build
- Package build
- Rollback

### Acceptance criteria

- No silent write occurs.
- Every modification has a diff.
- Validation results are tied to the generated commit or working tree.
- Failed validation does not appear successful.
- Rollback restores the previous state.
- The operation is auditable.

## Workstream 13 — Handoff and proposal review

### Outcome

Design and engineering can review the same structured proposal.

### Deliverables

- Proposal statuses
- Review checkpoints
- Field-level comments or portable review references
- Open questions
- Requested changes
- Approval records
- Pull-request-friendly export
- Proposal-to-implementation comparison

### Acceptance criteria

- A proposal can be reviewed before code generation.
- Engineering changes can be compared with design intent.
- Accepted differences update the contract deliberately.
- Unresolved drift becomes a visible finding.

**Implementation status**: the "pull-request-friendly export" deliverable has a real first slice — an approved proposal exports as a checksum-verifiable handoff package (`proposal-handoff-export.ts`) an engineer can pick up outside the app. Review checkpoints, field-level comments, open questions, requested changes, approval records, and proposal-to-implementation comparison are not built — there is no generated implementation yet for a comparison to run against.

## Workstream 14 — Assurance transition

### Outcome

The new component becomes an ordinary ForgeGate component record.

### Deliverables

- Manifest creation or import
- Story and test discovery
- Token verification
- Documentation generation
- Required manual-review queue
- Readiness state
- Evidence freshness

### Acceptance criteria

- Generated files are not treated as evidence.
- All gates begin as pending, not run, or not evaluated as appropriate.
- The proposal remains linked for traceability.
- Repository truth supersedes temporary Studio output.
- Release remains blocked until policy requirements are satisfied.

## Workstream 15 — Figma reference linking

### Outcome

A proposal or component record can link to a Figma component set without requiring synchronization.

### Deliverables

- Optional file and node identity
- Link validation
- Variant-property mapping
- Token-variable mapping
- Story mapping
- Last-inspected metadata
- Drift findings

### Acceptance criteria

- Figma is optional.
- Missing access does not break local work.
- Identity mappings are explicit.
- Designed-versus-coded differences are presented as comparisons, not automatic failures unless policy says otherwise.
- No Figma write-back occurs.

## Workstream 16 — Structured Figma interoperability

### Outcome

A portable proposal can participate in a plugin or Code Connect-style workflow.

### Deliverables

- Export contract
- Property and variant mapping
- Token mapping
- Anatomy metadata
- Story and implementation references
- Conflict model
- Capability discovery

This work begins only after Level 2 linking is validated and should not block the first Blueprint Studio release.

## Testing strategy

### Domain tests

- Schema validation
- Unknown-field preservation
- Blueprint migration
- Conditional rules
- Variant-state calculations
- Token requirements
- Adapter capability resolution
- Proposal revision comparison

### UI unit tests

- Inspector field rendering
- Validation messages
- Matrix interaction
- Anatomy selection
- Token selection
- Undo and redo
- Draft recovery

### Component and Storybook tests

Blueprint Studio's own components should include stories for:

- Empty proposal
- Valid button proposal
- Blocking semantic issue
- Unsupported adapter
- Large variant matrix
- Missing dark-theme tokens
- Generation conflict
- Reduced motion
- Forced colors
- Narrow desktop window

### End-to-end tests

- Create and save proposal
- Reopen proposal
- Edit contract
- Add state
- Map tokens
- Generate temporary preview
- Review generation plan
- Reject write
- Approve write
- Validation failure and rollback
- Successful transition to component record

### Accessibility tests

- Keyboard-only complete flow
- Screen-reader review
- 200% and 400% zoom
- Forced colors
- Reduced motion
- Matrix table alternative
- Error prevention and recovery

## Telemetry and research

Blueprint Studio should remain useful offline. Any telemetry is opt-in and should avoid source, component, token, or design content.

Useful research measures include:

- Time to engineering-ready proposal
- Fields that frequently require engineering correction
- States most often omitted
- Token slots most often unresolved
- Generation artifacts most often rejected
- Proposal-to-implementation drift
- Accessibility requirements identified before implementation

Qualitative validation should include at least:

- One design-system designer
- One design-system engineer
- One accessibility specialist
- One design-system lead or manager

## Release sequence

### Release A — Proposal Studio

Structured proposal editing with a reference preview. No framework generation.

### Release B — Web Component preview

Temporary Lit or vanilla Web Component generation and coded preview.

### Release C — Reviewable component package

Safe generation of component, stories, tests, manifest, and documentation into a repository.

### Release D — Handoff and assurance

Proposal review, implementation comparison, and transition into full assurance.

### Release E — Linked design references

Figma component-set links, property mappings, and drift comparison.

### Release F — Multi-framework authoring

A second generation adapter proves the proposal model is framework-neutral.

## Exit criteria for the first Blueprint Studio initiative

The initiative is validated when:

1. A designer creates a Button proposal without editing code or YAML.
2. An engineer understands the proposed API, states, anatomy, tokens, and behavior without a separate specification meeting.
3. ForgeGate generates reviewable Web Component artifacts safely.
4. Validation catches at least one incomplete or inconsistent proposal before implementation approval.
5. The resulting component enters assurance with accurate pending requirements.
6. A real designer and engineer report that the workflow improves handoff compared with screenshots and prose alone.
