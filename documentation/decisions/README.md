# Architecture and Product Decision Records

This folder holds short, dated decisions that close open questions from [`../20-risks-and-decisions.md`](../20-risks-and-decisions.md) so implementation can begin without relitigating them.

Each record uses:

- Context
- Decision
- Alternatives considered
- Consequences
- Status
- Date
- Owners
- Revisit condition

Records are numbered in the order they were made, not by topic. A superseded record stays in place with `Status: Superseded by NNNN` rather than being deleted, so the reasoning history is preserved.

## Index

- [`0001-primary-mvp-user.md`](0001-primary-mvp-user.md) — engineer is the primary MVP operator; accessibility specialist validates procedures and approves manual evidence.
- [`0002-initial-buyer.md`](0002-initial-buyer.md) — buyer is an engineering/design-system leader releasing shared components into regulated applications; federal is the strongest early market, not the only one.
- [`0003-pilot-repository.md`](0003-pilot-repository.md) — demonstrate against a real repository, then build a small deterministic fixture for CI.
- [`0004-mvp-generation-scope.md`](0004-mvp-generation-scope.md) — MVP assures existing components; it proposes missing artifacts but does not generate components from scratch.
- [`0005-workspace-architecture.md`](0005-workspace-architecture.md) — pnpm + Nx + Angular desktop UI + Tauri 2 + Rust boundary + TypeScript domain/adapters.
- [`0006-blueprint-studio-boundary.md`](0006-blueprint-studio-boundary.md) — Blueprint Studio is a first-class post-MVP structured visual component-authoring workflow, not a general graphics canvas or a change to MVP generation scope.
