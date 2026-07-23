use serde::Serialize;
use std::fs;
use std::path::Path;

/// Non-recursive, top-level workspace detection, per documentation/16-data-and-schema-model.md
/// ("Workspace") and TODO.md Phase 3 ("Repository scanning"). This is a first
/// slice: it reads directory entries and, where a claim needs more than a
/// filename match (Starlight), a small amount of file content — it never
/// walks into node_modules or recurses beyond one extra level for token
/// files. Deeper, adapter-driven discovery (frameworks, versions, visual
/// providers) is later Phase 3/5/12 work.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceScan {
    package_manager: Option<String>,
    has_nx: bool,
    has_storybook: bool,
    has_starlight: bool,
    token_files: Vec<String>,
    test_runners: Vec<String>,
    ci_providers: Vec<String>,
}

pub fn scan_workspace(root: &Path) -> WorkspaceScan {
    let entries = top_level_entry_names(root);

    WorkspaceScan {
        package_manager: detect_package_manager(&entries),
        has_nx: entries.contains(&"nx.json".to_string()),
        has_storybook: entries.contains(&".storybook".to_string()),
        has_starlight: detect_starlight(root, &entries),
        token_files: detect_token_files(root, &entries),
        test_runners: detect_test_runners(&entries),
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
        assert!(scan.has_nx);
        assert!(!scan.has_storybook, "ForgeGate does not use Storybook on itself");
        assert!(!scan.has_starlight, "ForgeGate does not use Starlight on itself");
        assert!(scan.token_files.is_empty());
        assert!(scan.test_runners.contains(&"vitest".to_string()));
        assert!(!scan.test_runners.contains(&"jest".to_string()));
        assert!(scan.ci_providers.contains(&"github-actions".to_string()));
    }

    #[test]
    fn returns_defaults_for_an_empty_directory() {
        let dir = std::env::temp_dir().join(format!("forgegate-scan-test-{}", std::process::id()));
        fs::create_dir_all(&dir).expect("should create temp dir");

        let scan = scan_workspace(&dir);

        assert_eq!(scan.package_manager, None);
        assert!(!scan.has_nx);
        assert!(!scan.has_storybook);
        assert!(!scan.has_starlight);
        assert!(scan.token_files.is_empty());
        assert!(scan.test_runners.is_empty());
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
}
