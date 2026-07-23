import { createReleaseDecision } from './release-decision';

const base = {
  id: 'rd-1',
  componentVersionId: 'cv-1',
  policyId: 'section-508-web',
  policyVersion: '0.1.0',
  evidenceIds: ['ex-1'],
  commit: 'a'.repeat(40),
  decidedAt: new Date().toISOString(),
};

describe('createReleaseDecision', () => {
  it('is blocked whenever blocking findings remain, even with an approver', () => {
    const decision = createReleaseDecision({
      ...base,
      blockingFindingIds: ['f-1'],
      approver: 'jane.doe',
    });
    expect(decision.outcome).toBe('blocked');
  });

  it('is authorized-candidate only with no blocking findings and a named approver', () => {
    const decision = createReleaseDecision({
      ...base,
      blockingFindingIds: [],
      approver: 'jane.doe',
    });
    expect(decision.outcome).toBe('authorized-candidate');
  });

  it('refuses to authorize without a named approver', () => {
    expect(() => createReleaseDecision({ ...base, blockingFindingIds: [] })).toThrow(
      'requires an approver',
    );
  });
});
