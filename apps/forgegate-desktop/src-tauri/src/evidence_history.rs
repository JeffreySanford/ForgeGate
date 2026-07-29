use postgres::{Client, NoTls};
use serde::{Deserialize, Serialize};

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

#[cfg(test)]
const DEV_EVIDENCE_HISTORY_SEED_SQL: &str = include_str!("../seeds/dev_evidence_history.sql");

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceStatus {
    pub configured: bool,
    pub connected: bool,
    pub applied_migrations: Vec<String>,
    pub scan_snapshot_count: i64,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnrichedScanSnapshot {
    pub source_commit: Option<String>,
    pub dirty: Option<bool>,
    pub component_count: i32,
    pub readiness_summary: serde_json::Value,
    pub adapter_summary: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceHistorySnapshot {
    pub id: i64,
    pub scanned_at: String,
    pub source_commit: Option<String>,
    pub dirty: Option<bool>,
    pub component_count: Option<i32>,
    pub readiness_summary: Option<serde_json::Value>,
    pub adapter_summary: serde_json::Value,
    pub seeded: bool,
    pub seed_label: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceHistoryTrend {
    pub configured: bool,
    pub connected: bool,
    pub snapshots: Vec<EvidenceHistorySnapshot>,
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

pub fn evidence_history_trend_from_env(workspace_path: &str) -> EvidenceHistoryTrend {
    let Some(database_url) = database_url_from_env() else {
        return EvidenceHistoryTrend {
            configured: false,
            connected: false,
            snapshots: Vec::new(),
            error: None,
        };
    };

    match connect_and_migrate(&database_url)
        .and_then(|mut client| evidence_history_trend(&mut client, workspace_path, 24))
    {
        Ok(snapshots) => EvidenceHistoryTrend {
            configured: true,
            connected: true,
            snapshots,
            error: None,
        },
        Err(error) => EvidenceHistoryTrend {
            configured: true,
            connected: false,
            snapshots: Vec::new(),
            error: Some(error),
        },
    }
}

pub fn enrich_latest_scan_snapshot_if_configured(
    workspace_path: &str,
    snapshot: &EnrichedScanSnapshot,
) -> Result<Option<i64>, String> {
    let Some(database_url) = database_url_from_env() else {
        return Ok(None);
    };

    let mut client = connect_and_migrate(&database_url)?;
    let workspace_id = upsert_workspace(&mut client, workspace_path)?;
    let row = client
        .query_opt(
            "UPDATE scan_snapshots
            SET
                source_commit = $2,
                dirty = $3,
                component_count = $4,
                readiness_summary = $5,
                adapter_summary = $6
            WHERE id = (
                SELECT id
                FROM scan_snapshots
                WHERE workspace_id = $1 AND seeded = false
                ORDER BY scanned_at DESC, id DESC
                LIMIT 1
            )
            RETURNING id",
            &[
                &workspace_id,
                &snapshot.source_commit,
                &snapshot.dirty,
                &snapshot.component_count,
                &snapshot.readiness_summary,
                &snapshot.adapter_summary,
            ],
        )
        .map_err(|error| format!("Failed to enrich scan snapshot: {error}"))?;

    Ok(row.map(|row| row.get(0)))
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

fn evidence_history_trend(
    client: &mut Client,
    workspace_path: &str,
    limit: i64,
) -> Result<Vec<EvidenceHistorySnapshot>, String> {
    let normalized_workspace_path = normalize_workspace_path_for_history_lookup(workspace_path);
    client
        .query(
            "SELECT
                scan_snapshots.id,
                to_char(scan_snapshots.scanned_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS scanned_at,
                scan_snapshots.source_commit,
                scan_snapshots.dirty,
                scan_snapshots.component_count,
                scan_snapshots.readiness_summary,
                scan_snapshots.adapter_summary,
                scan_snapshots.seeded,
                scan_snapshots.seed_label
            FROM scan_snapshots
            JOIN workspaces ON workspaces.id = scan_snapshots.workspace_id
            WHERE workspaces.workspace_path = $1
               OR workspaces.workspace_path = $2
            ORDER BY scan_snapshots.scanned_at DESC, scan_snapshots.id DESC
            LIMIT $3",
            &[&workspace_path, &normalized_workspace_path, &limit],
        )
        .map(|rows| {
            let mut snapshots = rows
                .into_iter()
                .map(|row| EvidenceHistorySnapshot {
                    id: row.get(0),
                    scanned_at: row.get(1),
                    source_commit: row.get(2),
                    dirty: row.get(3),
                    component_count: row.get(4),
                    readiness_summary: row.get(5),
                    adapter_summary: row.get(6),
                    seeded: row.get(7),
                    seed_label: row.get(8),
                })
                .collect::<Vec<_>>();
            snapshots.reverse();
            snapshots
        })
        .map_err(|error| format!("Failed to read evidence history trend: {error}"))
}

fn normalize_workspace_path_for_history_lookup(workspace_path: &str) -> String {
    workspace_path.replace('\\', "/")
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
    fn dev_seed_sql_is_replaceable_and_unmistakably_seeded() {
        let sql = DEV_EVIDENCE_HISTORY_SEED_SQL;

        assert!(sql.contains("seed_label = 'dev-history-2026-07'"));
        assert!(sql.contains("'dev-history-2026-07'"));
        assert!(sql.contains("seeded,"));
        assert!(sql.contains("true,"));
        assert!(sql.contains("D:/repos/public-sector-federation"));
        assert!(sql.contains("D:/repos/phase-2-cosmic"));
        assert_eq!(sql.matches("'2026-").count(), 12);
    }

    #[test]
    fn trend_query_normalizes_windows_path_separators() {
        assert_eq!(
            normalize_workspace_path_for_history_lookup(r"D:\repos\ForgeGate"),
            "D:/repos/ForgeGate"
        );
        assert_eq!(
            normalize_workspace_path_for_history_lookup("D:/repos/ForgeGate"),
            "D:/repos/ForgeGate"
        );
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

    #[test]
    #[ignore = "requires FORGEGATE_DATABASE_URL pointing at a disposable Postgres database"]
    fn enriches_latest_scan_snapshot_when_database_configured() {
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
            storybook_projects: Vec::new(),
            starlight_projects: Vec::new(),
            has_zeroheight: false,
            token_files: Vec::new(),
            test_runners: vec!["vitest".to_string()],
            visual_regression_providers: Vec::new(),
            ci_providers: vec!["github-actions".to_string()],
            custom_elements_manifests: Vec::new(),
            component_packages: Vec::new(),
            component_manifests: Vec::new(),
            test_evidence_files: Vec::new(),
            ui_technologies: Vec::new(),
            ui_source_files: Vec::new(),
            ui_source_files_truncated: false,
        };
        let snapshot_id = record_scan_snapshot_if_configured("D:/repos/acme", &scan)
            .expect("raw snapshot insert should succeed")
            .expect("configured database should insert a snapshot");

        let enriched = EnrichedScanSnapshot {
            source_commit: Some("a".repeat(40)),
            dirty: Some(true),
            component_count: 3,
            readiness_summary: serde_json::json!({
                "total": 3,
                "readiness": { "unknown": 3 },
                "lifecycle": { "candidate": 2, "proposal": 1 }
            }),
            adapter_summary: serde_json::json!({
                "total": 2,
                "byStatus": { "loaded": 1, "partial": 1 }
            }),
        };
        let enriched_id = enrich_latest_scan_snapshot_if_configured("D:/repos/acme", &enriched)
            .expect("snapshot enrichment should succeed")
            .expect("latest raw snapshot should be enriched");

        assert_eq!(enriched_id, snapshot_id);
        let row = client
            .query_one(
                "SELECT source_commit, dirty, component_count, readiness_summary->'readiness'->>'unknown', adapter_summary->'byStatus'->>'partial'
                FROM scan_snapshots
                WHERE id = $1",
                &[&snapshot_id],
            )
            .expect("enriched snapshot should be readable");

        assert_eq!(row.get::<_, String>(0), "a".repeat(40));
        assert!(row.get::<_, bool>(1));
        assert_eq!(row.get::<_, i32>(2), 3);
        assert_eq!(row.get::<_, String>(3), "3");
        assert_eq!(row.get::<_, String>(4), "1");
    }

    #[test]
    #[ignore = "requires FORGEGATE_DATABASE_URL pointing at a disposable Postgres database"]
    fn reads_history_trend_for_a_workspace_with_normalized_path_separators() {
        let database_url = std::env::var(DATABASE_URL_ENV)
            .expect("FORGEGATE_DATABASE_URL must point at a test Postgres database");
        let mut client =
            connect_and_migrate(&database_url).expect("test database should be reachable");
        client
            .batch_execute("TRUNCATE scan_snapshots, workspaces RESTART IDENTITY CASCADE")
            .expect("test database should be disposable");

        let workspace_id = upsert_workspace(&mut client, "D:/repos/acme")
            .expect("workspace insert should succeed");
        client
            .execute(
                "INSERT INTO scan_snapshots (
                    workspace_id,
                    scanned_at,
                    source_commit,
                    dirty,
                    component_count,
                    readiness_summary,
                    adapter_summary,
                    scan,
                    seeded,
                    seed_label
                )
                VALUES
                    ($1, '2026-01-15T15:00:00Z', $2, false, 2, $3, $4, '{}'::jsonb, true, 'test-seed'),
                    ($1, '2026-02-15T15:00:00Z', $5, true, 4, $6, $7, '{}'::jsonb, true, 'test-seed')",
                &[
                    &workspace_id,
                    &"a".repeat(40),
                    &serde_json::json!({ "readiness": { "unknown": 2 } }),
                    &serde_json::json!({ "byStatus": { "loaded": 1 } }),
                    &"b".repeat(40),
                    &serde_json::json!({ "readiness": { "unknown": 4 } }),
                    &serde_json::json!({ "byStatus": { "loaded": 2, "partial": 1 } }),
                ],
            )
            .expect("snapshot inserts should succeed");

        let snapshots = evidence_history_trend(&mut client, r"D:\repos\acme", 24)
            .expect("trend query should succeed");

        assert_eq!(snapshots.len(), 2);
        assert_eq!(snapshots[0].scanned_at, "2026-01-15T15:00:00Z");
        assert_eq!(snapshots[1].component_count, Some(4));
        assert!(snapshots[1].dirty.unwrap());
        assert_eq!(snapshots[1].seed_label.as_deref(), Some("test-seed"));
    }
}
