import { componentManifestPath, createComponentManifest } from './component-manifest';

describe('createComponentManifest', () => {
  it('defaults optional collections to empty and lifecycle to proposal', () => {
    const manifest = createComponentManifest({
      id: 'up.design-system.button',
      framework: 'web-components',
      adapter: 'framework.lit',
      packagePath: 'packages/design-system/src/button',
    });

    expect(manifest.lifecycle).toBe('proposal');
    expect(manifest.states).toEqual([]);
    expect(manifest.contract).toEqual({
      inputs: [],
      outputs: [],
      content: [],
      publicMethods: [],
      styleParts: [],
    });
  });

  it('keeps provided fields', () => {
    const manifest = createComponentManifest({
      id: 'up.design-system.button',
      framework: 'web-components',
      adapter: 'framework.lit',
      packagePath: 'packages/design-system/src/button',
      owner: 'jane.doe',
      states: [{ name: 'disabled', required: true }],
      contract: { inputs: [{ name: 'disabled', type: 'boolean' }] },
    });

    expect(manifest.owner).toBe('jane.doe');
    expect(manifest.states).toHaveLength(1);
    expect(manifest.contract.inputs).toHaveLength(1);
  });

  it('rejects an id that is not organization.library.component', () => {
    expect(() =>
      createComponentManifest({
        id: 'button',
        framework: 'web-components',
        adapter: 'framework.lit',
        packagePath: 'packages/design-system/src/button',
      }),
    ).toThrow('must be "organization.library.component"');
  });

  it('rejects an empty packagePath', () => {
    expect(() =>
      createComponentManifest({
        id: 'up.design-system.button',
        framework: 'web-components',
        adapter: 'framework.lit',
        packagePath: '',
      }),
    ).toThrow('non-empty packagePath');
  });
});

describe('componentManifestPath', () => {
  it('builds the conventional repository-relative path', () => {
    expect(componentManifestPath('up.design-system.button')).toBe(
      '.forgegate/components/up.design-system.button.yaml',
    );
  });
});
