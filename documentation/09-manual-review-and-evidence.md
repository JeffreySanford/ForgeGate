# ForgeGate Manual Review and Evidence

## Purpose

Many important component qualities require human judgment. ForgeGate should make those reviews structured, repeatable, attributable, and tied to the code that was actually reviewed.

The goal is not to turn accessibility specialists into checkbox operators. The goal is to remove administrative friction while preserving professional judgment.

## Procedure model

A manual procedure should contain:

- Stable procedure ID
- Version
- Component types to which it applies
- Preconditions
- Required environment
- Starting state
- Ordered steps
- Expected result for each step
- Allowed result states
- Required attachments
- Required reviewer role
- Expiration or re-review rule

Example:

```yaml
id: button.screen-reader.windows
version: 1.0.0
appliesTo: [button]
environment:
  operatingSystem: Windows
  assistiveTechnology: [JAWS, NVDA]
steps:
  - action: Move focus to the button using Tab.
    expected: The accessible name and button role are announced.
  - action: Activate using Space.
    expected: The configured action occurs exactly once.
  - action: Activate using Enter.
    expected: The configured action occurs exactly once.
  - action: Review the disabled example.
    expected: The unavailable state is conveyed and activation does not occur.
```

**Implementation status.** The guided walkthrough described above (`ManualReviewWalkthrough`) is real for target-repository components: it reads a procedure's real `.forgegate/procedures/*.yaml` file and steps a reviewer through it. Preconditions, starting state, and required attachments are not implemented yet — the walkthrough is narrower than this section's full model.

There is also a second, purpose-built guided flow that does not fit this section's component-centric model: `AccessibilityReviewPage` (`/accessibility-review`) reviews ForgeGate's own shell rather than a component discovered in some workspace, since ForgeGate has no manifest or procedure file representing its own UI. Three of its four areas (`self-review-content.ts`) are fixed, hand-authored content — ForgeGate's shell structure is identical regardless of which repository is open — but the fourth ("Component assurance records") is deliberately not fixed: `buildComponentRecordSteps` generates real per-component checks from whatever the currently open workspace actually discovered, sorted so components with no real `ManualReview` yet (or a stale one) sort first, with a live "N of M reviewed" coverage count. A failed component-record step's derived `Finding` is attributed to the real component it checked, not the shell (`manual-review-findings.ts`'s per-step `componentId` override). The review as a whole still records a disclosed synthetic `componentVersionId` (`forgegate.desktop.shell`) rather than a real discovered component's identity, and stages, diffs, and approves through the exact same `WorkspaceService.stageManualReview`/`approveStagedManualReview` mechanism as the component-centric walkthrough — same evidence shape, same `.forgegate/manual-reviews/` directory, same worst-of-steps rollup — so it is a different entry point onto the same real evidence model, not a separate one.

## Review result states

- Passed
- Failed
- Blocked
- Not applicable
- Observation
- Needs follow-up

Not applicable requires rationale. Blocked requires the blocking condition. A failed step should create or link to a finding.

## Environment capture

ForgeGate should capture:

- Operating system and version
- Browser and version
- Assistive technology and version
- Display scaling
- Zoom
- Theme
- Forced-color or high-contrast state
- Reduced-motion state
- Locale and text direction
- Story or application URL
- Component and package version
- Git commit or dirty fingerprint

Automatic environment detection may assist, but the reviewer must confirm the environment.

## Reviewer identity

A review record should include:

- Reviewer name or organization identity
- Reviewer role
- Date and timezone
- Signature or approval action where policy requires it
- Optional second reviewer
- Conflict-of-interest or independence metadata where required by an organization

## Review queue

Future team editions should provide queues such as:

- Ready for keyboard review
- Ready for screen-reader review
- Incomplete automated findings requiring disposition
- Review expired
- Source changed after approval
- Exception expiring
- Consumer application failed

## Attachments

Reviewers may attach:

- Screenshots
- Screen recordings
- Audio recordings
- Browser traces
- Notes
- External issue links
- Provider report links

Attachments should have checksums, type, size, date, and retention information.

## Findings

A finding should be linked directly to the evidence step that produced it.

Example fields:

- Finding ID
- Title
- Component
- Story or application scenario
- Procedure and step
- Severity
- Observed behavior
- Expected behavior
- Standard or policy reference
- Owner
- Status
- Resolution evidence
- Verification review

## Exceptions

Exceptions are governed decisions, not deleted findings.

Supported types:

- Temporary exception
- Accepted risk
- Not applicable
- Known platform limitation
- Intentional behavior
- Deferred remediation

An exception should include:

- Rationale
- Approver
- Scope
- Effective date
- Expiration date
- Compensating control
- Related finding
- Re-review condition

## Stale approvals

An approval becomes stale when the reviewed evidence no longer matches current requirements or code.

Initial invalidation model:

- Component implementation change invalidates component manual reviews.
- Relevant token change invalidates visual and contrast review.
- Keyboard logic change invalidates keyboard and interaction review.
- Markup or ARIA change invalidates screen-reader review.
- Policy change reevaluates required evidence.
- Procedure change may require re-review.
- Expiration date invalidates the approval.

The initial implementation may use conservative component-level invalidation. More precise dependency-aware invalidation may follow.

ForgeGate should display:

```text
JAWS review: STALE
Reviewed commit: 7f3a81c
Current commit:  b91d20e
Changed files:
- button.component.html
- button.component.ts
Reason:
- Markup and keyboard behavior may have changed.
Required action:
- Repeat screen-reader and keyboard procedures.
```

**Implementation status.** The commit-level half of this is real: `ComponentDetailPage.manualReviewIsStale`/`manualReviewFreshness` compare a review's recorded commit against the workspace's real current commit, and a stale row's "Show changed files" action reuses the same real `git diff` mechanism P1.3's evidence timeline does, naming the exact files that changed. The per-category invalidation model above (component vs. token vs. keyboard-logic vs. markup/ARIA change) is not implemented — ForgeGate reports _that_ a review is stale and _which files_ changed, not _why_ that specific change invalidates _this specific_ procedure. Policy change, procedure change, and expiration-date invalidation are also not implemented.

## Evidence package structure

> **Implementation status.** ForgeGate now exports a real package against this
> structure (`apps/forgegate-desktop/src/app/evidence-export.ts`, reachable from
> the "Export evidence package" button on a component's detail page). Implemented
> today: `manifest.json` (including the real repository commit and a
> `checksums` map), `test-summary.json`, `documentation-status.json`,
> `automated/` for imported Playwright, axe, Storybook interaction, Jest, and
> Vitest reports, `manual/` (one real file per connected `ManualReview`),
> `findings/`, `exceptions/` (scoped to findings this export actually includes),
> `release-decision.json`, `report.html`, and `checksums.sha256`.
> Not yet implemented, and named explicitly in `manifest.json`'s `excludes` map
> and in the report's "Not connected" section rather than silently omitted:
> `policy-snapshot.json` and `attachments/`. See TODO.md's "Evidence export
> remaining sections" for what each one is blocked on. ForgeGate still imports
> externally produced automated evidence; it does not yet orchestrate
> target-repository commands itself.
>
> **`release-decision.json` and approvals.** A `blocked` outcome requires no
> approver, so it is produced from real data today whenever the repository has
> authored both a `policyId` and a `policyVersion` on the component manifest. An
> `authorized-candidate` outcome requires a named approver; ForgeGate has no
> human approval flow yet, so in normal use a clean component simply gets no
> release decision — with the reason recorded — rather than a fabricated
> approval. A `'test-harness'` approver exists solely so that path can be
> exercised end to end; anything produced that way is flagged `notRealApproval`
> in both `release-decision.json` and `manifest.json`, and banner-marked in
> `report.html`, so it can never be mistaken for a real approval.

Suggested export:

```text
forgegate-evidence/
├── manifest.json
├── policy-snapshot.json
├── release-decision.json
├── test-summary.json
├── automated/
│   ├── axe-results.json
│   ├── interaction-results.json
│   └── playwright-results.json
├── manual/
│   ├── keyboard-review.json
│   └── screen-reader-review.json
├── findings/
├── exceptions/
├── attachments/
├── documentation-status.json
├── report.html
└── checksums.sha256
```

## Evidence report

> **Implementation status.** `renderEvidenceReport` emits this as a
> self-contained `report.html`. Covered today from real data: component and
> version, repository commit, methods used and test environments (as recorded on
> each real `TestExecution`), automated results, findings, manual results (a
> real "Manual reviews" table), exceptions, documentation status, and release
> decision (including the approver, when one exists, or an honest "None — a
> blocked outcome requires no approver" otherwise). Not yet covered, and listed
> by name in the report's own "Not connected" section so their absence cannot be
> mistaken for a pass: scope, applicable policy and compliance profiles, and
> consumer validation.

A human-readable report should explain:

- Component and version
- Scope
- Applicable policy and compliance profiles
- Repository commit
- Methods used
- Test environments
- Automated results
- Manual results
- Findings
- Exceptions
- Consumer validation
- Documentation status
- Release decision
- Approvers
- Evidence freshness

## Integrity

Evidence packages should include checksums. Later versions may support cryptographic signing and organization certificates.

ForgeGate should detect missing or modified evidence files and distinguish an incomplete package from a failed component.

## Privacy

Evidence may include personal names, screenshots, application data, or sensitive system information.

ForgeGate should support:

- Redaction
- Attachment review before export
- Configurable retention
- Local-only storage
- Exclusion of secrets and tokens
- Organization privacy policies

## Acceptance criteria

The MVP manual-review workflow should support:

- One keyboard procedure
- One Windows screen-reader procedure
- Environment confirmation
- Pass/fail/blocked/not-applicable results
- Notes and one attachment type
- Finding creation
- Reviewer approval
- Commit association
- Stale status after source change
- Evidence export
