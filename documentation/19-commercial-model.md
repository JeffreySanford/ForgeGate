# ForgeGate Commercial Model

## Commercial hypothesis

ForgeGate is most valuable to organizations where a component library is not merely a visual convenience. It is a governed delivery asset whose quality, accessibility, documentation, and release evidence affect many applications.

The strongest initial commercial position is:

> ForgeGate is the local-first component assurance studio for teams that need to prove a design-system component is ready to release.

## Initial buyer categories

### Regulated design-system teams

Examples include government, healthcare, finance, education, insurance, and other organizations with accessibility, audit, procurement, or release-evidence requirements.

### Government contractors and civic-technology firms

These teams often need to demonstrate Section 508-oriented testing, traceability, documentation, and acceptance evidence across customer projects.

### Enterprise frontend platform teams

They manage multiple component packages and consuming applications, often across more than one framework.

### Accessibility consultancies

They may use ForgeGate to standardize component procedures, collect evidence, track remediation, and produce customer reports.

### Design-system consultancies

They may use ForgeGate as a delivery platform installed during component-library creation or remediation engagements.

### SaaS vendors selling to government or regulated buyers

They need repeatable evidence for components and application interfaces without uploading proprietary source code to another hosted platform.

### Federal design-system teams building from scratch

Large federal teams standing up a new agency-wide or cross-agency design system are a directly observed source of this pain, not a hypothetical buyer category. They are actively assembling component evidence, accessibility procedures, and documentation across disconnected tools today, and they need VPAT-ready accessibility evidence as part of standard procurement. See [`24-federal-compliance-and-vpat.md`](24-federal-compliance-and-vpat.md).

## User versus buyer

Possible users:

- Design-system engineer
- Accessibility specialist
- Frontend platform engineer
- Technical writer
- QA engineer
- Designer

Possible buyers:

- Director of engineering
- Design-system lead
- Accessibility program lead
- VP of product engineering
- Consulting practice lead
- Government program technical lead
- Compliance or risk leader

The sales narrative must connect technical workflow to reduced delivery risk and labor cost.

## Primary economic pain

ForgeGate should validate these costs:

- Hours spent locating current component evidence
- Duplicate test and documentation work
- Manual spreadsheet maintenance
- Accessibility rework late in release
- Stale approvals
- Inconsistent component acceptance across teams
- Documentation drift
- Consumer application regressions
- Difficulty producing contract or audit evidence
- Slow onboarding into existing component libraries

## Initial service-led offer

Before relying on self-service SaaS revenue, sell a fixed engagement:

# Component Assurance Sprint

Possible scope:

- One design system
- One Storybook
- Three representative components
- One Starlight site or Zeroheight mapping
- Automated test integration
- Manual review procedures
- Release policy
- Evidence export
- Findings and remediation roadmap

Possible pilot pricing hypothesis:

- Design-partner pilot: $15,000–$30,000
- Standard implementation pilot: $30,000–$60,000
- Larger regulated engagement: $60,000–$100,000+

These are hypotheses to validate, not established market prices.

## Product editions

### Community or Local edition

Potential capabilities:

- One local workspace
- Built-in framework adapters
- Component inventory
- Local Storybook integration
- Basic test orchestration
- Starlight generation
- Portable manifests and evidence

### Professional edition

Potential capabilities:

- Multiple workspaces
- Advanced policies
- More blueprints
- Visual provider adapters
- Zeroheight adapter
- Advanced evidence reports
- Safe generation
- CI CLI

### Team edition

Potential capabilities:

- Shared review queues
- Reviewer assignment
- Approval workflows
- Findings and exception management
- Shared policy bundles
- Team reporting

### Enterprise edition

Potential capabilities:

- SSO
- Organization roles
- Private adapter and blueprint registry
- Offline or restricted update channel
- Signed policies
- Central audit retention
- Self-hosted coordination service
- Premium support

Edition boundaries must not trap a customer’s critical data in a proprietary format.

## Licensing direction

The current lean is **proprietary-closed or source-available**, not open source. Source-available means evaluators and customers can read the code to build trust — a meaningful factor for federal and security-conscious enterprise buyers who want to verify local-first claims — without the right to freely use, modify, or redistribute it. This is a lean, not a final decision; exact license text remains open. See [`20-risks-and-decisions.md`](20-risks-and-decisions.md).

This direction reinforces the local-first pitch: a source-available desktop tool that provably never uploads customer code is a stronger trust story for a federal buyer than a closed-source hosted SaaS product making the same claim.

## Pricing models to evaluate

- Per named user
- Per design system
- Per component library
- Per organization
- Per active component
- Annual enterprise license
- Consulting implementation plus annual maintenance

Per-component pricing may discourage adoption and inventory completeness. Per-design-system or organization pricing may align better with value.

## Distribution

Initial distribution:

- Signed Windows installer
- Private design-partner builds
- Direct onboarding

Later distribution:

- Public download
- Enterprise offline installer
- Package registry for CLI and Starlight plugin
- Private adapter registry

## Differentiation

ForgeGate should not compete on:

- General graphics editing
- Generic Storybook hosting
- Generic axe scanning
- Generic documentation pages
- Generic AI component generation

ForgeGate should compete on:

- One current component record across tools
- Policy-driven completeness
- Guided human compliance review
- Git-aware stale approvals
- Application-context evidence
- Framework-neutral governance
- Local-first source privacy
- Portable release evidence
- Safe generation of missing assurance artifacts

## Sales demonstration

The strongest demonstration should intentionally include defects:

- Missing loading story
- Keyboard regression
- Axe violation
- Stale screen-reader approval
- Token drift
- One failing consuming application
- Documentation version mismatch

ForgeGate detects and explains each issue, then shows the path to readiness.

## Customer validation questions

Ask potential buyers:

- What must exist before a component is approved?
- Where is that evidence stored today?
- How do you know approval still applies after code changes?
- Who performs manual accessibility review?
- How are exceptions managed?
- How many applications consume the component?
- What happens when documentation and code disagree?
- How many hours does a release evidence package require?
- What failed in the last component or design-system release?
- Would local-first operation materially affect purchase approval?

Avoid asking only whether the idea sounds useful.

## Million-dollar path

A million dollars in collected revenue quickly is unlikely. More realistic paths include:

- Several high-value implementation pilots
- Annual enterprise contracts
- A consulting partner license
- A channel partnership with an accessibility or design-system consultancy
- A product valuation based on working software and early contracts

A plausible annual contract-value mix might be:

- Five enterprise customers at $100,000–$200,000
- Ten professional customers at $25,000–$75,000
- Consulting and implementation services

## Validation gates before major investment

Do not spend heavily on multi-framework implementation until:

- At least five target users confirm the problem.
- At least two buyers confirm budget ownership.
- One design partner provides a real repository.
- The Web Components vertical slice reduces measurable work, and Angular/Nx validation shows the same model can cross framework boundaries.
- The customer values stale-evidence and release-assurance capabilities beyond ordinary Storybook reporting.
