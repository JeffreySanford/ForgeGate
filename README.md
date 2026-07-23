# ForgeGate

**Build, verify, document, govern, and release trusted web components.**

ForgeGate is a proposed local-first desktop application and component-assurance platform for modern design systems. It connects component source code, Storybook, automated tests, manual accessibility and compliance review, design tokens, Git history, documentation systems, release decisions, and governed component proposals into one operational center of truth.

ForgeGate is not intended to replace Figma as a general graphics and interface-design application. It solves a narrower and more operational problem:

> How does a team know that a component is completely specified, correctly implemented, fully tested, accessible, documented, reviewed, versioned, and safe to release?

A later first-class initiative, **Blueprint Studio**, extends those same proven contracts into structured visual authoring:

> How can a designer propose a new component visually, preview the real coded result, and hand engineering a complete, reviewable package without beginning in framework code?

## Product position

ForgeGate sits above the existing tools in a component-delivery workflow:

- **Framework source code** remains the executable implementation.
- **Storybook** remains the isolated rendering and interaction workbench.
- **Figma or Penpot** remains the general visual-design environment and may provide linked design references.
- **Unit, integration, browser, accessibility, and visual tools** remain the test executors.
- **Git** remains the durable history of component requirements and implementation changes.
- **Astro Starlight** is the preferred open documentation-publishing target.
- **Zeroheight** is an optional enterprise documentation and governance adapter.
- **ForgeGate** coordinates the lifecycle, normalizes evidence, guides manual reviews, detects stale approvals, applies release policies, presents the authoritative component record, and later supports structured component proposals through Blueprint Studio.

## Core product promise

A user should be able to open a repository and answer all of these questions from one place:

1. What component libraries and components exist?
2. Which frameworks and versions are in use?
3. Which Storybook stories represent each required state?
4. Which design tokens and themes does each component consume?
5. Which unit, interaction, browser, accessibility, visual, and compliance tests apply?
6. Which tests passed, failed, were skipped, or produced incomplete findings?
7. Which manual keyboard, screen-reader, high-contrast, zoom, reduced-motion, and responsive reviews are required?
8. Which approvals are still valid for the current Git commit?
9. Which consuming applications have validated the component in context?
10. Which documentation pages are current, stale, missing, or unpublished?
11. Which findings and exceptions block release?
12. Is the component a proposal, candidate, approved release, deprecated asset, or retired component?

## Framework scope

ForgeGate is designed around a framework-adapter architecture rather than one hard-coded frontend stack. Planned support includes:

- Angular
- React
- Vue
- Svelte and SvelteKit
- Solid
- Lit and standards-based Web Components
- Qwik
- Astro component projects
- Framework-neutral HTML, CSS, JavaScript, and TypeScript component packages

The first implementation should be narrow and deep: Lit and vanilla Web Components, followed by Angular and Nx, then React, Vue, Svelte, and the remaining adapters. Web Components ship first because they prove the framework-neutral contract honestly and fit teams standardizing across products, frameworks, and agencies.

## Major capabilities

### Workspace discovery

- Open a local repository or monorepo.
- Detect package managers, workspace managers, frameworks, Storybook installations, documentation targets, test runners, token formats, and component packages.
- Support Nx, Turborepo, pnpm workspaces, npm workspaces, Yarn workspaces, Rush, Lage, and conventional repositories through adapters.

### Component inventory

- Discover existing components and public package exports.
- Associate implementation files, stories, tests, manifests, tokens, documentation, consumers, versions, owners, and release state.
- Identify orphaned components, undocumented exports, missing stories, stale tests, and unregistered assets.

### Component blueprints

ForgeGate provides policy-aware blueprints for common web-component patterns rather than beginning from an empty checklist.

Initial blueprints include:

- Button and link
- Text input and textarea
- Checkbox, radio group, toggle, and select
- Combobox and autocomplete
- Alert, status message, toast, and banner
- Dialog, popover, tooltip, menu, and disclosure
- Tabs, accordion, breadcrumb, pagination, and stepper
- Table, data grid, tree, listbox, and card
- Date picker, time picker, file upload, and search
- Navigation, application shell, skip link, and landmark patterns

Each blueprint defines the expected public contract, states, interactions, keyboard model, accessibility requirements, token categories, Storybook coverage, automated tests, manual reviews, documentation sections, and release evidence.

### Blueprint Studio

Blueprint Studio is the planned post-MVP visual component-authoring environment.

It lets designers:

- Choose a governed component pattern.
- Define purpose and semantics.
- Configure contract properties visually.
- Compose variants and states in a matrix.
- Define anatomy, slots, and parts.
- Map approved design tokens.
- Define behavior and content fixtures.
- Preview a clearly identified coded or reference implementation.
- Review required stories, tests, accessibility procedures, and documentation.
- Generate proposed files through temporary output, explicit diffs, approval, validation, and rollback.
- Hand the proposal to engineering and transition it into ordinary ForgeGate assurance.

Blueprint Studio is not a freeform graphics canvas and does not move full component generation into the current MVP. See [`documentation/27-blueprint-studio.md`](documentation/27-blueprint-studio.md), [`documentation/28-blueprint-studio-implementation-plan.md`](documentation/28-blueprint-studio-implementation-plan.md), and ADR [`documentation/decisions/0006-blueprint-studio-boundary.md`](documentation/decisions/0006-blueprint-studio-boundary.md).

### Storybook integration

- Detect local and hosted Storybook instances.
- Read Storybook indexes and associate story IDs with component manifests.
- Embed or open live stories in a restricted preview surface.
- Read args, tags, component metadata, accessibility results, interaction results, and visual-review links when available.
- Run project-defined Storybook test commands rather than reimplementing Storybook.

### Test and compliance orchestration

ForgeGate coordinates existing executors and converts their output into one evidence model:

- Unit tests
- Component tests
- Storybook interaction tests
- Playwright, Cypress, WebdriverIO, and other browser tests
- Axe and other automated accessibility checks
- Visual regression tools such as Chromatic, Percy, Applitools, Loki, and project-defined screenshot tests
- Lint, type-check, build, package, API-contract, and dependency checks
- Section 508 and WCAG-oriented automated, manual, and hybrid review profiles
- Application-context and composition testing

Passing axe alone must never be represented as legal or complete accessibility compliance. ForgeGate tracks conformance evidence, review completeness, unresolved findings, and policy decisions.

### Manual review and evidence

- Guided keyboard procedures
- Screen-reader procedures for JAWS, NVDA, VoiceOver, TalkBack, and configurable assistive technologies
- Zoom, text spacing, forced colors, high contrast, reduced motion, responsive layout, localization, bidirectional text, and cognitive-usability checks
- Tester identity, environment, date, observations, attachments, exceptions, and approvals
- Git-aware stale-evidence detection
- Exportable evidence packages with machine-readable manifests and human-readable reports

### Documentation publishing

- Generate and update Storybook MDX and autodocs metadata.
- Generate Astro Starlight Markdown and MDX pages.
- Generate token, anatomy, usage, accessibility, API, state, test, evidence, release, and migration sections.
- Connect to Zeroheight where supported for page discovery, status synchronization, Storybook references, and governed publication workflows.
- Keep documentation ownership in repository-controlled, portable data rather than trapping it in a desktop database.

### Governance and release gates

- Organization, library, package, component, and component-type policies
- Required state and environment matrices
- Severity thresholds
- Required automated and manual evidence
- Expiring approvals and accepted exceptions
- Candidate, approved, deprecated, and retired lifecycle states
- Release-readiness decisions tied to a commit, build, component version, and evidence set

## Center-of-truth principle

ForgeGate separates three kinds of truth:

1. **Repository truth** — manifests, policies, component contracts, tokens, documentation metadata, proposals, and requirements committed to Git.
2. **Execution truth** — normalized results produced by testing, build, accessibility, visual, and CI tools.
3. **Review truth** — human observations, approvals, accepted exceptions, release decisions, and re-review requirements.

The desktop application is the operational control center, but durable state must be exportable and repository-friendly. SQLite may cache local state; it must not become the only place where critical evidence or proposals exist.

## Proposed desktop architecture

- Tauri 2 desktop shell
- Framework-neutral core domain model
- Angular desktop user interface
- Rust/Tauri command boundary for filesystem, process, Git, credential, and operating-system capabilities
- SQLite for local indexing, drafts, and cache state
- Operating-system credential vault for tokens and secrets
- Sandboxed remote previews with no privileged filesystem or process bridge
- Adapter SDK for frameworks, workspaces, tests, documentation systems, tokens, version control, CI providers, and later Blueprint Studio generation

## Current milestone

The first demonstrable vertical slice remains:

> Open a Web Components design-system repository, discover one button component and its Storybook stories, run configured checks, complete a guided Section 508-oriented manual review, calculate release readiness for the current commit, export evidence, and generate an Astro Starlight component page.

The implementation-ready component experience is defined in [`documentation/25-designer-ready-vertical-slice.md`](documentation/25-designer-ready-vertical-slice.md).

The workspace-level visualization and motion language is defined in [`documentation/26-workspace-visualization-and-motion.md`](documentation/26-workspace-visualization-and-motion.md), with a fixture-only reference at [`documentation/prototypes/workspace-command-center.html`](documentation/prototypes/workspace-command-center.html).

Blueprint Studio is intentionally sequenced after this assurance milestone. Its direction is defined now so today's framework-neutral contracts, blueprints, token model, safe writes, and adapter capabilities can support it later without redesign.

## Repository guide

- [`TODO.md`](TODO.md) — phased implementation plan and active center of work
- [`documentation/README.md`](documentation/README.md) — documentation map and recommended reading order
- [`AGENTS.md`](AGENTS.md) — contribution and AI-agent operating rules

## License and commercial status

No license has been finalized. The current leaning is proprietary-closed or source-available rather than open source, given the intended federal and enterprise buyer. Until a license is intentionally added, this private repository and its contents should be treated as proprietary and not redistributed. See [`documentation/19-commercial-model.md`](documentation/19-commercial-model.md) and [`documentation/20-risks-and-decisions.md`](documentation/20-risks-and-decisions.md).
