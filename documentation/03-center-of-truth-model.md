# ForgeGate Center-of-Truth Model

## Purpose

ForgeGate is intended to be the operational center of truth for component assurance, but it must not become the only place where important data can be understood or recovered.

The product therefore separates truth into explicit layers.

## Repository truth

Repository truth is durable, reviewable, and version controlled.

It includes:

- Workspace configuration
- Component manifests
- Component contracts
- Required states and variants
- Token mappings
- Story mappings
- Test requirements
- Compliance profiles
- Policy rules
- Documentation mappings
- Ownership
- Consumer mappings
- Lifecycle metadata

Repository truth answers:

> What is required, where does it live, and how should the component be governed?

Repository truth should use documented YAML or JSON schemas and remain inspectable without ForgeGate.

## Execution truth

Execution truth is produced by tools and environments.

It includes:

- Unit-test results
- Storybook interaction results
- Axe results
- Playwright and Cypress results
- Visual regression results
- Build, lint, type-check, and package results
- Contract and bundle results
- Tool versions
- Browser and operating-system information
- Git commit or dirty-worktree fingerprint
- Raw logs and artifacts

Execution truth answers:

> What happened when this exact version was evaluated using this method and environment?

ForgeGate normalizes execution truth but preserves the raw source whenever practical.

## Review truth

Review truth is produced by human judgment and governed decisions.

It includes:

- Keyboard review
- Screen-reader review
- High-contrast review
- Zoom and reflow review
- Cognitive-usability observations
- Findings
- Exceptions
- Risk acceptance
- Reviewer approval
- Release approval
- Re-review date

Review truth answers:

> What did qualified people observe, decide, approve, reject, or accept?

Review truth must identify procedure, reviewer, environment, date, scope, and related code version.

## Publication truth

Publication truth describes where guidance and status are visible to consumers.

It includes:

- Storybook page and story IDs
- Starlight page path and source commit
- Zeroheight page identity and status
- Published package version
- Changelog and migration guidance
- Publication timestamp and result

Publication truth answers:

> What information has actually been published, where, and for which component version?

## Release truth

Release truth is the explicit decision calculated from policy and approved by authorized people.

It includes:

- Component and version
- Git commit
- Policy snapshot
- Evidence set
- Blocking and warning findings
- Accepted exceptions
- Approver
- Decision date
- Candidate, approved, blocked, deprecated, or retired state

Release truth answers:

> Was this component approved, under which rules, with which evidence, and for exactly which code?

## Why the layers matter

A component can have repository truth without current execution truth. It can have passing automated results without review truth. It can have complete evidence without publication truth. It can have all of those without an authorized release decision.

ForgeGate must never collapse these distinct states into one unexplained percentage.

## Example readiness explanation

```text
UP Dialog 1.4.0

Repository requirements       Complete
Automated execution evidence  Current and passing
Manual keyboard review        Current and approved
JAWS review                   Stale after template change
Documentation                 Current
Consumer validation           Failed in Admin Console
Release decision              Blocked

Blocking reasons:
1. JAWS review must be repeated for commit b91d20e.
2. Admin Console focus-trap integration test is failing.
```

## Freshness model

Every evidence item should carry:

- Component identifier
- Scope
- Commit SHA or dirty fingerprint
- Relevant source fingerprints
- Policy version
- Procedure version
- Adapter version
- Execution or review date

The initial stale-evidence rule should be conservative:

> Any relevant component source change invalidates manual approval and requires affected automated checks to rerun.

Later versions may classify changes:

- Markup or ARIA change
- Keyboard logic change
- Style or token change
- Story-only change
- Test-only change
- Documentation-only change
- Dependency change
- Policy change

The application must explain the invalidation reason.

## Portability requirements

Critical records should be exportable as:

- JSON
- YAML where appropriate
- Markdown or HTML summary
- Evidence attachments
- Checksums

A release evidence package must remain understandable without ForgeGate's optional PostgreSQL history store.

## Conflict handling

Conflicts can occur when:

- The manifest references a deleted story.
- Documentation describes an old public API.
- A Zeroheight status disagrees with the repository lifecycle.
- CI evidence exists for a different commit.
- A manual review was edited outside ForgeGate.
- Two branches contain competing approvals.

ForgeGate should surface conflicts and require explicit resolution. It should not silently choose the most recent value without understanding provenance.

## Authority rules

Default authority should be:

1. Repository manifest and policy define requirements.
2. Tool output defines execution results.
3. Human review records define observations and approvals.
4. Release policy and authorized approvers define release state.
5. Documentation destinations reflect published state but do not redefine the underlying component contract.

Organizations may configure authority, but changes must be explicit and documented.
