# ForgeGate Product Overview

## Executive summary

ForgeGate is a local-first desktop application for design-system component assurance. It helps teams turn a component from an idea or existing implementation into a governed, testable, documented, reviewable, and releasable asset.

The product coordinates the tools teams already use rather than attempting to replace them:

- Framework source code provides the implementation.
- Storybook provides isolated rendering, state exploration, interaction examples, and component-level testing surfaces.
- Unit, browser, accessibility, visual, build, lint, contract, and security tools execute specialized checks.
- Git provides durable history and change identity.
- Astro Starlight provides an open, repository-owned documentation destination.
- Zeroheight may provide an optional enterprise documentation and governance destination.
- ForgeGate provides the cross-tool component record, completion policy, manual review workflow, evidence normalization, stale-approval detection, release decision, and publication workflow.

## Problem statement

Design-system teams commonly distribute component lifecycle information across many disconnected places:

- Source files contain implementation details.
- Storybook contains stories and previews.
- CI contains test runs.
- Chromatic or another service contains visual approvals.
- Axe output contains partial accessibility findings.
- Accessibility specialists maintain manual-review spreadsheets or documents.
- Figma or Penpot contains visual proposals that may not match the coded component.
- Zeroheight, Starlight, Confluence, or another system contains documentation.
- Jira or GitHub Issues contains findings and exceptions.
- Release decisions are communicated in meetings, chat, or pull-request comments.

The result is uncertainty. A team may know that a component exists, but not whether it is actually ready for adoption. It may be impossible to answer which tests apply, whether evidence matches the current code, whether manual review was completed, which exception was accepted, or which application still fails in context.

ForgeGate addresses this by creating a durable, explainable component assurance record.

## Primary product question

For every component and version, ForgeGate should answer:

> Is this component ready to enter or remain in the design system, and what evidence supports that decision?

## Target users

### Design-system engineers

They need to discover components, define contracts, generate missing artifacts, run quality gates, inspect evidence, and release component packages.

### Frontend platform engineers

They need framework and workspace integration, package governance, dependency visibility, consumer validation, CI enforcement, and migration support.

### Accessibility and Section 508 specialists

They need repeatable procedures, environment capture, finding management, manual review, stale-evidence detection, and exportable reports.

### Designers working in coded systems

They need trustworthy examples, component anatomy, token mappings, allowed properties, state coverage, and a direct relationship to the actual coded component.

### Technical writers and documentation owners

They need structured source material, repeatable templates, Storybook examples, status visibility, and drift detection across Starlight and Zeroheight.

### Engineering managers and release approvers

They need an explainable readiness decision, blocking findings, exception status, ownership, and evidence tied to the exact version and commit.

### Consulting and regulated-delivery teams

They need a repeatable way to produce component evidence for customers, contracts, audits, accessibility acceptance, and release governance.

## Jobs to be done

A user hires ForgeGate to:

- Inventory a component library.
- Understand which components are incomplete.
- Standardize what “done” means for each component type.
- Connect component source to Storybook stories and tests.
- Run the correct checks without remembering every command.
- Collect automated and manual evidence in one normalized model.
- Prevent an old approval from remaining green after relevant code changes.
- Explain why a component is blocked.
- Generate or update component documentation.
- Export an evidence package for review, delivery, or audit.
- Apply the same policy locally and in CI.
- Support multiple frontend frameworks without duplicating the governance model.

## Core product capabilities

### Discover

Open a repository and identify workspaces, frameworks, packages, component libraries, components, stories, tests, tokens, documentation targets, consumers, and release metadata.

### Specify

Define a portable component manifest describing identity, contract, states, variants, stories, tokens, tests, compliance requirements, documentation, ownership, consumers, and policy.

### Assure

Run existing tools, normalize results, preserve raw artifacts, guide manual reviews, classify findings, and determine freshness.

### Govern

Apply inherited policies, require evidence, manage exceptions, require approvals, and calculate release readiness without hiding failures behind a single score.

### Publish

Generate Storybook MDX, Starlight documentation, Zeroheight publication packages or supported synchronization, and portable evidence reports.

### Extend

Add framework, workspace, testing, documentation, token, CI, and organization-specific adapters.

## Why a desktop application

A desktop application can safely perform local operations that a hosted web application cannot easily or appropriately perform:

- Inspect proprietary repositories without uploading source code.
- Start Storybook and documentation servers.
- Run local test, build, lint, and generation commands.
- Read Git state and file changes.
- Generate files and show diffs before writing.
- Work in restricted, disconnected, or regulated environments.
- Integrate with operating-system credential storage.
- Keep sensitive evidence local until the user explicitly exports or publishes it.

The desktop application must not use local access as an excuse for broad privileges. ForgeGate should use narrow capabilities, explicit consent, safe defaults, preview isolation, and auditable operations.

## Product boundaries

ForgeGate is not:

- A general vector-graphics editor.
- A replacement for Figma, Penpot, Illustrator, or Photoshop.
- A replacement for Storybook rendering.
- A replacement for axe, Playwright, Vitest, Jest, Cypress, or visual-testing providers.
- A legal certification engine.
- A full GRC platform.
- A hosted source-code repository.
- A proprietary documentation prison.
- An AI system that silently rewrites customer code.

ForgeGate may generate code, tests, manifests, and documentation, but every repository modification must remain visible and reviewable.

## Initial vertical slice

The first end-to-end demonstration should use one Angular/Nx button component and prove the full lifecycle:

1. Open the repository.
2. Detect Git, pnpm, Nx, Angular, Storybook, tests, tokens, and Starlight.
3. Discover the button implementation.
4. Associate the button with stories and tests.
5. Load or create the component manifest.
6. Show required states and missing coverage.
7. Run configured unit, Storybook, Playwright, axe, lint, and build checks.
8. Preserve raw results and normalize evidence.
9. Complete guided keyboard and screen-reader reviews.
10. Tie evidence to the current commit.
11. Change a relevant source file and mark prior approval stale.
12. Explain the blocking condition.
13. Generate a Starlight page.
14. Export a complete evidence package.

## Long-term product vision

ForgeGate becomes the component operations layer for multi-framework design systems. It provides one framework-neutral governance model across coded components while allowing each framework and organization to preserve its preferred implementation conventions.

A mature ForgeGate installation could manage:

- Multiple organizations and design systems.
- Shared and local policies.
- Private blueprint registries.
- Framework-specific adapters.
- Local and CI execution.
- Human review queues.
- Application consumer validation.
- Release acceptance.
- Evidence archiving.
- Documentation publication.
- Design-system migrations and deprecations.

## Success measures

The product should eventually demonstrate measurable improvements such as:

- Reduced time to determine component readiness.
- Reduced manual effort assembling evidence.
- Fewer stale or misleading approvals.
- Fewer undocumented public API changes.
- Increased required-state coverage.
- Faster accessibility review without reducing rigor.
- Fewer application-context regressions.
- Faster publication of accurate documentation.
- Reduced drift among source, Storybook, tokens, tests, and documentation.
