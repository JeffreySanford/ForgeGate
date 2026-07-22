# ForgeGate Product Principles

These principles are intended to remain stable even as the implementation, supported frameworks, vendors, and commercial model evolve.

## 1. Code is real; pictures are proposals

The coded component is the executable artifact. Visual design tools may propose appearance, anatomy, layout, and interaction, but they do not establish that the shipped component behaves correctly.

ForgeGate should connect design intent to code, not pretend static design objects are production components.

## 2. Storybook is a workbench, not the governing authority

Storybook is excellent at rendering isolated states, documenting examples, running interaction tests, and integrating accessibility and visual tooling. ForgeGate should use those strengths.

ForgeGate should not depend on Storybook to define the entire lifecycle, required evidence, human review, policy inheritance, exception handling, consumer validation, or release decision.

## 3. Use existing specialized tools

ForgeGate should coordinate and normalize rather than replace mature tools:

- Test runners execute tests.
- Axe and other rule engines detect machine-testable issues.
- Visual providers compare images and support review.
- Git identifies changes and history.
- Documentation systems publish guidance.
- Framework compilers and build systems validate framework behavior.

ForgeGate adds value by making their combined meaning visible and actionable.

## 4. Evidence must be attributable

Every result should identify where it came from:

- Tool or human reviewer
- Tool and adapter version
- Scope and method
- Story, state, component, application, or package
- Commit or dirty-worktree fingerprint
- Environment and date
- Raw evidence source

A normalized green status without provenance is not trustworthy.

## 5. Automated accessibility is partial evidence

Automated accessibility tools are necessary and valuable, but they cannot determine every conformance issue. ForgeGate must preserve incomplete findings and require manual evaluation where policy demands it.

The product should use language such as “automated checks passed,” “manual review complete,” and “evidence package approved.” It should avoid unsupported claims of legal certification.

## 6. Human review is structured work

A checkbox reading “screen reader tested” is insufficient. ForgeGate should provide a versioned procedure, expected behavior, environment capture, result states, observations, attachments, and reviewer identity.

The product should make manual review easier to perform consistently without pretending to automate judgment that still requires expertise.

## 7. Current code requires current evidence

Evidence must be tied to the relevant source version. A prior approval should not remain silently valid after relevant implementation, token, policy, story, or test changes.

The first implementation may invalidate conservatively. Later versions may use dependency-aware and change-type-aware invalidation, but the product should always explain why evidence is current or stale.

## 8. The operational center must not become a data prison

ForgeGate may index and cache data in SQLite, but durable manifests, policies, mappings, and evidence exports should use documented, portable formats.

A team should be able to inspect, version, archive, and process important records without the desktop application.

## 9. Framework neutrality belongs in contracts, not marketing

Supporting many framework names in a README is easy. True framework neutrality requires:

- Core entities with no framework imports
- Adapter capability declarations
- Portable manifests
- Framework-neutral policies and evidence
- Fixture-based compatibility tests
- Graceful behavior when an adapter cannot extract a feature

The initial Angular implementation should not leak Angular assumptions into the core model.

## 10. Deep support beats shallow support

ForgeGate should support one complete Angular journey before claiming complete support for every modern framework. Each adapter should meet explicit acceptance criteria for discovery, metadata, stories, tests, documentation, and generation.

## 11. Safe local access is a product feature

Desktop access to files, processes, Git, networks, and credentials creates power and risk. ForgeGate should earn trust through:

- Narrow Tauri capabilities
- Explicit user intent
- Sandboxed remote content
- Visible commands
- Diffs before writes
- Cancellation and timeouts
- Secret redaction
- No automatic push or publication

## 12. Release status must be explainable

A readiness score may help summarize progress, but it must never hide a blocker. ForgeGate should show:

- Which policy applies
- Which evidence satisfies it
- Which requirement remains missing
- Which finding blocks release
- Which exception was accepted
- Who approved the decision
- Which code version the decision covers

## 13. Component assurance includes context

A component may work in isolation and fail in composition. ForgeGate should support both isolated component evidence and consuming-application evidence.

Component readiness should be explicit about whether it has been validated only in Storybook or also in real themes, shells, containers, forms, focus flows, localization, and application routes.

## 14. Documentation is part of the release artifact

A component is incomplete when adopters cannot understand its purpose, API, states, behavior, accessibility expectations, tokens, limitations, migration path, and examples.

Documentation drift should be detectable and capable of blocking release under policy.

## 15. Generated work must remain reviewable

ForgeGate may generate components, stories, tests, manifests, procedures, and documentation. It should never silently replace user work.

Generation should use temporary output, deterministic templates, protected extension points, clear diffs, user approval, targeted formatting, validation, and rollback.

## 16. ForgeGate must dogfood its own standards

ForgeGate’s desktop UI and component library should be governed through ForgeGate as soon as the product can support that workflow. The product should demonstrate its own accessibility, evidence freshness, documentation, and release gates.
