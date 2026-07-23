import { createValidator } from '@forgegate/core-domain';
import { createReleaseDecision } from './release-decision';
import { releaseDecisionSchema } from './schemas';

describe('releaseDecisionSchema', () => {
  const validate = createValidator(releaseDecisionSchema);

  it('accepts an authorized-candidate decision built through createReleaseDecision', () => {
    const decision = createReleaseDecision({
      id: 'rd-1',
      componentVersionId: 'cv-1',
      policyId: 'section-508-web',
      policyVersion: '0.1.0',
      evidenceIds: ['ex-1'],
      commit: 'a'.repeat(40),
      blockingFindingIds: [],
      approver: 'jane.doe',
      decidedAt: new Date().toISOString(),
    });
    expect(validate(decision)).toBe(true);
  });

  it('accepts a blocked decision with no approver', () => {
    const decision = createReleaseDecision({
      id: 'rd-1',
      componentVersionId: 'cv-1',
      policyId: 'section-508-web',
      policyVersion: '0.1.0',
      evidenceIds: ['ex-1'],
      commit: 'a'.repeat(40),
      blockingFindingIds: ['f-1'],
      decidedAt: new Date().toISOString(),
    });
    expect(validate(decision)).toBe(true);
  });

  it('rejects a hand-built authorized-candidate record with no approver', () => {
    expect(
      validate({
        id: 'rd-1',
        componentVersionId: 'cv-1',
        policyId: 'section-508-web',
        policyVersion: '0.1.0',
        evidenceIds: [],
        commit: 'a'.repeat(40),
        outcome: 'authorized-candidate',
        blockingFindingIds: [],
        decidedAt: new Date().toISOString(),
      }),
    ).toBe(false);
  });
});
