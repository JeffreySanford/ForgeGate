import { createComponentManifest } from '@forgegate/core-manifest';
import { computeTokenTopology } from './token-topology';

describe('computeTokenTopology', () => {
  it('returns an empty list when no component has any token mapping', () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
    });

    expect(computeTokenTopology([manifest])).toEqual([]);
  });

  it('aggregates a real per-component token mapping into one entry', () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      tokenMappings: [
        { tokenPath: 'color.primary.500', category: 'color', required: true },
      ],
    });

    expect(computeTokenTopology([manifest])).toEqual([
      {
        tokenPath: 'color.primary.500',
        category: 'color',
        required: true,
        componentIds: ['acme.lib.button'],
        usages: [{ componentId: 'acme.lib.button' }],
      },
    ]);
  });

  it('groups the same token path across multiple components into one entry, listing every consumer', () => {
    const button = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      tokenMappings: [
        { tokenPath: 'color.primary.500', category: 'color', required: true },
      ],
    });
    const card = createComponentManifest({
      id: 'acme.lib.card',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      tokenMappings: [
        { tokenPath: 'color.primary.500', category: 'color', required: false },
      ],
    });

    const result = computeTokenTopology([button, card]);

    expect(result).toEqual([
      {
        tokenPath: 'color.primary.500',
        category: 'color',
        required: true,
        componentIds: ['acme.lib.button', 'acme.lib.card'],
        usages: [
          { componentId: 'acme.lib.button' },
          { componentId: 'acme.lib.card' },
        ],
      },
    ]);
  });

  it('carries a real per-mapping state and anatomy-part link when a repository authors one', () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      tokenMappings: [
        {
          tokenPath: 'color.action-hover',
          category: 'color',
          required: true,
          stateName: 'hover',
        },
        {
          tokenPath: 'color.text-inverse',
          category: 'color',
          required: true,
          anatomyPartId: 'label',
        },
      ],
    });

    const result = computeTokenTopology([manifest]);

    expect(
      result.find((entry) => entry.tokenPath === 'color.action-hover')?.usages,
    ).toEqual([{ componentId: 'acme.lib.button', stateName: 'hover' }]);
    expect(
      result.find((entry) => entry.tokenPath === 'color.text-inverse')?.usages,
    ).toEqual([{ componentId: 'acme.lib.button', anatomyPartId: 'label' }]);
  });

  it('sorts entries alphabetically by token path for a stable, real ordering', () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      tokenMappings: [
        { tokenPath: 'spacing.sm', category: 'spacing', required: true },
        { tokenPath: 'color.primary.500', category: 'color', required: true },
      ],
    });

    const result = computeTokenTopology([manifest]);

    expect(result.map((entry) => entry.tokenPath)).toEqual([
      'color.primary.500',
      'spacing.sm',
    ]);
  });
});
