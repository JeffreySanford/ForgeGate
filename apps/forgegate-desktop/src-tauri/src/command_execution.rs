use serde::Serialize;
use std::io::Read;
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

/// First real slice of the "Command execution flow" in
/// documentation/02-system-architecture.md. What this does: runs a
/// specific, pre-approved `command` + `args` (never a shell string — no
/// shell is invoked, so there is no shell-injection surface) in a given
/// working directory, with a hard timeout enforced from this side.
///
/// What this deliberately does not do yet, tracked in TODO.md rather than
/// silently skipped: stream output to the UI live (output is only
/// available once the process finishes or is killed), support
/// mid-run cancellation from the user, or resolve commands from
/// `.forgegate/config.yaml`'s command mappings — the caller supplies the
/// exact command today.
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub timed_out: bool,
    pub duration_ms: u128,
}

pub fn run_command(cwd: &Path, command: &str, args: &[String], timeout: Duration) -> Result<CommandResult, String> {
    let start = Instant::now();

    let mut child = Command::new(command)
        .current_dir(cwd)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start \"{command}\": {error}"))?;

    // Read stdout/stderr on their own threads so a chatty process can't
    // deadlock us by filling a pipe buffer while we're busy waiting on it.
    let stdout_pipe = child.stdout.take();
    let stderr_pipe = child.stderr.take();
    let stdout_thread = std::thread::spawn(move || read_all(stdout_pipe));
    let stderr_thread = std::thread::spawn(move || read_all(stderr_pipe));

    let timed_out;
    let exit_code;
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                timed_out = false;
                exit_code = status.code();
                break;
            }
            Ok(None) => {
                if start.elapsed() >= timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    timed_out = true;
                    exit_code = None;
                    break;
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(error) => return Err(format!("Failed to check \"{command}\" status: {error}")),
        }
    }

    let stdout = stdout_thread.join().unwrap_or_default();
    let stderr = stderr_thread.join().unwrap_or_default();

    Ok(CommandResult {
        exit_code,
        stdout,
        stderr,
        timed_out,
        duration_ms: start.elapsed().as_millis(),
    })
}

fn read_all<R: Read>(pipe: Option<R>) -> String {
    let Some(mut pipe) = pipe else {
        return String::new();
    };
    let mut buffer = String::new();
    let _ = pipe.read_to_string(&mut buffer);
    buffer
}

#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn captures_stdout_and_a_successful_exit_code() {
        let cwd = std::env::temp_dir();
        let result = run_command(&cwd, "git", &["--version".to_string()], Duration::from_secs(10))
            .expect("git --version should start successfully");

        assert_eq!(result.exit_code, Some(0));
        assert!(!result.timed_out);
        assert!(result.stdout.to_lowercase().contains("git version"));
    }

    #[test]
    fn reports_a_nonzero_exit_code_without_erroring() {
        let cwd = std::env::temp_dir();
        let result = run_command(
            &cwd,
            "git",
            &["not-a-real-git-subcommand".to_string()],
            Duration::from_secs(10),
        )
        .expect("the command starting successfully is not itself an error, even if git rejects the subcommand");

        assert_ne!(result.exit_code, Some(0));
        assert!(!result.stderr.is_empty());
    }

    #[test]
    fn fails_to_start_a_nonexistent_command() {
        let cwd = std::env::temp_dir();
        let error = run_command(
            &cwd,
            "forgegate-definitely-not-a-real-command",
            &[],
            Duration::from_secs(5),
        )
        .expect_err("a nonexistent command must fail to even start");
        assert!(error.contains("Failed to start"));
    }

    #[test]
    fn kills_and_reports_timed_out_for_a_command_that_runs_too_long() {
        let cwd = std::env::temp_dir();
        let (command, args) = slow_command();

        let result = run_command(&cwd, command, &args, Duration::from_millis(300))
            .expect("starting the slow command should succeed even though it will be killed");

        assert!(result.timed_out);
        assert_eq!(result.exit_code, None);
        assert!(result.duration_ms < 5000, "should be killed well before its own 5s sleep finishes");
    }
}
