# ForgeGate Design Tokens and Figma Bridge

## Position

ForgeGate is not a Figma replacement, consistent with [`00-product-overview.md`](00-product-overview.md). It does not edit visual designs and does not compete with Figma's canvas. It does, however, need to consume the one artifact Figma already produces that is genuinely machine-readable and useful to a coded design system: exported design tokens.

## DTCG as the token format

Figma can export variable collections and modes as JSON files that follow, or closely approximate, the **Design Tokens Community Group (DTCG)** format — commonly seen as `.json`, `.tokens.json`, or `.tokens` files. DTCG standardizes token types such as color, dimension, font family, font weight, duration, cubic bezier, and alias/reference values so that tools across the ecosystem can parse and transform them consistently.

ForgeGate adopts DTCG as its primary token interchange format rather than inventing a proprietary token schema. This decision is recorded in [`20-risks-and-decisions.md`](20-risks-and-decisions.md).

Reasons:

- DTCG is a real, versioned community standard, not a single vendor's format.
- Figma, and other design tools that support DTCG export, become token *sources* ForgeGate can ingest without becoming a design tool itself.
- Style Dictionary, Tokens Studio, and other established token pipelines already target DTCG or DTCG-adjacent formats, so ForgeGate does not have to own the transform step from token to CSS custom property, Sass variable, or platform-specific output.
- A component manifest that references DTCG token names is portable across organizations that already use the standard.

## What ForgeGate does with tokens

- **Ingest** DTCG-format token files from a repository, from a design tool export, or from a configured token pipeline output.
- **Map** token references onto component contracts: which tokens a component consumes for color, spacing, typography, motion, and elevation.
- **Detect drift** between a component's actual implementation (source code, computed styles, or a build-time token consumption report) and its declared token mappings.
- **Detect drift** between the token file currently in the repository and the token file a design tool most recently exported, when both are available.
- **Present** token tables and state matrices in generated documentation, per the audience-tier templates in [`10-documentation-publishing.md`](10-documentation-publishing.md) and [`12-starlight-integration.md`](12-starlight-integration.md).
- **Never** transform, publish, or write back to a design tool. Token flow is one-directional: design tool or repository → ForgeGate. ForgeGate does not attempt to push generated tokens back into Figma.

## Token pipeline position

```text
Figma variables (or another DTCG-capable design tool)
        │  export
        ▼
DTCG token JSON  ──────────────┐
        │ (repository-committed)│
        ▼                       │
Token transform (Style          │
Dictionary or equivalent,       │  ForgeGate reads the same
outside ForgeGate)               │  DTCG file directly
        │                       │
        ▼                       ▼
Platform tokens            Component token
(CSS, Sass, Swift, ...)    mappings + drift detection
```

ForgeGate sits alongside the existing token transform step, not in place of it. Teams keep whatever pipeline already turns DTCG tokens into CSS custom properties or platform-specific output; ForgeGate reads the same DTCG source to reason about component-level consumption and drift.

## Data model

The token schema referenced from [`16-data-and-schema-model.md`](16-data-and-schema-model.md) should:

- Preserve the DTCG token structure (`$value`, `$type`, `$description`, aliasing via `{token.path}` references) rather than flattening it into a ForgeGate-specific shape.
- Record token file provenance: source path, source tool (Figma export, hand-authored, pipeline output), export or commit date, and DTCG format version where declared.
- Support multiple token sets for themes, modes, and brands, consistent with how Figma variable collections and modes work.
- Represent unresolved alias references and unknown token types honestly, using the unknown-value model already defined in [`16-data-and-schema-model.md`](16-data-and-schema-model.md), rather than silently dropping them.

## Drift and evidence

Token drift is a first-class evidence type, not a cosmetic warning:

- A component references a token that no longer exists in the current token file.
- A component's computed styling no longer matches its declared token mapping.
- The repository's committed token file is older than the most recently available design-tool export.
- A token's type or value changed in a way that could alter component appearance without a corresponding component version bump.

Token drift feeds the same freshness and readiness model described in [`22-reactive-data-flow.md`](22-reactive-data-flow.md); a token file change is a source stream event that can mark downstream evidence stale.

## Non-goals

- ForgeGate does not render or preview Figma files.
- ForgeGate does not authenticate to Figma's API to pull live variables in the MVP; it reads exported DTCG files already present in or added to the repository. A live Figma API adapter may be considered later as an optional integration, not a requirement.
- ForgeGate does not generate or opinionatedly restructure a token taxonomy; it consumes whatever DTCG structure the organization already has.
