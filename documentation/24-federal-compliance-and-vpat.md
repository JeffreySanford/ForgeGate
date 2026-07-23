# ForgeGate Federal Compliance and VPAT

## Position

ForgeGate's strongest early validation is not general enterprise interest — it is direct observation of large teams building federal design systems from scratch, plus the maintainer's own experience building a design system recently. Federal buyers are a primary target, not a stretch market. This document scopes what "federal-ready" actually means for ForgeGate, separating what belongs in the MVP from what is a deliberate later milestone.

This is a capability scope document. It does not replace expert legal, accessibility, or authorization review, and it must not be used to make unverified compliance claims. See the language rules in [`07-compliance-testing.md`](07-compliance-testing.md), which apply equally here.

## Three separate federal concerns

Federal buyers evaluate a product like ForgeGate against three largely independent concerns. Conflating them overstates or understates readiness.

### 1. Product accessibility evidence (Section 508 / VPAT)

This concerns whether the *components a team builds* are accessible, and whether ForgeGate can help produce the standard federal procurement artifact — the **VPAT (Voluntary Product Accessibility Template)** — that documents conformance to Section 508 and WCAG.

### 2. Authorization posture of ForgeGate itself (FedRAMP / ATO)

This concerns whether *ForgeGate as a piece of software running in a federal environment* needs its own authorization. This applies to hosted or coordinating components, not to a fully local desktop tool with no network dependency.

### 3. Security control alignment (NIST SP 800-53 Rev. 5 / RMF)

This concerns whether ForgeGate's own engineering practices — access control, audit logging, configuration management, encryption, vulnerability management — align with the control families a federal ATO or a security-conscious enterprise buyer will ask about, independent of whether a formal authorization is ever pursued.

## 1. VPAT support

### What a VPAT is

A VPAT is a standardized document, based on the ITI (Information Technology Industry Council) template, that reports how a product conforms to Section 508 and WCAG success criteria. It is the artifact federal procurement officers expect when evaluating accessibility.

### What ForgeGate should and should not claim

- ForgeGate should assemble VPAT-formatted output from the same evidence model already defined in [`07-compliance-testing.md`](07-compliance-testing.md): automated results, manual review results, findings, exceptions, and their current freshness state.
- ForgeGate should not present a generated VPAT as a final, signed compliance artifact. A human accessibility reviewer must confirm and sign it before it is distributed to a customer, consistent with the "ForgeGate overstates compliance" risk in [`20-risks-and-decisions.md`](20-risks-and-decisions.md).
- Every success-criterion row in a generated VPAT should link back to the specific automated result, manual review, or accepted exception that supports it, not to a summary score.
- Where evidence is incomplete or stale, the generated VPAT should say so explicitly rather than omit the row or mark it silently as passing.

### Scope decision

VPAT export is valuable and directly connects to why federal teams would buy ForgeGate, but it is explicitly **post-MVP**. The MVP proves the underlying evidence model (Web Components button, automated gates, guided manual review, stale-evidence detection) is sound; VPAT export is a presentation layer on top of that evidence and should not block the vertical slice. See [`21-mvp-acceptance-criteria.md`](21-mvp-acceptance-criteria.md).

## 2. FedRAMP and authorization posture

### Why this mostly does not apply to the desktop MVP

ForgeGate's desktop application is local-first by design: it inspects a local repository, runs local commands, and does not require uploading source code to a hosted service to function. A purely local, offline-capable tool generally does not require FedRAMP authorization, because FedRAMP governs cloud services, not locally installed software with no service dependency.

### Where it becomes relevant

Later editions describe shared review queues, a coordination service, license validation, or an update channel (see [`19-commercial-model.md`](19-commercial-model.md), Team and Enterprise editions). Any of those, if hosted, would need an authorization conversation with a federal customer.

**FedRAMP 20x** is a newer, faster pilot authorization path aimed at lightweight, well-scoped cloud services, and is a more realistic target than the traditional FedRAMP process for a small vendor — but it still assumes an actual hosted service exists and is scoped for authorization. There is nothing to authorize until such a service is built.

### Decision

- No FedRAMP authorization work for the MVP or for a purely local desktop product.
- Track FedRAMP 20x as the intended path if and when a hosted coordination service is built, rather than the traditional multi-year FedRAMP process.
- Prefer an architecture where the hosted service's blast radius is minimal — license validation, team coordination metadata, maybe shared policy bundles — never customer source code or unredacted evidence, so the eventual authorization scope stays small.

## 3. NIST SP 800-53 Rev. 5 / RMF alignment

Independent of pursuing formal authorization, federal and security-conscious enterprise buyers will ask security-posture questions that map to RMF control families even for local software:

- **Access Control (AC)** — how workspace access, credential storage, and desktop capabilities are scoped. Already addressed architecturally in [`13-desktop-security.md`](13-desktop-security.md).
- **Audit and Accountability (AU)** — whether ForgeGate logs privileged operations (command execution, file writes, credential use) in a way an organization can review.
- **Configuration Management (CM)** — how repository configuration, policies, and adapter versions are tracked and change-controlled, addressed in [`16-data-and-schema-model.md`](16-data-and-schema-model.md).
- **Identification and Authentication (IA)** — how ForgeGate handles credentials for optional remote services (Zeroheight, CI providers), via the OS credential vault rather than in-app secret storage.
- **System and Communications Protection (SC)** — how the preview surface is isolated from privileged APIs, addressed in [`02-system-architecture.md`](02-system-architecture.md) and [`13-desktop-security.md`](13-desktop-security.md).
- **System and Information Integrity (SI)** — vulnerability management and update integrity for the desktop application and its dependencies.

### Scope decision

- ForgeGate should design its security architecture with these control families in mind from the start, because the underlying practices (least privilege, audit logging, scoped credentials, signed updates) are good engineering regardless of federal ambitions.
- A formal control-by-control mapping or third-party assessment is explicitly out of scope until there is a paying federal design partner requiring it. Producing that mapping prematurely is effort spent before validation, consistent with the "risk: the product is too broad for one developer" mitigation in [`20-risks-and-decisions.md`](20-risks-and-decisions.md).

## What this changes in near-term planning

- Nothing in the MVP acceptance criteria changes because of this document. VPAT, FedRAMP, and RMF are explicitly sequenced after the Web Components vertical slice.
- The audit-logging capability for privileged Tauri commands (command execution, file writes, credential access) should be designed early, since it is cheap to add now and expensive to retrofit, and it directly supports both AU-family alignment and ForgeGate's own evidence-immutability principle in [`16-data-and-schema-model.md`](16-data-and-schema-model.md).
- Sales and positioning language toward federal buyers should lead with "local-first, evidence-based, no source upload" rather than any authorization claim ForgeGate has not earned.

## Non-goals

- ForgeGate does not claim FedRAMP authorization, an ATO, or NIST RMF compliance for any current version.
- ForgeGate does not generate a final, signed VPAT without human accessibility review.
- ForgeGate is not a general GRC (governance, risk, and compliance) platform, consistent with the existing non-goal in [`00-product-overview.md`](00-product-overview.md) and [`20-risks-and-decisions.md`](20-risks-and-decisions.md).
