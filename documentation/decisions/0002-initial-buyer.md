# 0002 — Initial Buyer

## Context

[`19-commercial-model.md`](../19-commercial-model.md) and [`24-federal-compliance-and-vpat.md`](../24-federal-compliance-and-vpat.md) establish federal design-system teams as a directly observed, strongly validated pain point. The product language must not become so federal-specific that it excludes other regulated buyers who share the same underlying problem.

## Decision

**Initial buyer**: an engineering or design-system leader responsible for releasing shared components into regulated or high-consequence applications.

Federal contractors and federal design-system teams remain the strongest first market, based on direct observation, but the product positioning, documentation, and sales language stay broader — regulated enterprise (healthcare, finance, insurance, education) is explicitly in scope, not a fallback.

## Alternatives considered

- Federal-only positioning — rejected; narrows the addressable market and the language before any buyer has actually confirmed budget ownership, and the underlying pain (fragmented evidence, stale approvals, accessibility rework) is not federal-specific.
- Individual designer or engineer as buyer — rejected; component governance decisions are made at the team/leadership level, not by an individual contributor with a personal budget.

## Consequences

- Sales and documentation language should say "regulated design-system teams" with federal as the leading example, not "built for federal."
- The federal-specific compliance work in [`24-federal-compliance-and-vpat.md`](../24-federal-compliance-and-vpat.md) (VPAT, FedRAMP posture, RMF alignment) stays valuable to this broader buyer set, since VPAT and accessibility evidence needs are common outside federal too.

## Status

Accepted

## Date

2026-07-22

## Owners

Jeffrey Sanford

## Revisit condition

Revisit once a real buyer conversation happens — if federal buyers respond dramatically better than other regulated verticals, narrow the go-to-market language deliberately rather than by default.
