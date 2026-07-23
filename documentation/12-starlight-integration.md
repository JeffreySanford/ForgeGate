# ForgeGate Astro Starlight Integration

## Position

Astro Starlight is ForgeGate’s preferred open documentation destination because it supports repository-owned Markdown and MDX, version control, ordinary build pipelines, custom components, and plugin extension.

ForgeGate should work without Starlight, but Starlight provides the clearest default path for teams that do not want an enterprise documentation subscription.

## Goals

- Detect existing Starlight sites
- Create a new documentation target only after explicit approval
- Generate component pages from manifests and evidence
- Preserve user-authored guidance
- Embed or link Storybook examples
- Show component release state and evidence freshness
- Generate token and API tables
- Detect drift
- Validate the Starlight build
- Provide a reusable ForgeGate Starlight plugin

## Proposed content layout

```text
src/content/docs/
├── index.mdx
├── foundations/
│   ├── color.mdx
│   ├── typography.mdx
│   ├── spacing.mdx
│   └── tokens.mdx
├── components/
│   ├── index.mdx
│   ├── button.mdx
│   ├── input.mdx
│   └── dialog.mdx
├── patterns/
├── accessibility/
├── evidence/
└── releases/
```

## Generated component page

A generated page may include:

```mdx
---
title: Button
description: Triggers an immediate action.
forgegate:
  componentId: up-design-system.button
  version: 1.2.0
  lifecycle: candidate
  evidenceCommit: b91d20e
---

import { ComponentStatus, StoryPreview, TokenTable, EvidenceSummary } from '@forgegate/starlight';

<ComponentStatus component="up-design-system.button" />

## Overview

<!-- forgegate:user-content:start overview -->
User-authored purpose and guidance.
<!-- forgegate:user-content:end overview -->

## Examples

<StoryPreview storyId="components-button--default" />

## API

<!-- generated -->

## Tokens

<TokenTable component="up-design-system.button" />

## Accessibility

<!-- generated requirements plus protected guidance -->

## Assurance

<EvidenceSummary component="up-design-system.button" />
```

## Audience-tier output

The Starlight adapter is the primary implementation of the audience-tier templates defined in [`10-documentation-publishing.md`](10-documentation-publishing.md). The same manifest, evidence, and token data can render as designer-heavy, balanced, or developer-heavy Starlight pages.

Frontmatter records the active tier so drift detection and regeneration stay consistent:

```mdx
---
title: Button
description: Triggers an immediate action.
forgegate:
  componentId: up-design-system.button
  version: 1.2.0
  lifecycle: candidate
  evidenceCommit: b91d20e
  audience: designer-heavy
---
```

Representative differences per tier:

- **Designer-heavy** — leads with `StateMatrix` and `TokenTable`, includes annotated visual examples of each state, summarizes API as plain-language capabilities, omits code blocks, expands usage and content guidance, and surfaces accessibility requirements as behavior descriptions rather than ARIA attribute tables.
- **Balanced** — the current default page shape: overview, examples, API, tokens, accessibility, assurance, in the order already shown above.
- **Developer-heavy** — leads with `ApiTable` and installation and import snippets, expands `EvidenceSummary` with raw gate detail and links to CI runs, includes full prop, event, and slot signatures, includes copyable code examples per state, and expands migration and changelog detail.

Sites may publish one tier per component, or publish two linked pages, for example `components/button.mdx` for the balanced default and `components/button--for-developers.mdx` for the developer-heavy companion, cross-linked in frontmatter. ForgeGate should never fork the underlying facts between linked pages; only presentation differs.

The `@forgegate/starlight` plugin components (`ComponentStatus`, `StoryPreview`, `StateMatrix`, `TokenTable`, `ApiTable`, `AccessibilityRequirements`, `EvidenceSummary`, `ConsumerValidation`, `ReleaseHistory`, `DeprecationNotice`) each accept the active tier and adjust their own verbosity, so a tier change does not require different components, only different composition and props.

## Protected content

ForgeGate needs a safe way to update generated sections without destroying user-authored content.

Possible strategies:

- Explicit protected markers
- Separate generated data files consumed by MDX components
- Frontmatter-only updates
- AST-aware MDX transforms
- Template regions with deterministic IDs

The preferred long-term approach is to keep frequently changing status and evidence in generated JSON consumed by stable Starlight components. Human guidance stays in MDX.

## ForgeGate Starlight plugin

A plugin could provide:

- `ComponentStatus`
- `StoryPreview`
- `StateMatrix`
- `TokenTable`
- `ApiTable`
- `AccessibilityRequirements`
- `EvidenceSummary`
- `ConsumerValidation`
- `ReleaseHistory`
- `DeprecationNotice`

The plugin should read portable ForgeGate manifests and evidence summaries.

## Storybook previews

ForgeGate should support:

- Link to story
- Embedded iframe where safe and allowed
- Static screenshot fallback
- Local-development preview
- Hosted Storybook preview

Documentation should remain useful when the Storybook is temporarily unavailable.

## Navigation

The adapter should support:

- Autogenerated navigation from content structure
- Explicit sidebar configuration
- Component grouping by category
- Lifecycle filters
- Deprecated sections
- Versioned documentation strategies

ForgeGate should show proposed navigation changes before writing.

## Search and metadata

Generated pages should include meaningful:

- Titles
- Descriptions
- Keywords
- Component IDs
- Package names
- Versions
- Lifecycle
- Last reviewed commit

## Evidence presentation

Public documentation should not necessarily expose every raw test artifact.

The publication policy should define which information appears:

- Summary only
- Finding counts
- Release decision
- Evidence date
- Link to internal evidence
- Full public report

Sensitive evidence should remain private.

## Drift detection

ForgeGate should compare:

- Manifest component version
- Page frontmatter version
- Story IDs
- API contract
- Token mappings
- Required sections
- Release status
- Evidence commit

## Validation

After writing, ForgeGate should run the configured Starlight build and report:

- Build success
- Broken links
- Missing imports
- Invalid frontmatter
- Missing Storybook targets
- Plugin compatibility errors

## MVP acceptance

The first Starlight adapter should:

- Detect one existing Starlight site
- Generate one button page
- Preserve one user-authored section
- Include one Storybook link or embed
- Include API, states, tokens, accessibility, and assurance summary
- Show a diff
- Build successfully
