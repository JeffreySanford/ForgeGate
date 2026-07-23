# 0001 — Primary MVP User

## Context

[`00-product-overview.md`](../00-product-overview.md) lists many potential users. The MVP cannot design equally for all of them; one primary user must drive the interaction model.

## Decision

- **Primary user**: design-system or frontend platform engineer. This person opens the workspace, runs gates, reads results, and operates ForgeGate day to day.
- **Secondary user**: accessibility specialist or compliance reviewer. This person defines or validates manual review procedures and approves manual evidence, but does not need to be the one driving the tool session to session.

## Alternatives considered

- Accessibility specialist as primary user — rejected for MVP because it would front-load procedure authoring UX before the core evidence/readiness loop is proven.
- Engineering manager or release approver as primary user — rejected for MVP; that role consumes the readiness decision but is not the day-to-day operator.

## Consequences

- MVP interaction design (workspace open, component record, running gates, viewing results) should optimize for an engineer's workflow first.
- Manual review screens still need to be usable by a non-engineer reviewer, but do not need to be the primary navigation entry point in the MVP.

## Status

Accepted

## Date

2026-07-22

## Owners

Jeffrey Sanford

## Revisit condition

Revisit if an early design partner's primary hands-on user turns out to be the accessibility specialist rather than the engineer.
