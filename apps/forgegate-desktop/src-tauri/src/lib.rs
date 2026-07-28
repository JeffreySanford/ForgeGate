use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Emitter;
use tauri_plugin_dialog::DialogExt;

mod command_execution;
use command_execution::CommandResult;

mod workspace_scan;
use workspace_scan::{scan_workspace, WorkspaceScan};

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct GitStatus {
    branch: String,
    commit: String,
    dirty: bool,
    /// Real, workspace-root-relative paths from `git status --porcelain`
    /// (staged and unstaged changes, plus untracked files) — the input
    /// P1.4's change-impact view needs to cross-reference against each
    /// component's own `sourceFiles`. Deliberately not `git diff` against
    /// a specific commit range (that answers a different, larger question
    /// — "what changed since X" — this answers "what's different from
    /// HEAD right now", matching what `dirty` already reports as a
    /// boolean).
    changed_files: Vec<String>,
}

/// Parses `git status --porcelain` output into a real, ordered list of
/// changed paths. Each line is `XY PATH` (two status characters, a space,
/// then the path), except renames/copies (`R  old -> new`), where only
/// the new path is kept — the new path is what a component's own
/// `sourceFiles` would actually match today. Malformed lines (should not
/// happen from real git output, but a truncated line short enough to
/// have no path is possible in principle) are skipped rather than
/// panicking.
fn parse_changed_files(porcelain_status: &str) -> Vec<String> {
    porcelain_status
        .lines()
        .filter_map(|line| {
            let path_part = line.get(3..)?;
            let path = path_part.rsplit(" -> ").next().unwrap_or(path_part);
            let trimmed = path.trim();
            (!trimmed.is_empty()).then(|| trimmed.to_string())
        })
        .collect()
}

/// Opens the native folder picker and returns the selected absolute path, if any.
/// This is the only way a workspace path enters the application; there is no
/// free-text path entry exposed to the webview.
#[tauri::command]
async fn select_workspace(app: tauri::AppHandle) -> Option<String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog().file().pick_folder(move |folder| {
        let _ = tx.send(folder);
    });
    rx.recv()
        .ok()
        .flatten()
        .and_then(|f| f.into_path().ok())
        .map(|p| p.display().to_string())
}

/// Rejects relative paths and paths that do not resolve to a real directory,
/// so downstream commands never shell out against an unvalidated string.
fn resolve_workspace_path(path: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(path);
    if !candidate.is_absolute() {
        return Err("Workspace path must be absolute".to_string());
    }
    let canonical = candidate
        .canonicalize()
        .map_err(|_| "Workspace path does not exist".to_string())?;
    if !canonical.is_dir() {
        return Err("Workspace path is not a directory".to_string());
    }
    Ok(canonical)
}

/// A `.git` entry can be a directory (an ordinary repository) or a file (a
/// worktree or submodule pointer); either counts as "this is a Git repository".
fn is_git_repository(workspace: &std::path::Path) -> bool {
    workspace.join(".git").exists()
}

#[tauri::command]
fn read_git_status(path: String) -> Result<GitStatus, String> {
    let workspace = resolve_workspace_path(&path)?;
    if !is_git_repository(&workspace) {
        return Err(format!("{} is not a Git repository", workspace.display()));
    }

    let run_git = |args: &[&str]| -> Result<String, String> {
        let output = Command::new("git")
            .arg("-C")
            .arg(&workspace)
            .args(args)
            .output()
            .map_err(|error| format!("Failed to run git: {error}"))?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    };

    let branch = run_git(&["rev-parse", "--abbrev-ref", "HEAD"])?;
    let commit = run_git(&["rev-parse", "HEAD"])?;
    let status = run_git(&["status", "--porcelain"])?;

    Ok(GitStatus {
        branch,
        commit,
        dirty: !status.is_empty(),
        changed_files: parse_changed_files(&status),
    })
}

#[tauri::command]
fn read_workspace_scan(path: String) -> Result<WorkspaceScan, String> {
    let workspace = resolve_workspace_path(&path)?;
    scan_workspace(&workspace)
}

/// Returns the raw text of `.forgegate/config.yaml`, or `None` if the
/// workspace has not been configured yet — that is a normal, expected
/// state, not an error. Parsing and schema validation happen in
/// `@forgegate/core-config` on the TypeScript side, per the architecture
/// split in documentation/02-system-architecture.md: Rust owns the
/// privileged filesystem read only, not the config's business logic.
#[tauri::command]
fn read_repository_config_file(path: String) -> Result<Option<String>, String> {
    let workspace = resolve_workspace_path(&path)?;
    let config_path = workspace.join(".forgegate").join("config.yaml");
    if !config_path.is_file() {
        return Ok(None);
    }
    fs::read_to_string(&config_path)
        .map(Some)
        .map_err(|error| format!("Failed to read {}: {error}", config_path.display()))
}

/// Resolves a path relative to an already-validated workspace root, and
/// requires the result to canonicalize to somewhere still inside that root
/// — so a `relative` containing `..` cannot escape the workspace, even
/// though the workspace itself was already user-approved via the folder
/// picker. Shared by every command that reads or runs something at a
/// workspace-relative location.
fn resolve_relative_path_within_workspace(
    workspace: &std::path::Path,
    relative: &str,
) -> Result<PathBuf, String> {
    let candidate = workspace.join(relative);
    let resolved = candidate
        .canonicalize()
        .map_err(|_| format!("{relative} does not exist in this workspace"))?;
    if !resolved.starts_with(workspace) {
        return Err(format!("{relative} resolves outside the workspace"));
    }
    Ok(resolved)
}

/// Reads any text file inside the workspace, given a path relative to it —
/// used for scan-discovered files like a Custom Elements Manifest whose
/// exact location varies per project.
#[tauri::command]
fn read_text_file(workspace_path: String, relative_path: String) -> Result<String, String> {
    let workspace = resolve_workspace_path(&workspace_path)?;
    let resolved = resolve_relative_path_within_workspace(&workspace, &relative_path)?;
    if !resolved.is_file() {
        return Err(format!("{relative_path} is not a file"));
    }
    fs::read_to_string(&resolved).map_err(|error| format!("Failed to read {relative_path}: {error}"))
}

/// Tracks the currently running `run_workspace_command` invocation, if
/// any, so `cancel_workspace_command` can signal it. Keyed by a monotonic
/// id rather than just the flag alone so a slow-to-clean-up run can never
/// clobber a newer run's entry (see the id check in `run_workspace_command`).
/// Signalling a flag the running loop itself polls — rather than killing a
/// remembered process ID directly — avoids a real (if rare) correctness
/// bug: a PID can be reused by the OS after the original process exits.
#[derive(Default)]
struct RunningCommand(Mutex<Option<(u64, Arc<AtomicBool>)>>);

static NEXT_COMMAND_ID: AtomicU64 = AtomicU64::new(1);

/// Payload for the `workspace-command-output` event emitted once per line
/// of live stdout/stderr — see `command_execution::LineSink`'s doc comment
/// for what "live" does and doesn't redact. `run_id` lets a listener that
/// starts late or overlaps a superseded run recognize which lines are
/// actually its own; today's one real caller (CEM generation) only ever
/// has one run active at a time and doesn't filter by it, which is an
/// honest simplification, not a fabricated guarantee that multiple
/// concurrent runs are supported.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandOutputLine {
    run_id: u64,
    stream: &'static str,
    line: String,
}

/// Runs one specific, caller-supplied command and argument list — never a
/// shell string, so there is no shell-injection surface — inside a
/// workspace-relative working directory, with a hard timeout, streaming
/// each output line to `on_line` as it arrives. The UI is responsible for
/// showing the resolved command to the user and requiring an explicit
/// approval click before ever invoking this, per the "Command execution
/// flow" in documentation/02-system-architecture.md.
///
/// Split from the `#[tauri::command]` wrapper below so tests can call this
/// directly with a plain `&RunningCommand` — a `tauri::State` cannot be
/// constructed outside of a running app, so the thin wrapper is the only
/// piece that actually needs Tauri's IPC machinery.
async fn run_workspace_command_inner(
    workspace_path: String,
    relative_cwd: String,
    command: String,
    args: Vec<String>,
    timeout_seconds: u64,
    running: &RunningCommand,
    id: u64,
    on_line: Arc<command_execution::LineSink>,
) -> Result<CommandResult, String> {
    let workspace = resolve_workspace_path(&workspace_path)?;
    let cwd = resolve_relative_path_within_workspace(&workspace, &relative_cwd)?;
    if !cwd.is_dir() {
        return Err(format!("{relative_cwd} is not a directory"));
    }

    let cancel = Arc::new(AtomicBool::new(false));
    *running.0.lock().unwrap() = Some((id, cancel.clone()));

    let command_for_artifact = command.clone();
    let args_for_artifact = args.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        command_execution::run_command(
            &cwd,
            &command,
            &args,
            Duration::from_secs(timeout_seconds),
            &cancel,
            on_line,
        )
    })
    .await
    .map_err(|error| format!("Command worker failed: {error}"))?;

    let mut guard = running.0.lock().unwrap();
    if guard.as_ref().map(|(current_id, _)| *current_id) == Some(id) {
        *guard = None;
    }
    drop(guard);

    result.map(|mut command_result| {
        command_result.artifact_path =
            write_command_artifact(id, &command_for_artifact, &args_for_artifact, &command_result);
        command_result
    })
}

/// Persists a redacted copy of a finished command's result to a
/// ForgeGate-owned artifact file, so it survives beyond the in-memory
/// `CommandResult` the frontend holds for this one session — a real first
/// step toward evidence export (tracked as its own, separate P1 backlog
/// item). Deliberately does **not** write inside the target workspace: the
/// CEM-generation approval preview the user actually clicked only shows
/// and consents to the analyzer command itself (its working directory,
/// glob, exclusions, output path) — silently also writing a second file
/// into their repository would be an undisclosed side effect the approval
/// never covered. Uses the OS temp directory instead, a known, honestly
/// documented limitation (not yet a durable per-workspace location —
/// tracked as real follow-up work, not silently accepted). Best-effort: a
/// write failure does not fail the command itself — the actual command
/// result matters more to the user than whether it could also be filed
/// away, so this returns `None` on any error rather than propagating one.
///
/// `command`/`args` are redacted the same way `stdout`/`stderr` already
/// are: a literal secret can just as easily arrive as a CLI argument
/// (`--token=...`) as in a program's own output, and the artifact would
/// otherwise leak it even though the captured output next to it is clean.
fn write_command_artifact(id: u64, command: &str, args: &[String], result: &CommandResult) -> Option<String> {
    let artifacts_dir = std::env::temp_dir().join("forgegate-artifacts");
    fs::create_dir_all(&artifacts_dir).ok()?;

    let redacted_args: Vec<String> = args.iter().map(|arg| command_execution::redact_secrets(arg)).collect();
    let artifact = serde_json::json!({
        "id": id,
        "command": command_execution::redact_secrets(command),
        "args": redacted_args,
        "exitCode": result.exit_code,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "timedOut": result.timed_out,
        "cancelled": result.cancelled,
        "durationMs": result.duration_ms,
    });

    let path = artifacts_dir.join(format!("{id}.json"));
    fs::write(&path, serde_json::to_vec_pretty(&artifact).ok()?).ok()?;
    Some(path.display().to_string())
}

#[tauri::command]
async fn run_workspace_command(
    workspace_path: String,
    relative_cwd: String,
    command: String,
    args: Vec<String>,
    timeout_seconds: u64,
    running: tauri::State<'_, RunningCommand>,
    app: tauri::AppHandle,
) -> Result<CommandResult, String> {
    let id = NEXT_COMMAND_ID.fetch_add(1, Ordering::SeqCst);
    let on_line: Arc<command_execution::LineSink> = Arc::new(move |is_stderr, line| {
        let _ = app.emit(
            "workspace-command-output",
            CommandOutputLine {
                run_id: id,
                stream: if is_stderr { "stderr" } else { "stdout" },
                line: line.to_string(),
            },
        );
    });
    run_workspace_command_inner(
        workspace_path,
        relative_cwd,
        command,
        args,
        timeout_seconds,
        &running,
        id,
        on_line,
    )
    .await
}

/// Requests cancellation of whatever command `run_workspace_command` is
/// currently running. Returns whether a running command was actually found
/// and signalled, so the UI can tell "cancel took effect" apart from
/// "nothing was running to cancel" (e.g. it had already finished).
#[tauri::command]
fn cancel_workspace_command(running: tauri::State<'_, RunningCommand>) -> bool {
    match running.0.lock().unwrap().as_ref() {
        Some((_, cancel)) => {
            cancel.store(true, Ordering::SeqCst);
            true
        }
        None => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn no_op_line_sink() -> Arc<command_execution::LineSink> {
        Arc::new(|_, _| {})
    }

    #[test]
    fn rejects_relative_paths() {
        assert!(resolve_workspace_path("relative/path").is_err());
    }

    #[test]
    fn rejects_nonexistent_paths() {
        let missing = std::env::temp_dir().join("forgegate-nonexistent-test-path");
        assert!(resolve_workspace_path(&missing.display().to_string()).is_err());
    }

    #[test]
    fn accepts_an_existing_directory() {
        let dir = std::env::temp_dir();
        assert!(resolve_workspace_path(&dir.display().to_string()).is_ok());
    }

    #[test]
    fn reports_a_clean_not_a_git_repository_error_for_a_plain_folder() {
        let dir = std::env::temp_dir().join(format!("forgegate-not-a-repo-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("should create temp dir");

        let error = read_git_status(dir.display().to_string())
            .expect_err("a plain folder with no .git should be rejected");
        assert!(error.contains("is not a Git repository"));

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn returns_none_when_no_repository_config_exists() {
        let dir = std::env::temp_dir().join(format!("forgegate-no-config-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("should create temp dir");

        let result = read_repository_config_file(dir.display().to_string())
            .expect("reading an absent config file should not itself be an error");
        assert!(result.is_none());

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn reads_repository_config_file_contents_when_present() {
        let dir = std::env::temp_dir().join(format!("forgegate-with-config-{}", std::process::id()));
        let forgegate_dir = dir.join(".forgegate");
        std::fs::create_dir_all(&forgegate_dir).expect("should create .forgegate dir");
        std::fs::write(forgegate_dir.join("config.yaml"), "configVersion: 0.1.0\n").unwrap();

        let result = read_repository_config_file(dir.display().to_string())
            .expect("reading an existing config file should succeed");
        assert_eq!(result, Some("configVersion: 0.1.0\n".to_string()));

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn reads_a_text_file_relative_to_the_workspace() {
        let dir = std::env::temp_dir().join(format!("forgegate-read-text-{}", std::process::id()));
        let nested = dir.join("dist");
        std::fs::create_dir_all(&nested).expect("should create nested dir");
        std::fs::write(nested.join("custom-elements.json"), "{\"schemaVersion\":\"1.0.0\"}").unwrap();

        let result = read_text_file(dir.display().to_string(), "dist/custom-elements.json".to_string())
            .expect("reading a file inside the workspace should succeed");
        assert_eq!(result, "{\"schemaVersion\":\"1.0.0\"}");

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn rejects_a_relative_path_that_escapes_the_workspace() {
        let dir = std::env::temp_dir().join(format!("forgegate-read-text-escape-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("should create temp dir");

        let error = read_text_file(dir.display().to_string(), "../../etc/passwd".to_string())
            .expect_err("a path escaping the workspace must be rejected");
        assert!(error.contains("does not exist") || error.contains("resolves outside"));

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn rejects_a_relative_path_that_does_not_exist() {
        let dir = std::env::temp_dir().join(format!("forgegate-read-text-missing-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("should create temp dir");

        let error = read_text_file(dir.display().to_string(), "does-not-exist.json".to_string())
            .expect_err("a missing file must be rejected");
        assert!(error.contains("does not exist"));

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn runs_an_approved_command_in_the_workspace() {
        let result = tauri::async_runtime::block_on(run_workspace_command_inner(
            std::env::temp_dir().display().to_string(),
            ".".to_string(),
            "git".to_string(),
            vec!["--version".to_string()],
            10,
            &RunningCommand::default(),
            1,
            no_op_line_sink(),
        ))
        .expect("running git --version in the temp dir should succeed");
        assert_eq!(result.exit_code, Some(0));
    }

    #[test]
    fn persists_a_real_artifact_file_for_a_finished_command() {
        let id = 9_001;
        let result = tauri::async_runtime::block_on(run_workspace_command_inner(
            std::env::temp_dir().display().to_string(),
            ".".to_string(),
            "git".to_string(),
            vec!["--version".to_string()],
            10,
            &RunningCommand::default(),
            id,
            no_op_line_sink(),
        ))
        .expect("running git --version in the temp dir should succeed");

        let artifact_path = result
            .artifact_path
            .as_ref()
            .expect("a successful run should persist an artifact");
        let contents = std::fs::read_to_string(artifact_path).expect("artifact file should exist and be readable");
        let artifact: serde_json::Value =
            serde_json::from_str(&contents).expect("artifact should be valid JSON");

        assert_eq!(artifact["id"], id);
        assert_eq!(artifact["command"], "git");
        assert_eq!(artifact["exitCode"], 0);
        assert!(artifact["stdout"].as_str().unwrap().to_lowercase().contains("git version"));

        std::fs::remove_file(artifact_path).ok();
    }

    #[test]
    fn a_secret_in_command_output_is_redacted_in_the_persisted_artifact_too() {
        let id = 9_002;
        let (command, args) = echo_command_for_artifact_test("MY_SECRET_TOKEN=abc123def456");

        let result = tauri::async_runtime::block_on(run_workspace_command_inner(
            std::env::temp_dir().display().to_string(),
            ".".to_string(),
            command.to_string(),
            args,
            10,
            &RunningCommand::default(),
            id,
            no_op_line_sink(),
        ))
        .expect("echoing a line should succeed");

        let artifact_path = result.artifact_path.expect("a successful run should persist an artifact");
        let contents = std::fs::read_to_string(&artifact_path).expect("artifact file should exist and be readable");

        assert!(contents.contains("MY_SECRET_TOKEN=***REDACTED***"));
        assert!(!contents.contains("abc123def456"));

        std::fs::remove_file(&artifact_path).ok();
    }

    /// `echo` is a `cmd.exe` builtin on Windows, but `build_command` in
    /// `command_execution.rs` already wraps every command with `cmd /C`
    /// there, so passing `"echo"` straight through works on both platforms.
    fn echo_command_for_artifact_test(text: &str) -> (&'static str, Vec<String>) {
        ("echo", vec![text.to_string()])
    }

    #[test]
    fn rejects_a_working_directory_that_escapes_the_workspace() {
        let dir = std::env::temp_dir().join(format!("forgegate-run-cmd-escape-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("should create temp dir");

        let error = tauri::async_runtime::block_on(run_workspace_command_inner(
            dir.display().to_string(),
            "..".to_string(),
            "git".to_string(),
            vec!["--version".to_string()],
            10,
            &RunningCommand::default(),
            2,
            no_op_line_sink(),
        ))
        .expect_err("a working directory outside the workspace must be rejected");
        assert!(error.contains("resolves outside"));

        std::fs::remove_dir_all(&dir).ok();
    }

    #[cfg(windows)]
    fn slow_command() -> (&'static str, Vec<String>) {
        (
            "powershell",
            vec![
                "-NoProfile".to_string(),
                "-Command".to_string(),
                "Start-Sleep -Seconds 5".to_string(),
            ],
        )
    }

    #[cfg(not(windows))]
    fn slow_command() -> (&'static str, Vec<String>) {
        ("sleep", vec!["5".to_string()])
    }

    /// End-to-end test of the actual cancellation mechanism `run_workspace_command`
    /// and `cancel_workspace_command` share: starts a slow command through
    /// `run_workspace_command_inner`, then — on a separate thread, mimicking a
    /// second concurrent IPC call — reaches into the same `RunningCommand`
    /// registry `cancel_workspace_command` would use and signals it. Confirms
    /// the run reports `cancelled: true` and returns promptly rather than
    /// waiting out its own 30s timeout.
    #[test]
    fn cancelling_a_running_command_through_the_shared_registry_stops_it_promptly() {
        let cwd = std::env::temp_dir();
        let (command, args) = slow_command();
        let running = Arc::new(RunningCommand::default());
        let running_for_canceller = running.clone();

        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(200));
            // Same lookup-and-signal logic as cancel_workspace_command's body.
            if let Some((_, cancel)) = running_for_canceller.0.lock().unwrap().as_ref() {
                cancel.store(true, Ordering::SeqCst);
            }
        });

        let result = tauri::async_runtime::block_on(run_workspace_command_inner(
            cwd.display().to_string(),
            ".".to_string(),
            command.to_string(),
            args,
            30,
            &running,
            3,
            no_op_line_sink(),
        ))
        .expect("starting the slow command should succeed even though it will be cancelled");

        assert!(result.cancelled);
        assert_eq!(result.exit_code, None);
        assert!(
            result.duration_ms < 5000,
            "should stop promptly once cancelled, not wait out its own 30s timeout"
        );
    }

    #[test]
    fn streams_output_lines_through_run_workspace_command_inner_as_the_real_command_runs() {
        let lines: Arc<Mutex<Vec<(u64, String)>>> = Arc::new(Mutex::new(Vec::new()));
        let collector = lines.clone();
        let on_line: Arc<command_execution::LineSink> = Arc::new(move |_is_stderr, line| {
            collector.lock().unwrap().push((4, line.to_string()));
        });

        let result = tauri::async_runtime::block_on(run_workspace_command_inner(
            std::env::temp_dir().display().to_string(),
            ".".to_string(),
            "git".to_string(),
            vec!["--version".to_string()],
            10,
            &RunningCommand::default(),
            4,
            on_line,
        ))
        .expect("running git --version in the temp dir should succeed");

        assert_eq!(result.exit_code, Some(0));
        let captured = lines.lock().unwrap();
        assert!(!captured.is_empty(), "expected at least one streamed line from a real git --version run");
        assert!(captured.iter().any(|(run_id, line)| *run_id == 4 && line.to_lowercase().contains("git version")));
    }

    #[test]
    fn reads_git_status_of_the_forgegate_repository() {
        // CARGO_MANIFEST_DIR is .../apps/forgegate-desktop/src-tauri; the
        // repository root is three levels up.
        let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        let repo_root = manifest_dir
            .ancestors()
            .nth(3)
            .expect("repository root should exist")
            .to_path_buf();

        let status = read_git_status(repo_root.display().to_string())
            .expect("git status should succeed against the ForgeGate repository");

        assert!(!status.branch.is_empty());
        assert_eq!(status.commit.len(), 40);
    }

    #[test]
    fn parses_modified_added_untracked_and_renamed_porcelain_lines() {
        let porcelain = " M apps/forgegate-desktop/src-tauri/src/lib.rs\nA  apps/new-file.ts\n?? apps/untracked.ts\nR  apps/old-name.ts -> apps/new-name.ts\n";

        let changed_files = parse_changed_files(porcelain);

        assert_eq!(
            changed_files,
            vec![
                "apps/forgegate-desktop/src-tauri/src/lib.rs",
                "apps/new-file.ts",
                "apps/untracked.ts",
                "apps/new-name.ts",
            ]
        );
    }

    #[test]
    fn returns_an_empty_list_for_a_clean_working_tree() {
        assert!(parse_changed_files("").is_empty());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(RunningCommand::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            select_workspace,
            read_git_status,
            read_workspace_scan,
            read_repository_config_file,
            read_text_file,
            run_workspace_command,
            cancel_workspace_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
