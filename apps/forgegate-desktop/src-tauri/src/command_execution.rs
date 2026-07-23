use serde::Serialize;
use std::io::Read;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::time::{Duration, Instant};

/// How long to wait for the stdout/stderr reader threads to finish after
/// the process has already stopped (normally) or been killed (on timeout),
/// before giving up and returning whatever was captured so far. In the
/// normal-completion case this is never actually hit — the pipes close as
/// soon as the process exits, so the readers finish almost immediately.
/// It matters for the case documented on `build_command`: on Windows,
/// killing a `cmd /C`-wrapped process does not reliably cascade to a real
/// child it spawned (e.g. `cmd /C npx ...` spawning `node`), so that
/// orphan can keep holding the pipe open well past the requested timeout.
/// Without this bound, `run_command` would silently ignore its own
/// `timeout` argument in exactly that case — it would report `timed_out:
/// true` correctly, but not actually *return* until the orphan exited on
/// its own, which defeats the entire point of a timeout.
const READER_DRAIN_GRACE_PERIOD: Duration = Duration::from_millis(500);

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

/// On Windows, many real-world tools (`npx`, `npm`, `yarn`, `pnpm`, and
/// anything else installed as an npm-style shim) resolve to a `.cmd`/`.bat`
/// batch-file wrapper, not a native `.exe`. `CreateProcess` — what
/// `std::process::Command` calls under the hood — cannot launch a batch
/// file directly the way an interactive shell can; spawning it fails with
/// a plain "program not found", even though the same name works fine
/// typed into a terminal. The standard, documented workaround is to run it
/// through the command processor (`cmd /C <command> <args...>`), which is
/// exactly what a terminal does implicitly. Everywhere else, the command
/// runs directly, with no shell involved.
///
/// Known limitation this introduces on Windows specifically: killing the
/// `cmd.exe` wrapper process on timeout does not reliably cascade to the
/// real child process it launched (Windows has no automatic process-group
/// kill the way Unix does for a plain child) — confirmed empirically: a
/// killed `cmd /C powershell -Command "Start-Sleep -Seconds 5"` left
/// `powershell.exe` running for its own full 5 seconds. `run_command`
/// itself still returns promptly (see `READER_DRAIN_GRACE_PERIOD` — it
/// stops waiting on the now-orphaned process's output pipes rather than
/// blocking until the orphan exits), but the orphan process keeps running
/// in the background regardless. Fixing that leak properly needs a
/// Windows Job Object, which is real, separate follow-up work — the
/// timeout's *latency* guarantee is fixed here; the *resource cleanup*
/// guarantee is not.
#[cfg(windows)]
fn build_command(command: &str, args: &[String]) -> Command {
    let mut wrapped = Command::new("cmd");
    wrapped.arg("/C").arg(command).args(args);
    wrapped
}

#[cfg(not(windows))]
fn build_command(command: &str, args: &[String]) -> Command {
    let mut direct = Command::new(command);
    direct.args(args);
    direct
}

pub fn run_command(cwd: &Path, command: &str, args: &[String], timeout: Duration) -> Result<CommandResult, String> {
    let start = Instant::now();

    let mut child = build_command(command, args)
        .current_dir(cwd)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start \"{command}\": {error}"))?;

    // Read stdout/stderr on their own threads so a chatty process can't
    // deadlock us by filling a pipe buffer while we're busy waiting on it.
    // Results come back over a channel, not a plain JoinHandle, so the
    // main thread can give up after READER_DRAIN_GRACE_PERIOD instead of
    // blocking forever on .join() — see that constant's doc comment.
    let stdout_pipe = child.stdout.take();
    let stderr_pipe = child.stderr.take();
    let (stdout_tx, stdout_rx) = mpsc::channel();
    let (stderr_tx, stderr_rx) = mpsc::channel();
    std::thread::spawn(move || {
        let _ = stdout_tx.send(read_all(stdout_pipe));
    });
    std::thread::spawn(move || {
        let _ = stderr_tx.send(read_all(stderr_pipe));
    });

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

    let stdout = stdout_rx.recv_timeout(READER_DRAIN_GRACE_PERIOD).unwrap_or_default();
    let stderr = stderr_rx.recv_timeout(READER_DRAIN_GRACE_PERIOD).unwrap_or_default();

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

    /// On Unix, a nonexistent command fails at `spawn()` itself — there is
    /// no shell in between to catch it. On Windows, spawning goes through
    /// `cmd /C` (see `build_command`'s doc comment), so `cmd.exe` itself
    /// always exists and starts fine; the "not found" failure shows up as
    /// a non-zero exit code and stderr message instead of a Rust `Err`.
    /// Both are legitimate ways to report the same underlying problem.
    #[cfg(not(windows))]
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

    #[cfg(windows)]
    #[test]
    fn reports_a_nonexistent_command_as_a_failed_run_rather_than_a_spawn_error() {
        let cwd = std::env::temp_dir();
        let result = run_command(
            &cwd,
            "forgegate-definitely-not-a-real-command",
            &[],
            Duration::from_secs(5),
        )
        .expect("cmd.exe itself always exists, so spawning must succeed even for an unknown inner command");
        assert_ne!(result.exit_code, Some(0));
    }

    /// Regression test for the actual bug this fix addresses: real tools
    /// like npx/npm/yarn/pnpm resolve to a `.cmd` batch-file wrapper on
    /// Windows, which `Command::new(...).spawn()` cannot launch directly.
    /// Uses the batch file's absolute path rather than a bare filename:
    /// cmd.exe's non-interactive `/C` command search does not reliably
    /// check the working directory for a bare relative name the way an
    /// interactive prompt does (confirmed empirically — a bare `"hello.cmd"`
    /// with `current_dir` correctly set to the directory containing it
    /// still gets "not recognized"), so this test intentionally avoids
    /// that ambiguity and exercises the same absolute-path/PATH-resolved
    /// pattern the real npx/npm/yarn call sites actually use.
    #[cfg(windows)]
    #[test]
    fn runs_a_windows_batch_script_wrapper_like_npx_cmd() {
        let dir = std::env::temp_dir().join(format!("forgegate-cmd-batch-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("should create temp dir");
        let script_path = dir.join("hello.cmd");
        std::fs::write(&script_path, "@echo off\r\necho hello-from-batch\r\n").unwrap();

        let result = run_command(&dir, &script_path.display().to_string(), &[], Duration::from_secs(10))
            .expect("running a .cmd batch file should succeed, matching how npx.cmd/npm.cmd work on Windows");

        assert_eq!(result.exit_code, Some(0));
        assert!(result.stdout.contains("hello-from-batch"));

        std::fs::remove_dir_all(&dir).ok();
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
