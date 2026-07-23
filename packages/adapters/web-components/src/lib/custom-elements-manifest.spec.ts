import { customElementDeclarations, type CustomElementsManifest } from './custom-elements-manifest';

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
        },
        {
          kind: 'class',
          name: 'InternalHelper',
        },
      ],
    },
    {
      kind: 'javascript-module',
      path: 'src/up-icon.ts',
      declarations: [
        {
          kind: 'class',
          name: 'UpIcon',
          customElement: true,
          // Missing tagName on purpose — an incompletely-annotated declaration.
        },
      ],
    },
  ],
};

describe('customElementDeclarations', () => {
  it('returns only declarations with customElement: true and a tagName', () => {
    const result = customElementDeclarations(manifest);
    expect(result).toHaveLength(1);
    expect(result[0]?.declaration.tagName).toBe('up-button');
    expect(result[0]?.modulePath).toBe('src/up-button.ts');
  });
});
