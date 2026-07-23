import { createApproval, createEvidencePackage, createException, createFinding } from './evidence';

describe('createFinding', () => {
  it('starts every finding as open', () => {
    const finding = createFinding({
      id: 'f-1',
      componentId: 'up.design-system.button',
      description: 'Missing accessible name on icon-only variant',
      severity: 'serious',
    });
    expect(finding.status).toBe('open');
  });

  it('rejects an empty description', () => {
    expect(() =>
      createFinding({ id: 'f-1', componentId: 'c-1', description: '', severity: 'minor' }),
    ).toThrow('non-empty description');
  });
});

describe('createApproval', () => {
  it('starts every approval as not stale', () => {
    const approval = createApproval({
      id: 'a-1',
      componentVersionId: 'cv-1',
      evidenceIds: ['ex-1', 'ex-2'],
      policyId: 'section-508-web',
      policyVersion: '0.1.0',
      approvedBy: 'jane.doe',
      approvedAt: new Date().toISOString(),
      commitOrFingerprint: 'a'.repeat(40),
    });
    expect(approval.stale).toBe(false);
  });
});

describe('createException', () => {
  it('rejects an empty rationale', () => {
    expect(() =>
      createException({
        id: 'ex-1',
        findingId: 'f-1',
        approvedBy: 'jane.doe',
        approvedAt: new Date().toISOString(),
        rationale: '',
      }),
    ).toThrow('non-empty rationale');
  });
});

describe('createEvidencePackage', () => {
  it('always marks includesCredentials false', () => {
    const pkg = createEvidencePackage({
      id: 'pkg-1',
      componentVersionId: 'cv-1',
      exportedAt: new Date().toISOString(),
      checksums: { 'manifest.yaml': 'deadbeef' },
      contents: ['manifest', 'evidence-summary'],
    });
    expect(pkg.includesCredentials).toBe(false);
  });

  it('rejects an empty package', () => {
    expect(() =>
      createEvidencePackage({
        id: 'pkg-1',
        componentVersionId: 'cv-1',
        exportedAt: new Date().toISOString(),
        checksums: {},
        contents: [],
      }),
    ).toThrow('at least one content item');
  });
});
