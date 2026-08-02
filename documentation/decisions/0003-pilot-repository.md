# 0003 — Pilot Repository

## Context

ForgeGate needs both a real repository to prove the product against reality, and a small deterministic fixture to keep ForgeGate's own automated tests reliable. These serve different purposes and should not be conflated into one repository.

## Decision

- Use **Public Sector Federation** (Jeffrey's existing design-system repository) for the first real, end-to-end demonstration, because much of the necessary material — components, Storybook, tests, tokens — already exists there.
- Build a small, purpose-built, deterministic fixture repository later, specifically for ForgeGate's own CI. The fixture exists to keep ForgeGate's automated tests reliable and independent of an external repository's drift, not to replace the real-world demonstration.

## Current sequencing note

[`documentation/decisions/0005-workspace-architecture.md`](0005-workspace-architecture.md) and the earlier planning conversation in this session set the **engineering delivery order** as Lit/vanilla Web Components first, Angular second (see [`20-risks-and-decisions.md`](../20-risks-and-decisions.md) "Resolved decisions" and [`05-framework-adapters.md`](../05-framework-adapters.md)). If Public Sector Federation is an Angular/Nx repository, the first real pilot demonstration would require the *second* adapter to be built, not the first.

That sequencing question has now been resolved: Web Components remain first because they prove framework neutrality earliest. Public Sector Federation remains the preferred real pilot, but its full end-to-end demo should be scheduled after Angular/Nx validation lands, unless the repository can exercise a Web Components-compatible component path earlier. The small deterministic CI fixture should therefore track the Web Components MVP first, while Public Sector Federation is used opportunistically for real-repository checks that already match implemented capabilities such as workspace detection and Starlight build validation.

## Alternatives considered

- Public Sector Federation only, no synthetic fixture — rejected; an external, evolving repository is not deterministic enough for ForgeGate's own CI.
- Synthetic fixture only, no real repository — rejected; a purely synthetic fixture cannot validate product-market fit or produce a credible demonstration for a real buyer conversation.

## Consequences

- ForgeGate's CI must not depend on Public Sector Federation being reachable or unchanged.
- The synthetic fixture's framework should match the Web Components MVP first, so it can exercise the full vertical slice without waiting on Public Sector Federation access.

## Status

Accepted — pilot/fixture split is decided; Web Components remain first, and Public Sector Federation becomes the real pilot once matching adapter coverage exists.

## Date

2026-07-22

## Owners

Jeffrey Sanford

## Revisit condition

Revisit when Angular/Nx validation is ready enough to run the Public Sector Federation pilot end to end, or earlier if Public Sector Federation adds a Web Components-compatible slice.
