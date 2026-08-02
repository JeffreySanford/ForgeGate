import { createValidator } from '@forgegate/core-domain';
import { createRepositoryConfig } from './repository-config';
import { repositoryConfigSchema } from './schema';

describe('repositoryConfigSchema', () => {
  const validate = createValidator(repositoryConfigSchema);

  it('accepts a config built through createRepositoryConfig', () => {
    const config = createRepositoryConfig({
      projectMappings: [{ projectId: 'up.design-system', path: 'packages/design-system', kind: 'library' }],
      commandMappings: { unit: 'pnpm nx test design-system' },
      documentationMappings: { starlight: { contentRoot: 'src/content/docs' } },
      policyMappings: [
        {
          policyId: 'up.baseline',
          policyVersion: '2026.1.0',
          path: '.forgegate/policies/up.baseline.yaml',
        },
      ],
      safeWriteLocations: ['src/content/docs/generated/**'],
    });
    expect(validate(config)).toBe(true);
  });

  it('rejects a project mapping with an unknown kind', () => {
    expect(
      validate({
        configVersion: '0.1.0',
        projectMappings: [{ projectId: 'p', path: 'x', kind: 'not-a-real-kind' }],
        packageMappings: [],
        commandMappings: {},
        policyMappings: [],
        documentationMappings: {},
        adapterConfiguration: {},
        ignorePatterns: [],
        safeWriteLocations: ['x/**'],
      }),
    ).toBe(false);
  });

  it('rejects an empty safeWriteLocations array', () => {
    expect(
      validate({
        configVersion: '0.1.0',
        projectMappings: [],
        packageMappings: [],
        commandMappings: {},
        policyMappings: [],
        documentationMappings: {},
        adapterConfiguration: {},
        ignorePatterns: [],
        safeWriteLocations: [],
      }),
    ).toBe(false);
  });
});
