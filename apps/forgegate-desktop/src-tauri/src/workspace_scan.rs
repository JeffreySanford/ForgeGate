use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

/// Workspace detection, per documentation/16-data-and-schema-model.md
/// ("Workspace") and TODO.md Phase 3 ("Repository scanning"). Most checks
/// are workspace-root-only; Storybook and Starlight are also checked one
/// level into `apps/*`, `packages/*`, and `libs/*`, because real Nx
/// monorepos put per-project Storybook and Starlight configs inside a
/// project directory rather than at the workspace root — confirmed by
/// testing against a real fixture repository, not assumed. `libs/` is
/// included alongside `apps/`/`packages/` because it's Nx's own original
/// default convention (predating the newer `packages/` convention this
/// codebase and the tested fixture both happen to use) — without it,
/// detection would silently miss an entire, common category of real
/// workspaces rather than just being "one level short" on an unusual one.
/// This still never walks into node_modules or recurses more than one
/// level. Deeper, adapter-driven discovery (frameworks, versions) is later
/// Phase 5/12 work.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ComponentPackageCandidate {
    pub name: String,
    pub path: String,
    pub source_glob: String,
    pub output_directory: String,
    pub manifest_path: String,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceScan {
    package_name: Option<String>,
    package_manager: Option<String>,
    workspace_manager: Option<String>,
    storybook_projects: Vec<String>,
    starlight_projects: Vec<String>,
    has_zeroheight: bool,
    token_files: Vec<String>,
    test_runners: Vec<String>,
    visual_regression_providers: Vec<String>,
    ci_providers: Vec<String>,
    custom_elements_manifests: Vec<String>,
    component_packages: Vec<ComponentPackageCandidate>,
}

/// Fails loudly if the workspace root itself cannot be read (permissions,
/// removed mid-scan, etc.) rather than silently reporting an empty scan —
/// per TODO.md's Phase 3 exit criterion "discovery errors are actionable
/// rather than silent". Nested, best-effort reads (an optional `apps/*`
/// project directory, a missing `tokens/` folder) are allowed to come back
/// empty without erroring the whole scan: a missing optional thing is a
/// normal "not found" result, not a discovery failure.
pub fn scan_workspace(root: &Path) -> Result<WorkspaceScan, String> {
    let entries = top_level_entry_names(root)?;
    let package_json = read_package_json(root, &entries);
    let project_dirs = candidate_project_dirs(root, &entries);

    Ok(WorkspaceScan {
        package_name: package_json
            .as_ref()
            .and_then(|value| value.get("name"))
            .and_then(|value| value.as_str())
            .map(|name| name.to_string()),
        package_manager: detect_package_manager(&entries),
        workspace_manager: detect_workspace_manager(&entries, package_json.as_ref()),
        storybook_projects: detect_storybook_projects(root, &project_dirs),
        starlight_projects: detect_starlight_projects(root, &project_dirs),
        has_zeroheight: detect_zeroheight(&entries, package_json.as_ref()),
        token_files: detect_token_files(root, &project_dirs),
        test_runners: detect_test_runners(&entries),
        visual_regression_providers: detect_visual_regression_providers(package_json.as_ref()),
        ci_providers: detect_ci_providers(root, &entries),
        custom_elements_manifests: detect_custom_elements_manifests(root, &project_dirs),
        component_packages: detect_component_packages(root, &project_dirs),
    })
}

fn top_level_entry_names(root: &Path) -> Result<Vec<String>, String> {
    let dir = fs::read_dir(root).map_err(|error| {
        format!("Could not read workspace directory {}: {error}", root.display())
    })?;
    Ok(dir
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| entry.file_name().into_string().ok())
        .collect())
}

/// The workspace root itself, plus every immediate child directory of
/// `apps/`, `packages/`, and `libs/` — covering both the newer
/// (`apps`+`packages`) and original (`apps`+`libs`) Nx conventions, plus
/// the plain `packages/` layout non-Nx pnpm/npm/Yarn workspaces commonly
/// use. One level deep only.
fn candidate_project_dirs(root: &Path, entries: &[String]) -> Vec<PathBuf> {
    let mut dirs = vec![root.to_path_buf()];
    for group in ["apps", "packages", "libs"] {
        if entries.contains(&group.to_string()) {
            if let Ok(read) = fs::read_dir(root.join(group)) {
                for entry in read.filter_map(|entry| entry.ok()) {
                    if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                        dirs.push(entry.path());
                    }
                }
            }
        }
    }
    dirs
}

fn relative_display(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .display()
        .to_string()
        .replace('\\', "/")
}

fn read_package_json(root: &Path, entries: &[String]) -> Option<Value> {
    if !entries.contains(&"package.json".to_string()) {
        return None;
    }
    read_package_json_at(root)
}

fn read_package_json_at(dir: &Path) -> Option<Value> {
    let contents = fs::read_to_string(dir.join("package.json")).ok()?;
    serde_json::from_str(&contents).ok()
}

fn detect_component_packages(root: &Path, project_dirs: &[PathBuf]) -> Vec<ComponentPackageCandidate> {
    project_dirs
        .iter()
        .filter(|dir| dir.join("src").is_dir())
        .filter_map(|dir| {
            let package_json = read_package_json_at(dir)?;
            let name = package_json.get("name")?.as_str()?.to_string();
            let package_path = relative_display(root, dir);
            let path = if package_path.is_empty() { ".".to_string() } else { package_path };
            let declared_manifest = package_json
                .get("customElements")
                .and_then(Value::as_str)
                .unwrap_or("custom-elements.json")
                .replace('\\', "/");
            let manifest = Path::new(&declared_manifest);
            let output_directory = manifest
                .parent()
                .filter(|parent| !parent.as_os_str().is_empty())
                .map(|parent| parent.display().to_string().replace('\\', "/"))
                .unwrap_or_else(|| ".".to_string());

            Some(ComponentPackageCandidate {
                name,
                path,
                source_glob: "src/**/*.{js,ts,jsx,tsx}".to_string(),
                output_directory,
                manifest_path: declared_manifest,
            })
        })
        .collect()
}

fn dependency_keys(package_json: Option<&Value>) -> Vec<String> {
    let Some(package_json) = package_json else {
        return Vec::new();
    };
    ["dependencies", "devDependencies"]
        .iter()
        .filter_map(|field| package_json.get(field))
        .filter_map(|value| value.as_object())
        .flat_map(|map| map.keys().cloned())
        .collect()
}

fn detect_package_manager(entries: &[String]) -> Option<String> {
    let candidates = [
        ("pnpm-lock.yaml", "pnpm"),
        ("yarn.lock", "yarn"),
        ("bun.lockb", "bun"),
        ("package-lock.json", "npm"),
    ];
    candidates
        .iter()
        .find(|(file, _)| entries.contains(&(*file).to_string()))
        .map(|(_, manager)| manager.to_string())
}

/// Priority order matters: a repository can contain more than one marker
/// (for example both `nx.json` and a `package.json` "workspaces" field), and
/// the more specific/opinionated tool wins.
fn detect_workspace_manager(entries: &[String], package_json: Option<&Value>) -> Option<String> {
    if entries.contains(&"nx.json".to_string()) {
        return Some("nx".to_string());
    }
    if entries.contains(&"turbo.json".to_string()) {
        return Some("turborepo".to_string());
    }
    if entries.contains(&"rush.json".to_string()) {
        return Some("rush".to_string());
    }
    if entries.contains(&"lage.config.js".to_string()) || entries.contains(&"lage.config.json".to_string()) {
        return Some("lage".to_string());
    }
    if entries.contains(&"pnpm-workspace.yaml".to_string()) {
        return Some("pnpm-workspaces".to_string());
    }
    if package_json.and_then(|value| value.get("workspaces")).is_some() {
        return Some("package-json-workspaces".to_string());
    }
    None
}

fn detect_storybook_projects(root: &Path, project_dirs: &[PathBuf]) -> Vec<String> {
    project_dirs
        .iter()
        .map(|dir| dir.join(".storybook"))
        .filter(|storybook_dir| storybook_dir.is_dir())
        .map(|storybook_dir| relative_display(root, &storybook_dir))
        .collect()
}

fn detect_starlight_projects(root: &Path, project_dirs: &[PathBuf]) -> Vec<String> {
    let config_names = ["astro.config.mjs", "astro.config.ts", "astro.config.js"];
    project_dirs
        .iter()
        .filter_map(|dir| {
            config_names.iter().find_map(|name| {
                let config_file = dir.join(name);
                let contents = fs::read_to_string(&config_file).ok()?;
                contents
                    .to_lowercase()
                    .contains("starlight")
                    .then(|| relative_display(root, dir))
            })
        })
        .collect()
}

fn detect_zeroheight(entries: &[String], package_json: Option<&Value>) -> bool {
    let has_config_file = entries
        .iter()
        .any(|name| name.starts_with("zeroheight.config."));
    let mentioned_in_package_json = dependency_keys(package_json)
        .iter()
        .any(|key| key.to_lowercase().contains("zeroheight"));
    has_config_file || mentioned_in_package_json
}

/// Content-aware, not filename-aware: real repositories don't reliably name
/// token files `*.tokens.json` (confirmed by testing against a real design
/// system, whose tokens are `design-tokens.json`, `primitives.json`, etc.).
/// A `.json` file counts as a token file if its name follows the DTCG-suffix
/// convention (`*.tokens.json`/`*.tokens`) OR its contents contain a DTCG
/// `"$value"`/`"$type"` marker, per documentation/23-design-tokens-and-figma-bridge.md.
/// Searched locations: each candidate project directory's top level, plus
/// one more level into `src/`, `tokens/`, and `design-tokens/` inside it —
/// enough to reach the real fixture's `packages/tokens/src/*.json` without
/// scanning the whole tree.
fn detect_token_files(root: &Path, project_dirs: &[PathBuf]) -> Vec<String> {
    let is_dtcg_named = |name: &str| name.ends_with(".tokens.json") || name.ends_with(".tokens");
    let mut found = Vec::new();

    for project_dir in project_dirs {
        for search_dir in [
            project_dir.clone(),
            project_dir.join("src"),
            project_dir.join("tokens"),
            project_dir.join("design-tokens"),
        ] {
            let Ok(read) = fs::read_dir(&search_dir) else {
                continue;
            };
            for entry in read.filter_map(|entry| entry.ok()) {
                let Ok(name) = entry.file_name().into_string() else {
                    continue;
                };
                if !name.ends_with(".json") && !is_dtcg_named(&name) {
                    continue;
                }
                let file_path = search_dir.join(&name);
                let has_dtcg_marker = fs::read_to_string(&file_path)
                    .map(|contents| contents.contains("\"$value\"") || contents.contains("\"$type\""))
                    .unwrap_or(false);
                if is_dtcg_named(&name) || has_dtcg_marker {
                    found.push(relative_display(root, &file_path));
                }
            }
        }
    }

    found
}

fn detect_test_runners(entries: &[String]) -> Vec<String> {
    let mut runners = Vec::new();
    let has_any = |names: &[&str]| names.iter().any(|name| entries.contains(&(*name).to_string()));

    if has_any(&["vitest.config.ts", "vitest.config.mts", "vitest.config.js", "vitest.workspace.ts"]) {
        runners.push("vitest".to_string());
    }
    if has_any(&["jest.config.ts", "jest.config.js", "jest.config.cjs", "jest.config.json"]) {
        runners.push("jest".to_string());
    }
    if has_any(&["playwright.config.ts", "playwright.config.js"]) {
        runners.push("playwright".to_string());
    }

    runners
}

/// Detected from declared dependencies rather than filenames, since most of
/// these providers configure themselves inside Storybook or CI rather than
/// through a dedicated top-level config file.
fn detect_visual_regression_providers(package_json: Option<&Value>) -> Vec<String> {
    let keys = dependency_keys(package_json);
    let has = |needle: &str| keys.iter().any(|key| key.contains(needle));

    let mut providers = Vec::new();
    if has("chromatic") {
        providers.push("chromatic".to_string());
    }
    if has("@percy/") {
        providers.push("percy".to_string());
    }
    if has("backstopjs") {
        providers.push("backstopjs".to_string());
    }
    if has("loki") {
        providers.push("loki".to_string());
    }
    if has("@applitools/") {
        providers.push("applitools".to_string());
    }

    providers
}

/// A package declares where its Custom Elements Manifest lives via the
/// standard `"customElements"` field in `package.json`
/// (https://github.com/webcomponents/custom-elements-manifest); fall back
/// to a conventional `custom-elements.json` at the project root if that
/// field is absent. Only manifest files that actually exist are returned —
/// a declared-but-missing path (for example, not yet built) is silently
/// skipped here rather than treated as an error, since scan_workspace only
/// fails loudly for the workspace root itself.
fn detect_custom_elements_manifests(root: &Path, project_dirs: &[PathBuf]) -> Vec<String> {
    project_dirs
        .iter()
        .filter_map(|dir| {
            let declared_path = read_package_json_at(dir)
                .and_then(|package_json| package_json.get("customElements").cloned())
                .and_then(|value| value.as_str().map(|s| s.to_string()));

            let candidate = match declared_path {
                Some(relative) => dir.join(relative),
                None => dir.join("custom-elements.json"),
            };

            candidate.is_file().then(|| relative_display(root, &candidate))
        })
        .collect()
}

fn detect_ci_providers(root: &Path, entries: &[String]) -> Vec<String> {
    let mut providers = Vec::new();

    if entries.contains(&".github".to_string()) {
        let workflows_dir = root.join(".github").join("workflows");
        let has_workflow_file = fs::read_dir(&workflows_dir)
            .map(|dir| dir.filter_map(|entry| entry.ok()).count() > 0)
            .unwrap_or(false);
        if has_workflow_file {
            providers.push("github-actions".to_string());
        }
    }
    if entries.contains(&".gitlab-ci.yml".to_string()) {
        providers.push("gitlab-ci".to_string());
    }
    if entries.contains(&"azure-pipelines.yml".to_string()) {
        providers.push("azure-pipelines".to_string());
    }

    providers
}

#[cfg(test)]
mod tests {
    use super::*;

    fn repository_root() -> std::path::PathBuf {
        // CARGO_MANIFEST_DIR is .../apps/forgegate-desktop/src-tauri; the
        // repository root is three levels up.
        std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .ancestors()
            .nth(3)
            .expect("repository root should exist")
            .to_path_buf()
    }

    fn fixture_root() -> std::path::PathBuf {
        repository_root().join("fixtures/acme-button-library")
    }

    #[test]
    fn detects_this_repository_correctly() {
        let scan = scan_workspace(&repository_root()).expect("scan should succeed");

        assert_eq!(scan.package_name, Some("forgegate".to_string()));
        assert_eq!(scan.package_manager, Some("pnpm".to_string()));
        assert_eq!(scan.workspace_manager, Some("nx".to_string()));
        assert!(scan.storybook_projects.is_empty(), "ForgeGate does not use Storybook on itself");
        assert!(scan.starlight_projects.is_empty(), "ForgeGate does not use Starlight on itself");
        assert!(!scan.has_zeroheight);
        assert!(scan.token_files.is_empty());
        assert!(scan.test_runners.contains(&"vitest".to_string()));
        assert!(!scan.test_runners.contains(&"jest".to_string()));
        assert!(scan.visual_regression_providers.is_empty());
        assert!(scan.ci_providers.contains(&"github-actions".to_string()));
        assert!(scan.custom_elements_manifests.is_empty(), "ForgeGate does not publish a CEM on itself");
    }

    /// Regression protection for the checked-in ADR 0003 fixture
    /// (`fixtures/acme-button-library/`): scans it for real, the same way a
    /// developer pointing ForgeGate at it would, so a future edit to the
    /// fixture that breaks detection fails CI immediately rather than
    /// silently drifting out of sync with what it claims to demonstrate.
    #[test]
    fn detects_the_acme_button_library_fixture_correctly() {
        let scan = scan_workspace(&fixture_root()).expect("scan should succeed");

        assert_eq!(scan.package_name, Some("@acme/button-library".to_string()));
        assert_eq!(scan.custom_elements_manifests, vec!["custom-elements.json".to_string()]);
        assert_eq!(scan.token_files, vec!["tokens/acme.tokens.json".to_string()]);
        assert_eq!(scan.storybook_projects, vec![".storybook".to_string()]);
        assert!(scan.test_runners.is_empty(), "the fixture deliberately has no test runner yet");
    }

    #[test]
    fn returns_defaults_for_an_empty_directory() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-test-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");

        let scan = scan_workspace(&dir).expect("scan should succeed");

        assert_eq!(scan.package_name, None);
        assert_eq!(scan.package_manager, None);
        assert_eq!(scan.workspace_manager, None);
        assert!(scan.storybook_projects.is_empty());
        assert!(scan.starlight_projects.is_empty());
        assert!(!scan.has_zeroheight);
        assert!(scan.token_files.is_empty());
        assert!(scan.test_runners.is_empty());
        assert!(scan.visual_regression_providers.is_empty());
        assert!(scan.ci_providers.is_empty());
        assert!(scan.custom_elements_manifests.is_empty());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn reports_an_actionable_error_when_the_workspace_directory_cannot_be_read() {
        let missing = std::env::temp_dir().join(format!("forgegate-scan-missing-{}", std::process::id()));
        // Deliberately not created — read_dir must fail.

        let error = scan_workspace(&missing).expect_err("scan should fail for a nonexistent directory");
        assert!(error.contains("Could not read workspace directory"));
    }

    #[test]
    fn prefers_pnpm_over_npm_when_both_lockfiles_are_present() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-pm-test-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");
        fs::write(dir.join("pnpm-lock.yaml"), "").unwrap();
        fs::write(dir.join("package-lock.json"), "").unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");
        assert_eq!(scan.package_manager, Some("pnpm".to_string()));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn prefers_nx_over_turborepo_when_both_are_present() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-wm-test-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");
        fs::write(dir.join("nx.json"), "{}").unwrap();
        fs::write(dir.join("turbo.json"), "{}").unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");
        assert_eq!(scan.workspace_manager, Some("nx".to_string()));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn detects_package_json_workspaces_when_no_dedicated_tool_is_present() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-pjw-test-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");
        fs::write(dir.join("package.json"), r#"{"workspaces": ["packages/*"]}"#).unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");
        assert_eq!(scan.workspace_manager, Some("package-json-workspaces".to_string()));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn detects_visual_regression_providers_from_package_json_dependencies() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-vr-test-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");
        fs::write(
            dir.join("package.json"),
            r#"{"devDependencies": {"chromatic": "^11.0.0", "@percy/cli": "^1.0.0"}}"#,
        )
        .unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");
        assert!(scan.visual_regression_providers.contains(&"chromatic".to_string()));
        assert!(scan.visual_regression_providers.contains(&"percy".to_string()));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn reports_the_scoped_package_name_from_package_json() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-pkgname-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");
        fs::write(dir.join("package.json"), r#"{"name": "@up/design-system"}"#).unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");
        assert_eq!(scan.package_name, Some("@up/design-system".to_string()));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn detects_zeroheight_from_a_config_file() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-zh-test-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");
        fs::write(dir.join("zeroheight.config.json"), "{}").unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");
        assert!(scan.has_zeroheight);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn detects_a_custom_elements_manifest_declared_in_package_json() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-cem-declared-{}", std::process::id()));
        let dist_dir = dir.join("dist");
        fs::create_dir_all(&dist_dir).expect("should create dist dir");
        fs::write(
            dir.join("package.json"),
            r#"{"name": "up-design-system", "customElements": "dist/custom-elements.json"}"#,
        )
        .unwrap();
        fs::write(dist_dir.join("custom-elements.json"), r#"{"schemaVersion": "1.0.0", "modules": []}"#).unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");
        assert_eq!(scan.custom_elements_manifests, vec!["dist/custom-elements.json".to_string()]);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn falls_back_to_the_conventional_filename_when_package_json_does_not_declare_one() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-cem-fallback-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");
        fs::write(dir.join("custom-elements.json"), r#"{"schemaVersion": "1.0.0", "modules": []}"#).unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");
        assert_eq!(scan.custom_elements_manifests, vec!["custom-elements.json".to_string()]);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn does_not_report_a_declared_manifest_path_that_does_not_actually_exist() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-cem-missing-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");
        fs::write(
            dir.join("package.json"),
            r#"{"name": "up-design-system", "customElements": "dist/custom-elements.json"}"#,
        )
        .unwrap();
        // dist/custom-elements.json is declared but never actually built.

        let scan = scan_workspace(&dir).expect("scan should succeed");
        assert!(scan.custom_elements_manifests.is_empty());

        fs::remove_dir_all(&dir).ok();
    }

    /// This layout — Storybook nested under an `apps/*` project rather than
    /// at the workspace root, and Astro Starlight likewise under its own
    /// `apps/*` project — was found by testing against a real Nx-based
    /// design-system monorepo, not assumed. A root-only scan silently missed
    /// both.
    #[test]
    fn detects_storybook_and_starlight_nested_under_apps() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-nested-test-{}", std::process::id()));
        let qa_remote_storybook = dir.join("apps").join("qa-remote").join(".storybook");
        let starlight_app = dir.join("apps").join("starlight");
        fs::create_dir_all(&qa_remote_storybook).unwrap();
        fs::create_dir_all(&starlight_app).unwrap();
        fs::write(
            starlight_app.join("astro.config.mjs"),
            "import starlight from '@astrojs/starlight';\nexport default { integrations: [starlight({})] };",
        )
        .unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");

        assert_eq!(scan.storybook_projects, vec!["apps/qa-remote/.storybook".to_string()]);
        assert_eq!(scan.starlight_projects, vec!["apps/starlight".to_string()]);

        fs::remove_dir_all(&dir).ok();
    }

    /// Same nested-detection guarantee as `detects_storybook_and_starlight_nested_under_apps`,
    /// but for the original Nx `apps` + `libs` convention rather than the
    /// newer `apps` + `packages` one — a workspace using `libs/` must not
    /// be silently treated as having no Storybook at all.
    #[test]
    fn detects_storybook_nested_under_libs() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-libs-test-{}", std::process::id()));
        let ui_kit_storybook = dir.join("libs").join("ui-kit").join(".storybook");
        fs::create_dir_all(&ui_kit_storybook).unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");
        assert_eq!(scan.storybook_projects, vec!["libs/ui-kit/.storybook".to_string()]);

        fs::remove_dir_all(&dir).ok();
    }

    /// The Storybook/Starlight nested-detection tests above cover those two
    /// signals specifically; this closes the same gap for Custom Elements
    /// Manifest detection, which shares the same `candidate_project_dirs`
    /// but never had its own nested-case test — the code path was
    /// exercised only at the workspace root before this test existed.
    #[test]
    fn discovers_component_package_candidates_without_treating_every_workspace_project_as_one_package() {
        let dir = std::env::temp_dir().join(format!("forgegate-component-packages-{}", std::process::id()));
        let package = dir.join("packages").join("button");
        fs::create_dir_all(package.join("src")).unwrap();
        fs::write(
            package.join("package.json"),
            r#"{"name":"@up/button","customElements":"dist/custom-elements.json"}"#,
        )
        .unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");

        assert_eq!(
            scan.component_packages,
            vec![ComponentPackageCandidate {
                name: "@up/button".to_string(),
                path: "packages/button".to_string(),
                source_glob: "src/**/*.{js,ts,jsx,tsx}".to_string(),
                output_directory: "dist".to_string(),
                manifest_path: "dist/custom-elements.json".to_string(),
            }]
        );

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn detects_a_custom_elements_manifest_nested_under_packages() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-cem-nested-{}", std::process::id()));
        let button_pkg = dir.join("packages").join("button");
        fs::create_dir_all(&button_pkg).unwrap();
        fs::write(
            button_pkg.join("package.json"),
            r#"{"name": "@up/button", "customElements": "custom-elements.json"}"#,
        )
        .unwrap();
        fs::write(button_pkg.join("custom-elements.json"), r#"{"schemaVersion": "1.0.0", "modules": []}"#).unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");
        assert_eq!(
            scan.custom_elements_manifests,
            vec!["packages/button/custom-elements.json".to_string()]
        );

        fs::remove_dir_all(&dir).ok();
    }

    /// Replicates the real fixture's actual token layout — a `tokens`
    /// package under `packages/`, whose real content lives one level
    /// further in `src/`, named plainly (`design-tokens.json`, not
    /// `*.tokens.json`). The previous filename-only detection found nothing
    /// here; content-aware detection must find it via the DTCG "$value" marker.
    #[test]
    fn detects_dtcg_token_files_by_content_even_with_a_plain_filename() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-dtcg-test-{}", std::process::id()));
        let tokens_src = dir.join("packages").join("tokens").join("src");
        fs::create_dir_all(&tokens_src).unwrap();
        fs::write(
            tokens_src.join("design-tokens.json"),
            r##"{"color": {"primary": {"$type": "color", "$value": "#0B5FFF"}}}"##,
        )
        .unwrap();
        // A same-directory JSON file with no DTCG markers must NOT be reported.
        fs::write(tokens_src.join("index.json"), r#"{"main": "./index.ts"}"#).unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");

        assert_eq!(
            scan.token_files,
            vec!["packages/tokens/src/design-tokens.json".to_string()]
        );

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn still_detects_a_dtcg_suffixed_filename_even_without_content_markers() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-dtcg-suffix-test-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("brand.tokens.json"), "{}").unwrap();

        let scan = scan_workspace(&dir).expect("scan should succeed");

        assert_eq!(scan.token_files, vec!["brand.tokens.json".to_string()]);

        fs::remove_dir_all(&dir).ok();
    }
}
