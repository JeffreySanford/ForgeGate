import { createFinding, type Finding } from '@forgegate/core-evidence';
import { createComponentManifest } from '@forgegate/core-manifest';
import { computeReleaseDecision, isRealApproval, type EvidenceApprover } from './release-decision-export';

const COMMIT = 'a'.repeat(40);

function manifestWithPolicy(overrides: Record<string, unknown> = {}) {
  return createComponentManifest({
    id: 'acme.lib.button',
    framework: 'web-components',
    adapter: 'framework.web-components',
    packagePath: '.',
    componentVersion: '1.0.0',
    policyId: 'acme.baseline',
    policyVersion: '2.1.0',
    ...overrides,
  });
}

const blockingFinding: Finding = createFinding({
  id: 'acme.lib.button-blocking-0',
  componentId: 'acme.lib.button',
  description: 'No token mappings connected',
  severity: 'minor',
});

function decisionOf(result: ReturnType<typeof computeReleaseDecision>) {
  if ('unavailable' in result) {
    throw new Error(`Expected a decision, got: ${result.unavailable}`);
  }
  return result;
}

describe('isRealApproval', () => {
  it('treats only a human approval as real', () => {
    expect(isRealApproval({ identity: 'a@example.com', provenance: 'human' })).toBe(true);
    expect(isRealApproval({ identity: 'e2e', provenance: 'test-harness' })).toBe(false);
    expect(isRealApproval(null)).toBe(false);
    expect(isRealApproval(undefined)).toBe(false);
  });
});

describe('computeReleaseDecision', () => {
  it('produces a fully real blocked decision with no approver when blocking findings exist', () => {
    const result = decisionOf(
      computeReleaseDecision({
        manifest: manifestWithPolicy(),
        findings: [blockingFinding],
        commit: COMMIT,
        decidedAt: '2026-01-01T00:00:00.000Z',
        evidenceIds: ['run-1'],
      }),
    );

    expect(result.decision.outcome).toBe('blocked');
    expect(result.decision.blockingFindingIds).toEqual(['acme.lib.button-blocking-0']);
    expect(result.decision.approver).toBeUndefined();
    expect(result.decision.policyId).toBe('acme.baseline');
    expect(result.decision.policyVersion).toBe('2.1.0');
    expect(result.decision.commit).toBe(COMMIT);
    // A blocked outcome needs no approval at all, so it is never "not real".
    expect(result.notRealApproval).toBe(false);
  });

  it('never records an approver on a blocked decision, even when one is supplied', () => {
    const result = decisionOf(
      computeReleaseDecision({
        manifest: manifestWithPolicy(),
        findings: [blockingFinding],
        commit: COMMIT,
        decidedAt: '2026-01-01T00:00:00.000Z',
        evidenceIds: [],
        approver: { identity: 'someone@example.com', provenance: 'human' },
      }),
    );

    expect(result.decision.outcome).toBe('blocked');
    expect(result.decision.approver).toBeUndefined();
  });

  it('refuses to authorize a clean component without an approver, rather than inventing one', () => {
    const result = computeReleaseDecision({
      manifest: manifestWithPolicy(),
      findings: [],
      commit: COMMIT,
      decidedAt: '2026-01-01T00:00:00.000Z',
      evidenceIds: [],
    });

    expect('unavailable' in result).toBe(true);
    expect('unavailable' in result && result.unavailable).toContain('requires a named approver');
  });

  it('authorizes a clean component with a real human approver and marks it as a real approval', () => {
    const approver: EvidenceApprover = { identity: 'lead@example.com', provenance: 'human' };
    const result = decisionOf(
      computeReleaseDecision({
        manifest: manifestWithPolicy(),
        findings: [],
        commit: COMMIT,
        decidedAt: '2026-01-01T00:00:00.000Z',
        evidenceIds: ['run-1'],
        approver,
      }),
    );

    expect(result.decision.outcome).toBe('authorized-candidate');
    expect(result.decision.approver).toBe('lead@example.com');
    expect(result.notRealApproval).toBe(false);
  });

  it('lets a test harness drive the authorized path but flags the approval as not real', () => {
    const result = decisionOf(
      computeReleaseDecision({
        manifest: manifestWithPolicy(),
        findings: [],
        commit: COMMIT,
        decidedAt: '2026-01-01T00:00:00.000Z',
        evidenceIds: [],
        approver: { identity: 'e2e-harness', provenance: 'test-harness' },
      }),
    );

    expect(result.decision.outcome).toBe('authorized-candidate');
    expect(result.decision.approver).toBe('e2e-harness');
    expect(result.notRealApproval).toBe(true);
  });

  it('reports why no decision is possible when the repository authored no policy', () => {
    const result = computeReleaseDecision({
      manifest: createComponentManifest({
        id: 'acme.lib.button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
      }),
      findings: [blockingFinding],
      commit: COMMIT,
      decidedAt: '2026-01-01T00:00:00.000Z',
      evidenceIds: [],
    });

    expect('unavailable' in result && result.unavailable).toContain('No policy is authored');
  });

  it('requires a policy version, not just a policy id', () => {
    const result = computeReleaseDecision({
      manifest: manifestWithPolicy({ policyVersion: undefined }),
      findings: [blockingFinding],
      commit: COMMIT,
      decidedAt: '2026-01-01T00:00:00.000Z',
      evidenceIds: [],
    });

    expect('unavailable' in result && result.unavailable).toContain('policy id and its version');
  });

  it('refuses to decide without a commit to tie the decision to', () => {
    const result = computeReleaseDecision({
      manifest: manifestWithPolicy(),
      findings: [blockingFinding],
      commit: null,
      decidedAt: '2026-01-01T00:00:00.000Z',
      evidenceIds: [],
    });

    expect('unavailable' in result && result.unavailable).toContain('No repository commit');
  });
});
