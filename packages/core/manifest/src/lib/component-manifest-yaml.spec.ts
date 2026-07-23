import { createComponentManifest } from './component-manifest';
import { parseComponentManifest, serializeComponentManifest } from './component-manifest-yaml';

describe('serializeComponentManifest / parseComponentManifest round-trip', () => {
  it('parses back to an equivalent manifest after serializing', () => {
    const original = createComponentManifest({
      id: 'up.design-system.button',
      framework: 'web-components',
      adapter: 'framework.lit',
      packagePath: 'packages/design-system/src/button',
      sourceFiles: ['packages/design-system/src/button/button.ts'],
      states: [
        { name: 'default', required: true },
        { name: 'disabled', required: true },
      ],
      tokenMappings: [{ tokenPath: 'color.primary.500', category: 'color', required: true }],
      testRequirements: [{ gate: 'axe', scope: 'component', required: true }],
      documentationTargets: [{ adapter: 'starlight', pathOrPageId: 'components/button.mdx' }],
    });

    const yamlText = serializeComponentManifest(original);
    const parsed = parseComponentManifest(yamlText);

    expect(parsed).toEqual(original);
  });
});

describe('parseComponentManifest', () => {
  it('rejects malformed YAML', () => {
    expect(() => parseComponentManifest('id: [unterminated')).toThrow('not valid YAML');
  });

  it('rejects YAML that parses but fails the schema', () => {
    expect(() => parseComponentManifest('id: up.design-system.button')).toThrow(
      'does not match the schema',
    );
  });
});
