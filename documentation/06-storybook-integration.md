# ForgeGate Storybook Integration

## Role of Storybook

Storybook is the primary isolated rendering and component-state workbench in ForgeGate. It is not the final authority for component readiness.

ForgeGate should use Storybook to:

- Discover stories
- Preview component states
- Read story and component metadata
- Run interaction tests
- Run or collect accessibility checks
- Link visual-review providers
- Support documentation examples

ForgeGate adds requirements, policy, manual review, cross-tool evidence, freshness, consumer validation, and release decisions.

## Supported Storybook sources

ForgeGate should support:

- A local Storybook development server
- A locally built static Storybook
- A hosted Storybook URL
- Multiple Storybooks in one monorepo
- Storybooks protected by organization authentication where a secure integration is possible

## Discovery

ForgeGate should detect:

- `.storybook/` directories
- Storybook dependencies and versions
- Storybook project targets in Nx or package scripts
- Static build locations
- Story file globs
- Test-runner configuration
- Accessibility addon configuration
- Visual provider configuration

The user must be able to correct or override discovery.

## Story index

Where supported, ForgeGate should read Storybook’s story index and capture:

- Story ID
- Title
- Name
- Import path
- Tags
- Component grouping
- Story type

ForgeGate must handle version differences through capability detection rather than assuming one endpoint shape forever.

**Implementation status.** `@forgegate/adapter-storybook`'s `parseStorybookIndex` reads exactly this shape (id, name, title, import path, tags, and story/docs type) from either a locally built `storybook-static/index.json` (read automatically once Storybook is detected) or, as of this pass, a real running local Storybook server's own `/index.json` — an explicit, user-triggered "Check live Storybook" action on the component detail page, done through a Rust-mediated fetch rather than a direct webview request so the app's CSP never has to widen. `describeStorybookAdapterCapabilities` declares this honestly: static and live index reads, plus story-to-component mapping, are real; interaction tests, accessibility checks, visual review, and starting Storybook are not.

## Story-to-component mapping

Automatic mapping may use:

- Explicit component manifest references
- Story title and component metadata
- Import path proximity
- Framework adapter output
- User confirmation

Mappings should be persisted in repository-controlled configuration.

ForgeGate should surface:

- Stories with no component
- Components with no stories
- Duplicate state mappings
- Manifest references to missing stories
- Stories that are excluded or internal

## Required-state coverage

A component blueprint or policy defines required states. Storybook stories satisfy those requirements.

Example:

```text
Required state        Story mapping                     Status
Default               components-button--default       Covered
Disabled              components-button--disabled      Covered
Loading               —                                 Missing
Icon only             components-button--icon-only     Covered
Forced colors         components-button--forced-colors Covered
```

A single story may satisfy multiple requirements through args or environment controls, but ForgeGate must record how the requirement is exercised.

## Preview surface

ForgeGate may embed Storybook or open it externally.

Embedded remote content must be isolated:

- No privileged Tauri commands
- No filesystem bridge
- No process bridge
- Restricted navigation
- Origin allowlist
- Clear origin display
- No automatic credential forwarding

ForgeGate should provide controls that translate into Storybook capabilities where supported:

- Story selection
- Args
- Theme
- Viewport
- Locale
- Text direction
- Reduced motion
- Forced colors
- Density

## Storybook metadata

ForgeGate may collect:

- Args and arg types
- Component descriptions
- Controls
- Parameters
- Tags
- Docs references
- Accessibility configuration
- Play function presence
- Test status metadata
- Visual review links

Metadata must be treated as discovered information, not always authoritative contract truth. The component manifest remains the reviewed contract.

## Interaction tests

ForgeGate should run the project’s supported Storybook interaction-test workflow and normalize:

- Story ID
- Test name
- Result
- Duration
- Error
- Browser/environment
- Tool versions
- Raw output
- Attachments

Interaction tests may satisfy policy requirements such as:

- Trigger activates once
- Dialog opens
- Focus enters modal
- Escape closes
- Focus returns
- Validation message appears
- Tab selection changes

## Accessibility checks

ForgeGate should collect accessibility results per story and environment.

Required distinctions:

- Violation
- Incomplete/manual-review-needed
- Pass
- Inapplicable
- Tool error
- Story unavailable

ForgeGate should preserve rule identifiers, impact, nodes, selectors or targets, help text, tool versions, and raw result files when available.

Automated success is one evidence category, not complete compliance.

## Visual review

Storybook may connect to:

- Chromatic
- Percy
- Applitools
- Loki
- Project-defined screenshot baselines

ForgeGate should normalize:

- Story and environment
- Baseline identity
- Build or review link
- Approved, changed, failed, pending, or unavailable status
- Reviewer where exposed
- Commit and build metadata

ForgeGate should not copy proprietary visual assets unless configured and permitted.

## Running Storybook

ForgeGate may offer to start a local Storybook using a configured command.

Requirements:

- Display exact command and working directory
- Require confirmation
- Stream logs
- Detect readiness URL
- Allow cancellation
- Stop only processes ForgeGate started
- Record command and tool version
- Avoid port conflicts

## Documentation relationship

Storybook remains the executable example source. ForgeGate documentation may embed or link stories but should not duplicate every Storybook feature.

Recommended separation:

- Storybook: isolated states, controls, play functions, developer-focused API
- Starlight/Zeroheight: guidance, anatomy, usage, accessibility, policy, adoption, migration
- ForgeGate: assurance record and release status

## Failure cases

ForgeGate should handle:

- Storybook not installed
- Unsupported Storybook version
- Index endpoint missing
- Storybook not running
- Static build stale
- Protected remote Storybook
- Story import failure
- Test runner unavailable
- Story mapping ambiguity
- Preview security restriction

Each failure should produce an actionable message and should not corrupt existing component records.
