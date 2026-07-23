import { createValidator } from '@forgegate/core-domain';
import { createComponentContract } from './contract';
import { componentContractSchema, testRequirementSchema, tokenReferenceSchema } from './schemas';
import { createTestRequirement } from './test-requirement';
import { createTokenReference } from './token-reference';

describe('componentContractSchema', () => {
  it('accepts a contract built through createComponentContract', () => {
    const validate = createValidator(componentContractSchema);
    const contract = createComponentContract({
      id: 'c-1',
      componentVersionId: 'cv-1',
      inputs: [{ name: 'disabled', type: 'boolean', required: false }],
    });
    expect(validate(contract)).toBe(true);
  });

  it('rejects a contract member missing a name', () => {
    const validate = createValidator(componentContractSchema);
    expect(
      validate({
        id: 'c-1',
        componentVersionId: 'cv-1',
        inputs: [{ type: 'boolean' }],
        outputs: [],
        content: [],
        publicMethods: [],
        styleParts: [],
      }),
    ).toBe(false);
  });
});

describe('tokenReferenceSchema', () => {
  it('accepts a reference built through createTokenReference', () => {
    const validate = createValidator(tokenReferenceSchema);
    const token = createTokenReference({
      id: 't-1',
      componentVersionId: 'cv-1',
      tokenPath: 'color.primary.500',
      category: 'color',
    });
    expect(validate(token)).toBe(true);
  });

  it('rejects an unknown category', () => {
    const validate = createValidator(tokenReferenceSchema);
    expect(
      validate({
        id: 't-1',
        componentVersionId: 'cv-1',
        tokenPath: 'color.primary.500',
        category: 'sparkle',
        required: true,
      }),
    ).toBe(false);
  });
});

describe('testRequirementSchema', () => {
  it('accepts a requirement built through createTestRequirement', () => {
    const validate = createValidator(testRequirementSchema);
    const requirement = createTestRequirement({
      id: 'r-1',
      componentVersionId: 'cv-1',
      gate: 'axe',
      scope: 'component',
    });
    expect(validate(requirement)).toBe(true);
  });

  it('rejects an unknown gate', () => {
    const validate = createValidator(testRequirementSchema);
    expect(
      validate({
        id: 'r-1',
        componentVersionId: 'cv-1',
        gate: 'vibes-check',
        scope: 'component',
        required: true,
      }),
    ).toBe(false);
  });
});
