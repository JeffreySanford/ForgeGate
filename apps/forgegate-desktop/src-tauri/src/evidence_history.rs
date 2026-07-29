use postgres::{Client, NoTls};
use serde::Serialize;

use crate::workspace_scan::WorkspaceScan;

const DATABASE_URL_ENV: &str = "FORGEGATE_DATABASE_URL";

struct Migration {
    version: &'static str,
    sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[Migration {
    version: "0001_evidence_history",
    sql: include_str!("../migrations/0001_evidence_history.sql"),
}];

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceStatus {
    pub configured: bool,
    pub connected: bool,
    pub applied_migrations: Vec<String>,
    pub scan_snapshot_count: i64,
    pub error: Option<String>,
}

pub fn persistence_status_from_env() -> PersistenceStatus {
    let Some(database_url) = database_url_from_env() else {
        return PersistenceStatus {
            configured: false,
            connected: false,
            applied_migrations: Vec::new(),
            scan_snapshot_count: 0,
            error: None,
        };
    };

    match connect_and_migrate(&database_url) {
        Ok(mut client) => PersistenceStatus {
            configured: true,
            connected: true,
            applied_migrations: applied_migrations(&mut client).unwrap_or_default(),
            scan_snapshot_count: scan_snapshot_count(&mut client).unwrap_or(0),
            error: None,
        },
        Err(error) => PersistenceStatus {
            configured: true,
            connected: false,
            applied_migrations: Vec::new(),
            scan_snapshot_count: 0,
            error: Some(error),
        },
    }
}

pub fn record_scan_snapshot_if_configured(
    workspace_path: &str,
    scan: &WorkspaceScan,
) -> Result<Option<i64>, String> {
    let Some(database_url) = database_url_from_env() else {
        return Ok(None);
    };

    let mut client = connect_and_migrate(&database_url)?;
    let workspace_id = upsert_workspace(&mut client, workspace_path)?;
    let scan_json = serde_json::to_value(scan)
        .map_err(|error| format!("Failed to serialize workspace scan: {error}"))?;
    let adapter_summary = adapter_summary(scan);
    let row = client
        .query_one(
            "INSERT INTO scan_snapshots (
                workspace_id,
                package_name,
                package_manager,
                workspace_manager,
                adapter_summary,
                scan
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id",
            &[
                &workspace_id,
                &scan.package_name,
                &scan.package_manager,
                &scan.workspace_manager,
                &adapter_summary,
                &scan_json,
            ],
        )
        .map_err(|error| format!("Failed to insert scan snapshot: {error}"))?;

    Ok(Some(row.get(0)))
}

fn database_url_from_env() -> Option<String> {
    std::env::var(DATABASE_URL_ENV)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn connect_and_migrate(database_url: &str) -> Result<Client, String> {
    let mut client = Client::connect(database_url, NoTls)
        .map_err(|error| format!("Failed to connect to Postgres: {error}"))?;
    apply_migrations(&mut client)?;
    Ok(client)
}

fn apply_migrations(client: &mut Client) -> Result<(), String> {
    client
        .batch_execute(
            "CREATE TABLE IF NOT EXISTS forgegate_schema_migrations (
                version text PRIMARY KEY,
                applied_at timestamptz NOT NULL DEFAULT now()
            )",
        )
        .map_err(|error| format!("Failed to bootstrap migration table: {error}"))?;

    for migration in MIGRATIONS {
        let already_applied = client
            .query_opt(
                "SELECT 1 FROM forgegate_schema_migrations WHERE version = $1",
                &[&migration.version],
            )
            .map_err(|error| format!("Failed to read migration state: {error}"))?
            .is_some();
        if already_applied {
            continue;
        }
        let mut transaction = client
            .transaction()
            .map_err(|error| format!("Failed to start migration transaction: {error}"))?;
        transaction
            .batch_execute(migration.sql)
            .map_err(|error| format!("Failed to apply migration {}: {error}", migration.version))?;
        transaction
            .execute(
                "INSERT INTO forgegate_schema_migrations (version) VALUES ($1)",
                &[&migration.version],
            )
            .map_err(|error| {
                format!("Failed to record migration {}: {error}", migration.version)
            })?;
        transaction.commit().map_err(|error| {
            format!("Failed to commit migration {}: {error}", migration.version)
        })?;
    }
    Ok(())
}

fn applied_migrations(client: &mut Client) -> Result<Vec<String>, String> {
    client
        .query(
            "SELECT version FROM forgegate_schema_migrations ORDER BY version",
            &[],
        )
        .map(|rows| rows.into_iter().map(|row| row.get(0)).collect())
        .map_err(|error| format!("Failed to list migrations: {error}"))
}

fn scan_snapshot_count(client: &mut Client) -> Result<i64, String> {
    client
        .query_one("SELECT count(*)::bigint FROM scan_snapshots", &[])
        .map(|row| row.get(0))
        .map_err(|error| format!("Failed to count scan snapshots: {error}"))
}

fn upsert_workspace(client: &mut Client, workspace_path: &str) -> Result<i64, String> {
    client
        .query_one(
            "INSERT INTO workspaces (workspace_path)
            VALUES ($1)
            ON CONFLICT (workspace_path)
            DO UPDATE SET last_seen_at = now()
            RETURNING id",
            &[&workspace_path],
        )
        .map(|row| row.get(0))
        .map_err(|error| format!("Failed to upsert workspace: {error}"))
}

fn adapter_summary(scan: &WorkspaceScan) -> serde_json::Value {
    serde_json::json!({
        "storybookProjects": scan.storybook_projects.len(),
        "starlightProjects": scan.starlight_projects.len(),
        "tokenFiles": scan.token_files.len(),
        "testRunners": scan.test_runners.len(),
        "visualRegressionProviders": scan.visual_regression_providers.len(),
        "ciProviders": scan.ci_providers.len(),
        "customElementsManifests": scan.custom_elements_manifests.len(),
        "componentManifests": scan.component_manifests.len(),
        "testEvidenceFiles": scan.test_evidence_files.len(),
        "uiTechnologies": scan.ui_technologies.len(),
        "uiSourceFiles": scan.ui_source_files.len(),
        "uiSourceFilesTruncated": scan.ui_source_files_truncated,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_unconfigured_when_no_database_url_is_available() {
        let status = match std::env::var(DATABASE_URL_ENV) {
            Ok(original) => {
                std::env::remove_var(DATABASE_URL_ENV);
                let status = persistence_status_from_env();
                std::env::set_var(DATABASE_URL_ENV, original);
                status
            }
            Err(_) => persistence_status_from_env(),
        };

        assert_eq!(
            status,
            PersistenceStatus {
                configured: false,
                connected: false,
                applied_migrations: Vec::new(),
                scan_snapshot_count: 0,
                error: None,
            }
        );
    }

    #[test]
    fn migration_sql_creates_the_append_only_snapshot_tables() {
        let sql = MIGRATIONS[0].sql;

        assert!(sql.contains("CREATE TABLE IF NOT EXISTS workspaces"));
        assert!(sql.contains("CREATE TABLE IF NOT EXISTS scan_snapshots"));
        assert!(sql.contains("seeded boolean NOT NULL DEFAULT false"));
        assert!(sql.contains("scan jsonb NOT NULL"));
    }

    #[test]
    #[ignore = "requires FORGEGATE_DATABASE_URL pointing at a disposable Postgres database"]
    fn records_scan_snapshot_when_database_configured() {
        let database_url = std::env::var(DATABASE_URL_ENV)
            .expect("FORGEGATE_DATABASE_URL must point at a test Postgres database");
        let mut client =
            connect_and_migrate(&database_url).expect("test database should be reachable");
        client
            .batch_execute("TRUNCATE scan_snapshots, workspaces RESTART IDENTITY CASCADE")
            .expect("test database should be disposable");

        let scan = WorkspaceScan {
            package_name: Some("@acme/design-system".to_string()),
            package_manager: Some("pnpm".to_string()),
            workspace_manager: Some("nx".to_string()),
            storybook_projects: vec!["apps/storybook".to_string()],
            starlight_projects: Vec::new(),
            has_zeroheight: false,
            token_files: vec!["tokens/design-tokens.json".to_string()],
            test_runners: vec!["vitest".to_string()],
            visual_regression_providers: vec!["playwright".to_string()],
            ci_providers: vec!["github-actions".to_string()],
            custom_elements_manifests: Vec::new(),
            component_packages: Vec::new(),
            component_manifests: vec![
                ".forgegate/components/acme.design-system.button.yaml".to_string()
            ],
            test_evidence_files: Vec::new(),
            ui_technologies: Vec::new(),
            ui_source_files: vec!["src/button.component.ts".to_string()],
            ui_source_files_truncated: false,
        };

        let snapshot_id = record_scan_snapshot_if_configured("D:/repos/acme", &scan)
            .expect("snapshot insert should succeed")
            .expect("configured database should insert a snapshot");

        let row = client
            .query_one(
                "SELECT package_name, package_manager, scan->>'packageName'
                FROM scan_snapshots
                WHERE id = $1",
                &[&snapshot_id],
            )
            .expect("snapshot should be readable");

        assert_eq!(row.get::<_, String>(0), "@acme/design-system");
        assert_eq!(row.get::<_, String>(1), "pnpm");
        assert_eq!(row.get::<_, String>(2), "@acme/design-system");
    }
}
