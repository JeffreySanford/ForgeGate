# ForgeGate User Experience

## Experience goal

ForgeGate should make a complex assurance process understandable without reducing it to misleading green badges.

The interface should answer three questions at every level:

1. What exists?
2. What is required?
3. What must happen next?

## Primary navigation

Suggested areas:

- Workspaces
- Components
- Test Center
- Review Center
- Findings
- Documentation
- Releases
- Policies
- Adapters
- Settings

## Workspace onboarding

### Step 1: Select repository

The user chooses a local folder. ForgeGate displays the scope of requested access.

### Step 2: Discovery

ForgeGate scans and reports:

- Git state
- Package manager
- Workspace manager
- Frameworks
- Component packages
- Storybooks
- Tests
- Tokens
- Documentation targets
- CI providers

### Step 3: Confirm mappings

The user corrects uncertain results and selects trusted commands.

### Step 4: Save configuration

ForgeGate proposes `.forgegate/config.yaml` and displays the diff.

## Workspace dashboard

The dashboard should show:

- Repository and branch
- Current commit
- Dirty state
- Component count
- Candidate and approved components
- Blocked components
- Stale evidence
- Failing gates
- Pending reviews
- Documentation drift
- Expiring exceptions
- Adapter warnings

## Component inventory

Suggested columns or cards:

- Name
- Package
- Framework
- Version
- Lifecycle
- Readiness
- Blocking count
- Story coverage
- Test status
- Manual review status
- Documentation status
- Owner

Filters:

- Framework
- Package
- Lifecycle
- Owner
- Blueprint
- Readiness
- Finding severity
- Stale evidence
- Missing manifest
- Missing documentation

## Component record

Suggested sections:

### Summary

- Component identity
- Version
- Lifecycle
- Readiness decision
- Blocking reasons
- Current commit
- Last approved commit

### Contract

- Inputs, props, events, slots, parts, methods
- Native semantics
- Adapter-specific metadata

### States and stories

- Required state matrix
- Story mappings
- Missing coverage
- Preview controls

### Tokens

- Primitive, semantic, and component token mappings
- Theme coverage
- Drift warnings

### Tests

- Required gates
- Current, stale, failed, pending, or not-run state
- Run actions
- Raw artifacts

### Compliance

- Profiles
- Automated results
- Incomplete findings
- Manual procedures
- Environments

### Findings and exceptions

- Open findings
- Accepted exceptions
- Owners
- Due dates
- Expiration

### Consumers

- Applications
- Scenarios
- Versions
- Pass/fail status

### Documentation

- Storybook
- Starlight
- Zeroheight
- Drift
- Publication plan

### Release

- Policy
- Evidence set
- Approvers
- Decision history
- Export

## Test Center

The Test Center should support:

- Run all required gates
- Run one gate
- Run only stale gates
- View prerequisites
- View exact command
- Stream logs
- Cancel
- Open raw report
- Filter results by component
- Compare current and prior run

## Review Center

The Review Center should provide guided work rather than generic forms.

Example:

```text
Screen-reader review: Button
Procedure version: 1.0.0
Required environment: Windows + JAWS or NVDA
Component commit: b91d20e

Step 2 of 4
Action: Activate the button using Space.
Expected: The configured action occurs exactly once.

Result: [Pass] [Fail] [Blocked] [Observation]
Observed behavior: _________________________
Attachment: [Add]
```

## Readiness presentation

Avoid using only a percentage.

Good presentation:

```text
Release: BLOCKED

Passed
- Unit tests
- Interaction tests
- Axe checks
- Keyboard review

Blocked
- JAWS review stale after template change
- Admin Console consumer scenario failed

Warnings
- Dark mobile visual baseline pending
```

A percentage may appear as supplemental progress, not the release decision.

## Explanations

Every status should answer “why?”

Examples:

- Why is this evidence stale?
- Why is this review required?
- Why does this component use this blueprint?
- Why is this finding blocking?
- Why can’t ForgeGate update Zeroheight content directly?
- Why is this adapter partial?

## Generation experience

Generation should use a review flow:

1. Choose missing artifact.
2. Select template or blueprint.
3. Generate to temporary location.
4. Show files and diff.
5. Accept or reject changes.
6. Write approved files.
7. Run formatter and tests.
8. Show result and follow-up work.

## Error experience

Errors should be specific and actionable.

Bad:

> Storybook failed.

Better:

> ForgeGate could not read the Storybook index at `http://localhost:4400/index.json`. The server responded with 404. Confirm the detected Storybook version or choose a static build directory.

## Accessibility of ForgeGate

ForgeGate must itself support:

- Complete keyboard operation
- Visible focus
- Logical reading order
- Screen-reader labels and live status
- High contrast and forced colors
- 200% and 400% zoom
- Reduced motion
- Accessible tables and charts
- Error prevention and recovery
- No color-only status
- User-configurable density where practical

## First-run learning

ForgeGate is a new product category. The application should explain:

- Why Storybook is not replaced
- Why axe is partial evidence
- Why manual review is required
- Why approvals become stale
- Why repository files remain important
- Why the user must approve commands and writes

## MVP screen set

The first version needs only:

1. Workspace selection and discovery
2. Component inventory
3. Component record
4. Test Center
5. Manual review
6. Documentation preview and diff
7. Evidence export

Settings and adapter diagnostics may be simple but must be available for troubleshooting.
