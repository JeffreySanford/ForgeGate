use serde::Serialize;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc};
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
/// working directory, with a hard timeout enforced from this side, redacts
/// likely secrets from the captured `stdout`/`stderr` before returning
/// (see `redact_secrets`), and can be cancelled mid-run via `cancel`.
///
/// What this deliberately does not do yet, tracked in TODO.md rather than
/// silently skipped: stream output to the UI live (output is only
/// available once the process finishes, is killed, or is cancelled), or
/// resolve commands from `.forgegate/config.yaml`'s command mappings — the
/// caller supplies the exact command today.
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub timed_out: bool,
    /// True only when `cancel` was observed set during the run — distinct
    /// from `timed_out` because a user cancelling on purpose and this
    /// side's own timeout firing are different outcomes worth telling
    /// apart in evidence, not collapsed into one "did not finish" flag.
    pub cancelled: bool,
    pub duration_ms: u128,
    /// Workspace-relative path to a persisted copy of this result under
    /// `.forgegate/artifacts/`, set by `write_command_artifact` in
    /// `lib.rs` after this struct is built (this module has no concept of
    /// a workspace root, only the command's own `cwd`). `None` either
    /// means the write failed (best-effort, does not fail the command) or
    /// this result came from a call site that doesn't persist artifacts
    /// (e.g. a unit test constructing `CommandResult` directly).
    pub artifact_path: Option<String>,
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

#[cfg(windows)]
fn terminate_process_tree(child: &mut std::process::Child) {
    let process_id = child.id().to_string();
    let _ = Command::new("taskkill")
        .args(["/PID", &process_id, "/T", "/F"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
    let _ = child.wait();
}

#[cfg(not(windows))]
fn terminate_process_tree(child: &mut std::process::Child) {
    let _ = child.kill();
    let _ = child.wait();
}

/// Called once per line as it's read from the child's stdout (`is_stderr:
/// false`) or stderr (`is_stderr: true`), already redacted the same way
/// (`redact_line`) — with one disclosed gap: PEM private-key block
/// redaction needs to see the whole block at once, so it only applies to
/// the final buffered `CommandResult.stdout`/`.stderr`, not this live
/// per-line feed. A key streamed live would appear line-by-line before a
/// block-aware reader could redact it; real callers must treat this feed
/// as untrusted for that one case rather than assume parity with the
/// final result.
pub type LineSink = dyn Fn(bool, &str) + Send + Sync;

pub fn run_command(
    cwd: &Path,
    command: &str,
    args: &[String],
    timeout: Duration,
    cancel: &AtomicBool,
    on_line: Arc<LineSink>,
) -> Result<CommandResult, String> {
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
    // blocking forever on .join() — see that constant's doc comment. This
    // also rules out `std::thread::scope`: its implicit join at the end of
    // the scope would reintroduce exactly the orphan-process hang the
    // grace period exists to avoid, so `on_line` is `Arc`'d ('static +
    // Send + Sync) rather than borrowed.
    let stdout_pipe = child.stdout.take();
    let stderr_pipe = child.stderr.take();
    let (stdout_tx, stdout_rx) = mpsc::channel();
    let (stderr_tx, stderr_rx) = mpsc::channel();
    let stdout_sink = on_line.clone();
    std::thread::spawn(move || {
        let _ = stdout_tx.send(read_streamed(stdout_pipe, |line| stdout_sink(false, line)));
    });
    let stderr_sink = on_line.clone();
    std::thread::spawn(move || {
        let _ = stderr_tx.send(read_streamed(stderr_pipe, |line| stderr_sink(true, line)));
    });

    let timed_out;
    let cancelled;
    let exit_code;
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                timed_out = false;
                cancelled = false;
                exit_code = status.code();
                break;
            }
            Ok(None) => {
                if cancel.load(Ordering::SeqCst) {
                    terminate_process_tree(&mut child);
                    timed_out = false;
                    cancelled = true;
                    exit_code = None;
                    break;
                }
                if start.elapsed() >= timeout {
                    terminate_process_tree(&mut child);
                    timed_out = true;
                    cancelled = false;
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
        stdout: redact_secrets(&stdout),
        stderr: redact_secrets(&stderr),
        timed_out,
        cancelled,
        duration_ms: start.elapsed().as_millis(),
        artifact_path: None,
    })
}

/// Reads `pipe` line by line, calling `on_line` with each line's
/// per-line-redacted text (no trailing newline) as soon as it arrives, and
/// returns the full, *unredacted* accumulated text — the caller still runs
/// `redact_secrets` on that once, at the end, for `CommandResult`, since
/// that pass needs the whole text to catch multi-line PEM blocks that a
/// per-line reader can't.
fn read_streamed<R: Read>(pipe: Option<R>, mut on_line: impl FnMut(&str)) -> String {
    let Some(pipe) = pipe else {
        return String::new();
    };
    let mut reader = BufReader::new(pipe);
    let mut full = String::new();
    let mut line = String::new();
    loop {
        line.clear();
        match reader.read_line(&mut line) {
            Ok(0) | Err(_) => break,
            Ok(_) => {
                let trimmed = line.trim_end_matches(['\r', '\n']);
                on_line(&redact_line(trimmed));
                full.push_str(&line);
            }
        }
    }
    full
}

/// Case-insensitive substrings of a bare `KEY` in a `KEY=VALUE` word that
/// mark the value as a secret worth redacting, e.g. from a tool that dumps
/// its environment (`env`, `printenv`, a verbose CI runner) into stdout.
const SECRET_KEY_MARKERS: [&str; 7] = [
    "SECRET", "TOKEN", "PASSWORD", "PASSWD", "APIKEY", "PRIVATE_KEY", "ACCESS_KEY",
];

/// Known credential-format prefixes redacted wherever they appear inside a
/// word, regardless of surrounding `KEY=` context — covers a token pasted
/// bare into a command's own output (e.g. a verbose `curl` or `npm`
/// invocation echoing an `Authorization` header or registry token).
const KNOWN_TOKEN_PREFIXES: [&str; 7] = ["ghp_", "gho_", "ghu_", "ghs_", "ghr_", "npm_", "AKIA"];

/// Best-effort defense-in-depth secret scrubbing applied to every command's
/// captured stdout/stderr before it reaches the frontend (and, from there,
/// anything that persists it as evidence). This is deliberately narrow and
/// documented rather than a general secret-scanning engine: it redacts (1)
/// `KEY=VALUE` words whose key name suggests a secret, (2) known credential
/// prefixes (GitHub, npm, AWS access keys) appearing anywhere in a word,
/// (3) the token following a `Bearer`/`Basic` auth scheme word, and (4) PEM
/// private-key blocks in full. It cannot catch every possible secret format
/// — this is a real, useful reduction in accidental leakage, not a
/// guarantee.
pub fn redact_secrets(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut in_private_key_block = false;

    for line in text.split_inclusive('\n') {
        let (content, line_ending) = split_line_ending(line);

        if !in_private_key_block && is_private_key_marker(content, "BEGIN") {
            in_private_key_block = true;
            result.push_str(content);
            result.push_str(" [REDACTED]");
            result.push_str(line_ending);
            continue;
        }
        if in_private_key_block {
            if is_private_key_marker(content, "END") {
                in_private_key_block = false;
                result.push_str(content);
                result.push_str(line_ending);
            }
            // Otherwise this line is inside the key body: omit it entirely.
            continue;
        }

        result.push_str(&redact_line(content));
        result.push_str(line_ending);
    }

    result
}

fn split_line_ending(line: &str) -> (&str, &str) {
    if let Some(content) = line.strip_suffix("\r\n") {
        (content, "\r\n")
    } else if let Some(content) = line.strip_suffix('\n') {
        (content, "\n")
    } else {
        (line, "")
    }
}

fn is_private_key_marker(line: &str, marker: &str) -> bool {
    line.contains(&format!("-----{marker}")) && line.contains("PRIVATE KEY-----")
}

fn redact_line(line: &str) -> String {
    let mut result = String::with_capacity(line.len());
    let mut previous_word_is_auth_scheme = false;

    for chunk in split_preserving_whitespace(line) {
        if chunk.chars().next().is_some_and(char::is_whitespace) {
            result.push_str(chunk);
            continue;
        }
        if previous_word_is_auth_scheme {
            result.push_str("***REDACTED***");
            previous_word_is_auth_scheme = false;
            continue;
        }
        let lower = chunk.to_ascii_lowercase();
        if lower == "bearer" || lower == "basic" {
            result.push_str(chunk);
            previous_word_is_auth_scheme = true;
            continue;
        }
        result.push_str(&redact_word(chunk));
    }

    result
}

fn redact_word(word: &str) -> String {
    if let Some(eq_index) = word.find('=') {
        let key = &word[..eq_index];
        let is_bare_identifier =
            !key.is_empty() && key.chars().all(|c| c.is_ascii_alphanumeric() || c == '_');
        if is_bare_identifier {
            let key_upper = key.to_ascii_uppercase();
            if SECRET_KEY_MARKERS.iter().any(|marker| key_upper.contains(marker)) {
                return format!("{key}=***REDACTED***");
            }
        }
    }

    if KNOWN_TOKEN_PREFIXES.iter().any(|prefix| word.contains(prefix)) {
        return "***REDACTED***".to_string();
    }

    word.to_string()
}

/// Splits `line` into alternating whitespace and non-whitespace runs,
/// preserving every character (unlike `split_whitespace`, which discards
/// the separators) so redaction never has to reconstruct spacing.
fn split_preserving_whitespace(line: &str) -> Vec<&str> {
    let mut chunks = Vec::new();
    let mut start = 0;
    let mut current_is_whitespace: Option<bool> = None;

    for (idx, ch) in line.char_indices() {
        let is_whitespace = ch.is_whitespace();
        match current_is_whitespace {
            None => current_is_whitespace = Some(is_whitespace),
            Some(previous) if previous != is_whitespace => {
                chunks.push(&line[start..idx]);
                start = idx;
                current_is_whitespace = Some(is_whitespace);
            }
            _ => {}
        }
    }
    if start < line.len() {
        chunks.push(&line[start..]);
    }

    chunks
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

    fn not_cancelled() -> AtomicBool {
        AtomicBool::new(false)
    }

    fn no_op_line_sink() -> Arc<LineSink> {
        Arc::new(|_, _| {})
    }

    #[test]
    fn captures_stdout_and_a_successful_exit_code() {
        let cwd = std::env::temp_dir();
        let result = run_command(
            &cwd,
            "git",
            &["--version".to_string()],
            Duration::from_secs(10),
            &not_cancelled(),
            no_op_line_sink(),
        )
        .expect("git --version should start successfully");

        assert_eq!(result.exit_code, Some(0));
        assert!(!result.timed_out);
        assert!(!result.cancelled);
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
            &not_cancelled(),
            no_op_line_sink(),
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
            &not_cancelled(),
            no_op_line_sink(),
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
            &not_cancelled(),
            no_op_line_sink(),
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

        let result = run_command(
            &dir,
            &script_path.display().to_string(),
            &[],
            Duration::from_secs(10),
            &not_cancelled(),
            no_op_line_sink(),
        )
        .expect("running a .cmd batch file should succeed, matching how npx.cmd/npm.cmd work on Windows");

        assert_eq!(result.exit_code, Some(0));
        assert!(result.stdout.contains("hello-from-batch"));

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn kills_and_reports_timed_out_for_a_command_that_runs_too_long() {
        let cwd = std::env::temp_dir();
        let (command, args) = slow_command();

        let result = run_command(
            &cwd,
            command,
            &args,
            Duration::from_millis(300),
            &not_cancelled(),
            no_op_line_sink(),
        )
        .expect("starting the slow command should succeed even though it will be killed");

        assert!(result.timed_out);
        assert!(!result.cancelled);
        assert_eq!(result.exit_code, None);
        assert!(result.duration_ms < 5000, "should be killed well before its own 5s sleep finishes");
    }

    #[test]
    fn reports_cancelled_rather_than_timed_out_when_the_cancel_flag_is_set_mid_run() {
        let cwd = std::env::temp_dir();
        let (command, args) = slow_command();
        let cancel = std::sync::Arc::new(AtomicBool::new(false));
        let cancel_setter = cancel.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(150));
            cancel_setter.store(true, Ordering::SeqCst);
        });

        let result = run_command(
            &cwd,
            command,
            &args,
            Duration::from_secs(5),
            &cancel,
            no_op_line_sink(),
        )
        .expect("starting the slow command should succeed even though it will be cancelled");

        assert!(result.cancelled);
        assert!(!result.timed_out);
        assert_eq!(result.exit_code, None);
        assert!(
            result.duration_ms < 5000,
            "should stop well before its own 5s sleep or the 5s timeout"
        );
    }

    #[test]
    fn redacts_a_key_value_word_whose_key_name_suggests_a_secret() {
        assert_eq!(
            redact_secrets("GITHUB_TOKEN=abc123def456\n"),
            "GITHUB_TOKEN=***REDACTED***\n"
        );
        assert_eq!(
            redact_secrets("DB_PASSWORD=hunter2"),
            "DB_PASSWORD=***REDACTED***"
        );
    }

    #[test]
    fn leaves_unrelated_key_value_words_untouched() {
        assert_eq!(redact_secrets("NODE_ENV=production"), "NODE_ENV=production");
    }

    #[test]
    fn redacts_known_credential_prefixes_anywhere_in_a_word() {
        assert_eq!(
            redact_secrets("cloning with token ghp_abcdefghijklmnopqrstuvwxyz0123456789 now"),
            "cloning with token ***REDACTED*** now"
        );
        assert_eq!(
            redact_secrets("AWS_ACCESS_KEY_ID=AKIAABCDEFGHIJKLMNOP"),
            "AWS_ACCESS_KEY_ID=***REDACTED***"
        );
    }

    #[test]
    fn redacts_the_token_following_a_bearer_or_basic_auth_scheme() {
        assert_eq!(
            redact_secrets("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret.payload"),
            "Authorization: Bearer ***REDACTED***"
        );
        assert_eq!(
            redact_secrets("Authorization: Basic dXNlcjpwYXNz"),
            "Authorization: Basic ***REDACTED***"
        );
    }

    #[test]
    fn redacts_a_pem_private_key_block_in_full_while_keeping_surrounding_output() {
        let input = "generating key\n-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA\nmore-key-bytes\n-----END RSA PRIVATE KEY-----\ndone\n";
        let output = redact_secrets(input);

        assert!(output.contains("generating key"));
        assert!(output.contains("-----BEGIN RSA PRIVATE KEY----- [REDACTED]"));
        assert!(!output.contains("MIIEpAIBAAKCAQEA"));
        assert!(!output.contains("more-key-bytes"));
        assert!(output.contains("-----END RSA PRIVATE KEY-----"));
        assert!(output.contains("done"));
    }

    #[test]
    fn leaves_ordinary_command_output_completely_unchanged() {
        let input = "Cloning into 'repo'...\nremote: Enumerating objects: 42, done.\n";
        assert_eq!(redact_secrets(input), input);
    }

    #[test]
    fn real_command_output_containing_a_secret_arrives_redacted_through_run_command() {
        let cwd = std::env::temp_dir();
        let (command, args) = echo_command("MY_SECRET_TOKEN=abc123def456");

        let result = run_command(
            &cwd,
            command,
            &args,
            Duration::from_secs(10),
            &not_cancelled(),
            no_op_line_sink(),
        )
        .expect("echoing a line should succeed");

        assert!(result.stdout.contains("MY_SECRET_TOKEN=***REDACTED***"));
        assert!(!result.stdout.contains("abc123def456"));
    }

    #[test]
    fn streams_each_stdout_line_live_and_redacted_as_the_real_command_produces_it() {
        let cwd = std::env::temp_dir();
        let (command, args) = echo_command("STREAM_SECRET=abc123def456");

        let lines: Arc<std::sync::Mutex<Vec<(bool, String)>>> = Arc::new(std::sync::Mutex::new(Vec::new()));
        let collector = lines.clone();
        let on_line: Arc<LineSink> = Arc::new(move |is_stderr, line| {
            collector.lock().unwrap().push((is_stderr, line.to_string()));
        });

        let result = run_command(&cwd, command, &args, Duration::from_secs(10), &not_cancelled(), on_line)
            .expect("echoing a line should succeed");

        assert!(result.stdout.contains("STREAM_SECRET=***REDACTED***"));
        let captured = lines.lock().unwrap();
        assert!(
            captured.iter().any(|(is_stderr, line)| !is_stderr && line == "STREAM_SECRET=***REDACTED***"),
            "expected a live stdout line already redacted, got {captured:?}",
        );
        assert!(
            captured.iter().all(|(_, line)| !line.contains("abc123def456")),
            "no live line should ever carry the raw secret",
        );
    }

    /// `echo` is a `cmd.exe` builtin, not a standalone executable — but
    /// `build_command` already wraps every command with `cmd /C` on
    /// Windows (see its doc comment), so passing `"echo"` straight through
    /// is correct here, matching how the non-Windows branch works.
    fn echo_command(text: &str) -> (&'static str, Vec<String>) {
        ("echo", vec![text.to_string()])
    }
}
