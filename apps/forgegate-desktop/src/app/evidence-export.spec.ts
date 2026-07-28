import { createComponentManifest } from '@forgegate/core-manifest';
import type { TestExecution } from '@forgegate/core-evidence';
import { buildEvidenceExport, componentVersionId, type EvidenceExportResult } from './evidence-export';

function requireFile(result: EvidenceExportResult, name: string): string {
  const content = result.files[name];
  if (content === undefined) {
    throw new Error(`Expected exported file "${name}" to exist`);
  }
  return content;
}

function execution(overrides: Partial<TestExecution>): TestExecution {
  return {
    id: 'id',
    componentVersionId: 'component-version',
    gate: 'unit',
    tool: 'vitest',
    toolVersion: '4.1.10',
    adapterVersion: '1.0.0',
    status: 'passed',
    startedAt: '2026-01-01T00:00:00.000Z',
    commitOrFingerprint: 'a'.repeat(40),
    ...overrides,
  };
}

describe('componentVersionId', () => {
  it('combines id and componentVersion when a version is known', () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });
    expect(componentVersionId(manifest)).toBe('acme.lib.button@1.0.0');
  });

  it('falls back to the bare id when no version is known', () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
    });
    expect(componentVersionId(manifest)).toBe('acme.lib.button');
  });
});

describe('buildEvidenceExport', () => {
  it('includes only the sections ForgeGate has real data for, and explains every excluded one', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });

    const result = await buildEvidenceExport('export-1', '2026-01-01T00:00:00.000Z', manifest, [], []);

    expect(Object.keys(result.files).sort()).toEqual([
      'checksums.sha256',
      'documentation-status.json',
      'manifest.json',
      'test-summary.json',
    ]);

    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    expect(manifestJson.componentId).toBe('acme.lib.button');
    expect(manifestJson.componentVersionId).toBe('acme.lib.button@1.0.0');
    expect(manifestJson.includesCredentials).toBe(false);
    expect(Object.keys(manifestJson.excludes)).toEqual([
      'policy-snapshot.json',
      'release-decision.json',
      'automated/',
      'manual/',
      'findings/',
      'exceptions/',
      'attachments/',
      'report.html',
    ]);
  });

  it('names the export directory after the real component version id', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });

    const result = await buildEvidenceExport('42', '2026-01-01T00:00:00.000Z', manifest, [], []);

    expect(result.directoryName).toBe('acme.lib.button-1.0.0-evidence-42');
  });

  it('writes real test executions into test-summary.json', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });
    const executions = [execution({ id: 'run-1', gate: 'unit', status: 'passed' })];

    const result = await buildEvidenceExport('export-1', '2026-01-01T00:00:00.000Z', manifest, executions, []);

    const testSummary = JSON.parse(requireFile(result, 'test-summary.json'));
    expect(testSummary).toEqual(executions);
  });

  it('computes real per-target documentation drift into documentation-status.json', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '2.0.0',
      documentationTargets: [
        { adapter: 'starlight', pathOrPageId: 'docs/button', publishedVersion: '1.0.0' },
      ],
    });

    const result = await buildEvidenceExport(
      'export-1',
      '2026-01-01T00:00:00.000Z',
      manifest,
      [],
      ['docs'],
    );

    const documentationStatus = JSON.parse(requireFile(result, 'documentation-status.json'));
    expect(documentationStatus).toEqual([
      {
        adapter: 'starlight',
        pathOrPageId: 'docs/button',
        status: 'drifted',
        detail: 'Drifted — published 1.0.0, current 2.0.0',
      },
    ]);
  });

  it('produces real, verifiable SHA-256 checksums for every included content file', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
    });

    const result = await buildEvidenceExport('export-1', '2026-01-01T00:00:00.000Z', manifest, [], []);

    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    const checksumLines = requireFile(result, 'checksums.sha256').trim().split('\n');
    expect(checksumLines).toHaveLength(2);

    for (const [name, expectedHash] of Object.entries(manifestJson.checksums)) {
      const bytes = new TextEncoder().encode(requireFile(result, name));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const actualHash = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      expect(actualHash).toBe(expectedHash);
      expect(checksumLines).toContain(`${expectedHash}  ${name}`);
    }
  });
});
