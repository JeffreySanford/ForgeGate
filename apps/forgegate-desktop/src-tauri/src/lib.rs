use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;
use tauri_plugin_dialog::DialogExt;

mod workspace_scan;
use workspace_scan::{scan_workspace, WorkspaceScan};

#[derive(Serialize)]
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

#[tauri::command]
fn read_git_status(path: String) -> Result<GitStatus, String> {
    let workspace = resolve_workspace_path(&path)?;

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
    Ok(scan_workspace(&workspace))
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
            read_workspace_scan
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
