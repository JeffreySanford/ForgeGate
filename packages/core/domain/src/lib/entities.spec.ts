import { createComponent, createComponentVersion, createWorkspace } from './entities';

describe('createWorkspace', () => {
  it('builds a workspace record', () => {
    const workspace = createWorkspace({
      id: 'ws-1',
      path: 'D:/repos/example',
      repositoryId: 'repo-1',
      branch: 'master',
      commit: 'a'.repeat(40),
      dirty: false,
      packageManager: 'pnpm',
      configurationVersion: '0.1.0',
    });
    expect(workspace.path).toBe('D:/repos/example');
  });

  it('rejects an empty path', () => {
    expect(() =>
      createWorkspace({
        id: 'ws-1',
        path: '   ',
        repositoryId: 'repo-1',
        branch: 'master',
        commit: 'a'.repeat(40),
        dirty: false,
        packageManager: 'pnpm',
        configurationVersion: '0.1.0',
      }),
    ).toThrow('Workspace path must not be empty');
  });
});

describe('createComponent', () => {
  it('starts new components as a proposal with clear readiness', () => {
    const component = createComponent({
      id: 'up.design-system.button',
      organization: 'up',
      library: 'design-system',
      name: 'button',
      packageId: 'pkg-1',
    });
    expect(component.lifecycle).toBe('proposal');
    expect(component.readiness).toBe('clear');
  });
});

describe('createComponentVersion', () => {
  const base = {
    id: 'cv-1',
    componentId: 'up.design-system.button',
    contractId: 'contract-1',
  };

  it('accepts a valid semver version and full commit SHA', () => {
    const version = createComponentVersion({
      ...base,
      version: '1.2.0',
      commitSha: 'b'.repeat(40),
    });
    expect(version.lifecycle).toBe('proposal');
  });

  it('rejects a non-semver version', () => {
    expect(() =>
      createComponentVersion({ ...base, version: 'v1', commitSha: 'b'.repeat(40) }),
    ).toThrow('not valid semver');
  });

  it('rejects a short or malformed commit SHA', () => {
    expect(() =>
      createComponentVersion({ ...base, version: '1.0.0', commitSha: 'deadbeef' }),
    ).toThrow('not a full 40-character SHA');
  });
});
