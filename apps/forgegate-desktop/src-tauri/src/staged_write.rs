use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// A safe bare filename for a file this module writes directly into the
/// target workspace (not a user-picked export destination) — no path
/// separator of either kind, no `..`, non-empty. Deliberately stricter than
/// the evidence-package export path (which allows one subdirectory level):
/// a real workspace write should never be able to name a subdirectory at
/// all, since the directory it lands in is fixed by the caller, not by the
/// content being written.
pub(crate) fn is_safe_bare_filename(name: &str) -> bool {
    if name.is_empty() || name.contains('/') || name.contains('\\') || name.contains("..") {
        return false;
    }
    true
}

/// A staging id this module minted itself (`stage_evidence_write`'s
/// return value) — never accepted as free-form input, since it becomes a
/// path segment for `approve_staged_write`/`discard_staged_write`.
fn is_safe_staging_id(id: &str) -> bool {
    match id.strip_prefix("stg-") {
        Some(suffix) => !suffix.is_empty() && suffix.chars().all(|c| c.is_ascii_digit()),
        None => false,
    }
}

fn staging_root(workspace: &Path) -> PathBuf {
    workspace.join(".forgegate").join(".staging")
}

fn new_staging_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    format!("stg-{nanos}")
}

/// One evidence write ForgeGate has staged but not yet committed into the
/// real workspace. `previous_content` is whatever real file this write
/// would replace, if any — captured up front so a caller can show a real
/// diff, and so `rollback_committed_write` can restore it later.
pub(crate) struct StagedEvidenceWrite {
    pub staging_id: String,
    pub subdirectory: String,
    pub filename: String,
    pub previous_content: Option<String>,
    pub new_content: String,
}

/// Writes `content` into a temporary staging directory
/// (`.forgegate/.staging/<staging-id>/<subdirectory>/<filename>`) rather
/// than the real conventional evidence directory. The real workspace is
/// never touched by this step — per P2 entry gate 2 ("temporary output,
/// explicit diffs, approval, validation, and rollback"), this is the
/// "temporary output" half; nothing commits until `approve_staged_write`
/// is called explicitly.
pub(crate) fn stage_evidence_write(
    workspace: &Path,
    subdirectory: &str,
    filename: &str,
    content: &str,
) -> Result<StagedEvidenceWrite, String> {
    if !is_safe_bare_filename(filename) {
        return Err(format!(
            "Refusing to stage unexpected {subdirectory} filename \"{filename}\""
        ));
    }

    let target_path = workspace.join(".forgegate").join(subdirectory).join(filename);
    let previous_content = fs::read_to_string(&target_path).ok();

    let staging_id = new_staging_id();
    let staging_dir = staging_root(workspace).join(&staging_id).join(subdirectory);
    fs::create_dir_all(&staging_dir)
        .map_err(|error| format!("Failed to create {}: {error}", staging_dir.display()))?;
    let staged_path = staging_dir.join(filename);
    fs::write(&staged_path, content)
        .map_err(|error| format!("Failed to write {}: {error}", staged_path.display()))?;

    Ok(StagedEvidenceWrite {
        staging_id,
        subdirectory: subdirectory.to_string(),
        filename: filename.to_string(),
        previous_content,
        new_content: content.to_string(),
    })
}

/// Commits a previously staged write into the real conventional evidence
/// directory, then removes its staging directory. Only ever called after
/// an explicit approval action in the frontend — never automatically
/// alongside `stage_evidence_write`.
pub(crate) fn approve_staged_write(
    workspace: &Path,
    staging_id: &str,
    subdirectory: &str,
    filename: &str,
) -> Result<String, String> {
    if !is_safe_staging_id(staging_id) {
        return Err(format!("\"{staging_id}\" is not a real staging id"));
    }
    if !is_safe_bare_filename(filename) {
        return Err(format!(
            "Refusing to approve unexpected {subdirectory} filename \"{filename}\""
        ));
    }

    let staged_path = staging_root(workspace)
        .join(staging_id)
        .join(subdirectory)
        .join(filename);
    let content = fs::read_to_string(&staged_path).map_err(|error| {
        format!(
            "No staged write found at {}: {error}",
            staged_path.display()
        )
    })?;

    let target_dir = workspace.join(".forgegate").join(subdirectory);
    fs::create_dir_all(&target_dir)
        .map_err(|error| format!("Failed to create {}: {error}", target_dir.display()))?;
    let target_path = target_dir.join(filename);
    fs::write(&target_path, &content)
        .map_err(|error| format!("Failed to write {}: {error}", target_path.display()))?;

    discard_staged_write(workspace, staging_id)?;

    Ok(target_path.display().to_string())
}

/// Discards a staged write without ever touching the real workspace —
/// the reviewer chose not to approve it. Also used internally by
/// `approve_staged_write` to clean up once a write has committed.
pub(crate) fn discard_staged_write(workspace: &Path, staging_id: &str) -> Result<(), String> {
    if !is_safe_staging_id(staging_id) {
        return Err(format!("\"{staging_id}\" is not a real staging id"));
    }
    let staging_dir = staging_root(workspace).join(staging_id);
    if staging_dir.exists() {
        fs::remove_dir_all(&staging_dir)
            .map_err(|error| format!("Failed to remove {}: {error}", staging_dir.display()))?;
    }
    Ok(())
}

/// Restores a real conventional evidence file to `previous_content`
/// (or removes it, if the committed write had created a new file), using
/// the `previous_content` captured by `stage_evidence_write` before the
/// matching `approve_staged_write` committed it.
pub(crate) fn rollback_committed_write(
    workspace: &Path,
    subdirectory: &str,
    filename: &str,
    previous_content: Option<&str>,
) -> Result<(), String> {
    if !is_safe_bare_filename(filename) {
        return Err(format!(
            "Refusing to roll back unexpected {subdirectory} filename \"{filename}\""
        ));
    }

    let target_path = workspace.join(".forgegate").join(subdirectory).join(filename);
    match previous_content {
        Some(content) => {
            fs::write(&target_path, content)
                .map_err(|error| format!("Failed to write {}: {error}", target_path.display()))?;
        }
        None => {
            if target_path.exists() {
                fs::remove_file(&target_path).map_err(|error| {
                    format!("Failed to remove {}: {error}", target_path.display())
                })?;
            }
        }
    }
    Ok(())
}

/// Package-manager manifests and lockfiles this module refuses to write to
/// or replace, matched by filename regardless of which directory they sit
/// in. Nothing calls `stage_relative_write` with a path like this today —
/// the one real caller (Starlight page generation) only ever stages
/// conventional documentation paths — but the path itself isn't otherwise
/// restricted to any subdirectory, so this is defense in depth: a future
/// caller (or a bug in one) can't turn this into a way to edit a reviewed
/// developer's own `package.json` or lockfile, which ForgeGate has no
/// business touching regardless of what generated it.
const SENSITIVE_MANIFEST_FILENAMES: &[&str] = &[
    "package.json",
    "package-lock.json",
    "npm-shrinkwrap.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "yarn.lock",
];

fn is_sensitive_manifest_path(path: &str) -> bool {
    let filename = path.rsplit('/').next().unwrap_or(path);
    SENSITIVE_MANIFEST_FILENAMES
        .iter()
        .any(|candidate| candidate.eq_ignore_ascii_case(filename))
}

/// A safe workspace-relative path for a file this module writes outside
/// `.forgegate/` — e.g. a generated Starlight page under a detected
/// project's `src/content/docs/...`. Unlike `is_safe_bare_filename` this
/// allows nested directories (a real Starlight page path is several
/// levels deep), but still rejects anything that could escape the
/// workspace (no absolute path, no `..`, no backslash, no empty segment)
/// or land on a package-manager manifest or lockfile
/// (`is_sensitive_manifest_path`).
pub(crate) fn is_safe_relative_workspace_path(path: &str) -> bool {
    if path.is_empty()
        || path.starts_with('/')
        || path.contains('\\')
        || path.contains("..")
        || path.ends_with('/')
        || is_sensitive_manifest_path(path)
    {
        return false;
    }
    path.split('/').all(|segment| !segment.is_empty())
}

/// One write staged at an arbitrary workspace-relative path, mirroring
/// `StagedEvidenceWrite` but for destinations outside the fixed
/// `.forgegate/<subdirectory>/` convention.
pub(crate) struct StagedRelativeWrite {
    pub staging_id: String,
    pub relative_path: String,
    pub previous_content: Option<String>,
    pub new_content: String,
}

/// Stages `content` at `relative_path` under a temporary staging
/// directory, capturing any real file it would replace — the same
/// temporary-output-first discipline as `stage_evidence_write`, for
/// writes that land outside `.forgegate/` (a generated Starlight page,
/// for example). The real workspace is never touched by this step.
pub(crate) fn stage_relative_write(
    workspace: &Path,
    relative_path: &str,
    content: &str,
) -> Result<StagedRelativeWrite, String> {
    if !is_safe_relative_workspace_path(relative_path) {
        return Err(format!(
            "Refusing to stage unexpected relative path \"{relative_path}\""
        ));
    }

    let target_path = workspace.join(relative_path);
    let previous_content = fs::read_to_string(&target_path).ok();

    let staging_id = new_staging_id();
    let staging_target = staging_root(workspace).join(&staging_id).join(relative_path);
    if let Some(parent) = staging_target.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create {}: {error}", parent.display()))?;
    }
    fs::write(&staging_target, content)
        .map_err(|error| format!("Failed to write {}: {error}", staging_target.display()))?;

    Ok(StagedRelativeWrite {
        staging_id,
        relative_path: relative_path.to_string(),
        previous_content,
        new_content: content.to_string(),
    })
}

/// Commits a previously staged relative-path write into the real
/// workspace, then removes its staging directory — the relative-path
/// counterpart to `approve_staged_write`.
pub(crate) fn approve_staged_relative_write(
    workspace: &Path,
    staging_id: &str,
    relative_path: &str,
) -> Result<String, String> {
    if !is_safe_staging_id(staging_id) {
        return Err(format!("\"{staging_id}\" is not a real staging id"));
    }
    if !is_safe_relative_workspace_path(relative_path) {
        return Err(format!(
            "Refusing to approve unexpected relative path \"{relative_path}\""
        ));
    }

    let staged_path = staging_root(workspace).join(staging_id).join(relative_path);
    let content = fs::read_to_string(&staged_path).map_err(|error| {
        format!(
            "No staged write found at {}: {error}",
            staged_path.display()
        )
    })?;

    let target_path = workspace.join(relative_path);
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create {}: {error}", parent.display()))?;
    }
    fs::write(&target_path, &content)
        .map_err(|error| format!("Failed to write {}: {error}", target_path.display()))?;

    discard_staged_write(workspace, staging_id)?;

    Ok(target_path.display().to_string())
}

/// Restores a real file at `relative_path` to `previous_content` (or
/// removes it, if the committed write had created it) — the
/// relative-path counterpart to `rollback_committed_write`.
pub(crate) fn rollback_relative_write(
    workspace: &Path,
    relative_path: &str,
    previous_content: Option<&str>,
) -> Result<(), String> {
    if !is_safe_relative_workspace_path(relative_path) {
        return Err(format!(
            "Refusing to roll back unexpected relative path \"{relative_path}\""
        ));
    }

    let target_path = workspace.join(relative_path);
    match previous_content {
        Some(content) => {
            fs::write(&target_path, content)
                .map_err(|error| format!("Failed to write {}: {error}", target_path.display()))?;
        }
        None => {
            if target_path.exists() {
                fs::remove_file(&target_path).map_err(|error| {
                    format!("Failed to remove {}: {error}", target_path.display())
                })?;
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_workspace(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "forgegate-staged-write-{label}-{}-{}",
            std::process::id(),
            line!()
        ));
        fs::create_dir_all(&dir).expect("should create temp workspace dir");
        dir
    }

    #[test]
    fn is_safe_bare_filename_accepts_and_rejects_the_expected_shapes() {
        assert!(is_safe_bare_filename("acme-button-keyboard-review.json"));
        assert!(!is_safe_bare_filename("findings/x.json"));
        assert!(!is_safe_bare_filename("../escape.json"));
        assert!(!is_safe_bare_filename("windows\\backslash.json"));
        assert!(!is_safe_bare_filename(""));
    }

    #[test]
    fn is_safe_staging_id_accepts_only_ids_this_module_would_mint() {
        assert!(is_safe_staging_id("stg-123456"));
        assert!(!is_safe_staging_id("../escape"));
        assert!(!is_safe_staging_id("stg-"));
        assert!(!is_safe_staging_id("stg-12a"));
        assert!(!is_safe_staging_id(""));
    }

    #[test]
    fn stages_a_write_without_touching_the_real_workspace() {
        let dir = temp_workspace("stage-only");

        let staged = stage_evidence_write(&dir, "manual-reviews", "review.json", "{\"a\":1}")
            .expect("stage should succeed");

        assert!(!dir.join(".forgegate/manual-reviews/review.json").exists());
        assert!(dir
            .join(".forgegate/.staging")
            .join(&staged.staging_id)
            .join("manual-reviews/review.json")
            .exists());
        assert_eq!(staged.previous_content, None);
        assert_eq!(staged.new_content, "{\"a\":1}");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn captures_real_previous_content_for_a_real_diff() {
        let dir = temp_workspace("stage-diff");
        let target_dir = dir.join(".forgegate/manual-reviews");
        fs::create_dir_all(&target_dir).unwrap();
        fs::write(target_dir.join("review.json"), "{\"a\":1}").unwrap();

        let staged = stage_evidence_write(&dir, "manual-reviews", "review.json", "{\"a\":2}")
            .expect("stage should succeed");

        assert_eq!(staged.previous_content.as_deref(), Some("{\"a\":1}"));
        assert_eq!(
            fs::read_to_string(target_dir.join("review.json")).unwrap(),
            "{\"a\":1}",
            "the real file must be untouched until approval"
        );

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn refuses_to_stage_a_filename_that_would_escape_the_conventional_directory() {
        let dir = temp_workspace("stage-escape");

        let result = stage_evidence_write(&dir, "manual-reviews", "../escape.json", "{}");

        assert!(result.is_err());
        assert!(!dir.join(".forgegate").exists());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn approves_a_staged_write_into_the_real_directory_and_clears_staging() {
        let dir = temp_workspace("approve");
        let staged = stage_evidence_write(&dir, "findings", "finding.json", "{\"status\":\"open\"}")
            .expect("stage should succeed");

        let result_path =
            approve_staged_write(&dir, &staged.staging_id, "findings", "finding.json")
                .expect("approve should succeed");

        assert_eq!(
            fs::read_to_string(&result_path).unwrap(),
            "{\"status\":\"open\"}"
        );
        assert!(!staging_root(&dir).join(&staged.staging_id).exists());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn refuses_to_approve_a_staging_id_it_never_minted() {
        let dir = temp_workspace("approve-forged-id");

        let result = approve_staged_write(&dir, "../escape", "findings", "finding.json");

        assert!(result.is_err());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn discards_a_staged_write_without_ever_creating_the_real_file() {
        let dir = temp_workspace("discard");
        let staged = stage_evidence_write(&dir, "findings", "finding.json", "{\"status\":\"open\"}")
            .expect("stage should succeed");

        discard_staged_write(&dir, &staged.staging_id).expect("discard should succeed");

        assert!(!staging_root(&dir).join(&staged.staging_id).exists());
        assert!(!dir.join(".forgegate/findings/finding.json").exists());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn rolls_back_a_committed_write_to_its_real_previous_content() {
        let dir = temp_workspace("rollback-existing");
        let target_dir = dir.join(".forgegate/manual-reviews");
        fs::create_dir_all(&target_dir).unwrap();
        fs::write(target_dir.join("review.json"), "{\"a\":1}").unwrap();

        let staged = stage_evidence_write(&dir, "manual-reviews", "review.json", "{\"a\":2}")
            .expect("stage should succeed");
        approve_staged_write(&dir, &staged.staging_id, "manual-reviews", "review.json")
            .expect("approve should succeed");
        assert_eq!(
            fs::read_to_string(target_dir.join("review.json")).unwrap(),
            "{\"a\":2}"
        );

        rollback_committed_write(
            &dir,
            "manual-reviews",
            "review.json",
            staged.previous_content.as_deref(),
        )
        .expect("rollback should succeed");

        assert_eq!(
            fs::read_to_string(target_dir.join("review.json")).unwrap(),
            "{\"a\":1}"
        );

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn rolls_back_a_committed_write_by_removing_a_file_it_newly_created() {
        let dir = temp_workspace("rollback-new");

        let staged = stage_evidence_write(&dir, "findings", "finding.json", "{\"status\":\"open\"}")
            .expect("stage should succeed");
        approve_staged_write(&dir, &staged.staging_id, "findings", "finding.json")
            .expect("approve should succeed");
        assert!(dir.join(".forgegate/findings/finding.json").exists());

        rollback_committed_write(&dir, "findings", "finding.json", None)
            .expect("rollback should succeed");

        assert!(!dir.join(".forgegate/findings/finding.json").exists());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn is_safe_relative_workspace_path_accepts_and_rejects_the_expected_shapes() {
        assert!(is_safe_relative_workspace_path(
            "src/content/docs/components/button.mdx"
        ));
        assert!(is_safe_relative_workspace_path("button.mdx"));
        assert!(!is_safe_relative_workspace_path("../escape.mdx"));
        assert!(!is_safe_relative_workspace_path("/absolute.mdx"));
        assert!(!is_safe_relative_workspace_path("windows\\backslash.mdx"));
        assert!(!is_safe_relative_workspace_path(""));
        assert!(!is_safe_relative_workspace_path("trailing-slash/"));
        assert!(!is_safe_relative_workspace_path("a//b.mdx"));
    }

    #[test]
    fn refuses_a_relative_write_to_a_package_manager_manifest_or_lockfile() {
        assert!(!is_safe_relative_workspace_path("package.json"));
        assert!(!is_safe_relative_workspace_path("apps/portal/package.json"));
        assert!(!is_safe_relative_workspace_path("package-lock.json"));
        assert!(!is_safe_relative_workspace_path("npm-shrinkwrap.json"));
        assert!(!is_safe_relative_workspace_path("pnpm-lock.yaml"));
        assert!(!is_safe_relative_workspace_path("pnpm-workspace.yaml"));
        assert!(!is_safe_relative_workspace_path("yarn.lock"));
        // Case-insensitive on the filename itself, still path-shape safe otherwise.
        assert!(!is_safe_relative_workspace_path("PACKAGE.JSON"));
        // A real Starlight page is never named after one of these, so this
        // never rejects the one thing this mechanism actually stages today.
        assert!(is_safe_relative_workspace_path(
            "src/content/docs/components/package-comparison.mdx"
        ));
    }

    #[test]
    fn stages_a_relative_write_without_touching_the_real_target() {
        let dir = temp_workspace("relative-stage");

        let staged = stage_relative_write(
            &dir,
            "src/content/docs/components/button.mdx",
            "# Button",
        )
        .expect("stage should succeed");

        assert!(!dir
            .join("src/content/docs/components/button.mdx")
            .exists());
        assert_eq!(staged.previous_content, None);
        assert_eq!(staged.new_content, "# Button");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn refuses_to_stage_a_write_targeting_a_real_package_json() {
        let dir = temp_workspace("relative-stage-refuses-package-json");
        fs::write(dir.join("package.json"), "{\"name\":\"real-project\"}").unwrap();

        let result = stage_relative_write(&dir, "package.json", "{\"tampered\":true}");

        assert!(result.is_err());
        assert_eq!(
            fs::read_to_string(dir.join("package.json")).unwrap(),
            "{\"name\":\"real-project\"}"
        );

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn captures_real_previous_content_for_a_relative_write_diff() {
        let dir = temp_workspace("relative-diff");
        let target_dir = dir.join("src/content/docs/components");
        fs::create_dir_all(&target_dir).unwrap();
        fs::write(target_dir.join("button.mdx"), "# Old Button").unwrap();

        let staged = stage_relative_write(
            &dir,
            "src/content/docs/components/button.mdx",
            "# New Button",
        )
        .expect("stage should succeed");

        assert_eq!(staged.previous_content.as_deref(), Some("# Old Button"));
        assert_eq!(
            fs::read_to_string(target_dir.join("button.mdx")).unwrap(),
            "# Old Button"
        );

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn refuses_to_stage_a_relative_path_that_would_escape_the_workspace() {
        let dir = temp_workspace("relative-escape");

        let result = stage_relative_write(&dir, "../escape.mdx", "x");

        assert!(result.is_err());
        assert!(!dir.join(".forgegate").exists());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn approves_a_staged_relative_write_creating_nested_directories() {
        let dir = temp_workspace("relative-approve");
        let staged = stage_relative_write(
            &dir,
            "src/content/docs/components/button.mdx",
            "# Button",
        )
        .expect("stage should succeed");

        let result_path = approve_staged_relative_write(
            &dir,
            &staged.staging_id,
            "src/content/docs/components/button.mdx",
        )
        .expect("approve should succeed");

        assert_eq!(fs::read_to_string(&result_path).unwrap(), "# Button");
        assert!(!staging_root(&dir).join(&staged.staging_id).exists());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn rolls_back_a_committed_relative_write_to_its_real_previous_content() {
        let dir = temp_workspace("relative-rollback");
        let target_dir = dir.join("src/content/docs/components");
        fs::create_dir_all(&target_dir).unwrap();
        fs::write(target_dir.join("button.mdx"), "# Old Button").unwrap();

        let staged = stage_relative_write(
            &dir,
            "src/content/docs/components/button.mdx",
            "# New Button",
        )
        .expect("stage should succeed");
        approve_staged_relative_write(
            &dir,
            &staged.staging_id,
            "src/content/docs/components/button.mdx",
        )
        .expect("approve should succeed");

        rollback_relative_write(
            &dir,
            "src/content/docs/components/button.mdx",
            staged.previous_content.as_deref(),
        )
        .expect("rollback should succeed");

        assert_eq!(
            fs::read_to_string(target_dir.join("button.mdx")).unwrap(),
            "# Old Button"
        );

        fs::remove_dir_all(&dir).ok();
    }
}
