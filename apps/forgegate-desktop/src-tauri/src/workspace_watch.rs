use notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebouncedEventKind, Debouncer};
use std::path::Path;
use std::sync::mpsc;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime};

/// How long to wait after the last filesystem event before reporting a
/// batch. A single `pnpm install` or branch switch can touch thousands of
/// files in a burst; without this, each one would fire its own event.
const DEBOUNCE_MS: u64 = 750;

/// Caps how many changed paths one event reports. This does not cap how
/// many files are *watched* — it only keeps a single burst (e.g. a large
/// rebase) from flooding the frontend with an enormous path list; the real
/// signal a user needs is "something changed, consider rescanning", not a
/// complete diff.
const MAX_REPORTED_PATHS: usize = 50;

#[derive(serde::Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceChangedEvent {
    pub changed_paths: Vec<String>,
    pub truncated: bool,
}

#[derive(serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WatchDirectory {
    pub path: String,
    pub recursive: bool,
}

/// Holds the currently active watcher, if any. Dropping a `Debouncer` stops
/// its underlying OS watch and ends the background thread reading its
/// events (see `watch_directories`'s doc comment) — so replacing this on
/// every new workspace selection is enough to fully tear down the previous
/// watch, with no separate stop signal needed.
#[derive(Default)]
pub struct WorkspaceWatcherState(Mutex<Option<Debouncer<notify::RecommendedWatcher>>>);

pub fn stop(state: &WorkspaceWatcherState) {
    *state.0.lock().unwrap() = None;
}

/// Starts watching the given, already-scanned real directories under
/// `workspace_root` and emits a debounced `workspace-changed` event on
/// `app` whenever something inside them changes. Thin Tauri-specific
/// wrapper around `watch_directories`, which does the real work and has no
/// Tauri types in its signature — see that function's doc comment for why.
pub fn start<R: Runtime>(
    app: AppHandle<R>,
    state: &WorkspaceWatcherState,
    workspace_root: &Path,
    directories: &[WatchDirectory],
) -> Result<(), String> {
    let debouncer = watch_directories(workspace_root, directories, move |event| {
        let _ = app.emit("workspace-changed", event);
    })?;
    *state.0.lock().unwrap() = Some(debouncer);
    Ok(())
}

/// The real watching logic, deliberately free of any Tauri type so it can
/// be exercised in plain Rust tests. `tauri::test::mock_app` was tried
/// first and abandoned: enabling `tauri`'s `test` feature as a
/// dev-dependency broke the *entire* Rust test binary on Windows with
/// `STATUS_ENTRYPOINT_NOT_FOUND` (a DLL entry-point resolution failure
/// pulled in by `tauri-runtime-wry`/`wry`'s webview bindings, which a bare
/// `cargo test` process — no real app, no bundled WebView2 loader — cannot
/// satisfy). Depending on Tauri's mock runtime for one module's tests was
/// not worth breaking every other test in the crate, so this function
/// takes a plain `on_change` callback instead: the real caller passes a
/// closure that calls `app.emit`, and a test passes a closure that pushes
/// into a channel.
///
/// Replaces `state`'s previous watcher, if any — see `stop`'s callers.
/// Deliberately does **not** watch `workspace_root` recursively — the
/// caller supplies `directories`, computed from a real scan
/// (`computeWorkspaceWatchDirectories` on the TypeScript side) so this
/// never has to watch `node_modules` or similar in the first place, rather
/// than watching everything and filtering afterward. A directory that
/// cannot be watched (deleted between scan and watch start, or a
/// permissions issue) is skipped rather than failing the whole batch.
fn watch_directories(
    workspace_root: &Path,
    directories: &[WatchDirectory],
    on_change: impl Fn(WorkspaceChangedEvent) + Send + 'static,
) -> Result<Debouncer<notify::RecommendedWatcher>, String> {
    let (tx, rx) = mpsc::channel();
    let mut debouncer = new_debouncer(Duration::from_millis(DEBOUNCE_MS), tx)
        .map_err(|error| format!("Failed to start filesystem watcher: {error}"))?;

    let mut watched_any = false;
    for directory in directories {
        let full_path = if directory.path == "." {
            workspace_root.to_path_buf()
        } else {
            workspace_root.join(&directory.path)
        };
        if !full_path.is_dir() {
            continue;
        }
        let mode = if directory.recursive {
            RecursiveMode::Recursive
        } else {
            RecursiveMode::NonRecursive
        };
        if debouncer.watcher().watch(&full_path, mode).is_ok() {
            watched_any = true;
        }
    }
    if !watched_any {
        return Err("No real directory could be watched".to_string());
    }

    let root = workspace_root.to_path_buf();
    // This thread's lifetime is tied to `tx`: `tx` lives inside the
    // debouncer this function returns, so when the caller drops or
    // replaces that debouncer, `tx` drops, `rx` sees the channel close,
    // and this loop — and thread — end on their own.
    std::thread::spawn(move || {
        for result in rx {
            let Ok(events) = result else { continue };
            if let Some(changed_event) = build_changed_event(&events, &root) {
                on_change(changed_event);
            }
        }
    });

    Ok(debouncer)
}

/// Turns one batch of raw debounced events into the real
/// `WorkspaceChangedEvent` reported to the frontend: drops
/// `AnyContinuous` events (still-changing, not a settled state worth
/// reporting), makes paths workspace-relative and forward-slashed,
/// dedupes, sorts for a stable order, and applies `MAX_REPORTED_PATHS`.
/// `None` when the batch contains nothing reportable (e.g. every event was
/// outside `root` or `AnyContinuous`).
///
/// Kept separate from `watch_directories`'s OS-watching code specifically
/// so it can be unit tested with a synthetic list of paths — real OS
/// filesystem-event delivery is not deterministic enough (confirmed: a
/// burst of 60 writes on Windows can arrive as more than one raw batch) to
/// assert an exact count against in an integration-style test.
fn build_changed_event(
    events: &[notify_debouncer_mini::DebouncedEvent],
    root: &Path,
) -> Option<WorkspaceChangedEvent> {
    let mut changed_paths: Vec<String> = events
        .iter()
        .filter(|event| event.kind != DebouncedEventKind::AnyContinuous)
        .filter_map(|event| event.path.strip_prefix(root).ok())
        .map(|relative| relative.to_string_lossy().replace('\\', "/"))
        .filter(|path| !path.is_empty())
        .collect();
    changed_paths.sort();
    changed_paths.dedup();
    if changed_paths.is_empty() {
        return None;
    }
    let truncated = changed_paths.len() > MAX_REPORTED_PATHS;
    changed_paths.truncate(MAX_REPORTED_PATHS);
    Some(WorkspaceChangedEvent {
        changed_paths,
        truncated,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc as std_mpsc;
    use std::time::Duration as StdDuration;

    fn temp_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "forgegate-watch-test-{name}-{}",
            std::process::id()
        ));
        std::fs::remove_dir_all(&dir).ok();
        std::fs::create_dir_all(&dir).expect("should create temp dir");
        dir
    }

    /// Real end-to-end test: starts a real watcher against a real temp
    /// directory, writes a real file, and asserts a real debounced event
    /// arrives naming it — no Tauri types involved, per `watch_directories`'
    /// doc comment.
    #[test]
    fn reports_a_real_file_change_inside_a_watched_directory() {
        let root = temp_dir("basic");
        std::fs::create_dir_all(root.join("src")).unwrap();
        let (tx, rx) = std_mpsc::channel();

        let _debouncer = watch_directories(
            &root,
            &[WatchDirectory {
                path: "src".to_string(),
                recursive: true,
            }],
            move |event| {
                let _ = tx.send(event);
            },
        )
        .expect("watcher should start against a real directory");

        // Give the OS watch a moment to actually register before writing —
        // real watchers are asynchronous to set up.
        std::thread::sleep(StdDuration::from_millis(200));
        std::fs::write(root.join("src/component.ts"), "export {}").unwrap();

        let event = rx
            .recv_timeout(StdDuration::from_secs(5))
            .expect("expected a real debounced event");
        assert!(event.changed_paths.iter().any(|p| p.contains("component.ts")));

        std::fs::remove_dir_all(&root).ok();
    }

    /// The directory-scoping contract itself: a change in an unwatched
    /// sibling directory must not produce an event.
    #[test]
    fn does_not_report_changes_outside_the_watched_directories() {
        let root = temp_dir("scoped");
        std::fs::create_dir_all(root.join("src")).unwrap();
        std::fs::create_dir_all(root.join("node_modules")).unwrap();
        let (tx, rx) = std_mpsc::channel();

        let _debouncer = watch_directories(
            &root,
            &[WatchDirectory {
                path: "src".to_string(),
                recursive: true,
            }],
            move |event| {
                let _ = tx.send(event);
            },
        )
        .expect("watcher should start");

        std::thread::sleep(StdDuration::from_millis(200));
        std::fs::write(root.join("node_modules/package.json"), "{}").unwrap();

        let event = rx.recv_timeout(StdDuration::from_millis(1500));
        assert!(
            event.is_err(),
            "an unwatched directory must not produce an event"
        );

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn skips_a_directory_that_does_not_exist_rather_than_failing_the_whole_start() {
        let root = temp_dir("missing");
        std::fs::create_dir_all(root.join("src")).unwrap();

        let result = watch_directories(
            &root,
            &[
                WatchDirectory {
                    path: "does-not-exist".to_string(),
                    recursive: true,
                },
                WatchDirectory {
                    path: "src".to_string(),
                    recursive: true,
                },
            ],
            |_event| {},
        );
        assert!(result.is_ok());

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn fails_when_every_supplied_directory_is_missing() {
        let root = temp_dir("all-missing");
        std::fs::create_dir_all(&root).unwrap();

        let result = watch_directories(
            &root,
            &[WatchDirectory {
                path: "does-not-exist".to_string(),
                recursive: true,
            }],
            |_event| {},
        );
        assert!(result.is_err());

        std::fs::remove_dir_all(&root).ok();
    }

    /// `MAX_REPORTED_PATHS` is this module's own logic, tested directly
    /// against `build_changed_event` with a synthetic path list — see that
    /// function's doc comment for why this is a deterministic unit test
    /// rather than a real burst of OS filesystem writes.
    #[test]
    fn caps_the_reported_path_count_and_marks_the_event_truncated_beyond_it() {
        let root = std::path::Path::new("/workspace");
        let events: Vec<_> = (0..(MAX_REPORTED_PATHS + 10))
            .map(|i| {
                notify_debouncer_mini::DebouncedEvent::new(
                    root.join(format!("src/file-{i}.ts")),
                    DebouncedEventKind::Any,
                )
            })
            .collect();

        let result = build_changed_event(&events, root).expect("expected a real event");
        assert_eq!(result.changed_paths.len(), MAX_REPORTED_PATHS);
        assert!(result.truncated);
    }

    #[test]
    fn does_not_mark_a_small_synthetic_change_set_as_truncated() {
        let root = std::path::Path::new("/workspace");
        let events = vec![notify_debouncer_mini::DebouncedEvent::new(
            root.join("src/one.ts"),
            DebouncedEventKind::Any,
        )];

        let result = build_changed_event(&events, root).expect("expected a real event");
        assert_eq!(result.changed_paths, vec!["src/one.ts"]);
        assert!(!result.truncated);
    }

    #[test]
    fn drops_still_changing_events_and_reports_none_if_nothing_else_is_left() {
        let root = std::path::Path::new("/workspace");
        let events = vec![notify_debouncer_mini::DebouncedEvent::new(
            root.join("src/one.ts"),
            DebouncedEventKind::AnyContinuous,
        )];

        assert!(build_changed_event(&events, root).is_none());
    }

    #[test]
    fn dedupes_the_same_path_reported_more_than_once_in_a_batch() {
        let root = std::path::Path::new("/workspace");
        let events = vec![
            notify_debouncer_mini::DebouncedEvent::new(root.join("src/one.ts"), DebouncedEventKind::Any),
            notify_debouncer_mini::DebouncedEvent::new(root.join("src/one.ts"), DebouncedEventKind::Any),
        ];

        let result = build_changed_event(&events, root).expect("expected a real event");
        assert_eq!(result.changed_paths, vec!["src/one.ts"]);
    }

    #[test]
    fn does_not_mark_a_small_real_change_set_as_truncated() {
        let root = temp_dir("no-truncate");
        std::fs::create_dir_all(root.join("src")).unwrap();
        let (tx, rx) = std_mpsc::channel();

        let _debouncer = watch_directories(
            &root,
            &[WatchDirectory {
                path: "src".to_string(),
                recursive: true,
            }],
            move |event| {
                let _ = tx.send(event);
            },
        )
        .expect("watcher should start");

        std::thread::sleep(StdDuration::from_millis(200));
        std::fs::write(root.join("src/one.ts"), "x").unwrap();

        let event = rx
            .recv_timeout(StdDuration::from_secs(5))
            .expect("expected a real debounced event");
        assert!(!event.truncated);

        std::fs::remove_dir_all(&root).ok();
    }
}
