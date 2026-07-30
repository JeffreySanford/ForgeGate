use postgres::{Client, NoTls};
use serde::{Deserialize, Serialize};

use crate::workspace_scan::WorkspaceScan;

const DATABASE_URL_ENV: &str = "FORGEGATE_DATABASE_URL";

struct Migration {
    version: &'static str,
    sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: "0001_evidence_history",
        sql: include_str!("../migrations/0001_evidence_history.sql"),
    },
    Migration {
        version: "0002_component_snapshots",
        sql: include_str!("../migrations/0002_component_snapshots.sql"),
    },
    Migration {
        version: "0003_evidence_events",
        sql: include_str!("../migrations/0003_evidence_events.sql"),
    },
];

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
    pub components: Vec<EnrichedComponentSnapshot>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnrichedComponentSnapshot {
    pub component_id: String,
    pub component_version: Option<String>,
    pub framework: String,
    pub adapter: String,
    pub lifecycle: String,
    pub source_files: Vec<String>,
    pub readiness: String,
    pub finding_summary: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceHistorySnapshot {
    pub id: i64,
    pub scanned_at: String,
    pub source_commit: Option<String>,
    pub dirty: Option<bool>,
    pub component_count: Option<i32>,
    pub component_snapshot_count: i64,
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentEvidenceEvent {
    pub occurred_at: String,
    pub event_kind: String,
    pub previous_readiness: String,
    pub next_readiness: String,
    pub previous_commit: Option<String>,
    pub next_commit: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentEvidenceEvents {
    pub configured: bool,
    pub connected: bool,
    pub events: Vec<ComponentEvidenceEvent>,
    pub error: Option<String>,
}

/// A component whose derived readiness differs between two consecutive
/// enriched scans of the same workspace — the real, narrow first slice of
/// "the exact causal event that made evidence stale" (see TODO.md's
/// evidence-history follow-up backlog). Only readiness changes are modeled
/// here; manual-review and release-decision event kinds need those features
/// to exist first and are deliberately not fabricated.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ComponentReadinessChange {
    pub component_id: String,
    pub previous_readiness: String,
    pub next_readiness: String,
}

/// Pure diff, no database or Tauri types involved, so it can be unit-tested
/// directly with synthetic inputs. Only emits a change for a component that
/// existed in the previous scan with a *different* readiness value — a
/// component with no prior recorded readiness (first time seen) has nothing
/// to compare against, so it is not a "change" yet.
fn diff_component_readiness(
    previous_readiness_by_component: &std::collections::HashMap<String, String>,
    next: &[EnrichedComponentSnapshot],
) -> Vec<ComponentReadinessChange> {
    next.iter()
        .filter_map(|component| {
            let previous_readiness =
                previous_readiness_by_component.get(&component.component_id)?;
            if previous_readiness == &component.readiness {
                return None;
            }
            Some(ComponentReadinessChange {
                component_id: component.component_id.clone(),
                previous_readiness: previous_readiness.clone(),
                next_readiness: component.readiness.clone(),
            })
        })
        .collect()
}

pub fn component_evidence_events_from_env(
    workspace_path: &str,
    component_id: &str,
) -> ComponentEvidenceEvents {
    let Some(database_url) = database_url_from_env() else {
        return ComponentEvidenceEvents {
            configured: false,
            connected: false,
            events: Vec::new(),
            error: None,
        };
    };

    match connect_and_migrate(&database_url)
        .and_then(|mut client| component_evidence_events(&mut client, workspace_path, component_id, 20))
    {
        Ok(events) => ComponentEvidenceEvents {
            configured: true,
            connected: true,
            events,
            error: None,
        },
        Err(error) => ComponentEvidenceEvents {
            configured: true,
            connected: false,
            events: Vec::new(),
            error: Some(error),
        },
    }
}

fn component_evidence_events(
    client: &mut Client,
    workspace_path: &str,
    component_id: &str,
    limit: i64,
) -> Result<Vec<ComponentEvidenceEvent>, String> {
    let normalized_workspace_path = normalize_workspace_path_for_history_lookup(workspace_path);
    client
        .query(
            "SELECT
                to_char(evidence_events.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS occurred_at,
                evidence_events.event_kind,
                evidence_events.previous_readiness,
                evidence_events.next_readiness,
                evidence_events.previous_commit,
                evidence_events.next_commit
            FROM evidence_events
            JOIN workspaces ON workspaces.id = evidence_events.workspace_id
            WHERE (workspaces.workspace_path = $1 OR workspaces.workspace_path = $2)
              AND evidence_events.component_id = $3
            ORDER BY evidence_events.occurred_at DESC, evidence_events.id DESC
            LIMIT $4",
            &[&workspace_path, &normalized_workspace_path, &component_id, &limit],
        )
        .map(|rows| {
            rows.into_iter()
                .map(|row| ComponentEvidenceEvent {
                    occurred_at: row.get(0),
                    event_kind: row.get(1),
                    previous_readiness: row.get(2),
                    next_readiness: row.get(3),
                    previous_commit: row.get(4),
                    next_commit: row.get(5),
                })
                .collect()
        })
        .map_err(|error| format!("Failed to read component evidence events: {error}"))
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
    let mut transaction = client
        .transaction()
        .map_err(|error| format!("Failed to start scan enrichment transaction: {error}"))?;
    let row = transaction
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

    let Some(row) = row else {
        transaction
            .commit()
            .map_err(|error| format!("Failed to commit scan enrichment transaction: {error}"))?;
        return Ok(None);
    };
    let snapshot_id = row.get::<_, i64>(0);

    let previous_scan = transaction
        .query_opt(
            "SELECT scan_snapshots.id, scan_snapshots.source_commit
            FROM scan_snapshots
            WHERE workspace_id = $1 AND id != $2
              AND EXISTS (
                SELECT 1 FROM component_snapshots
                WHERE component_snapshots.scan_snapshot_id = scan_snapshots.id
              )
            ORDER BY scanned_at DESC, id DESC
            LIMIT 1",
            &[&workspace_id, &snapshot_id],
        )
        .map_err(|error| format!("Failed to look up the previous enriched scan: {error}"))?;

    let previous_readiness_by_component = if let Some(previous_scan) = &previous_scan {
        let previous_scan_id: i64 = previous_scan.get(0);
        transaction
            .query(
                "SELECT component_id, readiness FROM component_snapshots WHERE scan_snapshot_id = $1",
                &[&previous_scan_id],
            )
            .map_err(|error| format!("Failed to read previous component readiness: {error}"))?
            .into_iter()
            .map(|row| (row.get::<_, String>(0), row.get::<_, String>(1)))
            .collect::<std::collections::HashMap<String, String>>()
    } else {
        std::collections::HashMap::new()
    };

    transaction
        .execute(
            "DELETE FROM component_snapshots WHERE scan_snapshot_id = $1",
            &[&snapshot_id],
        )
        .map_err(|error| format!("Failed to replace component snapshots: {error}"))?;

    for component in &snapshot.components {
        let source_files = serde_json::to_value(&component.source_files)
            .map_err(|error| format!("Failed to serialize component source files: {error}"))?;
        transaction
            .execute(
                "INSERT INTO component_snapshots (
                    scan_snapshot_id,
                    component_id,
                    component_version,
                    framework,
                    adapter,
                    lifecycle,
                    source_files,
                    readiness,
                    finding_summary
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                &[
                    &snapshot_id,
                    &component.component_id,
                    &component.component_version,
                    &component.framework,
                    &component.adapter,
                    &component.lifecycle,
                    &source_files,
                    &component.readiness,
                    &component.finding_summary,
                ],
            )
            .map_err(|error| format!("Failed to insert component snapshot: {error}"))?;
    }

    let previous_scan_id: Option<i64> = previous_scan.as_ref().map(|row| row.get(0));
    let previous_commit: Option<String> = previous_scan
        .as_ref()
        .and_then(|row| row.get::<_, Option<String>>(1));
    let readiness_changes =
        diff_component_readiness(&previous_readiness_by_component, &snapshot.components);

    for change in &readiness_changes {
        transaction
            .execute(
                "INSERT INTO evidence_events (
                    workspace_id,
                    component_id,
                    scan_snapshot_id,
                    previous_scan_snapshot_id,
                    event_kind,
                    previous_readiness,
                    next_readiness,
                    previous_commit,
                    next_commit
                )
                VALUES ($1, $2, $3, $4, 'readiness-changed', $5, $6, $7, $8)",
                &[
                    &workspace_id,
                    &change.component_id,
                    &snapshot_id,
                    &previous_scan_id,
                    &change.previous_readiness,
                    &change.next_readiness,
                    &previous_commit,
                    &snapshot.source_commit,
                ],
            )
            .map_err(|error| format!("Failed to record evidence event: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("Failed to commit scan enrichment transaction: {error}"))?;

    Ok(Some(snapshot_id))
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
                count(component_snapshots.id)::bigint AS component_snapshot_count,
                scan_snapshots.readiness_summary,
                scan_snapshots.adapter_summary,
                scan_snapshots.seeded,
                scan_snapshots.seed_label
            FROM scan_snapshots
            JOIN workspaces ON workspaces.id = scan_snapshots.workspace_id
            LEFT JOIN component_snapshots ON component_snapshots.scan_snapshot_id = scan_snapshots.id
            WHERE workspaces.workspace_path = $1
               OR workspaces.workspace_path = $2
            GROUP BY scan_snapshots.id
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
                    component_snapshot_count: row.get(5),
                    readiness_summary: row.get(6),
                    adapter_summary: row.get(7),
                    seeded: row.get(8),
                    seed_label: row.get(9),
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
    fn migration_sql_creates_component_snapshots_below_scan_snapshots() {
        let sql = MIGRATIONS[1].sql;

        assert!(sql.contains("CREATE TABLE IF NOT EXISTS component_snapshots"));
        assert!(sql.contains("scan_snapshot_id bigint NOT NULL REFERENCES scan_snapshots"));
        assert!(sql.contains("component_id text NOT NULL"));
        assert!(sql.contains("finding_summary jsonb NOT NULL"));
        assert!(sql.contains("readiness IN"));
    }

    #[test]
    fn migration_sql_creates_append_only_evidence_events_referencing_scan_snapshots() {
        let sql = MIGRATIONS[2].sql;

        assert!(sql.contains("CREATE TABLE IF NOT EXISTS evidence_events"));
        assert!(sql.contains("component_id text NOT NULL"));
        assert!(sql.contains("scan_snapshot_id bigint NOT NULL REFERENCES scan_snapshots"));
        assert!(sql.contains("event_kind text NOT NULL"));
        assert!(sql.contains("'readiness-changed'"));
    }

    #[test]
    fn diff_component_readiness_reports_only_components_whose_readiness_actually_changed() {
        let mut previous = std::collections::HashMap::new();
        previous.insert("acme.button".to_string(), "clear".to_string());
        previous.insert("acme.card".to_string(), "warning".to_string());

        let next = vec![
            EnrichedComponentSnapshot {
                component_id: "acme.button".to_string(),
                component_version: None,
                framework: "web-components".to_string(),
                adapter: "framework.web-components".to_string(),
                lifecycle: "candidate".to_string(),
                source_files: Vec::new(),
                readiness: "stale".to_string(),
                finding_summary: serde_json::json!({}),
            },
            EnrichedComponentSnapshot {
                component_id: "acme.card".to_string(),
                component_version: None,
                framework: "web-components".to_string(),
                adapter: "framework.web-components".to_string(),
                lifecycle: "candidate".to_string(),
                source_files: Vec::new(),
                readiness: "warning".to_string(),
                finding_summary: serde_json::json!({}),
            },
        ];

        let changes = diff_component_readiness(&previous, &next);

        assert_eq!(
            changes,
            vec![ComponentReadinessChange {
                component_id: "acme.button".to_string(),
                previous_readiness: "clear".to_string(),
                next_readiness: "stale".to_string(),
            }]
        );
    }

    #[test]
    fn diff_component_readiness_reports_nothing_for_a_component_with_no_previous_readiness() {
        let previous = std::collections::HashMap::new();
        let next = vec![EnrichedComponentSnapshot {
            component_id: "acme.newly-scanned".to_string(),
            component_version: None,
            framework: "web-components".to_string(),
            adapter: "framework.web-components".to_string(),
            lifecycle: "proposal".to_string(),
            source_files: Vec::new(),
            readiness: "unknown".to_string(),
            finding_summary: serde_json::json!({}),
        }];

        assert!(diff_component_readiness(&previous, &next).is_empty());
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
            manual_review_files: Vec::new(),
            exception_files: Vec::new(),
            procedure_files: Vec::new(),
            finding_files: Vec::new(),
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
            manual_review_files: Vec::new(),
            exception_files: Vec::new(),
            procedure_files: Vec::new(),
            finding_files: Vec::new(),
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
            components: vec![
                EnrichedComponentSnapshot {
                    component_id: "acme.design-system.button".to_string(),
                    component_version: Some("1.0.0".to_string()),
                    framework: "web-components".to_string(),
                    adapter: "framework.web-components".to_string(),
                    lifecycle: "candidate".to_string(),
                    source_files: vec!["src/button.ts".to_string()],
                    readiness: "unknown".to_string(),
                    finding_summary: serde_json::json!({
                        "status": "not-evaluated",
                        "findings": [],
                        "reason": "ForgeGate has not derived per-component readiness findings yet."
                    }),
                },
                EnrichedComponentSnapshot {
                    component_id: "acme.design-system.card".to_string(),
                    component_version: None,
                    framework: "web-components".to_string(),
                    adapter: "framework.web-components".to_string(),
                    lifecycle: "proposal".to_string(),
                    source_files: vec!["src/card.ts".to_string()],
                    readiness: "unknown".to_string(),
                    finding_summary: serde_json::json!({
                        "status": "not-evaluated",
                        "findings": []
                    }),
                },
            ],
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

        let component_rows = client
            .query(
                "SELECT component_id, component_version, lifecycle, readiness, source_files->>0, finding_summary->>'status'
                FROM component_snapshots
                WHERE scan_snapshot_id = $1
                ORDER BY component_id",
                &[&snapshot_id],
            )
            .expect("component snapshots should be readable");

        assert_eq!(component_rows.len(), 2);
        assert_eq!(
            component_rows[0].get::<_, String>(0),
            "acme.design-system.button"
        );
        assert_eq!(component_rows[0].get::<_, String>(1), "1.0.0");
        assert_eq!(component_rows[0].get::<_, String>(2), "candidate");
        assert_eq!(component_rows[0].get::<_, String>(3), "unknown");
        assert_eq!(component_rows[0].get::<_, String>(4), "src/button.ts");
        assert_eq!(component_rows[0].get::<_, String>(5), "not-evaluated");
    }

    #[test]
    #[ignore = "requires FORGEGATE_DATABASE_URL pointing at a disposable Postgres database"]
    fn records_a_readiness_changed_evidence_event_across_two_enriched_scans() {
        let database_url = std::env::var(DATABASE_URL_ENV)
            .expect("FORGEGATE_DATABASE_URL must point at a test Postgres database");
        let mut client =
            connect_and_migrate(&database_url).expect("test database should be reachable");
        client
            .batch_execute(
                "TRUNCATE evidence_events, component_snapshots, scan_snapshots, workspaces RESTART IDENTITY CASCADE",
            )
            .expect("test database should be disposable");

        let scan = WorkspaceScan {
            package_name: Some("@acme/design-system".to_string()),
            package_manager: Some("pnpm".to_string()),
            workspace_manager: Some("nx".to_string()),
            storybook_projects: Vec::new(),
            starlight_projects: Vec::new(),
            has_zeroheight: false,
            token_files: Vec::new(),
            test_runners: Vec::new(),
            visual_regression_providers: Vec::new(),
            ci_providers: Vec::new(),
            custom_elements_manifests: Vec::new(),
            component_packages: Vec::new(),
            component_manifests: Vec::new(),
            test_evidence_files: Vec::new(),
            manual_review_files: Vec::new(),
            exception_files: Vec::new(),
            procedure_files: Vec::new(),
            finding_files: Vec::new(),
            ui_technologies: Vec::new(),
            ui_source_files: Vec::new(),
            ui_source_files_truncated: false,
        };

        let button = |readiness: &str| EnrichedComponentSnapshot {
            component_id: "acme.design-system.button".to_string(),
            component_version: Some("1.0.0".to_string()),
            framework: "web-components".to_string(),
            adapter: "framework.web-components".to_string(),
            lifecycle: "candidate".to_string(),
            source_files: vec!["src/button.ts".to_string()],
            readiness: readiness.to_string(),
            finding_summary: serde_json::json!({}),
        };

        record_scan_snapshot_if_configured("D:/repos/acme", &scan)
            .expect("first raw snapshot insert should succeed");
        enrich_latest_scan_snapshot_if_configured(
            "D:/repos/acme",
            &EnrichedScanSnapshot {
                source_commit: Some("a".repeat(40)),
                dirty: Some(false),
                component_count: 1,
                readiness_summary: serde_json::json!({}),
                adapter_summary: serde_json::json!({}),
                components: vec![button("clear")],
            },
        )
        .expect("first enrichment should succeed");

        // No previous enriched scan yet, so a first-ever readiness has
        // nothing to compare against and must not produce an event.
        assert!(diff_component_readiness(
            &std::collections::HashMap::new(),
            &[button("clear")]
        )
        .is_empty());

        record_scan_snapshot_if_configured("D:/repos/acme", &scan)
            .expect("second raw snapshot insert should succeed");
        enrich_latest_scan_snapshot_if_configured(
            "D:/repos/acme",
            &EnrichedScanSnapshot {
                source_commit: Some("b".repeat(40)),
                dirty: Some(true),
                component_count: 1,
                readiness_summary: serde_json::json!({}),
                adapter_summary: serde_json::json!({}),
                components: vec![button("stale")],
            },
        )
        .expect("second enrichment should succeed");

        let events = component_evidence_events(
            &mut client,
            "D:/repos/acme",
            "acme.design-system.button",
            10,
        )
        .expect("component evidence events should be readable");

        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_kind, "readiness-changed");
        assert_eq!(events[0].previous_readiness, "clear");
        assert_eq!(events[0].next_readiness, "stale");
        assert_eq!(events[0].previous_commit.as_deref(), Some("a".repeat(40).as_str()));
        assert_eq!(events[0].next_commit.as_deref(), Some("b".repeat(40).as_str()));
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
        assert_eq!(snapshots[1].component_snapshot_count, 0);
        assert!(snapshots[1].dirty.unwrap());
        assert_eq!(snapshots[1].seed_label.as_deref(), Some("test-seed"));
    }
}
