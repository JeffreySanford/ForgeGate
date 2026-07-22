# ForgeGate Documentation Publishing

## Objective

ForgeGate should turn verified component information into accurate, maintainable documentation without making any one publishing platform the source of truth.

The repository-owned component manifest, contract, policies, stories, test evidence, and review records supply structured source material. Documentation adapters translate that material into Storybook, Astro Starlight, Zeroheight, and future destinations.

## Canonical documentation sections

A mature component page may include:

- Overview and purpose
- When to use
- When not to use
- Anatomy
- Variants and states
- Public API
- Events and callbacks
- Slots, children, or content projection
- Tokens and theming
- Keyboard behavior
- Accessibility expectations
- Compliance evidence summary
- Examples
- Storybook links or embeds
- Consumer application examples
- Known limitations
- Release status
- Changelog
- Migration guidance
- Deprecation and replacement guidance

Policies and blueprints determine which sections are required.

## Content ownership

ForgeGate should distinguish:

- Generated structured sections
- User-authored guidance
- Protected regions
- External links and embeds
- Status and evidence blocks

A generator should never replace user-authored guidance without showing a diff and obtaining approval.

## Publication plan

Before writing, ForgeGate should create a publication plan:

```text
Component: Button 1.2.0
Target: Astro Starlight

Create:
- src/content/docs/components/button.mdx

Update:
- src/content/docs/components/index.mdx
- astro.config.mjs sidebar metadata

Generated sections:
- API
- states
- tokens
- test status
- accessibility evidence

Protected sections:
- usage guidance
- content design guidance
```

## Documentation drift

ForgeGate should detect:

- Missing component page
- Page linked to old component version
- Missing public input or event
- Removed property still documented
- Story link no longer valid
- Token reference changed
- Accessibility procedure changed
- Release state mismatch
- Zeroheight status mismatch
- Consumer example using a deprecated version

Drift should be explainable and optionally block release.

## Storybook documentation

ForgeGate may generate or update:

- MDX pages
- Autodocs metadata
- Component descriptions
- Story tags
- Usage links
- Links to canonical Starlight or Zeroheight guidance

Storybook should remain focused on executable component examples and developer-facing API rather than duplicate all governance content.

## Starlight documentation

Starlight is the preferred open target because content can remain in the repository as Markdown and MDX.

ForgeGate should support:

- Frontmatter generation
- Component status blocks
- Storybook previews or links
- API tables
- Token tables
- State matrices
- Test evidence summaries
- Accessibility procedures
- Changelog and migration blocks
- Sidebar updates
- Validation through the Starlight build

## Zeroheight documentation

Zeroheight is an optional adapter. ForgeGate should use supported API capabilities honestly and generate manual publication packages when direct content writes are unavailable.

## Templates

Templates should be:

- Versioned
- Framework-neutral where possible
- Blueprint-aware
- Organization-overridable
- Protected against arbitrary code execution
- Testable with fixtures

## Generated status blocks

Example:

```text
Status: Candidate
Version: 1.2.0
Evidence commit: b91d20e
Automated gates: Passed
Manual review: Screen-reader review stale
Consumer validation: 2 of 3 passed
Release: Blocked
```

Status blocks should link to evidence rather than claim more than the evidence supports.

## Documentation validation

After generation ForgeGate should run:

- Schema validation
- Link checking
- Starlight build or Storybook build
- Missing-story checks
- Missing-token checks
- Required-section checks
- Format and lint checks

## Publication evidence

ForgeGate should record:

- Target
- Page identity or path
- Source component version
- Source commit
- Publication date
- Adapter version
- Result
- Build or provider link
- Published status

## Failure behavior

Publishing failures should not alter release truth silently.

Examples:

- Starlight build failed
- Zeroheight unavailable
- Authentication missing
- Protected section conflict
- Target file changed during generation
- Storybook embed blocked

The user should see the partial result, rollback options, and remaining manual steps.
