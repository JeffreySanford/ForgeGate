import { webComponentsGenerationCapabilities } from './generation-capabilities';

describe('webComponentsGenerationCapabilities', () => {
  it('honestly declares every generation capability as unsupported today', () => {
    const declaration = webComponentsGenerationCapabilities();

    expect(declaration.adapterId).toBe('framework.web-components');
    expect(declaration.capabilities.length).toBeGreaterThan(0);
    expect(
      declaration.capabilities.every((c) => c.supportLevel === 'unsupported'),
    ).toBe(true);
  });
});
