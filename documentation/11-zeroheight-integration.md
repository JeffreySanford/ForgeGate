# ForgeGate Zeroheight Integration

## Position

Zeroheight is an optional enterprise documentation and governance destination. ForgeGate must not depend on Zeroheight for its core component assurance workflow.

A team using only Git, Storybook, tests, manual review, evidence export, and Astro Starlight should retain full core functionality.

## Integration goals

ForgeGate should help teams:

- Link components to Zeroheight pages
- Discover styleguides and page metadata where supported
- Compare repository lifecycle with Zeroheight page status
- Synchronize supported status values
- Generate Storybook embed information
- Generate copy-ready or import-ready documentation content
- Detect stale or missing pages
- Record publication evidence

## Capability honesty

Zeroheight capabilities may vary by plan and API version. ForgeGate should perform capability discovery and present supported operations explicitly.

The adapter should distinguish:

- Read page metadata
- Read page status
- Update page status
- Read styleguide structure
- Write full page content
- Upload assets
- Create pages
- Unsupported or unavailable operation

ForgeGate must not pretend that an unavailable API write succeeded.

## Configuration

Suggested mapping file:

```yaml
zeroheight:
  organization: example
  styleguides:
    - id: public-sector-design-system
      environment: production
components:
  up-design-system.button:
    styleguide: public-sector-design-system
    pageId: 238541
    expectedStatus: candidate
```

Credentials should be stored in the operating-system credential vault, not committed.

## Read workflow

1. User connects Zeroheight.
2. ForgeGate retrieves supported styleguide and page metadata.
3. User maps pages to components.
4. ForgeGate stores durable page identifiers in repository mappings.
5. ForgeGate compares component and publication state.

## Status synchronization

Example mismatch:

```text
ForgeGate lifecycle: Approved
Zeroheight page status: Draft

Recommended action:
- Review generated documentation changes.
- Publish or update Zeroheight manually.
- Synchronize status when supported.
```

Status synchronization must require confirmation and should record the previous and new value.

## Content workflow

Where direct content writes are unavailable, ForgeGate should generate:

- Markdown or rich-text source package
- Storybook story IDs and embed details
- API table
- Token mappings
- Accessibility guidance
- Evidence summary
- Publication checklist

The user can then paste or import content through supported Zeroheight workflows.

## Drift detection

ForgeGate may detect:

- Page missing
- Page status stale
- Component version mismatch
- Storybook reference removed
- Token mapping changed
- Required section absent from the repository publication source
- Publication not confirmed for current release

The adapter should not scrape arbitrary rendered Zeroheight pages unless such behavior is intentionally designed, legally permitted, stable, and secure.

## Offline behavior

When Zeroheight is unavailable:

- Local assurance continues.
- Starlight generation continues.
- Publication status becomes unavailable or pending.
- Existing cached metadata is clearly marked stale.
- No local release evidence is deleted.

## Security

- Store credentials in the OS vault.
- Restrict API scopes.
- Redact tokens from logs.
- Require HTTPS.
- Record write actions.
- Never expose credentials to embedded remote previews.

## Acceptance criteria

The initial adapter may be read-first:

- Connect account
- Read supported styleguide/page metadata
- Map one component page
- Display current status
- Detect mismatch
- Generate publication package
- Synchronize page status only where supported

Full content authoring is not an MVP requirement.
