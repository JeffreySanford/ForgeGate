# ForgeGate Framework Adapters

## Goal

ForgeGate must support all major modern web frameworks without making the core application dependent on any one framework’s compiler, metadata format, component model, or testing conventions.

The platform therefore uses framework adapters.

## Adapter responsibilities

A framework adapter may provide some or all of these capabilities:

- Detect framework projects and versions
- Discover components
- Determine whether a component is public or internal
- Extract component contract metadata
- Map source files and dependencies
- Associate stories and tests
- Identify package exports
- Detect framework-specific accessibility risks
- Generate starter components, stories, tests, and documentation
- Validate framework conventions
- Explain unsupported or uncertain extraction

Each adapter must declare capabilities and limitations.

## Core portable concepts

Framework-specific concepts should map into portable concepts:

| Portable concept | Angular | React | Vue | Svelte | Web Components |
|---|---|---|---|---|---|
| Inputs | `@Input`, signal inputs | props | props | props | properties/attributes |
| Outputs | `@Output` | callbacks | emits | events/callbacks | custom events |
| Content | projection | children | slots | slots/snippets | slots |
| Public methods | component API | refs/imperative handle | exposed methods | component exports | element methods |
| Styling API | classes/tokens | classes/tokens | classes/tokens | classes/tokens | parts/custom properties |
| Story states | args | args | args | args | args/attributes |

The portable model should not erase meaningful framework differences. Adapter extensions preserve details that cannot be represented generically.

## Angular adapter

### Discovery

Support:

- Angular CLI workspaces
- Nx Angular projects
- Libraries and applications
- NgModule-declared components
- Standalone components
- Published Angular packages

### Metadata

Extract where possible:

- Selector
- Inputs and signal inputs
- Outputs
- Content projection
- Host bindings and listeners
- Standalone status
- Change-detection strategy
- Public exports
- Template, style, and test files

### Story and test mapping

Support:

- Storybook for Angular
- Jasmine and Karma
- Jest
- Vitest where configured
- Angular Testing Library
- Playwright and Cypress

### Risks

- Decorator metadata may be transformed.
- Input types may not be available from runtime metadata.
- Template semantics require source analysis.
- Libraries may mix standalone and NgModule patterns.

The adapter should prefer compiler-supported or AST-supported extraction and report uncertainty.

## React adapter

### Discovery

Support:

- Vite
- Next.js
- Remix
- Nx React
- Turborepo packages
- Published component packages

### Metadata

Extract where practical:

- Props
- Default values
- Callback props
- Children
- Refs and imperative handles
- Display names
- Export status
- CSS modules, styled systems, and token references where detectable

### Risks

React components can be highly dynamic. TypeScript definitions may be more reliable than runtime inspection. Higher-order components, generic props, polymorphic components, and inferred props require careful handling.

## Vue adapter

Support Vue 3 and modern single-file components.

Extract:

- Props
- Emits
- Slots
- Exposed methods
- `v-model` contracts
- Script setup metadata
- Styles and token references
- Public exports

Support Vue Storybook, Vue Test Utils, Vitest, Jest, Playwright, and Cypress mappings.

## Svelte adapter

Support Svelte and SvelteKit component packages.

Extract:

- Props
- Events and callback contracts
- Slots and snippets
- Bindable values
- Exported functions where supported
- Style and token references
- Public package exports

Because Svelte evolves quickly, the adapter should declare supported compiler ranges and use fixtures for each supported major version.

## Lit and Web Components adapter

This adapter is especially important because Web Components provide a framework-neutral distribution model.

Prefer Custom Elements Manifest when available.

Extract:

- Custom element tag
- Attributes
- Properties
- Events
- Slots
- Methods
- CSS parts
- CSS custom properties
- Inheritance
- Public module exports

The adapter should support Lit, vanilla Custom Elements, and libraries that publish standards-based manifests.

## Solid adapter

Extract:

- Props
- Callbacks
- Children
- Signals exposed as component contract only when public
- Public exports
- Story and test mappings

Solid support should not assume React semantics even when JSX syntax is similar.

## Qwik adapter

Support Qwik component packages, resumability-oriented event patterns, props, slots, and Qwik-specific test/build metadata through a dedicated adapter.

## Astro adapter

Astro support has two distinct roles:

1. Astro components may themselves be governed components.
2. Astro Starlight is a documentation destination.

The framework adapter handles `.astro` components and their props, slots, scripts, styles, and exports. The Starlight adapter remains a separate documentation adapter.

## Framework-neutral adapter

Support ordinary HTML, CSS, JavaScript, and TypeScript packages when no recognized framework exists.

Possible metadata sources:

- Explicit ForgeGate manifests
- Custom Elements Manifest
- TypeScript declarations
- Package exports
- Storybook metadata
- User configuration

## Capability declaration

Adapters should return a capability document:

```ts
interface FrameworkAdapterCapabilities {
  discoverProjects: boolean;
  discoverComponents: boolean;
  extractContract: 'none' | 'partial' | 'full';
  extractDependencies: 'none' | 'partial' | 'full';
  mapStories: boolean;
  mapTests: boolean;
  generateComponent: boolean;
  generateStories: boolean;
  generateTests: boolean;
  validatePackageExports: boolean;
}
```

## Adapter selection

A workspace may contain several frameworks. ForgeGate should:

- Detect all candidates.
- Score adapter confidence.
- Allow user confirmation.
- Support adapter selection per project or package.
- Avoid running every adapter against every file.
- Preserve adapter version in generated evidence.

## Adapter failures

A failed adapter should not crash the workspace.

ForgeGate should distinguish:

- Framework detected but version unsupported
- Component discovered but contract extraction partial
- Story mapping unavailable
- Test mapping unavailable
- Generation unsupported
- Adapter internal error

## Adapter test requirements

Every adapter should have fixture repositories covering:

- Minimal project
- Monorepo project
- Public package
- Component with common contract features
- Storybook integration
- Test mapping
- Unsupported edge case
- Version compatibility
- Malformed source

## Delivery sequence

1. Angular and Nx
2. React
3. Vue
4. Svelte
5. Lit and Web Components
6. Solid
7. Qwik
8. Astro components
9. Framework-neutral fallback

The portable schema, policy, evidence, and publication layers must be usable before all adapters are complete.
