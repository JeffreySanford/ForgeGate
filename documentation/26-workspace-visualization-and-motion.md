# ForgeGate Workspace Visualization and Motion Slice

## Purpose

This document defines the second polished ForgeGate experience: an engaging workspace command center that uses meaningful data visualization, infographics, spatial relationships, and restrained animation to help designers and developers understand the health of a design system.

It builds on the designer-ready component assurance slice. The component record remains the authoritative place to inspect one component. This slice makes the workspace itself a visual overview of the complete system and a compelling entry point into that record.

The goal is not to decorate the existing repository scanner. The goal is to turn repository discovery and assurance data into an understandable visual story:

> ForgeGate has opened this design system, discovered its connected tools and components, evaluated what evidence exists, and can show exactly where the system is healthy, incomplete, stale, or blocked.

## Experience outcome

Within the first minute after opening a workspace, a designer or developer should be able to answer:

1. What kind of repository did ForgeGate discover?
2. Which parts of the design-system workflow are connected?
3. How many components are known, and what condition are they in?
4. Where are the largest coverage gaps?
5. Which evidence is current and which has become stale?
6. Which changes have the greatest impact?
7. What should the team do next?
8. How can the user move from the overview to the exact component, story, token, finding, test, or document involved?

The workspace should feel alive while remaining calm, trustworthy, accessible, and appropriate for regulated enterprise use.

## Product character

The visual direction should communicate:

- A living technical system rather than a static report.
- Relationships among source, components, tokens, stories, tests, reviews, documentation, and release decisions.
- Confidence grounded in evidence rather than decorative green scores.
- Craft and visual polish expected by design professionals.
- Depth and operational clarity expected by engineers.
- Restraint and legibility appropriate for accessibility and federal delivery.

ForgeGate should feel closer to a design-system observatory or mission-control surface than to a conventional business dashboard.

## Visualization principles

### Every visual answers a decision

A visualization belongs in ForgeGate only when it helps a user:

- Understand structure.
- Compare coverage.
- Find a problem.
- Understand change over time.
- Trace a relationship.
- Prioritize work.
- Explain a release decision.

Do not add charts merely to occupy space.

### Real data only

Visualizations must identify whether their data is:

- Detected directly from the repository.
- Inferred by an adapter.
- Imported from a tool.
- Entered during manual review.
- Fixture data used only in ForgeGate UI stories or prototypes.

Missing data must produce an honest incomplete visualization, not an invented positive value.

### Overview and detail remain connected

Every mark should have a path to its evidence:

- A component bubble opens the component record.
- A stale segment opens the affected evidence.
- A token edge opens the mapped token relationship.
- A failed stage opens the exact command or review result.
- A documentation gap opens the generation or mapping workflow.

### Visual meaning is redundant

Color is never the only carrier of meaning. Use combinations of:

- Shape.
- Pattern.
- Icon.
- Label.
- Position.
- Text description.
- Accessible summary.

### Motion explains state change

Animation should show discovery, transition, causality, or focus. It should never create urgency merely for excitement.

## Workspace narrative

The workspace should reveal itself in three acts.

### Act 1 — Discover

ForgeGate shows the repository becoming understood:

- Git identity appears.
- Workspace and framework nodes resolve.
- Component libraries appear.
- Storybook, tokens, tests, documentation, and CI connect.
- Unknown or unsupported nodes remain visibly unresolved.

### Act 2 — Interpret

ForgeGate summarizes what the discovered system means:

- Component portfolio.
- Coverage gaps.
- Evidence freshness.
- Blocking findings.
- Documentation drift.
- Tooling and adapter health.

### Act 3 — Act

ForgeGate presents:

- One recommended next action.
- The components or evidence involved.
- Secondary work grouped by impact.
- Direct navigation into the relevant component record or workflow.

This narrative should remain available after the first scan. The animated discovery sequence may replay only on explicit request or when a materially different workspace is opened.

## Command-center layout

At wide desktop sizes, use a composition with four visual zones:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Workspace identity · branch · commit · scan state · global actions          │
├─────────────────────────────────────────────┬───────────────────────────────┤
│ Living system map                           │ Readiness decision             │
│ Repository → components → evidence → docs  │ Priority action               │
│                                             │ Blocking changes              │
├──────────────────────────┬──────────────────┴───────────────────────────────┤
│ Component landscape      │ Assurance journey and evidence freshness         │
├──────────────────────────┴──────────────────────────────────────────────────┤
│ Coverage, activity, documentation drift, and adapter details               │
└─────────────────────────────────────────────────────────────────────────────┘
```

The page should have a strong visual center rather than a uniform grid of equal cards.

Recommended emphasis:

1. Living system map.
2. Readiness and next action.
3. Component landscape.
4. Assurance flow and freshness.
5. Supporting details.

## Visualization 1 — Living system map

### Purpose

Show the structure ForgeGate discovered and make the relationship among tools immediately understandable.

### Visual model

Use a node-link system centered on the selected workspace.

Primary nodes:

- Repository.
- Component library or libraries.
- Components.
- Storybook.
- Design tokens.
- Automated tests.
- Manual reviews.
- Documentation.
- CI and release.

The initial map should remain intentionally small. It is not a full dependency graph.

Suggested hierarchy:

```text
                          Storybook
                              │
Git repository ─ Component library ─ Components ─ Evidence ─ Release
       │                      │             │
       │                    Tokens     Documentation
       │
  Workspace tooling
```

### Node states

Each node can be:

- Connected.
- Partially connected.
- Detected but not configured.
- Missing.
- Unsupported.
- Error.
- Stale.

Visual treatments:

- Connected: solid boundary and stable label.
- Partial: dashed secondary ring.
- Missing: open placeholder with action.
- Unsupported: patterned fill and explanation.
- Error: warning icon and label.
- Stale: clock or age marker and textured boundary.

### Edge meaning

Edges should represent a known relationship, not proximity alone.

Examples:

- Component library publishes components.
- Storybook contains mapped stories.
- Components consume token sources.
- Tests produce evidence for components.
- Evidence supports release decisions.
- Components generate documentation targets.

An edge may indicate:

- Confirmed mapping.
- Inferred mapping.
- Missing mapping.
- Stale relationship.

### Interaction

- Hover or focus highlights one node and its immediate relationships.
- Selecting a node opens a summary inspector.
- Double activation or an explicit action navigates to the full route.
- A keyboard-accessible list provides the same nodes and relationships.
- A **Simplify map** control reduces the view to primary nodes.
- A **Show gaps** control emphasizes missing or unresolved relationships.

### Animation

During discovery:

1. Repository node appears.
2. A scan pulse travels outward.
3. Detected nodes fade and scale into place.
4. Confirmed relationships draw from source to target.
5. Missing relationships appear as open connectors.
6. The map settles and the summary is announced.

The sequence should complete quickly and progressively reveal real results. It should not block interaction.

Reduced-motion behavior:

- All nodes appear without travel or scaling.
- Relationship lines appear immediately.
- Scan status remains available as text and progress steps.

## Visualization 2 — Assurance journey ribbon

### Purpose

Show how the workspace advances from discovered code to an approved component release.

### Stages

- Discover.
- Specify.
- Preview.
- Test.
- Review.
- Document.
- Release.

### Visual model

Use a horizontal connected ribbon or stepped path. Each stage has:

- Current state.
- Number of applicable components.
- Number complete.
- Number blocked or stale.
- Most important gap.

Example:

```text
Discover       Specify       Preview        Test          Review       Document      Release
12/12          9/12          8/12           7/12          5/12         6/12          4/12
Complete       3 missing     2 unmapped      1 failed      4 stale      3 stale       2 blocked
```

### Why it is an infographic rather than a progress bar

The stages are different kinds of work. They must not be added into one percentage. The ribbon communicates progression and bottlenecks without claiming that a missing story is numerically equivalent to a failed screen-reader review.

### Interaction

- Selecting a stage filters the component landscape.
- The detail panel explains what completion means for the stage.
- Stage labels and counts remain visible at 200% zoom.
- On narrow windows, stages become a vertical timeline.

### Initial connected implementation

The workspace command center now renders the seven stages as its primary
semantic ordered list. Each item includes its status text, connected-data
summary, and a link to the component work that needs attention. The same data
drives the visual treatment, so there is no separate accessible view that can
drift from the ribbon.

The first incomplete stage with an available action becomes the workspace's
recommended next action. Completion is intentionally conservative:

- Discover counts mapped component manifests.
- Specify requires both declared states and token mappings.
- Preview requires a mapped Storybook story.
- Test and Review remain incomplete when requirements exist but result or
  decision evidence is not connected.
- Document requires a target whose adapter was detected in the workspace.
- Release remains not connected until a release-decision source exists.

The initial action links open the component inventory. Stage-specific
inventory filtering remains a later enhancement.

### Animation

When scan or evidence data changes, only the affected stage updates:

- Count rolls or crossfades.
- The changed stage briefly receives a non-looping emphasis.
- A connecting path may animate once to show downstream impact.

Do not continuously animate the entire ribbon.

## Visualization 3 — Component landscape

### Purpose

Let users understand the component portfolio at a glance and find clusters of incomplete work.

### Default visual

Use a grouped tile field or accessible treemap-like layout, organized by component category or package.

Each component tile shows:

- Human-readable name.
- Lifecycle.
- Readiness state.
- Compact coverage glyph.
- Optional framework icon.

Tile size should not imply importance unless a meaningful metric is configured. The safest default is equal-size tiles grouped by category.

### Coverage glyph

A small four-segment glyph can show:

- Story coverage.
- Automated evidence.
- Manual review.
- Documentation.

Each segment must also have text in the accessible name and detail panel.

Example accessible name:

> Button, candidate, blocked. Stories complete. Automated tests passing. Manual review stale. Documentation draft current.

### Filters

- Category or package.
- Lifecycle.
- Readiness.
- Missing evidence type.
- Owner.

### Alternative views

Users may switch to:

- Dense table.
- Readiness distribution bars.
- Coverage matrix.

The visualization is not the only way to access components.

### Animation

When filtering:

- Tiles reposition with a short, interruptible transition.
- Removed tiles fade rather than fly away.
- Focus remains on the selected component.
- Reduced motion uses immediate reflow.

## Visualization 4 — Coverage matrix heatmap

### Purpose

Reveal repeated gaps across components and assurance categories.

### Axes

Rows:

- Components.

Columns:

- Stories.
- Tokens.
- Unit or interaction tests.
- Browser tests.
- Automated accessibility.
- Manual keyboard review.
- Screen-reader review.
- Visual regression.
- Documentation.
- Consumer validation.

### Cell states

- Complete.
- Warning.
- Missing.
- Failed.
- Stale.
- Not applicable.
- Unknown.

Cells must use shape or pattern in addition to color.

### Interaction

- Focus a cell to hear a full description.
- Activate a cell to open the relevant component and evidence section.
- Sort by the largest number of blocking or stale cells.
- Collapse low-priority columns.

### Use in the first slice

The initial matrix may include only categories supported by real data. Unsupported columns remain absent rather than filled with optimistic placeholders.

## Visualization 5 — Evidence freshness timeline

### Purpose

Make stale evidence understandable and show how code changes affect prior approvals.

### Visual model

Use a horizontal timeline tied to Git events and evidence events.

Events may include:

- Component source commit.
- Story update.
- Token update.
- Test execution.
- Manual review.
- Approval.
- Documentation generation.
- Current working-tree change.

Example:

```text
Commit A       Test pass       JAWS review       Approval       Commit B       Today
   ●──────────────●────────────────●────────────────●──────────────●──────────────●
                                                            button.ts changed
                                                            review becomes stale
```

### Relationship explanation

Selecting the stale event should explain:

- Which file changed.
- Which evidence depended on it.
- Why the evidence was invalidated.
- What must be repeated.

### Animation

When a new change arrives:

- The event appears on the timeline.
- A brief causal line connects it to affected evidence.
- Affected items transition to stale.
- The readiness card updates after the causal animation completes.

The textual explanation and live-region announcement must not depend on animation.

## Visualization 6 — Change-impact view

### Purpose

Help teams understand the operational effect of the current branch or dirty working tree.

### Visual model

Use a compact impact diagram:

```text
Changed files → Affected components → Stale evidence → Blocked releases
      3                 2                   5                  1
```

Selecting a stage expands the exact items.

Examples:

- `button.ts` affects Button.
- Button change invalidates keyboard and screen-reader reviews.
- Stale screen-reader review blocks candidate approval.

This visualization becomes especially valuable once the reactive source streams and freshness engine are connected.

## Visualization 7 — Token topology

### Purpose

Give designers a visual explanation of token relationships and theme coverage.

### Visual model

Use layered columns:

```text
Component token       Semantic token                  Primitive token       Theme values
button.bg.default  →  action.primary.background   →  blue.600          →  Light / Dark
```

Multiple mappings may form a small directed graph.

### States

- Confirmed.
- Inferred.
- Hard-coded value.
- Unresolved reference.
- Missing theme value.
- Drifted from source.

### Interaction

- Select a node to inspect value, source file, and consumers.
- Highlight all component tokens depending on one semantic token.
- Switch light and dark theme values.
- Open the component record or token source.

### Animation

Theme switching may interpolate non-status preview colors when safe, but token labels and values update immediately. Forced-colors and reduced-motion modes disable interpolation.

## Visualization 8 — Documentation drift map

### Purpose

Show where published guidance no longer matches the coded system.

### Visual model

Use a source-to-target comparison:

```text
Component record → Storybook MDX → Starlight → Zeroheight
Current              Current        Stale       Not connected
```

For each target, show:

- Last synchronized commit.
- Missing sections.
- Changed source areas.
- Publication status.

A compact visual diff summary may show which documentation sections are affected:

- API.
- States.
- Tokens.
- Accessibility.
- Assurance summary.

## Visualization 9 — Adapter and tool constellation

### Purpose

Show the health of ForgeGate’s connections without making adapter internals dominate the workspace.

### Visual model

A compact constellation or status strip contains:

- Workspace adapter.
- Framework adapter.
- Storybook adapter.
- Token adapter.
- Test adapters.
- Documentation adapters.
- CI adapter.

Each shows capability level:

- Full.
- Partial.
- Discovery only.
- Not configured.
- Unsupported.
- Error.

This visualization should appear in a secondary details region, not the workspace hero.

## Readiness visualization

### Decision first

The workspace readiness surface must lead with a textual decision:

- Workspace ready for candidate release activity.
- Workspace contains blocked components.
- Evidence incomplete.
- Workspace not yet configured.

### Supporting visual

A segmented radial or arc visualization may summarize component distribution:

- Ready.
- Ready with warnings.
- Blocked.
- Stale.
- Not evaluated.

The center should contain the most important count and label, such as:

```text
2 blocked
of 12 components
```

This is a distribution, not a health score.

### Interaction

- Selecting a segment filters the component landscape.
- The legend contains exact counts.
- Screen-reader users receive the same distribution as a list.

### Prohibited presentation

Do not show:

- “87% healthy.”
- A single gauge that combines unrelated requirements.
- Confetti for release readiness.
- Red-to-green gradients without explicit labels.

## Priority-action infographic

The right-side action surface should visually connect the recommended action to its impact.

Example:

```text
Repeat JAWS review

1 review resolves
2 stale evidence items
1 blocked component

Button → Manual review → Release readiness
```

The infographic should show why this action is recommended. Ranking rules must be explainable and policy-driven rather than based on visual prominence alone.

## Scan experience

### Progressive scan stages

Show a persistent sequence:

1. Reading repository.
2. Detecting workspace tooling.
3. Finding component libraries.
4. Reading manifests.
5. Finding Storybook and tests.
6. Finding tokens and documentation.
7. Building the component inventory.
8. Evaluating available evidence.

### Visual treatment

The living system map grows as stages complete. A slim progress narrative also displays current and completed stages as text.

### Partial results

- Already discovered nodes remain usable.
- Later failures do not erase earlier results.
- Failed stages appear in context.
- The user may inspect or retry one stage.

### Completion

The interface settles into the command-center layout and announces a concise result:

> Scan complete. Twelve components discovered. Two are blocked, four have stale evidence, and Storybook is detected but not connected.

## Motion system

### Motion categories

#### Reveal

Used when newly discovered content becomes available.

#### Relationship

Used to show an edge, dependency, or causal impact.

#### State change

Used when status changes from current to stale, passing to failed, or disconnected to connected.

#### Navigation continuity

Used to preserve spatial context when moving from workspace overview to component detail.

#### Feedback

Used for button activation, filtering, successful completion, and errors.

### Duration tokens

Suggested initial values:

```text
fg.motion.instant   0 ms
fg.motion.fast      120 ms
fg.motion.standard  200 ms
fg.motion.slow      320 ms
fg.motion.scan      600–900 ms per grouped sequence
```

Avoid individual animations longer than 500 milliseconds during routine interaction. A grouped discovery sequence may be longer, but content must become usable progressively.

### Easing tokens

```text
fg.motion.ease.standard
fg.motion.ease.enter
fg.motion.ease.exit
fg.motion.ease.emphasis
```

Use restrained curves. Avoid spring or elastic motion in assurance and compliance surfaces.

### Reduced motion

When reduced motion is requested:

- Disable path drawing, travel, parallax, and animated reordering.
- Replace animated transitions with immediate state changes or short crossfades.
- Keep scan progress textual.
- Never remove information.

### Motion safety

- No flashing.
- No rapid pulsing.
- No auto-rotating carousels.
- No endless background movement.
- No motion that prevents reading.
- No animation required to discover a blocking condition.

## Infographic style

### Geometry

Use:

- Clear nodes and connectors.
- Rounded rectangles and circles with moderate radii.
- Consistent line weight.
- Subtle grid or coordinate structure where helpful.
- Patterns for stale, unsupported, and unknown states.

Avoid:

- Cartoon illustrations inside operational views.
- Excessive isometric diagrams.
- Decorative 3D graphs.
- Dense network hairballs.
- Tiny unlabeled dots.

### Labels

Every chart or diagram must include:

- Title.
- One-sentence purpose or takeaway.
- Units and timeframe where applicable.
- Legend when symbols are not self-evident.
- Data-source or freshness statement.
- Accessible text summary.

### Color

Use ForgeGate semantic visualization tokens, not hard-coded chart colors:

```text
fg.viz.series.1
fg.viz.series.2
fg.viz.series.3
fg.viz.series.4
fg.viz.neutral
fg.viz.connected
fg.viz.partial
fg.viz.missing
fg.viz.failed
fg.viz.blocked
fg.viz.stale
fg.viz.unknown
fg.viz.focus
```

Status colors and categorical series colors must remain distinct concepts.

### Dark theme

The dark theme should be separately tuned for:

- Connector contrast.
- Grid visibility.
- Pattern legibility.
- Text hierarchy.
- Selected and focused marks.
- Reduced glare in large surfaces.

Do not invert the light theme mechanically.

## Accessible visualization contract

Every visualization requires a parallel semantic representation.

### Required features

- Descriptive heading and summary.
- Keyboard-focusable interactive marks.
- Logical focus order.
- Visible focus indicator.
- Text equivalent for every state and relationship.
- Data table or list view for dense charts.
- Announced filtering and selection changes.
- No tooltip-only essential information.
- Minimum target sizes appropriate for desktop use and zoom.
- Support for 200% and 400% zoom.
- Forced-colors fallback.
- Reduced-motion fallback.

### SVG requirements

When SVG is used:

- Provide `<title>` and `<desc>` where the entire SVG is presented as one image.
- Use meaningful grouped labels for interactive marks.
- Avoid exposing hundreds of decorative SVG elements to assistive technology.
- Hide purely decorative connectors where relationship text is provided elsewhere.
- Manage focus explicitly.

### Canvas prohibition for primary visuals

Do not use `<canvas>` for the primary implementation of the workspace visualizations unless an equivalent accessible representation is fully maintained and tested. SVG and semantic HTML are preferred.

## Data model for workspace visualization

The visualization layer should receive explicit view models rather than interpreting raw domain records directly.

Illustrative contract:

```ts
interface WorkspaceCommandCenterViewModel {
  readonly identity: WorkspaceIdentityViewModel;
  readonly scan: WorkspaceScanNarrativeViewModel;
  readonly systemMap: SystemMapViewModel;
  readonly assuranceJourney: AssuranceJourneyViewModel;
  readonly readinessDistribution: ReadinessDistributionViewModel;
  readonly componentLandscape: ComponentLandscapeViewModel;
  readonly coverageMatrix: CoverageMatrixViewModel;
  readonly evidenceTimeline: EvidenceTimelineViewModel;
  readonly changeImpact: ChangeImpactViewModel;
  readonly documentationDrift: DocumentationDriftViewModel;
  readonly adapters: AdapterConstellationViewModel;
  readonly priorityAction: PriorityActionViewModel | null;
}
```

Every value should carry enough provenance to distinguish:

- Confirmed.
- Inferred.
- Unknown.
- Unsupported.
- Missing.
- Stale.
- Error.

The view model is a presentation contract, not a new center of truth.

## Data available now

The first visual workspace can already use real data for:

- Repository path.
- Branch.
- Commit.
- Dirty state.
- Package manager.
- Workspace manager.
- Storybook project paths.
- Starlight project paths.
- Zeroheight detection.
- Token file paths.
- Test runners.
- Visual regression providers.
- CI providers.
- Custom Elements Manifest paths.
- Real mapped component IDs.
- Framework and adapter identity from mapped manifests.
- Source files.
- Contract member groups.
- Repository configuration state.
- Custom Elements Manifest generation command state.

This is enough to build:

- The first living system map.
- Animated scan narrative.
- Tool and adapter constellation.
- Initial component landscape.
- Honest assurance journey with unavailable stages.
- Workspace identity and change state.

## Data not available yet

The following must remain visibly incomplete until adapters and workflow records exist:

- Story-level component coverage.
- Component-to-token dependency topology.
- Normalized test evidence.
- Manual review results.
- Git-aware evidence freshness.
- Change-impact mapping.
- Policy-driven component readiness.
- Documentation drift by section.
- Release-decision history.

Fixture data may demonstrate these states in ForgeGate’s own Storybook and the documentation prototype, but the production workspace must label disconnected capabilities honestly.

## Implementation technology

### Preferred rendering approach

Use the simplest accessible technology that satisfies the visualization:

- Semantic HTML and CSS for stage ribbons, distributions, and infographic cards.
- SVG for system maps, timelines, token topology, and relationship diagrams.
- CSS transitions and Web Animations API for simple state changes.
- D3 utilities for scales, layout, geometry, and transitions when the relationship or data volume justifies it.

D3 should not own application state or produce an inaccessible parallel DOM. Angular owns data and lifecycle; D3 may calculate geometry and scales.

### Dependency decision

Do not add a large charting library merely to render one readiness ring. Begin with native SVG and semantic HTML. Add D3 modules selectively when implementing the system map, matrix, or timeline reveals a real layout need.

### Component decomposition

Suggested UI units:

```text
WorkspaceCommandCenterRoute
├── WorkspaceHero
│   ├── WorkspaceIdentityBar
│   ├── LivingSystemMap
│   └── WorkspaceReadinessCard
├── PriorityActionInfographic
├── AssuranceJourneyRibbon
├── ComponentLandscape
├── CoverageMatrix
├── EvidenceFreshnessTimeline
├── ChangeImpactDiagram
├── DocumentationDriftMap
└── AdapterConstellation
```

Each visualization should also expose a semantic list or table component.

## Prototype states

ForgeGate’s own Storybook should contain visual stories for:

- Empty workspace.
- Scan beginning.
- Scan partially complete.
- Scan complete with all primary tools detected.
- Storybook detected but not connected.
- Token source missing.
- Mixed component readiness.
- All components not evaluated.
- Evidence stale after a source change.
- One blocked release.
- Adapter error.
- Long workspace and component names.
- Large component inventory.
- Narrow window.
- 200% and 400% zoom.
- Dark theme.
- Forced colors.
- Reduced motion.

## Reference prototype

A standalone visual prototype is included at:

```text
documentation/prototypes/workspace-command-center.html
```

The prototype is not production Angular code and uses fixture data. Its purpose is to demonstrate:

- Visual hierarchy.
- System-map composition.
- Animated discovery.
- Assurance journey.
- Readiness distribution.
- Component landscape.
- Evidence freshness.
- Priority-action storytelling.
- Dark-theme and reduced-motion behavior.

Production implementation must use real ForgeGate view models and accessibility testing rather than copying prototype fixture values directly.

## Acceptance criteria

The workspace visualization slice is complete when:

1. The workspace has a clear visual center rather than a uniform wall of cards.
2. Repository discovery appears as a progressive, understandable system map.
3. Detected, partial, missing, unsupported, error, and stale connections are visually and textually distinct.
4. The workspace presents an assurance journey without collapsing unrelated requirements into one score.
5. Users can understand component distribution and select a component from a visual landscape or equivalent table.
6. A coverage matrix reveals repeated gaps across components when real data supports it.
7. Evidence freshness and change impact are explained through causal visuals once source streams are connected.
8. The readiness surface states the decision and blockers in text before presenting a radial or distribution graphic.
9. Every interactive mark links to the exact component, evidence, token, document, command, or adapter involved.
10. Every visualization has a semantic list or table equivalent.
11. Keyboard, screen-reader, forced-colors, reduced-motion, 200% zoom, 400% zoom, dark-theme, and narrow-window states are tested.
12. Animation is interruptible, non-looping in operational views, and never the sole carrier of meaning.
13. Disconnected capabilities appear honestly incomplete rather than visually successful.
14. The command center can be populated initially from existing real workspace and component-discovery data.
15. Designers report that the workspace helps them understand the system rather than merely making it look more attractive.
16. Developers can navigate from every summary graphic to source-level operational detail.

## Recommended implementation sequence

### Step 1 — Visual foundations

- Add visualization semantic tokens.
- Add motion tokens.
- Establish SVG accessibility utilities.
- Create light, dark, forced-colors, and reduced-motion foundations.

### Step 2 — Animated workspace discovery

- Replace the flat detection list with grouped scan stages.
- Build the first system map from current real scan results.
- Add semantic list fallback.
- Preserve current errors and command actions.

### Step 3 — Component landscape

- Render real mapped component manifests as grouped tiles.
- Add selection and route navigation.
- Add equivalent table view.
- Show unconnected assurance categories honestly.

### Step 4 — Assurance journey and readiness distribution

- Build stages using available/disconnected states.
- Connect real readiness data as the policy engine lands.
- Keep the text decision authoritative.

### Step 5 — Evidence and change storytelling

- Connect normalized test evidence.
- Connect manual review records.
- Build the freshness timeline.
- Build the change-impact diagram from reactive source streams.

### Step 6 — Token and documentation visualizations

- Connect component-token relationships.
- Add token topology.
- Add documentation drift map.

### Step 7 — Validate with users

Test with:

- Design-system designers.
- Design-system engineers.
- Accessibility specialists.
- Technical writers.
- Release approvers.

Measure whether users can accurately identify:

- The largest gap.
- The most important next action.
- Which components are blocked.
- Why evidence is stale.
- Which tool or mapping is disconnected.

## Decision

ForgeGate should deliberately invest in a visually rich workspace. The product coordinates a complex system of tools and evidence; spatial and temporal visualization can explain that system more effectively than tables alone.

The visual richness must remain evidence-driven. The correct direction is not “more charts.” It is:

> Use infographics, data visualization, and motion to reveal relationships, causality, coverage, and next actions that are otherwise difficult to understand.

The living workspace map, assurance journey, component landscape, evidence timeline, and change-impact story should become ForgeGate’s distinctive visual language. The component assurance record remains the detailed center of truth; the workspace becomes the compelling, navigable map of that truth.
