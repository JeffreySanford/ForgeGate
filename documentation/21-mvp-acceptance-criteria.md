# ForgeGate MVP Acceptance Criteria

## MVP objective

The MVP must prove that ForgeGate can act as a real component assurance center, not merely a repository browser or Storybook launcher.

The MVP is complete when a user can open one Angular/Nx design-system repository, evaluate one button component through automated and manual requirements, understand current release readiness, generate accurate Starlight documentation, and export portable evidence.

## Supported environment

- Windows 11
- Tauri 2 desktop shell
- Angular desktop UI
- pnpm
- Nx workspace
- Modern Angular component library
- Local Storybook
- Astro Starlight target
- Git repository

Other operating systems, workspace managers, frameworks, and remote Storybooks are not required for MVP completion, although the core contracts must not prevent them.

## Scenario

The fixture or pilot repository contains:

- One button component
- Multiple Storybook stories
- Unit tests
- Storybook interaction tests
- Axe integration
- Playwright tests
- Tokens
- Starlight documentation site
- At least one intentionally missing requirement
- At least one intentionally failing or stale evidence item

## Acceptance journey

### 1. Install and launch

- ForgeGate installs on Windows.
- ForgeGate launches without developer tooling already running.
- The application provides accessible keyboard navigation and visible focus.
- The application displays version and diagnostic information.

### 2. Open workspace

- User selects a repository folder.
- ForgeGate explains requested access.
- ForgeGate identifies the Git repository.
- ForgeGate displays branch, commit, and dirty state.
- ForgeGate identifies pnpm, Nx, Angular, Storybook, test tools, tokens, and Starlight.
- Uncertain discovery is shown for confirmation.

### 3. Create or confirm configuration

- ForgeGate proposes repository configuration.
- Exact command mappings are visible.
- The user sees a diff before configuration is written.
- ForgeGate writes only after approval.
- Configuration validates against a schema.

### 4. Discover button component

- ForgeGate discovers the button.
- The component record shows stable identity, package, project, source files, version, owner, lifecycle, and framework.
- ForgeGate associates stories and tests.
- ForgeGate identifies token mappings.
- Missing mappings are visible.

### 5. Manifest

- ForgeGate reads or proposes a component manifest.
- The manifest includes contract, states, stories, tests, compliance profiles, documentation, consumers, and policy.
- Inferred values are identified.
- Invalid manifest data produces actionable validation errors.
- Proposed changes are diffed before writing.

### 6. Storybook

- ForgeGate connects to the local Storybook.
- The button’s stories are listed.
- A story preview can be opened safely.
- Required state coverage is displayed.
- At least one missing state is detected.
- Preview content has no privileged desktop bridge.

### 7. Automated gates

ForgeGate can run configured:

- Unit tests
- Storybook interaction tests
- Axe checks
- Playwright tests
- Lint
- Build

For every run:

- Exact command and working directory are shown.
- User approval is required.
- Output streams to the UI.
- Cancellation works.
- Timeout is enforced.
- Exit status and duration are recorded.
- Raw result is preserved.
- Normalized evidence is created.
- Evidence is tied to the current commit or dirty fingerprint.

### 8. Result interpretation

- Passed, failed, incomplete, skipped, blocked, and unknown states are distinguishable.
- Axe incomplete findings remain visible.
- A workspace-level result is not falsely attributed to the button without mapping.
- A failing result creates or links a finding.
- The user can open raw evidence.

### 9. Manual review

- ForgeGate provides a guided keyboard procedure.
- ForgeGate provides a guided Windows screen-reader procedure.
- Reviewer confirms operating system, browser, assistive technology, and versions.
- Each step supports pass, fail, blocked, not applicable, and observation.
- Reviewer can add notes.
- Failed steps can create findings.
- Reviewer approval is recorded.
- Review is tied to the current commit and procedure version.

### 10. Stale evidence

- User changes a relevant button source file.
- ForgeGate detects the change.
- Prior automated evidence becomes stale where applicable.
- Prior manual approval becomes stale.
- ForgeGate explains which file changed and which reviews must repeat.
- A documentation-only change does not unnecessarily invalidate unrelated evidence if the MVP classifier supports that distinction; otherwise conservative invalidation is clearly documented.

### 11. Policy and readiness

- A release policy defines required gates.
- ForgeGate evaluates current evidence.
- ForgeGate displays passed gates.
- ForgeGate displays warnings.
- ForgeGate displays blocking conditions.
- ForgeGate does not hide blockers behind a percentage.
- ForgeGate records an authorized candidate or blocked decision.
- The decision identifies policy version, evidence set, commit, approver, and date.

### 12. Documentation

- ForgeGate detects the Starlight site.
- ForgeGate generates a button page containing overview, Storybook example, API, states, tokens, keyboard behavior, accessibility guidance, assurance summary, and release state.
- User-authored content is preserved.
- A diff is shown before writing.
- The configured Starlight build runs.
- Build failures are actionable.
- Publication metadata is recorded.

### 13. Evidence export

ForgeGate exports:

- Component manifest
- Policy snapshot
- Automated test summary
- Raw or referenced automated results
- Manual reviews
- Findings
- Exceptions if present
- Documentation status
- Release decision
- HTML report
- JSON records
- Checksums

The package is understandable without ForgeGate and contains no stored credentials.

### 14. Error handling

The MVP handles:

- Unsupported repository
- Storybook unavailable
- Missing command
- Command failure
- Command timeout
- Command cancellation
- Malformed result
- Missing artifact
- Invalid manifest
- Starlight build failure
- Repository file changed during proposed write

Errors do not corrupt repository files or approved evidence.

### 15. Security

- Workspace access is scoped.
- Paths are validated.
- Remote preview cannot invoke Tauri commands.
- Commands require approval.
- Writes require diff and approval.
- Secrets are redacted.
- Credentials are not stored in repository files.
- Evidence export excludes credentials.

### 16. Accessibility of ForgeGate

The MVP desktop UI completes:

- Automated accessibility checks
- Keyboard-only review
- Screen-reader smoke review
- Forced-colors review
- 200% zoom review
- Reduced-motion review

Known issues are documented and subject to the same finding process.

## Performance expectations

Initial expectations for the fixture repository:

- Workspace discovery completes in a reasonable interactive period.
- The UI remains responsive during scans and command execution.
- Long operations are cancellable.
- Rescans reuse cached results where files are unchanged.

Exact benchmarks should be established after the first implementation.

## Commercially meaningful outcome

The MVP should support this demonstration statement:

> ForgeGate opened a real component repository, discovered the button’s implementation and Storybook states, executed the required quality gates, guided manual compliance review, detected stale approval after a source change, explained why release was blocked, generated accurate Starlight documentation, and exported a portable evidence package.

If the product cannot demonstrate that complete statement, the MVP is not complete.

## Post-MVP validation

After MVP completion:

- Test with a second Angular repository.
- Test with a real design-system team.
- Measure evidence-assembly time before and after.
- Implement one React or Web Component adapter.
- Refine the adapter SDK based on actual differences.
- Decide whether safe artifact generation enters the next release.
