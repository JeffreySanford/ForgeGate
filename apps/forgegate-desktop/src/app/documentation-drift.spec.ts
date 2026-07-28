import { createComponentManifest } from '@forgegate/core-manifest';
import { computeDocumentationDriftState, computeWorkspaceDocumentationDrift } from './documentation-drift';

describe('computeDocumentationDriftState', () => {
  it('reports not-evaluated when the adapter is not starlight', () => {
    const result = computeDocumentationDriftState({ adapter: 'zeroheight', pathOrPageId: 'button' }, '1.0.0', ['docs']);
    expect(result).toEqual({ status: 'not-evaluated', detail: 'Not evaluated — adapter not detected' });
  });

  it('reports not-evaluated when no starlight project matches the target path', () => {
    const result = computeDocumentationDriftState(
      { adapter: 'starlight', pathOrPageId: 'other-app/button' },
      '1.0.0',
      ['docs'],
    );
    expect(result.status).toBe('not-evaluated');
  });

  it('reports not-evaluated when the component has no current version', () => {
    const result = computeDocumentationDriftState(
      { adapter: 'starlight', pathOrPageId: 'docs/button' },
      undefined,
      ['docs'],
    );
    expect(result).toEqual({ status: 'not-evaluated', detail: 'Not evaluated — current component version is unavailable' });
  });

  it('reports not-evaluated when the target has no published version', () => {
    const result = computeDocumentationDriftState(
      { adapter: 'starlight', pathOrPageId: 'docs/button' },
      '1.0.0',
      ['docs'],
    );
    expect(result).toEqual({ status: 'not-evaluated', detail: 'Not evaluated — published component version is unavailable' });
  });

  it('reports current when the published and current versions match', () => {
    const result = computeDocumentationDriftState(
      { adapter: 'starlight', pathOrPageId: 'docs/button', publishedVersion: '1.0.0' },
      '1.0.0',
      ['docs'],
    );
    expect(result).toEqual({ status: 'current', detail: 'Current' });
  });

  it('reports drifted with both versions named when they differ', () => {
    const result = computeDocumentationDriftState(
      { adapter: 'starlight', pathOrPageId: 'docs/button', publishedVersion: '1.0.0' },
      '1.1.0',
      ['docs'],
    );
    expect(result).toEqual({ status: 'drifted', detail: 'Drifted — published 1.0.0, current 1.1.0' });
  });

  it('matches a starlight project registered as the workspace root', () => {
    const result = computeDocumentationDriftState(
      { adapter: 'starlight', pathOrPageId: 'button', publishedVersion: '1.0.0' },
      '1.0.0',
      ['.'],
    );
    expect(result.status).toBe('current');
  });
});

describe('computeWorkspaceDocumentationDrift', () => {
  it('flattens documentation targets across every component, each with its own drift result', () => {
    const current = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
      documentationTargets: [{ adapter: 'starlight', pathOrPageId: 'docs/button', publishedVersion: '1.0.0' }],
    });
    const drifted = createComponentManifest({
      id: 'acme.lib.card',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '2.0.0',
      documentationTargets: [{ adapter: 'starlight', pathOrPageId: 'docs/card', publishedVersion: '1.0.0' }],
    });
    const noDocs = createComponentManifest({
      id: 'acme.lib.icon',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
    });

    const result = computeWorkspaceDocumentationDrift([current, drifted, noDocs], ['docs']);

    expect(result).toHaveLength(2);
    expect(result.find((r) => r.componentId === 'acme.lib.button')?.result.status).toBe('current');
    expect(result.find((r) => r.componentId === 'acme.lib.card')?.result.status).toBe('drifted');
    expect(result.some((r) => r.componentId === 'acme.lib.icon')).toBe(false);
  });

  it('returns an empty list when no components declare documentation targets', () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
    });
    expect(computeWorkspaceDocumentationDrift([manifest], ['docs'])).toEqual([]);
  });
});
