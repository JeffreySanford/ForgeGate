\echo 'Seeding ForgeGate dev evidence history rows tagged dev-history-2026-07'

BEGIN;

DELETE FROM scan_snapshots
WHERE seeded = true
  AND seed_label = 'dev-history-2026-07';

INSERT INTO workspaces (workspace_path)
VALUES
  ('D:/repos/public-sector-federation'),
  ('D:/repos/phase-2-cosmic')
ON CONFLICT (workspace_path)
DO UPDATE SET last_seen_at = now();

WITH seed_rows (
  workspace_path,
  scanned_at,
  package_name,
  package_manager,
  workspace_manager,
  source_commit,
  dirty,
  component_count,
  readiness_summary,
  adapter_summary,
  scan
) AS (
  VALUES
    (
      'D:/repos/public-sector-federation',
      '2026-01-15T15:00:00Z'::timestamptz,
      'public-sector-federation',
      'pnpm',
      'nx',
      '1111111111111111111111111111111111111111',
      false,
      12,
      $json${
        "total": 12,
        "readiness": { "unknown": 12 },
        "lifecycle": { "proposal": 8, "candidate": 4 }
      }$json$::jsonb,
      $json${
        "total": 7,
        "byStatus": { "loaded": 3, "partial": 1, "unavailable": 3 },
        "diagnostics": [
          { "id": "workspace-scan", "adapter": "workspace scanner", "source": "read_workspace_scan", "status": "loaded", "error": null },
          { "id": "custom-elements-manifest", "adapter": "Web Components adapter", "source": "custom-elements.json", "status": "loaded", "error": null },
          { "id": "storybook-index", "adapter": "Storybook adapter", "source": "storybook-static/index.json", "status": "unavailable", "error": "Storybook build not available in seed baseline" }
        ]
      }$json$::jsonb,
      $json${
        "seeded": true,
        "repository": "public-sector-federation",
        "phase": "baseline",
        "packageName": "public-sector-federation",
        "packageManager": "pnpm",
        "workspaceManager": "nx"
      }$json$::jsonb
    ),
    (
      'D:/repos/public-sector-federation',
      '2026-02-20T15:00:00Z'::timestamptz,
      'public-sector-federation',
      'pnpm',
      'nx',
      '2222222222222222222222222222222222222222',
      true,
      16,
      $json${
        "total": 16,
        "readiness": { "unknown": 16 },
        "lifecycle": { "proposal": 6, "candidate": 9, "stable": 1 }
      }$json$::jsonb,
      $json${
        "total": 8,
        "byStatus": { "loaded": 4, "partial": 2, "unavailable": 2 },
        "diagnostics": [
          { "id": "workspace-scan", "adapter": "workspace scanner", "source": "read_workspace_scan", "status": "loaded", "error": null },
          { "id": "design-tokens", "adapter": "DTCG token adapter", "source": "design-tokens.json", "status": "partial", "error": "Seeded token coverage gap for early theme rollout" }
        ]
      }$json$::jsonb,
      $json${
        "seeded": true,
        "repository": "public-sector-federation",
        "phase": "token rollout",
        "packageName": "public-sector-federation",
        "packageManager": "pnpm",
        "workspaceManager": "nx"
      }$json$::jsonb
    ),
    (
      'D:/repos/public-sector-federation',
      '2026-03-18T15:00:00Z'::timestamptz,
      'public-sector-federation',
      'pnpm',
      'nx',
      '3333333333333333333333333333333333333333',
      false,
      19,
      $json${
        "total": 19,
        "readiness": { "unknown": 19 },
        "lifecycle": { "proposal": 4, "candidate": 12, "stable": 3 }
      }$json$::jsonb,
      $json${
        "total": 9,
        "byStatus": { "loaded": 6, "partial": 1, "unavailable": 2 },
        "diagnostics": [
          { "id": "workspace-scan", "adapter": "workspace scanner", "source": "read_workspace_scan", "status": "loaded", "error": null },
          { "id": "storybook-index", "adapter": "Storybook adapter", "source": "storybook-static/index.json", "status": "loaded", "error": null }
        ]
      }$json$::jsonb,
      $json${
        "seeded": true,
        "repository": "public-sector-federation",
        "phase": "storybook connected",
        "packageName": "public-sector-federation",
        "packageManager": "pnpm",
        "workspaceManager": "nx"
      }$json$::jsonb
    ),
    (
      'D:/repos/public-sector-federation',
      '2026-04-22T15:00:00Z'::timestamptz,
      'public-sector-federation',
      'pnpm',
      'nx',
      '4444444444444444444444444444444444444444',
      false,
      21,
      $json${
        "total": 21,
        "readiness": { "unknown": 21 },
        "lifecycle": { "proposal": 2, "candidate": 14, "stable": 5 }
      }$json$::jsonb,
      $json${
        "total": 10,
        "byStatus": { "loaded": 8, "partial": 1, "unavailable": 1 },
        "diagnostics": [
          { "id": "workspace-scan", "adapter": "workspace scanner", "source": "read_workspace_scan", "status": "loaded", "error": null },
          { "id": "test-evidence", "adapter": "test evidence adapter", "source": ".forgegate/evidence/*.json", "status": "loaded", "error": null }
        ]
      }$json$::jsonb,
      $json${
        "seeded": true,
        "repository": "public-sector-federation",
        "phase": "test evidence connected",
        "packageName": "public-sector-federation",
        "packageManager": "pnpm",
        "workspaceManager": "nx"
      }$json$::jsonb
    ),
    (
      'D:/repos/public-sector-federation',
      '2026-05-27T15:00:00Z'::timestamptz,
      'public-sector-federation',
      'pnpm',
      'nx',
      '5555555555555555555555555555555555555555',
      true,
      22,
      $json${
        "total": 22,
        "readiness": { "unknown": 22 },
        "lifecycle": { "proposal": 1, "candidate": 13, "stable": 8 }
      }$json$::jsonb,
      $json${
        "total": 10,
        "byStatus": { "loaded": 8, "partial": 2 },
        "diagnostics": [
          { "id": "workspace-scan", "adapter": "workspace scanner", "source": "read_workspace_scan", "status": "loaded", "error": null },
          { "id": "design-tokens", "adapter": "DTCG token adapter", "source": "design-tokens.json", "status": "partial", "error": "Seeded theme parity regression" }
        ]
      }$json$::jsonb,
      $json${
        "seeded": true,
        "repository": "public-sector-federation",
        "phase": "theme parity regression",
        "packageName": "public-sector-federation",
        "packageManager": "pnpm",
        "workspaceManager": "nx"
      }$json$::jsonb
    ),
    (
      'D:/repos/public-sector-federation',
      '2026-06-24T15:00:00Z'::timestamptz,
      'public-sector-federation',
      'pnpm',
      'nx',
      '6666666666666666666666666666666666666666',
      false,
      22,
      $json${
        "total": 22,
        "readiness": { "unknown": 22 },
        "lifecycle": { "candidate": 11, "stable": 11 }
      }$json$::jsonb,
      $json${
        "total": 10,
        "byStatus": { "loaded": 9, "partial": 1 },
        "diagnostics": [
          { "id": "workspace-scan", "adapter": "workspace scanner", "source": "read_workspace_scan", "status": "loaded", "error": null },
          { "id": "adapter-constellation", "adapter": "adapter summary", "source": "seeded history", "status": "partial", "error": "Manual review events not modeled yet" }
        ]
      }$json$::jsonb,
      $json${
        "seeded": true,
        "repository": "public-sector-federation",
        "phase": "current seeded posture",
        "packageName": "public-sector-federation",
        "packageManager": "pnpm",
        "workspaceManager": "nx"
      }$json$::jsonb
    ),
    (
      'D:/repos/phase-2-cosmic',
      '2026-01-15T15:00:00Z'::timestamptz,
      'phase-2-cosmic',
      'pnpm',
      'nx',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      false,
      0,
      $json${
        "total": 0,
        "readiness": {},
        "lifecycle": {}
      }$json$::jsonb,
      $json${
        "total": 5,
        "byStatus": { "loaded": 2, "unavailable": 3 },
        "diagnostics": [
          { "id": "workspace-scan", "adapter": "workspace scanner", "source": "read_workspace_scan", "status": "loaded", "error": null },
          { "id": "custom-elements-manifest", "adapter": "Web Components adapter", "source": "Custom Elements Manifest", "status": "unavailable", "error": "No manifest detected" }
        ]
      }$json$::jsonb,
      $json${
        "seeded": true,
        "repository": "phase-2-cosmic",
        "phase": "no component adapter",
        "packageName": "phase-2-cosmic",
        "packageManager": "pnpm",
        "workspaceManager": "nx"
      }$json$::jsonb
    ),
    (
      'D:/repos/phase-2-cosmic',
      '2026-02-20T15:00:00Z'::timestamptz,
      'phase-2-cosmic',
      'pnpm',
      'nx',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      false,
      8,
      $json${
        "total": 8,
        "readiness": { "unknown": 8 },
        "lifecycle": { "proposal": 8 }
      }$json$::jsonb,
      $json${
        "total": 6,
        "byStatus": { "loaded": 3, "partial": 1, "unavailable": 2 },
        "diagnostics": [
          { "id": "angular-components", "adapter": "Angular adapter", "source": "seeded first Angular scan", "status": "partial", "error": "Only routed shell components detected in early seed" }
        ]
      }$json$::jsonb,
      $json${
        "seeded": true,
        "repository": "phase-2-cosmic",
        "phase": "first Angular scan",
        "packageName": "phase-2-cosmic",
        "packageManager": "pnpm",
        "workspaceManager": "nx"
      }$json$::jsonb
    ),
    (
      'D:/repos/phase-2-cosmic',
      '2026-03-18T15:00:00Z'::timestamptz,
      'phase-2-cosmic',
      'pnpm',
      'nx',
      'cccccccccccccccccccccccccccccccccccccccc',
      true,
      21,
      $json${
        "total": 21,
        "readiness": { "unknown": 21 },
        "lifecycle": { "proposal": 18, "candidate": 3 }
      }$json$::jsonb,
      $json${
        "total": 7,
        "byStatus": { "loaded": 4, "partial": 1, "unavailable": 2 },
        "diagnostics": [
          { "id": "angular-components", "adapter": "Angular adapter", "source": "seeded expanded Angular scan", "status": "partial", "error": "Some component source files unavailable in seed" }
        ]
      }$json$::jsonb,
      $json${
        "seeded": true,
        "repository": "phase-2-cosmic",
        "phase": "expanded Angular scan",
        "packageName": "phase-2-cosmic",
        "packageManager": "pnpm",
        "workspaceManager": "nx"
      }$json$::jsonb
    ),
    (
      'D:/repos/phase-2-cosmic',
      '2026-04-22T15:00:00Z'::timestamptz,
      'phase-2-cosmic',
      'pnpm',
      'nx',
      'dddddddddddddddddddddddddddddddddddddddd',
      false,
      34,
      $json${
        "total": 34,
        "readiness": { "unknown": 34 },
        "lifecycle": { "proposal": 22, "candidate": 12 }
      }$json$::jsonb,
      $json${
        "total": 7,
        "byStatus": { "loaded": 5, "unavailable": 2 },
        "diagnostics": [
          { "id": "angular-components", "adapter": "Angular adapter", "source": "225 TypeScript source file(s)", "status": "loaded", "error": null }
        ]
      }$json$::jsonb,
      $json${
        "seeded": true,
        "repository": "phase-2-cosmic",
        "phase": "full Angular inventory",
        "packageName": "phase-2-cosmic",
        "packageManager": "pnpm",
        "workspaceManager": "nx"
      }$json$::jsonb
    ),
    (
      'D:/repos/phase-2-cosmic',
      '2026-05-27T15:00:00Z'::timestamptz,
      'phase-2-cosmic',
      'pnpm',
      'nx',
      'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      false,
      34,
      $json${
        "total": 34,
        "readiness": { "unknown": 34 },
        "lifecycle": { "proposal": 12, "candidate": 20, "stable": 2 }
      }$json$::jsonb,
      $json${
        "total": 8,
        "byStatus": { "loaded": 6, "unavailable": 2 },
        "diagnostics": [
          { "id": "component-manifest", "adapter": "component manifest adapter", "source": ".forgegate/components/*.yaml", "status": "loaded", "error": null }
        ]
      }$json$::jsonb,
      $json${
        "seeded": true,
        "repository": "phase-2-cosmic",
        "phase": "governance manifests added",
        "packageName": "phase-2-cosmic",
        "packageManager": "pnpm",
        "workspaceManager": "nx"
      }$json$::jsonb
    ),
    (
      'D:/repos/phase-2-cosmic',
      '2026-06-24T15:00:00Z'::timestamptz,
      'phase-2-cosmic',
      'pnpm',
      'nx',
      'ffffffffffffffffffffffffffffffffffffffff',
      true,
      34,
      $json${
        "total": 34,
        "readiness": { "unknown": 34 },
        "lifecycle": { "proposal": 6, "candidate": 22, "stable": 6 }
      }$json$::jsonb,
      $json${
        "total": 8,
        "byStatus": { "loaded": 6, "partial": 1, "unavailable": 1 },
        "diagnostics": [
          { "id": "angular-components", "adapter": "Angular adapter", "source": "225 TypeScript source file(s)", "status": "loaded", "error": null },
          { "id": "evidence-history", "adapter": "seeded history", "source": "dev_evidence_history.sql", "status": "partial", "error": "Readiness is still modeled as unknown until evidence states exist" }
        ]
      }$json$::jsonb,
      $json${
        "seeded": true,
        "repository": "phase-2-cosmic",
        "phase": "current seeded posture",
        "packageName": "phase-2-cosmic",
        "packageManager": "pnpm",
        "workspaceManager": "nx"
      }$json$::jsonb
    )
)
INSERT INTO scan_snapshots (
  workspace_id,
  scanned_at,
  package_name,
  package_manager,
  workspace_manager,
  source_commit,
  dirty,
  component_count,
  readiness_summary,
  adapter_summary,
  scan,
  seeded,
  seed_label
)
SELECT
  workspaces.id,
  seed_rows.scanned_at,
  seed_rows.package_name,
  seed_rows.package_manager,
  seed_rows.workspace_manager,
  seed_rows.source_commit,
  seed_rows.dirty,
  seed_rows.component_count,
  seed_rows.readiness_summary,
  seed_rows.adapter_summary,
  seed_rows.scan,
  true,
  'dev-history-2026-07'
FROM seed_rows
JOIN workspaces ON workspaces.workspace_path = seed_rows.workspace_path
ORDER BY seed_rows.workspace_path, seed_rows.scanned_at;

COMMIT;

\echo 'Seeded 12 ForgeGate dev evidence history rows tagged dev-history-2026-07'
