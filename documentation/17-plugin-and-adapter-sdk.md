# ForgeGate Plugin and Adapter SDK

## Objective

ForgeGate cannot maintain first-party logic for every framework, workspace, testing tool, documentation platform, token system, CI provider, and organization-specific policy forever. The product needs a controlled extension model.

The first releases should ship only built-in adapters. A public or enterprise plugin SDK should follow after the core contracts and security model stabilize.

## Adapter types

### Workspace adapter

Detects repository topology, projects, package manager, commands, and dependency relationships.

### Framework adapter

Discovers components and extracts or generates framework-specific artifacts.

### Storybook adapter

Connects to Storybook versions and normalizes story metadata and test capabilities.

### Test adapter

Runs or imports tool output and produces normalized evidence.

### Token adapter

Reads design-token formats and maps token usage.

### Documentation adapter

Generates, validates, and publishes documentation.

### Version-control adapter

Reads repository identity, status, diffs, and history. Git is the initial implementation.

### CI adapter

Imports evidence or publishes status to CI systems.

### Organization adapter

Provides private blueprints, procedures, policy bundles, or internal integrations.

## SDK design principles

- Explicit capabilities
- Versioned contracts
- No implicit privileged access
- Deterministic fixtures
- Clear provenance
- Graceful partial support
- No adapter may redefine core release semantics silently
- User and organization control over installation and activation

## Base adapter contract

```ts
interface ForgeGateAdapter {
  id: string;
  version: string;
  sdkVersion: string;
  displayName: string;
  capabilities: AdapterCapabilities;

  detect(context: DetectionContext): Promise<DetectionResult>;
  validateConfiguration(config: unknown): ValidationResult;
  diagnose(context: AdapterContext): Promise<Diagnostic[]>;
}
```

Specialized interfaces extend the base contract.

## Capability declaration

Capabilities should be structured rather than descriptive prose.

```ts
interface AdapterCapabilities {
  filesystem: 'none' | 'read' | 'write-proposed';
  processExecution: boolean;
  networkOrigins: string[];
  credentialKeys: string[];
  discovery: string[];
  generation: string[];
  evidenceFormats: string[];
}
```

The runtime compares requested capabilities with user and organization policy.

## Adapter isolation

Possible maturity stages:

1. Built-in adapters compiled with ForgeGate.
2. Signed first-party adapters loaded from a controlled registry.
3. Signed organization adapters with declared capabilities.
4. Community adapters in a restricted process or sandbox.

Arbitrary Node.js packages loaded into the privileged desktop process should not be the default plugin model.

## Adapter registry

A registry record may include:

- Adapter ID
- Version
- Publisher
- Signature
- Supported ForgeGate SDK range
- Supported tool/framework versions
- Capabilities
- Package checksum
- Release notes
- Security advisories

## Compatibility

ForgeGate should evaluate:

- SDK compatibility
- Framework or tool version compatibility
- Operating-system compatibility
- Required capabilities
- Organization allowlist

Unsupported adapters should remain disabled with explanation.

## Fixtures and conformance tests

Every adapter should provide fixtures covering:

- Positive detection
- Negative detection
- Minimal supported project
- Complex monorepo
- Unsupported version
- Malformed input
- Partial metadata
- Expected normalized output
- Security boundary behavior

ForgeGate should provide an adapter conformance test harness.

## Generation adapters

Generation is higher risk than discovery.

Generation adapters must:

- Produce files in a temporary output directory
- Declare intended target paths
- Avoid direct repository writes
- Produce deterministic output for the same input and template version
- Include template and adapter version
- Support dry run
- Provide validation commands

## Test adapters

Test adapters should separate:

- Execution definition
- Result parser
- Artifact collector
- Component attribution
- Version compatibility

A parser should be testable without running the external tool.

## Documentation adapters

Documentation adapters should define:

- Detection
- Target configuration
- Supported content operations
- Protected-content strategy
- Validation command
- Publication evidence
- Capability limitations

## Organization policy

Organizations may require:

- Approved publishers
- Signed adapters
- No network access
- No process execution
- Specific adapter versions
- Offline registry
- Manual security review

## Diagnostics

Adapter diagnostics should be visible in the desktop UI:

- Loaded version
- Detected target version
- Capabilities
- Configuration
- Last execution
- Warnings
- Unsupported features
- Raw diagnostic export

## SDK roadmap

The SDK should not be finalized until:

- The Angular vertical slice is complete.
- At least one non-Angular adapter is implemented.
- Storybook and Starlight adapters have real-world use.
- Evidence schemas are stable enough for CI.
- Security boundaries have been threat modeled.

Premature SDK stability would preserve the wrong abstractions.
