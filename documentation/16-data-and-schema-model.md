# ForgeGate Data and Schema Model

## Objective

ForgeGate needs a portable data model that works across desktop, CI, frameworks, repositories, and documentation targets. The schemas must be strict enough to support reliable policy evaluation and flexible enough to support adapter extensions.

## Primary entities

### Workspace

Represents one opened repository or monorepo context.

Key fields:

- ID
- Path
- Repository identity
- Branch and commit
- Package manager
- Workspace manager
- Configuration version
- Projects
- Adapter selections

### Project

Represents an application, library, documentation site, Storybook, test project, or infrastructure project within a workspace.

### Package

Represents a distributable or internal package with name, version, exports, dependencies, and component membership.

### Component

Represents stable component identity independent of one test run or release.

### ComponentVersion

Represents a versioned implementation and contract at a commit or package version.

### ComponentContract

Represents inputs, outputs, events, children, slots, methods, parts, properties, semantics, and framework extensions.

### Blueprint

Represents framework-neutral completion requirements for a component type.

### Policy

Represents inherited rules defining required gates, evidence, reviewers, thresholds, documentation, and release behavior.

### StoryReference

Links a component state or example to Storybook.

### TestRequirement

Defines a required gate and scope.

### TestExecution

Records one tool execution and its raw artifacts.

### AssuranceResult

Normalized result used by policy evaluation.

### ManualProcedure

Versioned sequence of human test steps.

### ManualReview

One execution of a manual procedure in a specific environment.

### Finding

A defect, incomplete result, or policy concern requiring disposition.

### Exception

An approved deviation or accepted risk.

### Approval

An authorized decision attached to scope, evidence, policy, and version.

### DocumentationPublication

Records target, path or ID, version, status, date, and publication result.

### ConsumerScenario

Represents application-context validation for a component.

### ReleaseDecision

Represents the final policy evaluation and authorized release state.

### EvidencePackage

Represents an exported, integrity-checked collection of records and artifacts.

## Identifier strategy

Identifiers should be stable and deterministic where possible.

Examples:

```text
workspace: local hash or configured ID
component: organization.library.component
story: Storybook story ID
procedure: blueprint.component.review.environment
finding: generated UUID
execution: generated UUID
release decision: generated UUID
```

A display name may change without changing identity.

## Schema families

ForgeGate should publish versioned schemas for:

- Workspace configuration
- Component manifest
- Blueprint
- Policy
- Compliance profile
- Manual procedure
- Automated evidence
- Manual review
- Finding
- Exception
- Release decision
- Evidence package manifest
- Adapter capability declaration

## Schema versioning

Schema versions should use semantic versioning principles:

- Patch: clarification or compatible constraint correction
- Minor: backward-compatible optional fields or capabilities
- Major: incompatible structural or semantic change

Every file should include its schema version.

## Unknown and unsupported values

The model must distinguish:

- Value is absent
- Value is unknown
- Adapter does not support extraction
- Requirement is not applicable
- Requirement is inherited
- Value was inferred
- Value was explicitly confirmed

Using `null` for all of these would be inadequate.

Suggested metadata:

```json
{
  "value": null,
  "state": "unsupported",
  "source": "framework.react",
  "reason": "Polymorphic generic props could not be resolved"
}
```

## Provenance

Important fields should carry provenance where discovery or transformation occurs:

- Source adapter
- Adapter version
- Source file or endpoint
- Extraction timestamp
- Confidence
- User confirmation
- Transformation history

## Local database

SQLite tables may include:

- workspaces
- projects
- scan_snapshots
- components_index
- adapter_results
- command_runs
- evidence_cache
- review_drafts
- remote_metadata_cache
- user_preferences

The database should store references to repository records rather than duplicate authoritative data without reconciliation.

## File fingerprints

Freshness calculations may use:

- Git commit SHA
- Blob SHA
- Content hash
- Dependency graph
- Policy hash
- Procedure hash
- Adapter version

Dirty worktrees require a deterministic fingerprint of relevant files.

## Migrations

Both repository schemas and SQLite need migrations.

Requirements:

- Dry run
- Backup
- Deterministic output
- Migration report
- Validation after migration
- Preservation of unknown extensions
- Rollback path where feasible

## Evidence immutability

Approved evidence should be append-oriented. Corrections should create a superseding record rather than silently modifying historical decisions.

The UI may show the current effective state while retaining history.

## Data retention

Organizations should configure:

- Raw log retention
- Screenshot and video retention
- Evidence package retention
- Cached remote metadata retention
- Personal data retention
- Review draft cleanup

## Interchange

Portable formats should support:

- Desktop export/import
- CI production
- Starlight rendering
- External report generation
- Archival
- Future API integration

JSON is preferred for evidence and machine interchange. YAML may be preferred for human-maintained manifests and policies. Markdown and HTML are presentation formats, not primary machine records.
