import { createComponentManifest } from '@forgegate/core-manifest';
import type { AutomatedEvidenceArtifact } from '@forgegate/core-evidence';
import { buildEvidenceExport } from './evidence-export';
import { loadStarlightEvidencePackageRecords } from './evidence-package-records';

describe('loadStarlightEvidencePackageRecords', () => {
  it('reloads Starlight-relevant records from an exported evidence package file map', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });
    const automatedArtifact: AutomatedEvidenceArtifact = {
      kind: 'axe-json',
      id: 'axe-run-1',
      componentVersionId: 'acme.lib.button@1.0.0',
      gate: 'axe',
      tool: 'axe-core',
      toolVersion: '4.10.3',
      adapterVersion: '0.1.0',
      commitOrFingerprint: 'a'.repeat(40),
      rawArtifactRef: '.forgegate/evidence/raw/axe-results.json',
      report: {
        violations: [
          {
            id: 'color-contrast',
            impact: 'serious',
            help: 'Elements must meet minimum color contrast ratio.',
            nodes: [{}],
          },
        ],
        incomplete: [],
        passes: [],
      },
    };
    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [
        {
          id: 'axe-run-1',
          componentVersionId: 'acme.lib.button@1.0.0',
          gate: 'axe',
          tool: 'axe-core',
          toolVersion: '4.10.3',
          adapterVersion: '0.1.0',
          status: 'failed',
          startedAt: '2026-01-01T00:00:00.000Z',
          commitOrFingerprint: 'a'.repeat(40),
          rawArtifactRef: '.forgegate/evidence/raw/axe-results.json',
        },
      ],
      automatedArtifacts: [automatedArtifact],
      persistedFindings: [
        {
          id: 'color-contrast-finding',
          componentId: 'acme.lib.button',
          description: 'Color contrast needs disposition.',
          severity: 'serious',
          status: 'open',
          sourceEvidenceId: 'axe-run-1',
        },
      ],
      starlightProjects: [],
    });

    const records = loadStarlightEvidencePackageRecords(result.files);

    expect(records.testExecutions).toHaveLength(1);
    expect(records.automatedDetails[0]).toMatchObject({
      sourceArtifactId: 'axe-run-1',
      kind: 'axe-json',
    });
    expect(records.findings[0]).toMatchObject({
      id: 'color-contrast-finding',
    });
    expect(records.limitations).toContain(
      'manual/ has no JSON records in this evidence package.',
    );
  });

  it('keeps missing and invalid evidence-package sections explicit', () => {
    const records = loadStarlightEvidencePackageRecords({
      'test-summary.json': '{}',
      'findings/bad.json': '{',
    });

    expect(records.testExecutions).toEqual([]);
    expect(records.findings).toEqual([]);
    expect(records.limitations).toContain('test-summary.json is not a JSON array.');
    expect(records.limitations.some((limitation) => limitation.includes('bad.json'))).toBe(
      true,
    );
    expect(records.limitations).toContain(
      'automated/details.json is not present in this evidence package.',
    );
  });
});
