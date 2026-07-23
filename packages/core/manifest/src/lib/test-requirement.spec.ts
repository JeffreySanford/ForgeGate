import { createTestRequirement } from './test-requirement';

describe('createTestRequirement', () => {
  it('defaults required to true', () => {
    const requirement = createTestRequirement({
      id: 'r-1',
      componentVersionId: 'cv-1',
      gate: 'axe',
      scope: 'component',
    });
    expect(requirement.required).toBe(true);
  });

  it('allows an explicitly optional requirement', () => {
    const requirement = createTestRequirement({
      id: 'r-1',
      componentVersionId: 'cv-1',
      gate: 'manual-reduced-motion',
      scope: 'component',
      required: false,
    });
    expect(requirement.required).toBe(false);
  });
});
