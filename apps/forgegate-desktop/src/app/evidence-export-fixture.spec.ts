import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseComponentManifest } from '@forgegate/core-manifest';
import { parseManualProcedure } from '@forgegate/core-evidence';
import { buildEvidenceExport } from './evidence-export';

const repositoryRoot = [
  resolve(process.cwd()),
  resolve(process.cwd(), '../..'),
].find((candidate) =>
  existsSync(`${candidate}/.forgegate/components/forgegate.desktop.shell.yaml`),
);

if (!repositoryRoot) {
  throw new Error('Unable to locate the ForgeGate repository root');
}

const fixtureRoot = [
  resolve(process.cwd(), 'fixtures/acme-button-library'),
  resolve(process.cwd(), '../../fixtures/acme-button-library'),
].find((candidate) => existsSync(candidate));

if (!fixtureRoot) {
  throw new Error('Unable to locate the checked-in acme-button-library fixture');
}

const manifestPath = `${fixtureRoot}/.forgegate/components/acme.button-library.acme-button.yaml`;
const shellManifestPath = `${repositoryRoot}/.forgegate/components/forgegate.desktop.shell.yaml`;
const shellProcedurePath = `${repositoryRoot}/.forgegate/procedures/forgegate-shell-accessibility-review.yaml`;

/**
 * Exercises the release-decision path against the real checked-in fixture
 * rather than a handcrafted manifest, so the fixture's own authored policy
 * reference is verified to flow all the way through to a real exported
 * decision. Chosen over pointing at an external repository because the
 * fixture is committed and portable — it runs in CI on any machine.
 */
describe('evidence export against the acme-button fixture', () => {
  it('reads a real authored policy reference from the fixture manifest', () => {
    const manifest = parseComponentManifest(readFileSync(manifestPath, 'utf8'));
    expect(manifest.policyId).toBe('acme.baseline');
    expect(manifest.policyVersion).toBe('1.0.0');
  });

  it('produces a real blocked release decision, with no approver and no not-real marking', async () => {
    const manifest = parseComponentManifest(readFileSync(manifestPath, 'utf8'));

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
      blockingReasons: ['No manual review recorded'],
      repositoryCommit: 'a'.repeat(40),
    });

    const decision = JSON.parse(result.files['release-decision.json'] ?? '{}');
    expect(decision.outcome).toBe('blocked');
    expect(decision.policyId).toBe('acme.baseline');
    expect(decision.policyVersion).toBe('1.0.0');
    expect(decision.blockingFindingIds).toEqual([
      'acme.button-library.acme-button-blocking-0',
    ]);
    // A blocked outcome needs no approver, so it is a fully real decision.
    expect(decision.approver).toBeUndefined();
    expect(decision.notRealApproval).toBeUndefined();
    expect(result.files['report.html']).not.toContain('NOT A REAL APPROVAL');
  });

  it('marks a test-harness authorization on the same real fixture unmistakably', async () => {
    const manifest = parseComponentManifest(readFileSync(manifestPath, 'utf8'));

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
      blockingReasons: [],
      repositoryCommit: 'a'.repeat(40),
      approver: { identity: 'e2e-harness', provenance: 'test-harness' },
    });

    const decision = JSON.parse(result.files['release-decision.json'] ?? '{}');
    expect(decision.outcome).toBe('authorized-candidate');
    expect(decision.notRealApproval).toBe(true);
    expect(result.files['report.html']).toContain('NOT A REAL APPROVAL');
  });
});

describe('ForgeGate dogfood shell identity', () => {
  it('keeps the checked-in shell manifest and manual procedure schema-valid and linked', () => {
    const manifest = parseComponentManifest(
      readFileSync(shellManifestPath, 'utf8'),
    );
    const procedure = parseManualProcedure(
      readFileSync(shellProcedurePath, 'utf8'),
    );

    expect(manifest.id).toBe('forgegate.desktop.shell');
    expect(manifest.manualReviewProcedureIds).toContain(procedure.id);
    expect(procedure.appliesTo).toContain(manifest.id);
    expect(manifest.documentationTargets).toContainEqual({
      adapter: 'starlight',
      pathOrPageId: 'documentation/dogfooding/forgegate-shell.md',
      publishedVersion: '0.1.0',
    });
  });
});
