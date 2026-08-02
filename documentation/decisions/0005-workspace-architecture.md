# 0005 — Workspace Architecture

## Context

[`02-system-architecture.md`](../02-system-architecture.md) already proposes Tauri 2, an Angular desktop UI, and a framework-neutral core. At the time of this ADR, [`20-risks-and-decisions.md`](../20-risks-and-decisions.md) still left "Nx versus a simpler pnpm workspace" and "Rust versus TypeScript ownership of scanning and Git operations" as open architecture decisions. This ADR closes those questions so implementation can proceed against a settled workspace shape.

## Decision

- **pnpm** as the package manager.
- **Nx monorepo** to host the desktop app and core libraries with strong dependency boundaries (Nx module boundary rules keep the framework-neutral core from accidentally importing Angular, adapter, or Tauri-specific code).
- **Angular** for the desktop UI, consistent with the maintainer's existing depth and the architecture already described in [`02-system-architecture.md`](../02-system-architecture.md).
- **Tauri 2** as the desktop shell.
- **Rust** owns the privileged operating-system boundary only: filesystem access, process execution, Git plumbing exposed through Tauri commands, credential vault access. Rust is not used for domain logic.
- **TypeScript** owns everything else: domain models, manifest/evidence/policy schemas and logic, the reactive evidence bus (see [`22-reactive-data-flow.md`](../22-reactive-data-flow.md)), and all framework adapters — including future adapters contributed by others, who should not need to write Rust to add a new framework adapter.

## Alternatives considered

- Rust for scanning and Git operations beyond the privileged boundary (e.g., manifest parsing, policy evaluation in Rust) — rejected; it would force every adapter and every contributor to work in Rust, directly conflicting with the plugin/adapter SDK goal in [`17-plugin-and-adapter-sdk.md`](../17-plugin-and-adapter-sdk.md) of a TypeScript-first extension surface.
- Plain pnpm workspace without Nx — rejected; Nx's enforced module boundaries are the practical mechanism for the "core layer must not import Angular compiler APIs, React tooling, Storybook packages..." rule already stated in [`02-system-architecture.md`](../02-system-architecture.md). Without an enforced boundary, that rule is only a comment.
- Turborepo instead of Nx — rejected for now; Nx's generators and module-boundary lint rules are a better fit for a domain/adapter/UI-layered monorepo than Turborepo's simpler task-graph model. Revisit only if Nx becomes a genuine friction point.

## Consequences

- Phase 1A (desktop foundation) scaffolds: pnpm workspace, Nx monorepo, Angular desktop app, Tauri 2 shell, and empty framework-neutral core/manifest/evidence/policy/adapter libraries with Nx module boundaries enforced from the start.
- Rust toolchain (rustc, cargo) must be installed in the development environment before the Tauri shell can be scaffolded; this was not present in the environment as of 2026-07-22 and needs to be installed separately.
- Every new framework adapter, test adapter, or documentation adapter is a TypeScript library, not a Rust crate.

## Status

Accepted

## Date

2026-07-22

## Owners

Jeffrey Sanford

## Revisit condition

Revisit the Nx-versus-simpler-workspace choice only if Nx's overhead measurably slows solo development without delivering proportional value.
