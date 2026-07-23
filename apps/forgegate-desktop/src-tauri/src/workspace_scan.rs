use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::Path;

/// Non-recursive, top-level workspace detection, per documentation/16-data-and-schema-model.md
/// ("Workspace") and TODO.md Phase 3 ("Repository scanning"). This is a first
/// slice: it reads directory entries and, where a claim needs more than a
/// filename match (Starlight, Zeroheight, visual-regression providers), a
/// small amount of file content — it never walks into node_modules or
/// recurses beyond one extra level for token files. Deeper, adapter-driven
/// discovery (frameworks, versions) is later Phase 5/12 work.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceScan {
    package_manager: Option<String>,
    workspace_manager: Option<String>,
    has_storybook: bool,
    has_starlight: bool,
    has_zeroheight: bool,
    token_files: Vec<String>,
    test_runners: Vec<String>,
    visual_regression_providers: Vec<String>,
    ci_providers: Vec<String>,
}

pub fn scan_workspace(root: &Path) -> WorkspaceScan {
    let entries = top_level_entry_names(root);
    let package_json = read_package_json(root, &entries);

    WorkspaceScan {
        package_manager: detect_package_manager(&entries),
        workspace_manager: detect_workspace_manager(&entries, package_json.as_ref()),
        has_storybook: entries.contains(&".storybook".to_string()),
        has_starlight: detect_starlight(root, &entries),
        has_zeroheight: detect_zeroheight(&entries, package_json.as_ref()),
        token_files: detect_token_files(root, &entries),
        test_runners: detect_test_runners(&entries),
        visual_regression_providers: detect_visual_regression_providers(package_json.as_ref()),
        ci_providers: detect_ci_providers(root, &entries),
    }
}

fn top_level_entry_names(root: &Path) -> Vec<String> {
    fs::read_dir(root)
        .map(|dir| {
            dir.filter_map(|entry| entry.ok())
                .filter_map(|entry| entry.file_name().into_string().ok())
                .collect()
        })
        .unwrap_or_default()
}

fn read_package_json(root: &Path, entries: &[String]) -> Option<Value> {
    if !entries.contains(&"package.json".to_string()) {
        return None;
    }
    let contents = fs::read_to_string(root.join("package.json")).ok()?;
    serde_json::from_str(&contents).ok()
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

fn detect_starlight(root: &Path, entries: &[String]) -> bool {
    ["astro.config.mjs", "astro.config.ts", "astro.config.js"]
        .iter()
        .filter(|name| entries.contains(&(**name).to_string()))
        .any(|name| {
            fs::read_to_string(root.join(name))
                .map(|contents| contents.to_lowercase().contains("starlight"))
                .unwrap_or(false)
        })
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

fn detect_token_files(root: &Path, entries: &[String]) -> Vec<String> {
    let is_token_file = |name: &str| name.ends_with(".tokens.json") || name.ends_with(".tokens");

    let mut found: Vec<String> = entries
        .iter()
        .filter(|name| is_token_file(name))
        .cloned()
        .collect();

    for dir_name in ["tokens", "design-tokens"] {
        if entries.contains(&dir_name.to_string()) {
            let dir_path = root.join(dir_name);
            if let Ok(dir) = fs::read_dir(&dir_path) {
                for entry in dir.filter_map(|entry| entry.ok()) {
                    if let Ok(name) = entry.file_name().into_string() {
                        if is_token_file(&name) {
                            found.push(format!("{dir_name}/{name}"));
                        }
                    }
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

    #[test]
    fn detects_this_repository_correctly() {
        let scan = scan_workspace(&repository_root());

        assert_eq!(scan.package_manager, Some("pnpm".to_string()));
        assert_eq!(scan.workspace_manager, Some("nx".to_string()));
        assert!(!scan.has_storybook, "ForgeGate does not use Storybook on itself");
        assert!(!scan.has_starlight, "ForgeGate does not use Starlight on itself");
        assert!(!scan.has_zeroheight);
        assert!(scan.token_files.is_empty());
        assert!(scan.test_runners.contains(&"vitest".to_string()));
        assert!(!scan.test_runners.contains(&"jest".to_string()));
        assert!(scan.visual_regression_providers.is_empty());
        assert!(scan.ci_providers.contains(&"github-actions".to_string()));
    }

    #[test]
    fn returns_defaults_for_an_empty_directory() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-test-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");

        let scan = scan_workspace(&dir);

        assert_eq!(scan.package_manager, None);
        assert_eq!(scan.workspace_manager, None);
        assert!(!scan.has_storybook);
        assert!(!scan.has_starlight);
        assert!(!scan.has_zeroheight);
        assert!(scan.token_files.is_empty());
        assert!(scan.test_runners.is_empty());
        assert!(scan.visual_regression_providers.is_empty());
        assert!(scan.ci_providers.is_empty());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn prefers_pnpm_over_npm_when_both_lockfiles_are_present() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-pm-test-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");
        fs::write(dir.join("pnpm-lock.yaml"), "").unwrap();
        fs::write(dir.join("package-lock.json"), "").unwrap();

        let scan = scan_workspace(&dir);
        assert_eq!(scan.package_manager, Some("pnpm".to_string()));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn prefers_nx_over_turborepo_when_both_are_present() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-wm-test-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");
        fs::write(dir.join("nx.json"), "{}").unwrap();
        fs::write(dir.join("turbo.json"), "{}").unwrap();

        let scan = scan_workspace(&dir);
        assert_eq!(scan.workspace_manager, Some("nx".to_string()));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn detects_package_json_workspaces_when_no_dedicated_tool_is_present() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-pjw-test-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");
        fs::write(dir.join("package.json"), r#"{"workspaces": ["packages/*"]}"#).unwrap();

        let scan = scan_workspace(&dir);
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

        let scan = scan_workspace(&dir);
        assert!(scan.visual_regression_providers.contains(&"chromatic".to_string()));
        assert!(scan.visual_regression_providers.contains(&"percy".to_string()));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn detects_zeroheight_from_a_config_file() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-zh-test-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");
        fs::write(dir.join("zeroheight.config.json"), "{}").unwrap();

        let scan = scan_workspace(&dir);
        assert!(scan.has_zeroheight);

        fs::remove_dir_all(&dir).ok();
    }
}
