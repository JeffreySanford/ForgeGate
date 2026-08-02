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
> `checksums` map), `policy-snapshot.json` for ForgeGate's current built-in
> release-decision ruleset, `test-summary.json`, `documentation-status.json`,
> `redaction-plan.json`, `attachments/index.json` for connected raw artifact
> refs, and redacted `attachments/files/*.txt` copies for readable
> workspace-relative text artifacts,
> `automated/` for imported Playwright, axe, Storybook interaction, Jest, and
> Vitest reports, `manual/` (one real file per connected `ManualReview`),
> `findings/`, `exceptions/` (scoped to findings this export actually includes),
> `release-decision.json`, durable `release-decisions/*.json` workflow records,
> `report.html`, and `checksums.sha256`.
> Not yet implemented, and named explicitly in `manifest.json`'s `excludes` map
> and in the report's "Not connected" section rather than silently omitted:
> copying binary, absolute-path, temporary, or unreadable raw attachment files
> into `attachments/files/`. See TODO.md's "Evidence export
> remaining sections" for what each one is blocked on. ForgeGate still imports
> externally produced Storybook interaction, axe, Playwright, Jest, and Vitest
> evidence. It also now orchestrates three configured target-repository command
> gates itself — unit, lint, and build — through explicit approval and records
> their real exit-code result as `TestExecution` evidence. Storybook, axe, and
> Playwright execution are not yet run by ForgeGate; those remain import-only.
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
> When a decision is produced, ForgeGate also writes a durable workflow record
> under `release-decisions/`. That record links back to `release-decision.json`,
> repeats the component, policy, commit, evidence, and finding inputs, and
> distinguishes `blocked-no-approval-required`, `human-approved`, and
> `test-harness-not-real`. Repository write-back for release-decision history
> and desktop human-approver capture remain future work.
>
> **`policy-snapshot.json`.** This is now a real snapshot of ForgeGate's narrow
> built-in release-decision rules, not a complete organizational policy engine.
> It records the authored `policyId`/`policyVersion`, repository commit,
> evidence ids, finding ids, evaluated rule outcomes, and explicit limitations.
> It does not load an external policy document, compliance control catalog,
> expiry calendar, or organization-specific waiver rules.
> ForgeGate can now load a repository-owned external policy/ruleset document
> through `.forgegate/config.yaml` `policyMappings` when the component's
> `policyId` and `policyVersion` match. The snapshot records path, format,
> size, SHA-256, excerpt, commit, and limitations in `policy-snapshot.json`
> and the HTML report. This is policy-document provenance, not a complete
> external policy evaluator; the current release decision still uses the
> built-in rules named in this snapshot.
>
> **Attachments and redaction.** ForgeGate now writes `attachments/index.json`
> when connected evidence records carry a real raw artifact reference. That file
> identifies the source evidence, source path, planned target path, redaction
> requirement, source class, media class, consent status, copy blocker, and
> whether the artifact was `copied-redacted`, `referenced-not-copied`,
> `pending-consent`, or `blocked-binary-redaction`. ForgeGate also writes
> `redaction-plan.json` on every
> export to describe the current normalized-JSON, raw-attachment, and
> HTML-report redaction posture. It copies only workspace-relative text artifacts
> it can read through the guarded `read_text_file` path, and writes them under
> `attachments/files/*.txt` after narrow text redaction. Binary files, absolute
> paths, temporary command artifacts, unreadable refs, and richer image/trace
> redaction are classified with explicit blockers but remain uncopied until
> copy consent, size limits, binary-safe streaming, destination naming, and
> retention rules exist.
>
> **Next implementation order.** The report-data primitive and first desktop UI
> path for direct Starlight regeneration from verified exported package records
> now exist: imported verified records can be merged into generated component
> report data, with live workspace records remaining authoritative on duplicate
> ids, and the generated files still stage for diff review before approval.
> Copied package attachment files are now detected during verified package
> reload and held as `requires-review` rather than loaded into generated
> Starlight report data. Fuller Starlight plugin discovery and registration
> comes next. Broad binary/temp attachment copying follows only after the
> current consent-policy classification is wired to an explicit UI flow and
> binary-safe file handling.

Suggested export:

```text
forgegate-evidence/
├── manifest.json
├── policy-snapshot.json
├── release-decision.json
├── release-decisions/
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
│   ├── index.json
│   └── files/
├── redaction-plan.json
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

Evidence packages include checksums. Later versions may support cryptographic signing and organization certificates.

ForgeGate now verifies `manifest.json` and `checksums.sha256` when loading an
already-read package file map for Starlight consumption. Missing, modified,
conflicting, or unlisted evidence files are reported as package-integrity
limitations, and unverified content is not passed into the Starlight record
loader. Those verified records can now feed generated Starlight component
report data directly. The first desktop import/regeneration UI uses a dedicated
package-directory picker, reads only safe evidence-package-relative text files
from that selected directory, verifies the package, and stages regenerated
Starlight output for review before any write lands in the workspace. Verified
copied files under `attachments/files/` are counted and reported as requiring
review, but their paths and contents are not exposed to Starlight report data
until a real redaction-review approval UI exists. Organization trust/signing
policy remains future work.

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
