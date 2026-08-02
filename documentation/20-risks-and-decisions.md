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

- Complete the Web Components button vertical slice first, then Angular.
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

### Risk: Transitive dependency vulnerabilities in the build toolchain

GitHub Dependabot flags vulnerabilities in packages ForgeGate never imports directly — pulled in transitively by Nx, Angular tooling, and Tauri's Linux GTK bindings.

Mitigation and current status (2026-07-23):

- 25 of 26 flagged npm advisories (axios, brace-expansion, http-proxy-middleware, webpack-dev-server, `@hono/node-server`, uuid, `@babel/core`, vite, esbuild) fixed via range-scoped `pnpm.overrides` in `package.json` — each override targets only the vulnerable version range for that package, not a blanket major-version bump, so unaffected coexisting versions (e.g. `brace-expansion@1.x`/`2.x`) are left alone. `pnpm audit --prod` is clean.
- One Rust advisory (`glib` GHSA — an unsoundness/crash bug in a rarely-used `VariantStrIter` iterator) is **upstream-blocked**: `tauri 2.11.5` pins `gtk = "^0.18"`, which pins `glib = "^0.18"`; no newer Tauri release exists yet that uses a newer gtk-rs line, and `cargo update -p glib --precise 0.20.0` fails for exactly that reason. It is also Linux-only (target-conditional in `Cargo.lock`; irrelevant to the current Windows-only deployment scope) and crash-only, not remote-exploitable. Tracked, not fixed — revisit when Tauri ships a gtk-rs bump.
- Re-run `pnpm audit --prod` and check `gh api repos/JeffreySanford/ForgeGate/dependabot/alerts` periodically; this is a build-toolchain surface that will keep needing attention as Nx/Angular/Tauri release new versions.

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
- Dogfood ForgeGate. **Real as of the accessibility axis**: `/accessibility-review` guides and records a real manual screen-reader pass against ForgeGate's own shell, and the same view now reports whether that self-review evidence is current or stale against the workspace commit (see documentation/01 principle 16, documentation/09). The pass itself still has not been performed by anyone — the mechanism exists, but the human evidence does not yet. Documentation and release gates for ForgeGate's own shell still need a real shell component identity before they can be honestly evaluated.

## Federal and regulated-buyer risks

### Risk: "Local-first" does not fully answer federal procurement questions

ForgeGate's local-first architecture avoids uploading source code, which addresses one major federal objection, but federal buyers will still ask about authorization posture for any component that is hosted or coordinates across users — for example a future team-edition coordination service, license server, or update channel.

Mitigation:

- Keep the desktop application's core value fully local and offline-capable, independent of any hosted component.
- Treat FedRAMP (including the FedRAMP 20x pilot authorization path) and NIST SP 800-53 Rev. 5 / Risk Management Framework alignment as a deliberate future milestone for any hosted or coordination service, not a day-one requirement for the desktop MVP.
- Design the hosted coordination service (if and when built) with RMF control families in mind from the start — audit logging, access control, encryption, configuration management — so a later authorization effort is not a rewrite.
- Document this posture explicitly for buyers rather than making unverified compliance claims. See [`24-federal-compliance-and-vpat.md`](24-federal-compliance-and-vpat.md).

### Risk: VPAT and accessibility evidence claims are legally overstated

Federal buyers will ask whether ForgeGate can produce a VPAT (Voluntary Product Accessibility Template). Overstating what generated evidence proves is a compliance and legal liability, consistent with the existing "ForgeGate overstates compliance" risk above.

Mitigation:

- Treat VPAT export as evidence-assembly assistance, not an automated legal certification.
- Require human review and sign-off before any VPAT-formatted export is treated as final.
- Keep automated, manual, and hybrid evidence sources clearly distinguished in VPAT-formatted output.
- Scope VPAT export as a post-MVP capability; do not let it block the Web Components vertical slice. See [`24-federal-compliance-and-vpat.md`](24-federal-compliance-and-vpat.md).

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

## Resolved decisions

- **First MVP framework target: Lit/vanilla Web Components, not Angular.** Web Components best prove framework neutrality and match how teams building a design system from scratch — including federal teams — increasingly standardize across agencies. Angular (ForgeGate's own UI framework) follows as the second validation target. Decided 2026-07-22.
- **Licensing direction: proprietary-closed or source-available, not open source.** The intended buyer is federal and large enterprise; source-available (visible to evaluators, not free to use or redistribute) is the current lean over fully closed, to support buyer evaluation. Final license text still undecided. Decided 2026-07-22.
- **Federal posture: local-first now, FedRAMP/RMF-aware architecture for any future hosted component.** ForgeGate does not pursue FedRAMP or NIST RMF Rev 5 authorization for the MVP. Any future hosted coordination service must be designed with RMF control families in mind from the start. Decided 2026-07-22.
- **Design tokens: adopt the DTCG (Design Tokens Community Group) format**, including Figma's DTCG-compatible token JSON export, as the primary token interchange format rather than inventing a proprietary token schema. Decided 2026-07-22. See [`23-design-tokens-and-figma-bridge.md`](23-design-tokens-and-figma-bridge.md).

## Decisions closed by ADR

These no longer need discussion in this document; see [`decisions/`](decisions/README.md) for full context.

- Primary MVP user (engineer, accessibility specialist secondary) — [`decisions/0001-primary-mvp-user.md`](decisions/0001-primary-mvp-user.md).
- Initial buyer (regulated design-system leader, federal leading example not federal-only) — [`decisions/0002-initial-buyer.md`](decisions/0002-initial-buyer.md).
- Pilot repository (Public Sector Federation for the real demo, a small synthetic fixture for CI) — [`decisions/0003-pilot-repository.md`](decisions/0003-pilot-repository.md). The original adapter-sequencing tension is now resolved in favor of Web Components first; the remaining question is when the Public Sector Federation pilot should begin, because it likely depends on Angular/Nx validation.
- MVP generation scope (assure existing components; propose but do not generate new ones) — [`decisions/0004-mvp-generation-scope.md`](decisions/0004-mvp-generation-scope.md).
- Workspace architecture (pnpm, Nx, Angular UI, Tauri 2, Rust boundary only, TypeScript everywhere else) — [`decisions/0005-workspace-architecture.md`](decisions/0005-workspace-architecture.md).

## Open product decisions

- Should the product be called ForgeGate permanently, or should it take a different name under the True North umbrella?
- Should the descriptive category be “Component Assurance Studio,” “Component Operations,” or another term?
- Should manual review records be committed to the repository by default?
- Which evidence belongs in Git versus external artifact storage?
- Which compliance profile can be responsibly provided as a starter template?
- How soon should VPAT export, FedRAMP 20x alignment, and NIST RMF Rev 5 alignment enter the roadmap relative to core assurance features?

## Decisions that can wait

These are real open questions but are explicitly not required to start Phase 1 and should not be resolved by adding more planning documents:

- Final pricing
- Open-source versus proprietary license text (direction is recorded; exact terms are not)
- React versus Web Components as the _second_ adapter after the first two are settled
- Evidence signing
- Zeroheight write capabilities
- Cloud collaboration
- Team accounts
- SSO
- Marketplace or plugin distribution
- Advanced AST-based stale-evidence classification
- AI generation

## Validation threshold

ForgeGate should be treated as a validated opportunity, not just a strong hypothesis, only after:

1. Five design-system or frontend-platform professionals confirm evidence freshness and release readiness are genuinely painful.
2. At least two people identify who owns the budget for this.
3. One organization lets ForgeGate analyze a real repository.
4. The prototype measurably reduces release-evidence assembly work.
5. One organization pays at least $15,000 for a pilot, or signs a credible purchase commitment.
6. The buyer specifically values stale-evidence detection, guided review, or release assurance — not merely custom software development.

As of 2026-07-22, none of these have occurred. Product interviews and a working prototype should proceed in parallel, per [`decisions/0001-primary-mvp-user.md`](decisions/0001-primary-mvp-user.md) — a working demonstration produces far better interview feedback than a verbal description.

## Open architecture decisions

- PostgreSQL deployment posture outside development Docker
- JSON Schema validator
- YAML library and comment preservation
- AST strategy per framework
- MDX protected-region strategy
- Plugin sandbox model
- Headless CLI language and packaging
- Evidence signing approach

## Open commercial decisions

- Exact license text (proprietary-closed versus source-available terms)
- Free edition boundaries
- Per-user versus per-design-system pricing
- Offline enterprise licensing
- Channel partner strategy
- Professional services scope
- Whether to pursue FedRAMP 20x pilot authorization for a hosted coordination service, and when

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
