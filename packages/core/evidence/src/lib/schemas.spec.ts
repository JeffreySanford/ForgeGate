import { createValidator } from '@forgegate/core-domain';
import { createApproval, createEvidencePackage, createException, createFinding } from './evidence';
import { approvalSchema, evidencePackageSchema, exceptionSchema, findingSchema } from './schemas';

describe('findingSchema', () => {
  it('accepts a finding built through createFinding', () => {
    const validate = createValidator(findingSchema);
    const finding = createFinding({
      id: 'f-1',
      componentId: 'up.design-system.button',
      description: 'Missing accessible name on icon-only variant',
      severity: 'serious',
    });
    expect(validate(finding)).toBe(true);
  });

  it('rejects an unknown severity', () => {
    const validate = createValidator(findingSchema);
    expect(
      validate({
        id: 'f-1',
        componentId: 'c-1',
        description: 'x',
        severity: 'catastrophic',
        status: 'open',
      }),
    ).toBe(false);
  });
});

describe('approvalSchema', () => {
  it('accepts an approval built through createApproval', () => {
    const validate = createValidator(approvalSchema);
    const approval = createApproval({
      id: 'a-1',
      componentVersionId: 'cv-1',
      evidenceIds: ['ex-1'],
      policyId: 'section-508-web',
      policyVersion: '0.1.0',
      approvedBy: 'jane.doe',
      approvedAt: new Date().toISOString(),
      commitOrFingerprint: 'a'.repeat(40),
    });
    expect(validate(approval)).toBe(true);
  });
});

describe('exceptionSchema', () => {
  it('accepts an exception built through createException', () => {
    const validate = createValidator(exceptionSchema);
    const exception = createException({
      id: 'ex-1',
      findingId: 'f-1',
      approvedBy: 'jane.doe',
      approvedAt: new Date().toISOString(),
      rationale: 'Accepted risk pending vendor fix',
    });
    expect(validate(exception)).toBe(true);
  });
});

describe('evidencePackageSchema', () => {
  it('accepts a package built through createEvidencePackage', () => {
    const validate = createValidator(evidencePackageSchema);
    const pkg = createEvidencePackage({
      id: 'pkg-1',
      componentVersionId: 'cv-1',
      exportedAt: new Date().toISOString(),
      checksums: { 'manifest.yaml': 'deadbeef' },
      contents: ['manifest'],
    });
    expect(validate(pkg)).toBe(true);
  });

  it('rejects a package that claims to include credentials', () => {
    const validate = createValidator(evidencePackageSchema);
    expect(
      validate({
        id: 'pkg-1',
        componentVersionId: 'cv-1',
        exportedAt: new Date().toISOString(),
        checksums: {},
        contents: ['manifest'],
        includesCredentials: true,
      }),
    ).toBe(false);
  });
});
