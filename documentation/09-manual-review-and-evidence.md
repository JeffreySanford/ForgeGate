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

## Evidence package structure

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
