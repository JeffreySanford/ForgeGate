# ForgeGate Agent and Contribution Rules

This file defines how human contributors and AI coding agents should work in the ForgeGate repository.

## Mission

ForgeGate is a local-first, framework-neutral component assurance platform. Every change should strengthen the ability to discover, specify, test, review, document, govern, and release trustworthy web components.

## Source-of-truth hierarchy

1. `README.md` defines the product direction.
2. `TODO.md` is the active phased implementation plan.
3. `documentation/README.md` is the documentation map.
4. Architecture, schema, adapter, compliance, and integration documents define subsystem behavior.
5. Code and tests must match approved documentation or update the documentation in the same change.

When documents conflict, do not silently choose one. Record the conflict and update the authoritative document.

## Work-selection rules

- Choose work from `TODO.md` unless the issue or user request explicitly overrides it.
- Do not mark work complete because scaffolding exists.
- Mark work complete only after implementation, tests, documentation, and acceptance criteria are satisfied.
- Use `[ ]` for incomplete work and `[X}` for completed work in project planning files.
- Keep changes narrowly scoped and reviewable.
- Avoid multi-framework implementation until the core contracts are framework-neutral and the Angular vertical slice works.

## Architecture rules

- Keep core domain contracts independent of Angular, React, Vue, Storybook, Tauri, and specific test runners.
- Put framework-specific behavior behind framework adapters.
- Put workspace-specific behavior behind workspace adapters.
- Put tool output parsing behind test or integration adapters.
- Put publishing behavior behind documentation adapters.
- Preserve raw evidence even when normalized evidence is created.
- Treat SQLite as local cache and workflow state, not the sole durable record.
- Store durable manifests, policies, mappings, and exportable evidence in portable repository-friendly formats.

## Security rules

- Treat all opened repositories and remote preview content as untrusted.
- Never expose privileged Tauri commands to remote Storybook or documentation content.
- Require explicit capability boundaries for filesystem, process, network, Git, and credential operations.
- Show the user the exact command and working directory before process execution.
- Show a diff before repository writes.
- Never silently overwrite an existing file.
- Never silently stage, commit, push, publish, or send evidence.
- Redact secrets from logs and exported support bundles.
- Store credentials in the operating-system credential store when implementation begins.

## Accessibility and compliance rules

- Automated accessibility tools provide partial evidence, not complete certification.
- Never label a component legally compliant solely because automated tests pass.
- Distinguish automated results, manual results, incomplete findings, accepted exceptions, and release decisions.
- Record test method, scope, environment, tool version, browser, operating system, assistive technology, tester, date, and commit where applicable.
- ForgeGate itself must be keyboard accessible, screen-reader usable, zoomable, high-contrast compatible, and reduced-motion aware.

## Test rules

Every meaningful feature should include the relevant combination of:

- Unit tests
- Contract/schema tests
- Adapter fixture tests
- Integration tests
- Desktop end-to-end tests
- Security tests
- Accessibility tests
- Migration tests
- Evidence normalization tests

Tests should use deterministic fixtures. Do not depend on a live third-party service for the default test suite.

## Documentation rules

- Explain why a subsystem exists before documenting implementation details.
- Include responsibilities, boundaries, data flow, failure modes, security concerns, and acceptance criteria.
- Mark assumptions and unresolved decisions explicitly.
- Provide examples for schemas and adapter contracts.
- Update the documentation map when a new major document is added.
- Keep vendor-specific facts isolated in integration documents so they can be updated without rewriting the product architecture.

## Generated-code rules

- Generate into a temporary location first.
- Compare against the target repository.
- Present a file list and unified diff.
- Allow users to accept or reject individual changes.
- Run formatting and targeted validation after accepted writes.
- Preserve custom user code.
- Prefer explicit extension points over fragile text replacement.

## Pull-request expectations

A pull request should explain:

- What changed
- Why it changed
- Which TODO items it addresses
- Which architectural contracts are affected
- Which tests ran
- Which evidence was produced
- Which risks or follow-up items remain

## Definition of done

A task is complete when:

- The implementation satisfies its acceptance criteria.
- Relevant tests pass.
- Failure and cancellation paths are handled.
- Security boundaries are respected.
- Accessibility requirements are considered.
- Documentation is updated.
- `TODO.md` accurately reflects the new status.
