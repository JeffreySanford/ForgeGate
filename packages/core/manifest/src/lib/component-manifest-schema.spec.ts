import { createValidator } from '@forgegate/core-domain';
import { createComponentManifest } from './component-manifest';
import { componentManifestSchema } from './component-manifest-schema';

describe('componentManifestSchema', () => {
  const validate = createValidator(componentManifestSchema);

  it('accepts a manifest built through createComponentManifest', () => {
    const manifest = createComponentManifest({
      id: 'up.design-system.button',
      framework: 'web-components',
      adapter: 'framework.lit',
      packagePath: 'packages/design-system/src/button',
      states: [{ name: 'disabled', required: true }],
      tokenMappings: [{ tokenPath: 'color.primary.500', category: 'color', required: true }],
      testRequirements: [{ gate: 'axe', scope: 'component', required: true }],
    });
    expect(validate(manifest)).toBe(true);
  });

  it('rejects an unknown lifecycle value', () => {
    expect(
      validate({
        schemaVersion: '0.1.0',
        id: 'up.design-system.button',
        framework: 'web-components',
        adapter: 'framework.lit',
        packagePath: 'x',
        sourceFiles: [],
        lifecycle: 'shipped',
        reviewers: [],
        contract: { inputs: [], outputs: [], content: [], publicMethods: [], styleParts: [] },
        states: [],
        themes: [],
        densities: [],
        viewports: [],
        environments: [],
        tokenMappings: [],
        storyMappings: [],
        testRequirements: [],
        manualReviewProcedureIds: [],
        documentationTargets: [],
        consumerApplicationIds: [],
      }),
    ).toBe(false);
  });

  it('rejects a component id missing the organization.library.component shape', () => {
    const manifest = createComponentManifest({
      id: 'up.design-system.button',
      framework: 'web-components',
      adapter: 'framework.lit',
      packagePath: 'x',
    });
    expect(validate({ ...manifest, id: 'button' })).toBe(false);
  });
});
