import { deriveOrganizationAndLibrary } from './derive-organization-and-library';

describe('deriveOrganizationAndLibrary', () => {
  it('splits a scoped package name into organization and library', () => {
    expect(deriveOrganizationAndLibrary('@up/design-system')).toEqual({
      organization: 'up',
      library: 'design-system',
    });
  });

  it('handles a scoped library name that itself contains a slash', () => {
    expect(deriveOrganizationAndLibrary('@up/design-system/core')).toEqual({
      organization: 'up',
      library: 'design-system/core',
    });
  });

  it('falls back to "unscoped" for an unscoped package name', () => {
    expect(deriveOrganizationAndLibrary('design-system')).toEqual({
      organization: 'unscoped',
      library: 'design-system',
    });
  });

  it('falls back to "unconfigured" for both when there is no package name at all', () => {
    expect(deriveOrganizationAndLibrary(null)).toEqual({
      organization: 'unconfigured',
      library: 'unconfigured',
    });
  });
});
