import {
  ADAPTER_GENERATION_CAPABILITY_NAMES,
  createUnsupportedGenerationCapabilityDeclaration,
} from './generation-capability';

describe('createUnsupportedGenerationCapabilityDeclaration', () => {
  it('declares every known generation capability as unsupported', () => {
    const declaration = createUnsupportedGenerationCapabilityDeclaration(
      'framework.web-components',
      '0.1.0',
    );

    expect(declaration.adapterId).toBe('framework.web-components');
    expect(declaration.adapterVersion).toBe('0.1.0');
    expect(declaration.capabilities).toHaveLength(
      ADAPTER_GENERATION_CAPABILITY_NAMES.length,
    );
    expect(
      declaration.capabilities.every((c) => c.supportLevel === 'unsupported'),
    ).toBe(true);
    expect(declaration.capabilities.map((c) => c.name)).toEqual(
      ADAPTER_GENERATION_CAPABILITY_NAMES,
    );
  });

  it('carries known limitations onto every declared capability when given', () => {
    const declaration = createUnsupportedGenerationCapabilityDeclaration(
      'framework.web-components',
      '0.1.0',
      ['No generation pipeline exists yet.'],
    );

    expect(
      declaration.capabilities.every(
        (c) => c.knownLimitations?.[0] === 'No generation pipeline exists yet.',
      ),
    ).toBe(true);
  });
});
