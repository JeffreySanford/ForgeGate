import { parseCustomElementsManifest } from './parse-custom-elements-manifest';

describe('parseCustomElementsManifest', () => {
  it('parses a well-formed manifest', () => {
    const json = JSON.stringify({
      schemaVersion: '1.0.0',
      modules: [
        {
          kind: 'javascript-module',
          path: 'src/up-button.ts',
          declarations: [{ kind: 'class', name: 'UpButton', customElement: true, tagName: 'up-button' }],
        },
      ],
    });

    const manifest = parseCustomElementsManifest(json);
    expect(manifest.schemaVersion).toBe('1.0.0');
    expect(manifest.modules).toHaveLength(1);
  });

  it('rejects malformed JSON', () => {
    expect(() => parseCustomElementsManifest('{not valid json')).toThrow('not valid JSON');
  });

  it('rejects JSON missing required top-level fields', () => {
    expect(() => parseCustomElementsManifest('{"modules": []}')).toThrow('does not have the expected shape');
  });

  it('does not reject a manifest with fields this subset does not model', () => {
    const json = JSON.stringify({
      schemaVersion: '1.0.0',
      modules: [{ path: 'src/up-button.ts', kind: 'javascript-module' }],
      readme: 'unmodeled top-level field from a real analyzer output',
    });
    expect(() => parseCustomElementsManifest(json)).not.toThrow();
  });
});
