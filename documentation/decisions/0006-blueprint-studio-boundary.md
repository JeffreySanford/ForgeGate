# 0006 — Blueprint Studio Product Boundary

## Context

ForgeGate's component blueprints, manifest model, design-token mappings, safe generation workflow, and assurance lifecycle can eventually support creating a new component from a governed specification.

The product also explicitly rejects becoming a general Figma replacement. Without a clearer decision, those two positions can appear contradictory and future implementation may either remove designer authoring entirely or expand into an unfocused drawing application.

The current MVP decision in [`0004-mvp-generation-scope.md`](0004-mvp-generation-scope.md) remains valid: ForgeGate first assures existing components and may propose supporting artifacts, but does not generate a brand-new component from scratch.

## Decision

ForgeGate will preserve **Blueprint Studio** as a first-class post-MVP initiative.

Blueprint Studio is a structured visual editor for component proposals. It allows a designer to define:

- Purpose and semantic role
- Public contract
- Variants and states
- Anatomy, slots, and parts
- Design-token mappings
- Content fixtures
- Keyboard and interaction behavior
- Story, test, review, and documentation requirements
- Framework-adapter generation inputs

Blueprint Studio may generate a component scaffold and its supporting artifacts only through ForgeGate's explicit temporary-generation, diff, approval, validation, and rollback workflow.

Blueprint Studio is not a freeform vector-graphics canvas and does not replace Figma, Penpot, Storybook, framework source code, engineering review, or assurance evidence.

The first Blueprint Studio implementation will target one Button blueprint and one Web Components adapter after the existing-component assurance vertical slice and safe artifact generation have been demonstrated.

## Alternatives considered

### Remove visual component creation from ForgeGate

Rejected. The blueprint and assurance models provide a strong foundation for a safer designer-to-code workflow, and removing that direction would leave designers as passive reviewers rather than participants in defining governed components.

### Build a full Figma-like canvas

Rejected. Arbitrary drawing, layout, vector editing, and general interface composition would dramatically expand scope and weaken ForgeGate's unique center: component contracts, evidence, and release assurance.

### Generate components immediately in the MVP

Rejected. Generation must follow proven assurance contracts rather than precede them. Otherwise ForgeGate could create attractive but incomplete components without being able to verify their quality.

### Depend entirely on a Figma plugin

Rejected as the primary approach. Figma may become an optional linked design reference and interoperability adapter, but ForgeGate must remain useful in offline, restricted, non-Figma, and repository-controlled environments.

## Consequences

- [`../27-blueprint-studio.md`](../27-blueprint-studio.md) becomes the primary initiative specification.
- The product overview must distinguish general graphics editing from structured component authoring.
- Component blueprints must gain visual-authoring metadata in addition to assurance requirements.
- Framework adapters must advertise authoring and generation capabilities explicitly.
- The Figma bridge may expand beyond one-way token ingestion in later phases, but only through explicit identity mapping and reviewable synchronization.
- The roadmap must place Blueprint Studio after assurance validation and safe generation.
- The current MVP remains unchanged.

## Status

Accepted

## Date

2026-07-23

## Owners

Jeffrey Sanford

## Revisit condition

Revisit the first implementation scope after the existing-component assurance vertical slice is demonstrated with a real repository and reviewed by at least one designer and one engineer.
