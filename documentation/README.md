# ForgeGate Documentation Map

This folder defines the product, architecture, data contracts, integrations, compliance model, user experience, roadmap, risks, and commercial direction for ForgeGate.

## Recommended reading order

1. [`00-product-overview.md`](00-product-overview.md) — problem, users, value proposition, scope, and product boundaries.
2. [`01-product-principles.md`](01-product-principles.md) — durable principles that guide product and engineering decisions.
3. [`02-system-architecture.md`](02-system-architecture.md) — desktop architecture, services, adapters, security boundaries, and data flow.
4. [`03-center-of-truth-model.md`](03-center-of-truth-model.md) — repository truth, execution truth, review truth, and release truth.
5. [`04-component-manifest.md`](04-component-manifest.md) — portable component manifest and policy association.
6. [`05-framework-adapters.md`](05-framework-adapters.md) — framework-neutral core and planned Angular, React, Vue, Svelte, Web Component, Solid, Qwik, and Astro adapters.
7. [`06-storybook-integration.md`](06-storybook-integration.md) — Storybook discovery, indexes, stories, preview isolation, and test execution.
8. [`07-compliance-testing.md`](07-compliance-testing.md) — Section 508 and WCAG-oriented automated, manual, hybrid, and application-context evidence.
9. [`08-test-orchestration.md`](08-test-orchestration.md) — command execution, test adapters, normalization, evidence freshness, and raw artifacts.
10. [`09-manual-review-and-evidence.md`](09-manual-review-and-evidence.md) — guided reviews, approvals, exceptions, stale evidence, and export packages.
11. [`10-documentation-publishing.md`](10-documentation-publishing.md) — canonical content model and documentation drift.
12. [`11-zeroheight-integration.md`](11-zeroheight-integration.md) — optional enterprise integration and capability limitations.
13. [`12-starlight-integration.md`](12-starlight-integration.md) — preferred open documentation target and plugin direction.
14. [`13-desktop-security.md`](13-desktop-security.md) — Tauri capabilities, untrusted previews, process execution, credentials, and repository writes.
15. [`14-component-blueprints.md`](14-component-blueprints.md) — framework-neutral samples and completion requirements for common web components.
16. [`15-user-experience.md`](15-user-experience.md) — primary workflows, screens, statuses, explanations, and accessibility of ForgeGate itself.
17. [`16-data-and-schema-model.md`](16-data-and-schema-model.md) — entities, identifiers, portable schemas, local cache, and migration strategy.
18. [`17-plugin-and-adapter-sdk.md`](17-plugin-and-adapter-sdk.md) — extension points and compatibility contracts.
19. [`18-roadmap.md`](18-roadmap.md) — staged delivery from prototype through commercial platform.
20. [`19-commercial-model.md`](19-commercial-model.md) — target buyers, pilot offer, editions, pricing hypotheses, and distribution.
21. [`20-risks-and-decisions.md`](20-risks-and-decisions.md) — major risks, mitigations, open decisions, and explicit non-goals.
22. [`21-mvp-acceptance-criteria.md`](21-mvp-acceptance-criteria.md) — end-to-end definition of the first commercially meaningful vertical slice.
23. [`22-reactive-data-flow.md`](22-reactive-data-flow.md) — RxJS observable and subject usage that keeps the core, adapters, and desktop UI synchronized.
24. [`23-design-tokens-and-figma-bridge.md`](23-design-tokens-and-figma-bridge.md) — DTCG token format adoption and one-directional Figma token export ingestion.
25. [`24-federal-compliance-and-vpat.md`](24-federal-compliance-and-vpat.md) — VPAT support, FedRAMP/authorization posture, and NIST RMF Rev 5 alignment scope.
26. [`decisions/`](decisions/README.md) — numbered ADRs closing the primary-user, buyer, pilot-repository, MVP-scope, and workspace-architecture decisions needed to begin Phase 1.

## Documentation ownership

- Product direction belongs in the overview, principles, roadmap, and commercial model.
- Technical boundaries belong in architecture, security, schema, adapter, and integration documents.
- Active implementation status belongs in the root [`TODO.md`](../TODO.md).
- Framework-specific implementation details should eventually live under `documentation/frameworks/`.
- Component-specific blueprint documents should eventually live under `documentation/blueprints/`.
- Architecture and product decisions live under [`documentation/decisions/`](decisions/README.md) as numbered ADRs.

## Current documentation status

Broad planning is complete. The repository has enough product definition, architecture, risk analysis, phased work, and MVP acceptance criteria to begin implementation, and the five ADRs in [`decisions/`](decisions/README.md) close the remaining decisions that would otherwise block Phase 1. Further large planning documents are not needed right now; the next work should be code against [`TODO.md`](../TODO.md) Phase 1, validated by showing a working prototype to real users rather than by writing more prose.

As engineering proceeds, these documents should be refined into validated contracts, diagrams, schemas, examples, and acceptance evidence.
