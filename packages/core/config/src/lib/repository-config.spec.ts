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

  it('accepts the safe directory itself, not just files under it', () => {
    expect(isWithinSafeWriteLocation('src/content/docs/generated', safeLocations)).toBe(true);
  });

  it('does not treat a sibling directory with a matching name prefix as safe', () => {
    // Regression test: a prior version stripped trailing "*"s and did a
    // plain startsWith, so "src/content/docs/generated/**" incorrectly
    // matched "src/content/docs/generated-other/evil.ts" too.
    expect(isWithinSafeWriteLocation('src/content/docs/generated-other/evil.ts', safeLocations)).toBe(false);
  });

  it('requires an exact match for a pattern with no wildcard', () => {
    expect(isWithinSafeWriteLocation('README.md', ['README.md'])).toBe(true);
    expect(isWithinSafeWriteLocation('README.md.bak', ['README.md'])).toBe(false);
  });
});
