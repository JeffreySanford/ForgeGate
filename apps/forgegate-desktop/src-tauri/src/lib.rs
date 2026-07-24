use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;
use tauri_plugin_dialog::DialogExt;

mod command_execution;
use command_execution::CommandResult;

mod workspace_scan;
use workspace_scan::{scan_workspace, WorkspaceScan};

#[derive(Serialize, Debug)]
struct GitStatus {
    branch: String,
    commit: String,
    dirty: bool,
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

/// Runs one specific, caller-supplied command and argument list — never a
/// shell string, so there is no shell-injection surface — inside a
/// workspace-relative working directory, with a hard timeout. The UI is
/// responsible for showing the resolved command to the user and requiring
/// an explicit approval click before ever invoking this, per the "Command
/// execution flow" in documentation/02-system-architecture.md. This first
/// slice does not stream output live or support mid-run cancellation; the
/// full result is only available once the process finishes or is killed
/// for exceeding `timeout_seconds`.
#[tauri::command]
async fn run_workspace_command(
    workspace_path: String,
    relative_cwd: String,
    command: String,
    args: Vec<String>,
    timeout_seconds: u64,
) -> Result<CommandResult, String> {
    let workspace = resolve_workspace_path(&workspace_path)?;
    let cwd = resolve_relative_path_within_workspace(&workspace, &relative_cwd)?;
    if !cwd.is_dir() {
        return Err(format!("{relative_cwd} is not a directory"));
    }
    tauri::async_runtime::spawn_blocking(move || {
        command_execution::run_command(&cwd, &command, &args, Duration::from_secs(timeout_seconds))
    })
    .await
    .map_err(|error| format!("Command worker failed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

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
        let result = tauri::async_runtime::block_on(run_workspace_command(
            std::env::temp_dir().display().to_string(),
            ".".to_string(),
            "git".to_string(),
            vec!["--version".to_string()],
            10,
        ))
        .expect("running git --version in the temp dir should succeed");
        assert_eq!(result.exit_code, Some(0));
    }

    #[test]
    fn rejects_a_working_directory_that_escapes_the_workspace() {
        let dir = std::env::temp_dir().join(format!("forgegate-run-cmd-escape-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("should create temp dir");

        let error = tauri::async_runtime::block_on(run_workspace_command(
            dir.display().to_string(),
            "..".to_string(),
            "git".to_string(),
            vec!["--version".to_string()],
            10,
        ))
        .expect_err("a working directory outside the workspace must be rejected");
        assert!(error.contains("resolves outside"));

        std::fs::remove_dir_all(&dir).ok();
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
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
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
            run_workspace_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
