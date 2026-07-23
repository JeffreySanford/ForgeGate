import type { ComponentManifest } from '@forgegate/core-manifest';
import type { CustomElementsManifest } from './custom-elements-manifest';
import { deriveOrganizationAndLibrary } from './derive-organization-and-library';
import { mapCustomElementsManifestToComponentManifests } from './map-custom-elements-manifest';

function firstOrThrow<T>(items: readonly T[]): T {
  const [first] = items;
  if (first === undefined) {
    throw new Error('Expected at least one item');
  }
  return first;
}

const manifest: CustomElementsManifest = {
  schemaVersion: '1.0.0',
  modules: [
    {
      kind: 'javascript-module',
      path: 'src/up-button.ts',
      declarations: [
        {
          kind: 'class',
          name: 'UpButton',
          customElement: true,
          tagName: 'up-button',
          members: [
            { kind: 'field', name: 'disabled', type: { text: 'boolean' }, description: 'Disables the button' },
            { kind: 'field', name: 'label', type: { text: 'string' } },
            { kind: 'field', name: '_internalState', type: { text: 'string' }, privacy: 'private' },
            { kind: 'method', name: 'focus', description: 'Focuses the button' },
            { kind: 'method', name: '_reset', privacy: 'private' },
          ],
          events: [{ name: 'up-click', type: { text: 'CustomEvent<void>' }, description: 'Fired on activation' }],
          slots: [
            { name: '', description: 'Default button content' },
            { name: 'icon', description: 'Leading icon' },
          ],
          cssParts: [{ name: 'button', description: 'The native button element' }],
          cssProperties: [{ name: '--up-button-color' }],
        },
      ],
    },
  ],
};

function mapButton(overrides: Partial<{ adapter: string }> = {}): ComponentManifest {
  return firstOrThrow(
    mapCustomElementsManifestToComponentManifests(manifest, {
      organization: 'up',
      library: 'design-system',
      packagePath: 'packages/design-system',
      ...overrides,
    }).manifests,
  );
}

describe('mapCustomElementsManifestToComponentManifests', () => {
  it('maps a full declaration to a ComponentManifest with the expected contract', () => {
    const result = mapButton({ adapter: 'framework.lit' });

    expect(result.id).toBe('up.design-system.up-button');
    expect(result.framework).toBe('web-components');
    expect(result.adapter).toBe('framework.lit');
    expect(result.sourceFiles).toEqual(['src/up-button.ts']);

    expect(result.contract.inputs).toEqual([
      { name: 'disabled', type: 'boolean', description: 'Disables the button' },
      { name: 'label', type: 'string', description: undefined },
    ]);
    expect(result.contract.publicMethods).toEqual([{ name: 'focus', description: 'Focuses the button' }]);
    expect(result.contract.outputs).toEqual([
      { name: 'up-click', type: 'CustomEvent<void>', description: 'Fired on activation' },
    ]);
    expect(result.contract.content).toEqual([
      { name: 'default', description: 'Default button content' },
      { name: 'icon', description: 'Leading icon' },
    ]);
    expect(result.contract.styleParts).toEqual([
      { name: 'button', description: 'The native button element' },
      { name: '--up-button-color', description: undefined },
    ]);
  });

  it('excludes private and protected members from inputs and publicMethods', () => {
    const result = mapButton();

    expect(result.contract.inputs.some((input) => input.name === '_internalState')).toBe(false);
    expect(result.contract.publicMethods.some((method) => method.name === '_reset')).toBe(false);
  });

  it('defaults adapter to framework.web-components when not specified', () => {
    expect(mapButton().adapter).toBe('framework.web-components');
  });

  it('returns no failures for well-formed declarations', () => {
    const result = mapCustomElementsManifestToComponentManifests(manifest, {
      organization: 'up',
      library: 'design-system',
      packagePath: 'packages/design-system',
    });
    expect(result.failures).toEqual([]);
  });

  it('maps one manifest per custom-element declaration across modules', () => {
    const multiModule: CustomElementsManifest = {
      schemaVersion: '1.0.0',
      modules: [
        ...manifest.modules,
        {
          kind: 'javascript-module',
          path: 'src/up-icon.ts',
          declarations: [{ kind: 'class', name: 'UpIcon', customElement: true, tagName: 'up-icon' }],
        },
      ],
    };

    const result = mapCustomElementsManifestToComponentManifests(multiModule, {
      organization: 'up',
      library: 'design-system',
      packagePath: 'packages/design-system',
    });

    expect(result.manifests.map((manifest) => manifest.id)).toEqual([
      'up.design-system.up-button',
      'up.design-system.up-icon',
    ]);
  });

  it('does not throw, and every declaration still maps, when the real workspace package name has a dot in it', () => {
    // Regression test for the full pipeline: a real, unscoped, dotted npm
    // package name (this pattern is common — "socket.io", "lodash.debounce")
    // fed through deriveOrganizationAndLibrary and straight into the
    // mapper must not throw or drop a valid component.
    const { organization, library } = deriveOrganizationAndLibrary('socket.io');

    const result = mapCustomElementsManifestToComponentManifests(manifest, {
      organization,
      library,
      packagePath: 'packages/socket.io',
    });

    expect(result.failures).toEqual([]);
    expect(result.manifests).toHaveLength(1);
    expect(result.manifests[0]?.id).toBe('unscoped.socket-io.up-button');
  });

  it('reports one bad declaration as a failure without discarding a valid sibling in the same manifest', () => {
    // The HTML custom-element name grammar technically permits "." in a
    // tag name, even though no real-world Web Component library uses it.
    // That one odd declaration must be reported, not thrown, and must not
    // take the valid sibling declaration down with it — the whole point
    // of returning { manifests, failures } instead of throwing on the
    // first bad item.
    const multiModule: CustomElementsManifest = {
      schemaVersion: '1.0.0',
      modules: [
        {
          kind: 'javascript-module',
          path: 'src/up-legacy-button.ts',
          declarations: [
            { kind: 'class', name: 'UpLegacyButton', customElement: true, tagName: 'up-button.legacy' },
          ],
        },
        ...manifest.modules,
      ],
    };

    const result = mapCustomElementsManifestToComponentManifests(multiModule, {
      organization: 'up',
      library: 'design-system',
      packagePath: 'packages/design-system',
    });

    expect(result.manifests.map((m) => m.id)).toEqual(['up.design-system.up-button']);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({
      declarationName: 'UpLegacyButton',
      modulePath: 'src/up-legacy-button.ts',
    });
    expect(result.failures[0]?.message).toContain('component');
  });
});
