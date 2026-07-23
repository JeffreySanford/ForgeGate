# 0003 — Pilot Repository

## Context

ForgeGate needs both a real repository to prove the product against reality, and a small deterministic fixture to keep ForgeGate's own automated tests reliable. These serve different purposes and should not be conflated into one repository.

## Decision

- Use **Public Sector Federation** (Jeffrey's existing design-system repository) for the first real, end-to-end demonstration, because much of the necessary material — components, Storybook, tests, tokens — already exists there.
- Build a small, purpose-built, deterministic fixture repository later, specifically for ForgeGate's own CI. The fixture exists to keep ForgeGate's automated tests reliable and independent of an external repository's drift, not to replace the real-world demonstration.

## Open tension to resolve before this ADR is fully actionable

[`documentation/decisions/0005-workspace-architecture.md`](0005-workspace-architecture.md) and the earlier planning conversation in this session set the **engineering delivery order** as Lit/vanilla Web Components first, Angular second (see [`20-risks-and-decisions.md`](../20-risks-and-decisions.md) "Resolved decisions" and [`05-framework-adapters.md`](../05-framework-adapters.md)). If Public Sector Federation is an Angular/Nx repository, the first real pilot demonstration would require the *second* adapter to be built, not the first.

This ADR does not resolve that tension. Two honest paths forward:

1. Keep Web Components as the first adapter for engineering reasons (proves framework neutrality earliest), and treat the Public Sector Federation demonstration as happening after the Angular adapter lands — i.e., after Phase 1A and both adapters, not immediately after the Web Components vertical slice.
2. Reorder adapter delivery so the first adapter matches whatever framework Public Sector Federation actually uses, prioritizing an early real-world demonstration over framework-neutrality proof order.

**Recorded but not decided**: which path to take. This should be settled once Phase 1A (desktop foundation) is done and before adapter work begins, based on how close Jeffrey wants to get to a Public Sector Federation demo versus proving neutrality first.

## Alternatives considered

- Public Sector Federation only, no synthetic fixture — rejected; an external, evolving repository is not deterministic enough for ForgeGate's own CI.
- Synthetic fixture only, no real repository — rejected; a purely synthetic fixture cannot validate product-market fit or produce a credible demonstration for a real buyer conversation.

## Consequences

- ForgeGate's CI must not depend on Public Sector Federation being reachable or unchanged.
- The synthetic fixture's framework should match whichever adapter is built first, so it can exercise the full vertical slice without waiting on Public Sector Federation access.

## Status

Partially accepted — pilot/fixture split is decided; adapter-sequencing-versus-pilot-framework tension is open.

## Date

2026-07-22

## Owners

Jeffrey Sanford

## Revisit condition

Revisit immediately once Phase 1A is complete and before adapter implementation begins.
