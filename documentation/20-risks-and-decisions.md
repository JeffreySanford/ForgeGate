# ForgeGate Risks and Open Decisions

## Purpose

ForgeGate combines desktop privileges, framework analysis, testing, accessibility review, documentation generation, and release governance. The product can become unfocused or unsafe if major risks are not tracked explicitly.

## Product risks

### Risk: The product becomes a collection of integrations without a unique center

Mitigation:

- Keep component readiness, evidence freshness, manual review, and release decision at the center.
- Reject features that do not strengthen the component assurance lifecycle.
- Treat Storybook, Starlight, Zeroheight, test tools, and design tools as adapters.

### Risk: Existing tools already solve enough of the problem

Storybook, Chromatic, Zeroheight, Supernova, UXPin, accessibility platforms, and CI systems overlap with portions of ForgeGate.

Mitigation:

- Validate the cross-tool assurance problem.
- Demonstrate stale-approval detection, current evidence, consumer validation, portable manifests, and release decisions.
- Avoid competing as a generic scanner or documentation host.

### Risk: Teams will not install a desktop application

Mitigation:

- Validate local-first demand.
- Provide a transparent security model.
- Add a headless CLI.
- Consider a browser UI connected to a local agent only if needed later.

### Risk: The product is too broad for one developer

Mitigation:

- Complete the Angular button vertical slice first.
- Delay multi-framework generation.
- Delay team collaboration.
- Delay full Zeroheight authoring.
- Use existing tools as executors.

### Risk: “All modern frameworks” becomes shallow marketing

Mitigation:

- Publish explicit adapter support levels.
- Require fixture and acceptance coverage.
- Keep unsupported capabilities visible.
- Implement a second framework before stabilizing the SDK.

## Technical risks

### Risk: Arbitrary repositories are inconsistent

Repositories vary in layout, commands, versions, and conventions.

Mitigation:

- Use discovery plus user confirmation.
- Store repository mappings.
- Support opinionated profiles first.
- Provide adapter diagnostics.
- Fail gracefully.

### Risk: Tool output formats change

Mitigation:

- Prefer stable structured formats.
- Version adapters.
- Preserve raw output.
- Maintain fixtures by supported version.
- Detect and report parse failures separately from test failures.

### Risk: Component attribution is inaccurate

A workspace-level test pass may not prove a specific component passed.

Mitigation:

- Require explicit mappings where needed.
- Use story IDs and component-scoped tests.
- Represent unknown scope honestly.
- Avoid automatically assigning broad passes to every component.

### Risk: Freshness invalidation is too aggressive

Conservative invalidation may frustrate teams.

Mitigation:

- Start conservative for safety.
- Explain why evidence is stale.
- Add dependency-aware and change-type-aware rules.
- Allow policy-approved preservation with rationale.

### Risk: Freshness invalidation is too permissive

Mitigation:

- Tie evidence to commit and relevant fingerprints.
- Treat policy and procedure changes as invalidating events.
- Test dependency analysis.
- Prefer false re-review over silent stale approval during early releases.

### Risk: Generated changes damage repositories

Mitigation:

- Generate to temporary paths.
- Show diffs.
- Require approval.
- Back up and support rollback.
- Run targeted validation.
- Never silently overwrite.

### Risk: Desktop privileges are abused by malicious content

Mitigation:

- Tauri capability restrictions.
- No privileged preview bridge.
- Approved command configuration.
- Path validation.
- Credential vault.
- Signed adapters.
- Security tests and threat model.

## Compliance and accessibility risks

### Risk: ForgeGate overstates compliance

Mitigation:

- Use evidence language.
- Separate automated and manual methods.
- Preserve incomplete findings.
- Require expert review of production profiles.
- Add legal and product disclaimers.

### Risk: Manual procedures are incorrect or outdated

Mitigation:

- Version procedures.
- Assign owners.
- Record effective and review dates.
- Invalidate evidence when procedure changes.
- Seek specialist validation.

### Risk: ForgeGate itself is inaccessible

Mitigation:

- Build accessibility into the desktop UI.
- Add automated and manual testing.
- Support keyboard, screen readers, forced colors, zoom, and reduced motion.
- Dogfood ForgeGate.

## Commercial risks

### Risk: Buyers like the idea but lack budget

Mitigation:

- Identify budget owner early.
- Connect to labor savings, release risk, and contract acceptance.
- Sell service-led pilots.
- Target regulated teams with repeated evidence needs.

### Risk: Sales cycles are long

Mitigation:

- Start with consultancies and contractors.
- Offer a bounded paid sprint.
- Provide local proof without enterprise procurement dependencies.

### Risk: Vendor APIs limit integration

Mitigation:

- Keep vendors optional.
- Use capability discovery.
- Generate manual publication packages.
- Preserve open Starlight path.

## Open product decisions

- Should the product be called ForgeGate permanently?
- Should the descriptive category be “Component Assurance Studio,” “Component Operations,” or another term?
- Which user is primary for MVP: engineer or accessibility specialist?
- Which buyer owns the initial budget?
- Should the first pilot use Public Sector Federation or a clean purpose-built fixture?
- Should ForgeGate create components in MVP or only assure existing components?
- Should manual review records be committed to the repository by default?
- Which evidence belongs in Git versus external artifact storage?
- Which compliance profile can be responsibly provided as a starter template?
- Which second framework best validates neutrality: React or Lit/Web Components?

## Open architecture decisions

- Nx versus a simpler pnpm workspace for ForgeGate itself
- Angular desktop UI architecture and state management
- Rust versus TypeScript ownership of scanning and Git operations
- SQLite access library
- JSON Schema validator
- YAML library and comment preservation
- AST strategy per framework
- MDX protected-region strategy
- Plugin sandbox model
- Headless CLI language and packaging
- Evidence signing approach

## Open commercial decisions

- License model
- Source availability
- Free edition boundaries
- Per-user versus per-design-system pricing
- Offline enterprise licensing
- Channel partner strategy
- Professional services scope

## Explicit non-goals for MVP

- General-purpose visual design canvas
- Figma replacement
- Full cloud collaboration platform
- Full GRC platform
- Legal compliance certification
- Every framework adapter
- Arbitrary AI code rewriting
- Zeroheight full authoring
- Multi-organization SSO
- Automatic Git push
- Automatic package release
- Mobile application

## Decision process

Major decisions should eventually use architecture decision records containing:

- Context
- Decision
- Alternatives
- Consequences
- Status
- Date
- Owners
- Revisit condition

Until ADR templates are added, decisions should be recorded in this file and reflected in the root TODO.
