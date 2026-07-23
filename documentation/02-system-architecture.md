# ForgeGate System Architecture

## Architectural objective

ForgeGate must provide powerful local repository access without coupling the product to one frontend framework, one workspace manager, one test runner, one documentation platform, or one hosted service.

The architecture should separate:

- Desktop presentation
- Privileged local operations
- Framework-neutral domain logic
- Adapter contracts
- Repository-owned portable data
- Local cache and workflow state
- External tools and services

## Proposed high-level architecture

```text
┌──────────────────────────────────────────────────────────────┐
│ ForgeGate Desktop                                            │
│                                                              │
│  Angular Desktop UI                                          │
│  ├── Workspace                                               │
│  ├── Component Inventory                                     │
│  ├── Component Record                                        │
│  ├── Test Center                                             │
│  ├── Manual Review                                           │
│  ├── Findings and Exceptions                                 │
│  ├── Documentation                                           │
│  └── Release and Evidence                                    │
│                                                              │
│  Framework-Neutral Core                                      │
│  ├── Domain Model                                            │
│  ├── Manifest Service                                        │
│  ├── Policy Engine                                           │
│  ├── Evidence Normalizer                                     │
│  ├── Freshness Engine                                        │
│  ├── Readiness Evaluator                                     │
│  ├── Publication Planner                                     │
│  └── Reactive Evidence Bus (RxJS)                             │
│                                                              │
│  Adapter Runtime                                             │
│  ├── Workspace Adapters                                      │
│  ├── Framework Adapters                                      │
│  ├── Storybook Adapter                                       │
│  ├── Test Adapters                                           │
│  ├── Token Adapters                                          │
│  ├── Documentation Adapters                                  │
│  ├── CI Adapters                                             │
│  └── Version-Control Adapters                                │
│                                                              │
│  Tauri Privileged Boundary                                   │
│  ├── Filesystem                                              │
│  ├── Process Execution                                       │
│  ├── Git                                                     │
│  ├── Network                                                 │
│  ├── Credential Vault                                        │
│  ├── Native Dialogs                                          │
│  └── Update and Packaging                                    │
└──────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
   Local Repository      Local Tooling       Optional Services
   Git + manifests       Storybook           Zeroheight
   source + tests        test runners        Chromatic
   tokens + docs         builds              CI providers
```

## Desktop shell

### Tauri 2

Tauri is preferred because ForgeGate needs controlled access to local files, processes, Git, credentials, and operating-system features without shipping a general Node.js runtime with unrestricted preload bridges.

The Tauri layer should expose narrow commands such as:

- `select_workspace`
- `read_workspace_metadata`
- `scan_files`
- `read_text_file`
- `prepare_file_changes`
- `apply_approved_changes`
- `run_configured_command`
- `cancel_command`
- `read_git_status`
- `read_git_diff`
- `store_secret`
- `retrieve_secret`

It should not expose a generic “run any shell command” function to the webview.

### Desktop user interface

The initial desktop user interface may use Angular because it aligns with the first proof-of-concept repository and the maintainer’s strengths. This is an implementation detail, not a restriction on supported component frameworks.

The UI should consume framework-neutral core contracts and adapter capability responses.

## Core domain layer

The core layer owns product meaning rather than tool details.

Responsibilities include:

- Component identity and lifecycle
- Manifest validation
- Policy inheritance
- Requirement evaluation
- Evidence normalization
- Finding and exception state
- Freshness determination
- Release readiness
- Documentation completeness
- Evidence package assembly

The core layer must not import Angular compiler APIs, React tooling, Storybook packages, Playwright APIs, or Zeroheight clients.

### Reactive synchronization

All working parts of the core layer, the adapter runtime, and the desktop UI stay synchronized through RxJS observables and subjects rather than polling or ad hoc callbacks. File changes, Git state, command output, adapter results, manual review progress, and policy evaluation are modeled as streams that compose into shared, multicast domain streams such as evidence freshness, readiness, and documentation drift. See [`22-reactive-data-flow.md`](22-reactive-data-flow.md) for the stream taxonomy, subject usage, adapter streaming contracts, and error-handling rules.

## Adapter runtime

Adapters translate external systems into ForgeGate contracts.

### Workspace adapters

Workspace adapters detect project topology and commands:

- Nx
- Turborepo
- pnpm, npm, Yarn, and Bun workspaces
- Rush
- Lage
- Conventional repositories

### Framework adapters

Framework adapters discover components and extract framework metadata:

- Angular
- React
- Vue
- Svelte
- Solid
- Lit and Web Components
- Qwik
- Astro
- Framework-neutral packages

### Test adapters

Test adapters parse and preserve outputs from:

- Vitest
- Jest
- Karma
- Playwright
- Cypress
- WebdriverIO
- Storybook tests
- Axe
- JUnit XML
- Visual providers
- Generic project-defined commands

### Documentation adapters

- Astro Starlight
- Storybook MDX and autodocs
- Zeroheight
- Future Markdown-based and enterprise platforms

### Adapter capabilities

Each adapter must declare what it can do, for example:

```json
{
  "adapter": "framework.angular",
  "version": "0.1.0",
  "capabilities": {
    "discoverComponents": true,
    "extractPublicApi": true,
    "extractSlots": "partial",
    "generateComponent": false,
    "generateStory": true,
    "mapTests": true
  }
}
```

ForgeGate should present unsupported and partial capabilities honestly.

## Data layers

### Repository-controlled data

Suggested `.forgegate/` structure:

```text
.forgegate/
├── config.yaml
├── policies/
│   ├── workspace.yaml
│   ├── section-508-web.yaml
│   └── wcag-2.2-aa.yaml
├── components/
│   ├── button.yaml
│   └── dialog.yaml
├── reviews/
│   └── optional-portable-review-records/
├── evidence/
│   └── optional-release-evidence/
└── mappings/
    ├── storybook.yaml
    ├── starlight.yaml
    └── zeroheight.yaml
```

The exact layout remains a design decision, but repository-owned data must be schema-valid and versioned.

### SQLite local cache

SQLite may store:

- Connected workspaces
- Scan indexes
- File fingerprints
- Adapter results
- Command history
- In-progress review drafts
- Cached remote metadata
- User preferences

SQLite should not be the only copy of approved release evidence.

### Raw artifacts

Raw tool results should be retained or referenced so that normalized records can be audited. Large binary artifacts may live outside Git but must have stable references, checksums, and retention rules.

## Command execution flow

```text
User selects gate
  → policy resolves required command
  → repository configuration resolves exact command
  → ForgeGate displays command and working directory
  → user approves execution
  → Tauri starts constrained child process
  → output streams to UI
  → user may cancel
  → raw output and artifacts are captured
  → adapter parses results
  → core normalizes evidence
  → freshness metadata is attached
  → readiness is reevaluated
```

## Repository write flow

```text
User requests generated artifact
  → adapter generates files in temporary directory
  → ForgeGate compares temporary output to repository
  → user sees file list and unified diff
  → user approves selected changes
  → Tauri writes only approved paths
  → formatter and targeted validation run
  → result and remaining failures are shown
```

No automatic commit or push should occur without separate explicit confirmation.

## Preview architecture

Local and remote Storybook content must be isolated from privileged APIs.

Recommended approach:

- Separate preview webview or browser surface
- No Tauri command bridge
- Strict origin allowlist
- Navigation restrictions
- No inherited credentials unless explicitly configured
- Content security policy
- Clear indication of local versus remote origin
- Open externally as a fallback when secure embedding is not possible

## Headless and CI architecture

The desktop application should eventually share schemas, adapters, policy evaluation, and evidence normalization with a headless CLI.

```text
Desktop UI ─┐
            ├── ForgeGate Core + Adapter SDK
CI CLI ─────┘
```

The CI form should not depend on desktop UI packages. Desktop and CI must produce compatible evidence and readiness decisions.

## Failure model

The architecture must represent failures without collapsing them into a generic error:

- Adapter unavailable
- Unsupported version
- Configuration missing
- Command rejected by user
- Command timed out
- Command cancelled
- Tool failed
- Tool succeeded but result parsing failed
- Evidence incomplete
- Remote service unavailable
- Authentication failed
- Repository changed during execution
- Output artifact missing
- Evidence stale

Every failure should include actionable next steps when possible.

## Initial deployment scope

The initial release should target Windows because:

- It matches the maintainer’s current environment.
- It supports immediate JAWS and Windows high-contrast workflows.
- It reduces packaging and code-signing complexity during the proof of concept.

The architecture must avoid Windows-only domain assumptions so macOS and Linux packaging can follow.
