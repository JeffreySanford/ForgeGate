# ForgeGate Design Tokens and Figma Bridge

## Position

ForgeGate is not a general Figma replacement, consistent with [`00-product-overview.md`](00-product-overview.md). It does not attempt to reproduce Figma's freeform canvas, vector-editing tools, page composition, prototyping, or broad interface-design workflow.

ForgeGate does provide a narrower visual-authoring environment through [`27-blueprint-studio.md`](27-blueprint-studio.md). Blueprint Studio edits structured component proposals: contracts, variants, states, anatomy, tokens, semantics, behavior, coverage requirements, and reviewable generated artifacts.

Figma and other design tools remain important sources of design intent. ForgeGate's integration should progress in deliberate levels rather than promising complete bidirectional synchronization before identity, API capability, and conflict behavior are proven.

## DTCG as the token format

Figma can export variable collections and modes as JSON files that follow, or closely approximate, the **Design Tokens Community Group (DTCG)** format — commonly seen as `.json`, `.tokens.json`, or `.tokens` files. DTCG standardizes token types such as color, dimension, font family, font weight, duration, cubic bezier, and alias/reference values so that tools across the ecosystem can parse and transform them consistently.

ForgeGate adopts DTCG as its primary token interchange format rather than inventing a proprietary token schema. This decision is recorded in [`20-risks-and-decisions.md`](20-risks-and-decisions.md).

Reasons:

- DTCG is a real, versioned community standard, not a single vendor's format.
- Figma and other DTCG-capable design tools can become token sources without defining ForgeGate's internal model.
- Style Dictionary, Tokens Studio, and established token pipelines already target DTCG or DTCG-adjacent formats.
- A component manifest or Blueprint Studio proposal that references DTCG token names remains portable.

## Current token capabilities

ForgeGate should:

- **Ingest** DTCG-format token files from a repository, design-tool export, or configured token-pipeline output.
- **Map** token references onto component contracts and Blueprint Studio anatomy slots.
- **Detect drift** between actual implementation and declared token mappings.
- **Detect drift** between repository token files and newer design-tool exports when both are available.
- **Present** token tables, alias chains, theme matrices, and state mappings in ForgeGate and generated documentation.
- **Preserve provenance** for token files and values.

For the MVP, token flow remains one-directional:

```text
Design tool or repository
        │
        │ export or commit
        ▼
DTCG token JSON
        │
        ├── token transform pipeline
        │       └── CSS, Sass, Swift, Android, or other platform output
        │
        └── ForgeGate
                ├── component token mappings
                ├── Blueprint Studio token slots
                ├── theme coverage
                └── drift detection
```

ForgeGate sits alongside the existing token-transform step, not in place of it.

## Figma interoperability levels

### Level 1 — DTCG token ingestion

This is the initial supported level.

- Read repository-controlled token exports.
- Record source tool, source path, export date, and commit provenance.
- Compare themes and modes.
- Map tokens to component parts and states.
- Detect missing, deprecated, hard-coded, or unresolved values.

No Figma authentication or write-back is required.

### Level 2 — Linked design reference

A component record or Blueprint Studio proposal may link to a Figma component or component set.

ForgeGate may store:

- Figma file identity
- Node or component-set identity
- Design-system library identity
- Last inspected version or timestamp
- Variant-property mappings
- Design-variable mappings
- Storybook story mappings

At this level ForgeGate may compare metadata and show drift, but it must not claim that a Figma node and coded component are automatically equivalent.

### Level 3 — Property and variant mapping

When supported reliably by the Figma API, plugin environment, Code Connect, or another explicit export format, ForgeGate may map:

- Figma component properties to portable manifest properties
- Figma variants to Blueprint Studio variant groups and states
- Figma variables to DTCG token references
- Figma examples to Storybook stories or content fixtures
- Code Connect mappings to framework implementation references

Mappings require explicit identity and remain reviewable.

### Level 4 — Structured export from ForgeGate

Blueprint Studio may export a portable component specification for use by a Figma plugin or another design tool.

The export may include:

- Contract properties and allowed values
- Variant and state identifiers
- Anatomy
- Token slots
- Content fixtures
- Accessibility and behavior notes
- Story and documentation identifiers

This is structured interoperability, not a rendering promise. A design-tool plugin decides how to represent those concepts visually.

### Level 5 — Governed synchronization

A future optional adapter may propose updates in either direction only when:

- Vendor capabilities are sufficient and stable.
- Source and destination identities are explicit.
- The user chooses the synchronization direction.
- Every proposed change is previewed.
- Conflicts are visible.
- No repository or design content is silently overwritten.
- Unsupported properties remain visible rather than being discarded.

Full bidirectional synchronization is not required for the first Blueprint Studio release.

## Blueprint Studio token experience

Blueprint Studio should allow designers to select approved tokens instead of typing raw values by default.

The visual experience should show:

- Primitive, semantic, and component-token layers
- Alias chains
- Light and dark modes
- Brand themes
- Token ownership and descriptions
- Contrast implications
- Affected anatomy parts
- Missing theme values
- Deprecated tokens
- Hard-coded exploration values
- Repository and design-export drift

Exploratory raw values may be stored in a draft, but policy may prevent an engineering handoff until required token slots are mapped.

## Data model

The token schema referenced from [`16-data-and-schema-model.md`](16-data-and-schema-model.md) should:

- Preserve DTCG structure (`$value`, `$type`, `$description`, alias references) rather than flattening it into a ForgeGate-specific shape.
- Record file and value provenance.
- Support multiple token sets, themes, modes, and brands.
- Represent unresolved aliases and unknown token types honestly.
- Associate tokens with component anatomy, variants, states, and Blueprint Studio proposals.
- Preserve optional external design identities without making them the portable primary key.

## Drift and evidence

Token and design-reference drift are first-class evidence types, not cosmetic warnings.

Examples:

- A component references a token that no longer exists.
- Computed styling no longer matches a declared token mapping.
- A repository token file is older than the newest available design export.
- A token value changes without corresponding component review.
- A Figma variant exists without a coded state or Storybook story.
- A coded public property exists without a linked design property.
- A design reference points to a deleted or inaccessible node.

Drift feeds the same freshness and readiness model described in [`22-reactive-data-flow.md`](22-reactive-data-flow.md). It must explain the source, affected components, and required follow-up.

## Security and privacy

- Repository token ingestion remains local-first.
- Figma authentication is optional and post-MVP.
- Credentials belong in the operating-system credential vault.
- Remote design content must not receive privileged Tauri capabilities.
- ForgeGate must disclose which metadata is requested from a design tool.
- Offline workflows must remain functional without Figma.

## Non-goals for the MVP

- Rendering or editing complete Figma files
- Authenticating to Figma to pull live variables
- Writing variables or component changes back to Figma
- Automatic design-to-code equivalence
- Pixel-diff certification between Figma and browser output
- Generating or restructuring an organization's token taxonomy
- Requiring Figma for Blueprint Studio

A live Figma adapter, linked component metadata, Code Connect integration, and governed synchronization remain later capabilities described by [`27-blueprint-studio.md`](27-blueprint-studio.md) and ADR [`decisions/0006-blueprint-studio-boundary.md`](decisions/0006-blueprint-studio-boundary.md).
