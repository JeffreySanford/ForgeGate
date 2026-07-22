# ForgeGate Compliance Testing

## Purpose

ForgeGate treats compliance as an evidence and governance problem, not as a single automated scan.

The platform should help teams define what must be tested, execute machine-testable checks, guide manual evaluation, capture environments and findings, manage exceptions, and tie release decisions to current evidence.

## Supported compliance direction

Initial profiles should focus on:

- Section 508-oriented web component evaluation
- WCAG 2.2 AA internal conformance evidence
- Organization-specific accessibility policies
- Design-system release policies
- Application-context accessibility validation

Future profiles may include additional procurement, brand, security, privacy, documentation, or regulated-delivery requirements, but accessibility remains the initial compliance domain.

## Important language rule

ForgeGate must not claim that a component is legally compliant merely because automated checks pass.

Preferred language:

- Automated checks passed
- Manual keyboard review completed
- Screen-reader procedure passed
- Required evidence is current
- Release policy satisfied
- Approved under organization policy

Avoid:

- Legally certified
- Fully compliant because axe passed
- Guaranteed Section 508 compliance

## Compliance profile

A compliance profile is a versioned repository-controlled policy document.

Example:

```yaml
id: section-508-web
version: 0.1.0
standard:
  name: Section 508 web component evidence
  basis:
    - WCAG 2.0 AA references required by organizational policy
    - organization-specific Section 508 procedures
scope: component

automated:
  axe:
    required: true
    stories: required
  interaction:
    required: true
  keyboardAssertions:
    required: true

manual:
  keyboard:
    required: true
  screenReaderWindows:
    required: true
  forcedColors:
    required: true
  zoom400:
    required: true
  reducedMotion:
    required: conditional

evidence:
  testerIdentity: required
  browserVersion: required
  operatingSystem: required
  assistiveTechnologyVersion: required
  procedureVersion: required
  commitSha: required

release:
  criticalFindingsAllowed: 0
  seriousFindingsAllowed: 0
  incompleteFindingsRequireDisposition: true
```

The exact legal and organizational basis must be reviewed by qualified compliance experts before a production profile is marketed as authoritative.

## Testing categories

### Automated semantic checks

Examples include:

- Invalid ARIA
- Missing accessible names
- Missing labels
- Duplicate IDs
- Detectable color contrast issues
- Invalid landmark relationships
- Certain focusability problems
- Role and attribute conflicts

ForgeGate should execute or import results from existing tools such as axe rather than create a new rules engine.

### Automated interaction checks

Examples include:

- Enter and Space activation
- Escape behavior
- Arrow-key behavior
- Focus placement
- Focus restoration
- Focus containment
- Disabled behavior
- Error-message rendering
- Live-region announcements where reliable automation exists

Automated interaction tests should be component-type specific and grounded in blueprint requirements.

### Visual and environmental checks

Examples include:

- Light theme
- Dark theme
- Forced colors
- High contrast
- Reduced motion
- Mobile and narrow viewport
- 200% and 400% zoom
- Text spacing
- RTL
- Long labels
- Localization expansion
- Error, loading, and disabled states

Some checks can be automated; others require human judgment.

### Manual keyboard review

Manual keyboard review should capture:

- Navigation order
- Focus visibility
- Activation behavior
- Escape behavior
- Arrow-key behavior
- Focus trapping
- Focus restoration
- Unexpected keyboard traps
- Disabled-state behavior
- Usability without pointer input

### Manual screen-reader review

ForgeGate should support configurable procedures for:

- JAWS
- NVDA
- VoiceOver
- TalkBack
- Organization-specific assistive technologies

A procedure should define:

- Starting state
- Navigation method
- Expected role
- Expected name
- Expected value and state
- Expected announcements
- Activation steps
- Error and status behavior
- Pass/fail/observation fields

### Cognitive and error-prevention review

Blueprints may include prompts for:

- Clear labels
- Instructions
- Error identification
- Error recovery
- Prevention of destructive mistakes
- Consistency
- Timing
- Motion and distraction
- Status clarity

## Component-specific applicability

Not every requirement applies to every component.

Examples:

- Reduced motion may be not applicable to a static button.
- Arrow-key navigation applies to tabs, menus, radio groups, trees, and grids but not an ordinary button.
- Focus trapping applies to modal dialogs but not inline alerts.

Not-applicable decisions must include rationale and, where required, reviewer approval.

## Automated result model

Every automated result should include:

- Component ID
- Story ID or scenario
- State and environment
- Rule or assertion ID
- Result
- Severity or impact
- Tool and version
- Adapter and version
- Commit or dirty fingerprint
- Timestamp
- Raw artifact reference

## Manual result model

Every manual result should include:

- Component ID
- Procedure ID and version
- Reviewer identity
- Reviewer role
- Date
- Operating system
- Browser
- Assistive technology
- Story or application scenario
- Expected result
- Observed result
- Pass, fail, blocked, not applicable, or observation
- Attachments
- Related finding
- Commit or dirty fingerprint

## Incomplete findings

Automated tools often identify cases that require human judgment.

ForgeGate should:

- Preserve incomplete results
- Assign or group them for manual review
- Require disposition when policy demands it
- Record resolved, confirmed issue, false positive, not applicable, or deferred states
- Prevent silent dismissal

## Findings

A finding should include:

- Stable ID
- Component and scenario
- Description
- Severity
- Source evidence
- Standard or policy reference
- Owner
- Status
- Due date
- Resolution
- Verification evidence
- Exception if accepted

## Application-context testing

A component passing in Storybook does not prove it works correctly in an application.

ForgeGate should support scenarios such as:

- Dialog inside an application shell
- Button under a consuming theme
- Table inside a constrained container
- Tooltip near clipping boundaries
- Form fields inside real validation flows
- Duplicate labels created by composition
- Conflicting focus traps
- Heading or landmark hierarchy problems

Component and application evidence must remain distinguishable.

## Review expiration and staleness

Evidence may become stale because of:

- Component source changes
- Token changes
- Story changes
- Dependency changes
- Policy changes
- Procedure changes
- Browser or assistive-technology support requirements
- Expiration date

ForgeGate should explain whether a review is stale because code changed, policy changed, or time elapsed.

## Evidence package

A compliance evidence package should include:

- Scope and component version
- Applicable profile and version
- Methods used
- Environments
- Automated results
- Manual results
- Findings
- Incomplete-result dispositions
- Exceptions
- Screenshots or recordings
- Commit and build identity
- Approval decision
- Checksums

## Profile governance

Production profiles should require:

- Named owner
- Version
- Change history
- Effective date
- Review date
- Expert approval
- Migration guidance

ForgeGate should record which profile version governed each release decision.
