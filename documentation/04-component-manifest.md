# ForgeGate Component Manifest

## Purpose

The component manifest is the portable record connecting a coded component to its contract, states, stories, tokens, tests, compliance profiles, documentation, consumers, ownership, lifecycle, and release policy.

It must be framework-neutral at the top level while allowing adapter-specific extensions.

## Design goals

The manifest should be:

- Human readable
- Schema validated
- Version controlled
- Stable across supported frameworks
- Extensible without unstructured free-form data becoming the primary model
- Suitable for desktop and CI use
- Capable of referencing external evidence without embedding large binary artifacts
- Explicit about unknown, unsupported, inherited, and not-applicable values

## Proposed location

```text
.forgegate/components/button.yaml
```

Alternative layouts may group manifests by package or library, but ForgeGate should support deterministic discovery and unique component identifiers.

## Proposed example

```yaml
schemaVersion: 0.1.0

component:
  id: up-design-system.button
  name: Button
  displayName: UP Button
  version: 1.2.0
  lifecycle: candidate
  framework: angular
  package: "@up-design-system/button"
  project: up-design-system
  sourceRoot: libs/up-design-system/button
  owners:
    - design-system-engineering
  reviewers:
    - accessibility-reviewers

adapter:
  id: framework.angular
  minimumVersion: 0.1.0

source:
  implementation:
    - src/lib/button.component.ts
    - src/lib/button.component.html
    - src/lib/button.component.scss
  publicExports:
    - src/index.ts

contract:
  inputs:
    - name: appearance
      type: ButtonAppearance
      required: false
      default: filled
      values: [filled, outlined, subtle, text]
    - name: tone
      type: ButtonTone
      required: false
      default: primary
      values: [primary, neutral, danger]
    - name: size
      type: ButtonSize
      required: false
      default: medium
      values: [small, medium, large]
    - name: disabled
      type: boolean
      required: false
      default: false
    - name: loading
      type: boolean
      required: false
      default: false
  outputs:
    - name: activated
      payload: void
  slots:
    - name: default
      purpose: accessible visible label
  semantics:
    nativeElement: button
    alternateLinkMode: false

states:
  required:
    - default
    - hover
    - focus-visible
    - active
    - disabled
    - loading
  variants:
    appearance: [filled, outlined, subtle, text]
    tone: [primary, neutral, danger]
    size: [small, medium, large]
  environments:
    themes: [light, dark]
    viewports: [desktop, mobile]
    preferences: [reduced-motion, forced-colors]

storybook:
  target: up-design-system
  stories:
    default: components-button--default
    disabled: components-button--disabled
    loading: components-button--loading
    iconOnly: components-button--icon-only

tokens:
  format: dtcg
  mappings:
    containerBackground: component.button.container.background
    labelColor: component.button.label.color
    focusRing: semantic.focus.ring
    borderRadius: component.button.radius

tests:
  requirements:
    - gate: unit
      required: true
    - gate: storybook-interaction
      required: true
    - gate: axe
      required: true
      scope: all-required-stories
    - gate: playwright-keyboard
      required: true
    - gate: visual
      required: true
      environments: [light-desktop, dark-desktop, light-mobile]

compliance:
  profiles:
    - section-508-web
    - wcag-2.2-aa-internal
  manualReviews:
    - keyboard
    - screen-reader-windows
    - forced-colors
    - zoom-400

consumers:
  - id: qa-remote
    required: true
    scenarios:
      - default-theme
      - dark-theme

publication:
  storybook: true
  starlight:
    page: components/button
  zeroheight:
    pageId: null

policy:
  inherits:
    - workspace.default-component-release
    - blueprint.button
  overrides: []

release:
  currentDecision: blocked
  blockingReasons:
    - manual screen-reader review missing
```

## Top-level sections

### Schema metadata

The schema version controls parsing and migration. It is independent of the component version.

### Component identity

Identity should remain stable even if display name, package path, or framework implementation changes.

Recommended identity fields:

- Stable component ID
- Name and display name
- Framework
- Package
- Project
- Source root
- Current version
- Lifecycle
- Owners and reviewers

### Adapter declaration

The manifest should record which framework adapter understands framework-specific fields and what minimum adapter version is expected.

### Source mapping

Source mapping identifies implementation, exports, stories, tests, tokens, and documentation. It supports freshness calculations and targeted generation.

### Public contract

The contract should represent the portable concepts supported by the component:

- Inputs, props, attributes, or parameters
- Outputs, events, or callbacks
- Slots, children, content projection, or snippets
- Methods or exposed APIs
- CSS parts and custom properties
- Native semantic expectations

Framework adapters translate framework-specific metadata into these concepts.

### State matrix

State coverage should distinguish:

- Interaction states
- Functional states
- Variants
- Themes
- Densities
- Viewports
- Locales
- Text directions
- User preferences
- Error and loading conditions

Policies decide which combinations are required rather than requiring the full Cartesian product.

### Story mapping

Story mappings connect required states and examples to Storybook story IDs. A story may satisfy multiple requirements, and a requirement may need multiple stories.

### Token mapping

Token mappings should prefer Design Tokens Community Group-compatible names while supporting adapter metadata for CSS variables, Sass variables, generated code, or token management tools.

### Test requirements

The manifest references gate identifiers and scopes. Commands and tool-specific configuration should usually live in workspace configuration or adapters rather than be repeated in every component.

### Compliance profiles

Profiles define required automated and manual methods. The manifest may add component-specific procedures or mark requirements not applicable with rationale.

### Consumers

Consumer mappings make application-context validation first class. They identify which applications, routes, themes, or scenarios must validate a component version.

### Publication

Publication mappings identify Storybook, Starlight, Zeroheight, and future documentation destinations.

### Policy

Policy inheritance allows a component to receive organization, workspace, library, package, and blueprint rules while documenting explicit overrides.

## Adapter extensions

Framework-specific extensions should live under namespaced keys:

```yaml
extensions:
  framework.angular:
    selector: up-button
    standalone: false
    changeDetection: OnPush
```

Core product logic must not depend on extension data unless the relevant adapter is active.

## Validation rules

The schema should reject:

- Duplicate component IDs
- Unknown lifecycle states
- Invalid story mappings
- Missing required rationale for not-applicable compliance requirements
- Unsupported policy references
- Invalid version formats where versions are required
- Ambiguous source paths
- Duplicate contract members

The schema should warn, rather than fail, for incomplete candidate manifests where policy permits progressive adoption.

## Manifest generation

ForgeGate may generate an initial manifest from discovered code and stories, but generated values must be reviewed. Inferred values should be marked with confidence and source.

Example:

```yaml
inference:
  generatedAt: 2026-07-22T15:00:00Z
  uncertain:
    - path: contract.inputs.appearance.values
      reason: values inferred from Storybook argTypes
```

## Migration

Schema migrations should:

- Be deterministic
- Preserve unknown extensions
- Produce a diff
- Support dry run
- Back up the original file
- Document semantic changes
