# ForgeGate Desktop Security

## Security objective

ForgeGate needs access to sensitive local capabilities: source code, filesystem writes, child processes, Git, credentials, browser previews, and external services. Security is therefore part of the core product, not a later hardening task.

## Trust boundaries

### Trusted only after user selection

- Local workspace path
- Repository configuration
- Approved command definitions
- Approved write locations

Even selected repositories may contain malicious files or scripts. Selection grants scoped access, not trust in repository content.

### Untrusted content

- Remote Storybook
- Local Storybook rendering customer components
- Generated HTML reports
- Zeroheight content
- Markdown and MDX previews
- Adapter packages
- Test output containing terminal control sequences
- Repository configuration submitted by third parties

## Tauri capability model

The application should define separate capabilities for:

- Folder selection
- Read-only workspace scanning
- Reading configured text files
- Writing approved paths
- Running approved commands
- Reading Git metadata
- Credential-vault access
- Network requests to configured origins
- Application updates

Remote preview webviews must receive no privileged commands.

**Implementation status — network requests to configured origins.** One real command exists: `fetch_live_storybook_index` (`apps/forgegate-desktop/src-tauri/src/storybook.rs`), which queries a running local Storybook server's own `/index.json`. Its origin is restricted at the Rust level, not merely by convention — `is_safe_local_storybook_origin` accepts only a real `http://localhost:<port>` or `http://127.0.0.1:<port>` origin, rejecting any remote host, path, query string, or non-HTTP scheme before a connection is even attempted. Done specifically so the webview's own CSP (`connect-src 'self' ipc: http://ipc.localhost`) never has to widen to allow arbitrary localhost ports — the frontend never makes this request directly. No credentials are attached, and the response is returned to the frontend as plain JSON text, never rendered as a webview (that distinction matters: this is a data fetch, not a "remote preview" in this doc's sense).

## Filesystem access

Requirements:

- Restrict access to user-selected workspaces and explicit application data directories.
- Normalize and validate paths.
- Prevent traversal outside the workspace.
- Handle symlinks safely.
- Distinguish read permission from write permission.
- Maintain an allowlist of write roots.
- Use temporary files and atomic replacement where practical.
- Show diffs before writes.
- Back up files before migrations or complex transforms.

## Process execution

ForgeGate should execute only configured and user-approved commands.

Requirements:

- No generic shell string by default.
- Separate executable and argument arrays.
- Display resolved executable, arguments, and working directory.
- Restrict environment-variable overrides.
- Redact secrets.
- Stream output safely.
- Escape terminal control sequences in UI display.
- Support timeout and cancellation.
- Track process trees so cleanup stops only processes ForgeGate started.
- Never elevate privileges automatically.

## Repository configuration risk

A malicious repository could define a destructive command.

Mitigations:

- Treat new or changed command configuration as untrusted.
- Display a warning when configuration changes.
- Require explicit approval per command or trusted workspace policy.
- Support read-only workspace mode.
- Record command approvals.
- Allow organization policy to prohibit specific executables or arguments.

## Remote preview isolation

Storybook previews may execute arbitrary customer JavaScript.

Requirements:

- Dedicated webview or external browser.
- No Tauri bridge.
- No inherited local file privileges.
- No unrestricted navigation.
- Origin allowlist.
- No clipboard, camera, microphone, or download privileges unless explicitly required.
- Clear origin and trust indicator.
- Ability to open externally when embedding is unsafe.

## Credentials

Credentials may include:

- Zeroheight token
- Visual-testing provider token
- Git provider token
- Enterprise license
- CI service credentials

Requirements:

- Store in OS credential vault.
- Never commit credentials.
- Never include credentials in exported evidence.
- Redact logs.
- Minimize scopes.
- Support revocation and removal.
- Keep credentials unavailable to preview content.

## Adapter security

Adapters may parse source, run tools, or generate files.

Initial releases should ship only built-in adapters. A future plugin system needs:

- Signed packages
- Declared capabilities
- Version compatibility
- Isolated execution where practical
- Provenance
- User approval
- Organization allowlists
- Update integrity

## Markdown and MDX

Generated or imported documentation may contain executable MDX.

ForgeGate should:

- Avoid executing arbitrary MDX in privileged contexts.
- Use safe parsing for preview.
- Restrict custom imports.
- Show raw content when safe rendering is uncertain.
- Treat documentation build commands like any other approved command.

## Evidence and privacy

Evidence can expose:

- Source paths
- Internal URLs
- User identities
- Screenshots with sensitive data
- Application state
- Test credentials
- Stack traces

ForgeGate should provide:

- Pre-export review
- Redaction
- Configurable inclusion rules
- Local-only mode
- Retention controls
- Checksums
- Clear warning before uploading or publishing

## Application update security

Commercial packaging should include:

- Signed releases
- Verified update metadata
- Rollback strategy
- Release notes
- Ability to disable automatic update checks in restricted environments
- Offline installer verification

## Threat-model scenarios

### Malicious Storybook

Attempt: remote story invokes a desktop command.

Mitigation: preview has no privileged bridge.

### Malicious repository command

Attempt: `.forgegate/config.yaml` runs destructive script.

Mitigation: command is untrusted, displayed, and requires approval; organization policies may deny it.

### Path traversal

Attempt: generated output writes outside the workspace.

Mitigation: canonical path validation and scoped write roots.

### Secret leakage

Attempt: token appears in process output and evidence package.

Mitigation: secret redaction, evidence review, and vault isolation.

### Adapter compromise

Attempt: third-party adapter reads unrelated files.

Mitigation: signed built-in adapters initially; future adapters require declared capabilities and isolation.

## Security acceptance criteria for MVP

- Remote Storybook cannot call Tauri commands.
- Workspace access is scoped.
- Process execution requires visible approval.
- File writes require a diff and explicit approval.
- Secrets are stored outside repository files.
- Logs redact configured secret values.
- Evidence export excludes credentials.
- Security tests cover path traversal, preview isolation, command validation, and log redaction.
