# ForgeGate Product Roadmap

## Roadmap philosophy

ForgeGate should prove one complete, valuable workflow before expanding to many frameworks and enterprise features.

The roadmap therefore moves through vertical slices rather than building every subsystem horizontally.

The root [`TODO.md`](../TODO.md) contains the detailed implementation checklist. This document explains the delivery sequence and product outcomes.

## Current roadmap truth

This roadmap is the intended product sequence, not a claim that each stage is untouched until the previous one is perfect. The current implementation has real slices through workspace discovery, component records, configured unit/lint/build gates, guided manual review, narrow policy/readiness, Starlight generation, evidence export, external policy-document provenance, curated automated-evidence details, verified evidence-package reload, copied-attachment review gates, and generated Starlight route injection. The MVP is still not complete because Storybook/axe/Playwright execution, full external policy-rule evaluation, repository release-history write-back, pilot validation, and the human ForgeGate screen-reader pass remain open. The next work should therefore stay on MVP closure and Starlight/report hardening, not P3 or full Blueprint Studio UI.

## Stage 0 — Product definition

Outcome:

- Product position is clear.
- Storybook, Starlight, Zeroheight, testing tools, and Git have defined roles.
- Framework neutrality is represented in contracts.
- Compliance evidence is defined without unsupported certification claims.
- Security and local-first principles are explicit.

Deliverables:

- Product documentation
- Architecture
- Manifest proposal
- Compliance model
- Roadmap
- MVP acceptance criteria

## Stage 1 — Desktop proof of concept

Outcome:

A Windows desktop application opens a repository and shows discovered workspace information.

Scope:

- Tauri 2
- Angular desktop UI
- Folder selection
- Git metadata
- Package manager detection
- Nx detection
- Angular detection
- Storybook detection
- Read-only operation

No generation, remote services, or team collaboration is required.

## Stage 2 — One component record

Outcome:

ForgeGate discovers one Lit or vanilla Web Components button and presents a complete record. Angular/Nx follows as the second validation target after the Web Components slice proves the portable model.

Scope:

- Component identity
- Source files
- Contract
- Story mapping
- Token mapping
- Test mapping
- Lifecycle
- Owner
- Missing requirements

The manifest can be created or edited through a diff-based workflow.

## Stage 3 — Executable assurance

Outcome:

ForgeGate runs existing checks and normalizes the results.

Scope:

- Unit test
- Storybook interaction test
- Axe result
- Playwright test
- Lint
- Build
- Raw logs
- Current commit
- Stale result after source change

## Stage 4 — Human compliance evidence

Outcome:

A reviewer completes guided keyboard and screen-reader procedures.

Scope:

- Procedure version
- Environment
- Step results
- Notes
- Finding creation
- Approval
- Commit binding
- Stale approval

## Stage 5 — Policy and release decision

Outcome:

ForgeGate explains why the button is ready or blocked.

Scope:

- Required gates
- Severity thresholds
- Manual review requirements
- Documentation requirement
- Current evidence requirement
- Exception
- Release decision

## Stage 6 — Starlight publishing

Outcome:

ForgeGate generates a complete Starlight component page and validates the documentation build.

Scope:

- Frontmatter
- Overview
- API
- States
- Tokens
- Accessibility guidance
- Storybook example
- Evidence summary
- Protected user content
- Diff

## Stage 7 — Evidence export

Outcome:

A portable evidence package can be reviewed without ForgeGate.

Scope:

- Manifest
- Policy snapshot
- Automated evidence
- Manual evidence
- Findings
- Exceptions
- Release decision
- HTML report
- Checksums

This completes the first commercially meaningful vertical slice.

Current implementation note: a real manifest-indexed export exists with checksums, report HTML, built-in and external policy-document provenance snapshots, redaction plan, attachment index, safe redacted text attachment copies, curated automated-evidence details, verified package reload for Starlight regeneration, copied-attachment review decisions, and release-decision workflow records. It is not complete until full external policy-rule evaluation, approved copied-content consumption, package trust/signing policy, and repository release-history write-back are connected.

## Stage 8 — Component blueprint expansion

Outcome:

ForgeGate supports button, input, and dialog blueprints with increasing complexity.

This stage validates whether the blueprint model generalizes beyond a simple component.

## Stage 9 — React validation adapter

Outcome:

A non-Angular component uses the same manifest, policy, evidence, and documentation model.

React is a practical second adapter because of its market size and varied component patterns. Web Components may be developed in parallel if Custom Elements Manifest provides a faster standards-based validation target.

## Stage 10 — Multi-framework platform

Add:

- Vue
- Svelte
- Lit and Web Components
- Solid
- Qwik
- Astro components
- Framework-neutral fallback

Each adapter must meet a published support matrix.

## Stage 11 — Zeroheight and enterprise documentation

Outcome:

Teams can link Zeroheight pages, detect status drift, generate publication packages, and use supported API operations.

Zeroheight remains optional.

## Stage 12 — CI and headless CLI

Outcome:

The same policies and evidence model run locally and in CI.

Scope:

- Headless CLI
- GitHub Actions
- Artifact generation
- Pull-request checks
- Release gate
- Evidence import into desktop

## Stage 13 — Team workflow

Outcome:

Teams can assign reviews, resolve findings, manage approvals, and coordinate release decisions.

Possible implementation:

- Repository-hosted portable review records initially
- Optional coordination service later
- SSO and organization roles for enterprise edition

## Stage 14 — Safe generation

Outcome:

ForgeGate can generate missing stories, tests, manifests, procedures, and documentation with explicit diffs and targeted validation.

Full component generation should follow assurance validation rather than precede it.

## Stage 15 — Commercial pilot

Outcome:

A design partner uses ForgeGate on a real component library.

Pilot deliverables:

- Workspace onboarding
- Component inventory
- Three component records
- Policy configuration
- Automated and manual evidence
- Starlight documentation
- Evidence export
- Findings and roadmap

## Stage 16 — Production packaging

Add:

- Signed Windows installer
- Secure updates
- Licensing
- Offline mode
- Support bundle
- Privacy controls
- Crash reporting with consent
- macOS and Linux packaging

## Roadmap guardrails

Do not advance to broad multi-framework claims until:

- The Web Components vertical slice works end to end.
- Evidence freshness is trustworthy.
- Repository writes are safe.
- ForgeGate itself is accessible.
- The core model supports Angular/Nx as a second framework without redesign.
- At least one potential customer validates the workflow.

## Commercial milestone

The first product milestone worth selling is not “component discovery.” It is:

> ForgeGate can prove why a component is or is not ready, produce current automated and manual evidence, generate accurate documentation, and export a release package.
