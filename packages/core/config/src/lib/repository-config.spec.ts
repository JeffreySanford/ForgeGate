import { createRepositoryConfig, isWithinSafeWriteLocation } from './repository-config';

describe('createRepositoryConfig', () => {
  it('defaults optional fields to empty collections', () => {
    const config = createRepositoryConfig({ safeWriteLocations: ['src/content/docs/generated/**'] });
    expect(config.projectMappings).toEqual([]);
    expect(config.commandMappings).toEqual({});
    expect(config.configVersion).toBe('0.1.0');
  });

  it('refuses to create a config with no safe write locations at all', () => {
    expect(() => createRepositoryConfig({ safeWriteLocations: [] })).toThrow(
      'requires at least one safe write location',
    );
  });
});

describe('isWithinSafeWriteLocation', () => {
  const safeLocations = ['src/content/docs/generated/**', '.forgegate/evidence/**'];

  it('accepts a path under a configured glob prefix', () => {
    expect(isWithinSafeWriteLocation('src/content/docs/generated/button.mdx', safeLocations)).toBe(true);
  });

  it('rejects a path outside every configured location', () => {
    expect(isWithinSafeWriteLocation('src/app/app.ts', safeLocations)).toBe(false);
  });

  it('normalizes backslashes before comparing', () => {
    expect(isWithinSafeWriteLocation('src\\content\\docs\\generated\\button.mdx', safeLocations)).toBe(true);
  });
});
