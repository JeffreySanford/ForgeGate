# 0004 — MVP Generation Scope

## Context

[`00-product-overview.md`](../00-product-overview.md) and the component blueprint work in [`14-component-blueprints.md`](../14-component-blueprints.md) both describe eventual code generation. Building full component generation before the assurance lifecycle works would be exactly the kind of breadth risk already flagged in [`20-risks-and-decisions.md`](../20-risks-and-decisions.md) ("the product is too broad for one developer").

## Decision

The MVP **assures existing components**; it does not create components from scratch.

It may propose missing *artifacts* around an existing component:

- A component manifest
- A missing Storybook story
- A test skeleton
- A Starlight page
- Repository configuration

All proposed artifacts follow the existing repository-write flow in [`02-system-architecture.md`](../02-system-architecture.md): generated to a temporary location, shown as a diff, written only after explicit approval.

Full component generation (scaffolding a brand-new component from a blueprint) waits until the assurance lifecycle — discovery, manifest, evidence, policy, readiness, documentation — is proven end to end.

## Alternatives considered

- Generate components from blueprints in the MVP — rejected; this is a different, larger product surface (a scaffolding tool) than the core assurance promise, and would delay proving the actual differentiator (stale-evidence detection, guided review, release readiness).

## Consequences

- The blueprint library in [`14-component-blueprints.md`](../14-component-blueprints.md) is used in the MVP as a *completion checklist* against an existing component, not as a code generator.
- "Generate component" capability stays declared `false` in early adapter capability documents (see [`05-framework-adapters.md`](../05-framework-adapters.md)) until this scope expands deliberately.

## Status

Accepted

## Date

2026-07-22

## Owners

Jeffrey Sanford

## Revisit condition

Revisit once the assurance lifecycle vertical slice is demonstrated and validated with at least one real user.
