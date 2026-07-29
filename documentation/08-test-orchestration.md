# ForgeGate Test Orchestration

## Objective

ForgeGate should provide one predictable workflow for running and understanding many existing quality tools without replacing those tools.

The orchestration layer has four responsibilities:

1. Resolve which gates apply.
2. Run or import results safely.
3. Preserve raw output.
4. Normalize results into the ForgeGate evidence model.

## Gate categories

### Build and static quality

- Build
- Type-check
- Lint
- Format check
- Package export
- API surface
- Bundle size
- Dependency audit
- License policy
- SBOM generation

### Component behavior

- Unit tests
- Framework component tests
- Storybook interaction tests
- Browser tests
- Keyboard automation
- Application integration tests

### Accessibility and compliance

- Axe
- Alternative automated rules engines
- Story-level accessibility runs
- Environment-specific checks
- Manual procedure requirements

### Visual quality

- Local screenshot comparison
- Chromatic
- Percy
- Applitools
- Loki
- Project-defined review providers

### Documentation and governance

- Required story coverage
- Required documentation sections
- Token mapping completeness
- Manifest validation
- Policy validation
- Evidence freshness
- Required approvals

## Safe command configuration

ForgeGate should not infer and execute arbitrary shell commands.

Commands should be defined or confirmed in `.forgegate/config.yaml`:

```yaml
commands:
  unit:
    cwd: .
    command: pnpm
    args: [nx, test, up-design-system, --json]
    timeoutSeconds: 900
  storybookTest:
    cwd: .
    command: pnpm
    args: [nx, test-storybook, up-design-system, --ci]
    timeoutSeconds: 1200
  playwright:
    cwd: .
    command: pnpm
    args: [nx, e2e, qa-remote]
    timeoutSeconds: 1800
```

The desktop UI should display the resolved command, arguments, and working directory before execution.

## Command lifecycle

```text
Configured → Awaiting approval → Running → Completed
                                ↘ Cancelled
                                ↘ Timed out
                                ↘ Failed to start
```

ForgeGate should capture:

- User who initiated the run
- Start and end time
- Command and arguments
- Working directory
- Environment overrides
- Exit code
- Standard output and error
- Cancellation or timeout reason
- Artifact paths
- Repository state

## Output parsing

Adapters should parse structured formats whenever available:

- JSON
- JUnit XML
- SARIF
- Provider APIs
- Tool-specific reports

Console-text parsing should be a fallback and must be version tested.

Current implementation supports imported `.forgegate/evidence/*.json` records
for a narrow, provenance-safe subset:

- ForgeGate-native `TestExecution` JSON.
- `playwright-json` envelopes that carry raw Playwright JSON plus
  `componentVersionId`, `commitOrFingerprint`, `toolVersion`, and optional
  `rawArtifactRef`.
- `axe-json` envelopes that carry raw axe-core JSON plus the same ForgeGate
  provenance.
- `storybook-interactions-json` envelopes that carry raw Storybook interaction
  result JSON plus the same ForgeGate provenance.

These adapters normalize a single `TestExecution` and preserve the raw report
for evidence export. ForgeGate still does not run target-repository commands
itself; command orchestration remains a separate milestone from result import.

## Normalized evidence

Proposed result contract:

```ts
interface AssuranceResult {
  id: string;
  componentId?: string;
  gateId: string;
  scope: 'workspace' | 'project' | 'package' | 'component' | 'story' | 'application';
  status: 'passed' | 'failed' | 'warning' | 'blocked' | 'skipped' | 'incomplete' | 'unknown';
  severity?: 'info' | 'minor' | 'moderate' | 'serious' | 'critical';
  source: {
    tool: string;
    toolVersion?: string;
    adapter: string;
    adapterVersion: string;
  };
  repository: {
    commitSha?: string;
    dirtyFingerprint?: string;
    branch?: string;
  };
  startedAt?: string;
  completedAt: string;
  durationMs?: number;
  findings: FindingReference[];
  artifacts: EvidenceArtifactReference[];
  rawResultReference?: string;
}
```

## Raw result preservation

Normalization may lose details. ForgeGate should preserve:

- Original JSON or XML
- Console logs
- Screenshots
- Videos and traces
- Provider links
- Browser reports
- Coverage reports
- Build manifests

Raw artifacts should have checksums and retention metadata.

## Component attribution

A test run may cover:

- One component
- Several stories
- A package
- A consuming application
- The entire workspace

ForgeGate should avoid falsely attributing a workspace-level pass to every component. Attribution should use:

- Explicit component IDs in results
- Test-to-component mappings
- Story IDs
- Source coverage where appropriate
- User-confirmed mappings
- Conservative unknown scope when attribution is unclear

## Parallel execution

Future versions may run independent gates in parallel, but the initial version should prioritize predictable behavior and readable logs.

Parallel execution must respect:

- CPU and memory limits
- Shared ports
- Storybook startup dependencies
- Database or test-environment conflicts
- Cancellation
- Artifact path collisions

## Dependency graph

Some gates depend on others:

```text
Install/configuration
  → Build
  → Storybook start
  → Storybook interaction and axe
  → Visual or browser tests
  → Evidence normalization
  → Policy evaluation
```

The orchestration model should support prerequisites, optional dependencies, and always-run cleanup.

## Missing tools and dependencies

ForgeGate should distinguish:

- Gate not configured
- Tool not installed
- Command not found
- Unsupported version
- Dependency installation required
- Storybook unavailable
- Provider authentication missing

The product should offer guidance but should not install packages or modify configuration without approval and a diff.

## CI import

ForgeGate should eventually import evidence produced in CI:

- GitHub Actions artifacts and checks
- GitLab artifacts
- Azure DevOps artifacts
- Jenkins reports
- Generic evidence package

Imported results must match the component commit and policy context.

## Test adapter quality

Each adapter should include fixtures for:

- Passing run
- Failing run
- Partial run
- Cancelled run
- Timed-out run
- Malformed report
- Unsupported version
- Multiple components
- Missing artifact

## User experience

The Test Center should show:

- Required gates
- Current/stale/not-run state
- Last run
- Commit
- Duration
- Findings
- Raw output
- Run button
- Cancellation
- Reason the gate applies
- Downstream readiness impact

## Acceptance requirements

The initial orchestration milestone should normalize at least:

- One unit-test runner
- Storybook interaction results
- Axe results
- Playwright results
- Lint
- Build

It must preserve raw results and mark evidence stale after a relevant source change.

Implementation status: imported Storybook interaction, axe, and Playwright
results are normalized and raw reports are preserved. Native Jest/Vitest, lint,
build, and ForgeGate-triggered target-repository command execution are still
open, as is source-change stale-evidence invalidation.
