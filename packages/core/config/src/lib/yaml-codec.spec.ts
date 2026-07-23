import { createRepositoryConfig } from './repository-config';
import { parseRepositoryConfig, serializeRepositoryConfig } from './yaml-codec';

describe('serializeRepositoryConfig / parseRepositoryConfig round-trip', () => {
  it('parses back to an equivalent config after serializing', () => {
    const original = createRepositoryConfig({
      projectMappings: [{ projectId: 'up.design-system', path: 'packages/design-system', kind: 'library' }],
      commandMappings: { unit: 'pnpm nx test design-system', axe: 'pnpm nx run design-system:axe' },
      documentationMappings: { starlight: { contentRoot: 'src/content/docs' } },
      ignorePatterns: ['**/*.stories.tsx'],
      safeWriteLocations: ['src/content/docs/generated/**'],
    });

    const yamlText = serializeRepositoryConfig(original);
    const parsed = parseRepositoryConfig(yamlText);

    expect(parsed).toEqual(original);
  });
});

describe('parseRepositoryConfig', () => {
  it('rejects malformed YAML rather than silently returning something unusable', () => {
    expect(() => parseRepositoryConfig('projectMappings: [unterminated')).toThrow('not valid YAML');
  });

  it('rejects YAML that parses fine but fails the schema', () => {
    expect(() => parseRepositoryConfig('configVersion: 0.1.0')).toThrow(
      'does not match the repository config schema',
    );
  });
});
