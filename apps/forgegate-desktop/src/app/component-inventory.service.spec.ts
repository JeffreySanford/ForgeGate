import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createComponentManifest } from '@forgegate/core-manifest';
import type { AngularComponentDeclaration } from './angular-components';
import { ComponentInventoryService } from './component-inventory.service';
import { TAURI_INVOKE } from './tauri-invoke';
import { TAURI_LISTEN } from './tauri-listen';
import { WorkspaceService, type WorkspaceScan } from './workspace.service';

const invokeMock = vi.fn();
const listenMock = vi.fn();

const scanFixture: WorkspaceScan = {
  packageName: '@acme/design-system',
  packageManager: 'pnpm',
  workspaceManager: 'nx',
  storybookProjects: [],
  starlightProjects: [],
  hasZeroheight: false,
  tokenFiles: [],
  testRunners: [],
  visualRegressionProviders: [],
  ciProviders: [],
  customElementsManifests: [],
  componentPackages: [],
  uiTechnologies: [],
};

function angularDeclaration(
  input: Partial<AngularComponentDeclaration> = {},
): AngularComponentDeclaration {
  return {
    className: 'ButtonComponent',
    selector: 'acme-button',
    sourceFile: 'apps/demo/src/app/button.component.ts',
    inputs: [
      {
        name: 'variant',
        alias: 'tone',
        api: 'decorator',
        required: true,
        type: '"primary" | "secondary"',
      },
    ],
    outputs: [
      {
        name: 'pressed',
        api: 'signal',
        required: false,
        type: 'void',
      },
    ],
    confidence: 'confirmed',
    ...input,
  };
}

describe('ComponentInventoryService', () => {
  let workspace: WorkspaceService;
  let inventory: ComponentInventoryService;

  beforeEach(() => {
    invokeMock.mockReset();
    listenMock.mockReset();
    listenMock.mockResolvedValue(vi.fn());
    TestBed.configureTestingModule({
      providers: [
        { provide: TAURI_INVOKE, useValue: invokeMock },
        { provide: TAURI_LISTEN, useValue: listenMock },
      ],
    });
    workspace = TestBed.inject(WorkspaceService);
    inventory = TestBed.inject(ComponentInventoryService);
    workspace.workspaceScan.set(scanFixture);
  });

  it('promotes Angular source declarations into component inventory without a Custom Elements Manifest', () => {
    workspace.angularComponents.set([angularDeclaration()]);

    const result = inventory.result();

    expect(result.failures).toEqual([]);
    expect(result.declarationCount).toBe(1);
    expect(result.manifests).toHaveLength(1);
    expect(result.manifests[0]).toMatchObject({
      id: 'acme.design-system.acme-button',
      framework: 'angular',
      adapter: 'framework.angular.source-scan.confirmed',
      packagePath: '.',
      sourceFiles: ['apps/demo/src/app/button.component.ts'],
      contract: {
        inputs: [
          {
            name: 'tone',
            type: '"primary" | "secondary"',
            required: true,
            description: 'Class member: variant',
          },
        ],
        outputs: [{ name: 'pressed', type: 'void', required: false }],
        content: [],
        publicMethods: [],
        styleParts: [],
      },
    });
  });

  it('keeps repository-authored governance data authoritative for Angular manifests', () => {
    workspace.angularComponents.set([angularDeclaration()]);
    workspace.componentManifestOverrides.set([
      createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'angular',
        adapter: 'framework.angular.source-scan.confirmed',
        packagePath: '.',
        componentVersion: '1.2.3',
        lifecycle: 'stable',
        owner: 'Design systems',
        states: [{ name: 'disabled', required: true }],
        policyId: 'federal-button-release',
        policyVersion: '2026.7.0',
      }),
    ]);

    const manifest = inventory.result().manifests[0];

    expect(manifest).toMatchObject({
      id: 'acme.design-system.acme-button',
      componentVersion: '1.2.3',
      lifecycle: 'stable',
      owner: 'Design systems',
      states: [{ name: 'disabled', required: true }],
      policyId: 'federal-button-release',
      policyVersion: '2026.7.0',
    });
    expect(manifest?.contract.inputs).toHaveLength(1);
  });

  it('includes repository-authored manifests even when no source adapter discovered the component', () => {
    workspace.componentManifestOverrides.set([
      createComponentManifest({
        id: 'forgegate.desktop.shell',
        framework: 'angular',
        adapter: 'repository.manifest',
        packagePath: 'apps/forgegate-desktop',
        componentVersion: '0.1.0',
        lifecycle: 'candidate',
        sourceFiles: ['apps/forgegate-desktop/src/app/app.ts'],
        states: [
          {
            name: 'workspace-closed',
            required: true,
            description: 'No target workspace is open yet.',
          },
        ],
        manualReviewProcedureIds: ['forgegate-shell-accessibility-review'],
        documentationTargets: [
          {
            adapter: 'starlight',
            pathOrPageId: 'documentation/dogfooding/forgegate-shell.md',
            publishedVersion: '0.1.0',
          },
        ],
      }),
    ]);

    const result = inventory.result();

    expect(result.manifests).toHaveLength(1);
    expect(result.discoveries[0]).toMatchObject({
      classification: 'workspace',
      canonicalSource: 'apps/forgegate-desktop/src/app/app.ts',
      declarationCount: 1,
      manifest: {
        id: 'forgegate.desktop.shell',
        adapter: 'repository.manifest',
        manualReviewProcedureIds: ['forgegate-shell-accessibility-review'],
      },
    });
  });

  it('groups duplicate Angular declarations by component id and preserves every source file', () => {
    workspace.angularComponents.set([
      angularDeclaration({
        sourceFile: 'apps/demo/src/app/button.component.ts',
      }),
      angularDeclaration({
        sourceFile: 'libs/ui/src/button/button.component.ts',
      }),
    ]);

    const result = inventory.result();

    expect(result.declarationCount).toBe(2);
    expect(result.duplicateGroupCount).toBe(1);
    expect(result.discoveries).toHaveLength(1);
    expect(result.discoveries[0]?.sourceFiles).toEqual([
      'apps/demo/src/app/button.component.ts',
      'libs/ui/src/button/button.component.ts',
    ]);
  });

  it("merges a real persisted finding into a component's readiness, scoped to its own componentId", () => {
    workspace.angularComponents.set([
      angularDeclaration({
        sourceFile: 'apps/demo/src/app/button.component.ts',
      }),
    ]);
    workspace.findings.set([
      {
        id: 'acme-button-keyboard-review-1-step-1',
        componentId: 'acme.design-system.acme-button',
        description: 'Activate using Space fired twice.',
        severity: 'serious',
        status: 'open',
      },
      {
        id: 'other-component-finding',
        componentId: 'some-other-component',
        description: 'Not this component.',
        severity: 'serious',
        status: 'open',
      },
    ]);

    const discovery = inventory.result().discoveries[0];

    expect(discovery?.readiness.findingSummary.findings).toContainEqual(
      expect.objectContaining({ id: 'acme-button-keyboard-review-1-step-1' }),
    );
    expect(
      discovery?.readiness.findingSummary.findings.map((finding) => finding.id),
    ).not.toContain('other-component-finding');
  });

  it("derives a component's latestReviewStatus from its most recently connected real ManualReview", () => {
    workspace.angularComponents.set([
      angularDeclaration({
        sourceFile: 'apps/demo/src/app/button.component.ts',
      }),
    ]);
    workspace.manualReviews.set([
      {
        id: 'older-review',
        componentVersionId: 'acme.design-system.acme-button',
        procedureId: 'some-procedure',
        procedureVersion: '1.0.0',
        reviewerIdentity: 'reviewer@example.com',
        date: '2026-01-01T00:00:00.000Z',
        operatingSystem: 'Windows 11',
        status: 'failed',
        commitOrFingerprint: 'a'.repeat(40),
      },
      {
        id: 'newer-review',
        componentVersionId: 'acme.design-system.acme-button',
        procedureId: 'some-procedure',
        procedureVersion: '1.0.0',
        reviewerIdentity: 'reviewer@example.com',
        date: '2026-02-01T00:00:00.000Z',
        operatingSystem: 'Windows 11',
        status: 'passed',
        commitOrFingerprint: 'a'.repeat(40),
      },
      {
        id: 'other-component-review',
        componentVersionId: 'some-other-component',
        procedureId: 'some-procedure',
        procedureVersion: '1.0.0',
        reviewerIdentity: 'reviewer@example.com',
        date: '2026-03-01T00:00:00.000Z',
        operatingSystem: 'Windows 11',
        status: 'blocked',
        commitOrFingerprint: 'a'.repeat(40),
      },
    ]);

    const discovery = inventory.result().discoveries[0];

    expect(discovery?.latestReviewStatus).toBe('passed');
  });

  it('reports a null latestReviewStatus when no ManualReview is connected', () => {
    workspace.angularComponents.set([angularDeclaration()]);

    const discovery = inventory.result().discoveries[0];

    expect(discovery?.latestReviewStatus).toBeNull();
  });

  it('persists an enriched scan snapshot after the inventory is complete', async () => {
    invokeMock.mockResolvedValue(null);
    workspace.workspacePath.set('D:/repos/ForgeGate');
    workspace.gitStatus.set({
      branch: 'master',
      commit: 'a'.repeat(40),
      dirty: true,
      changedFiles: ['apps/demo/src/app/button.component.ts'],
    });
    workspace.adapterDiagnostics.set([
      {
        id: 'workspace-scan',
        adapter: 'workspace scanner',
        source: 'read_workspace_scan',
        status: 'loaded',
        rawOutput: '{}',
        error: null,
      },
      {
        id: 'storybook-index',
        adapter: 'Storybook adapter',
        source: 'storybook-static/index.json',
        status: 'unavailable',
        rawOutput: null,
        error: 'Storybook not detected',
      },
    ]);
    workspace.angularComponents.set([angularDeclaration()]);

    workspace.scanProgress.set({
      phase: 'complete',
      state: 'complete',
      label: 'Workspace scan complete',
      completed: 5,
      total: 5,
    });

    await vi.waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('record_enriched_scan_snapshot', {
        path: 'D:/repos/ForgeGate',
        snapshot: {
          sourceCommit: 'a'.repeat(40),
          dirty: true,
          componentCount: 1,
          readinessSummary: {
            total: 1,
            readiness: { warning: 1 },
            lifecycle: { proposal: 1 },
          },
          adapterSummary: {
            total: 2,
            byStatus: { loaded: 1, unavailable: 1 },
            diagnostics: [
              {
                id: 'workspace-scan',
                adapter: 'workspace scanner',
                source: 'read_workspace_scan',
                status: 'loaded',
                error: null,
              },
              {
                id: 'storybook-index',
                adapter: 'Storybook adapter',
                source: 'storybook-static/index.json',
                status: 'unavailable',
                error: 'Storybook not detected',
              },
            ],
          },
          components: [
            {
              componentId: 'acme.design-system.acme-button',
              componentVersion: null,
              framework: 'angular',
              adapter: 'framework.angular.source-scan.confirmed',
              lifecycle: 'proposal',
              sourceFiles: ['apps/demo/src/app/button.component.ts'],
              readiness: 'warning',
              findingSummary: {
                status: 'warning',
                findings: expect.arrayContaining([
                  expect.objectContaining({
                    componentId: 'acme.design-system.acme-button',
                    description: 'No required states declared',
                    severity: 'minor',
                    status: 'open',
                  }),
                  expect.objectContaining({
                    componentId: 'acme.design-system.acme-button',
                    description:
                      'Preview unavailable - Storybook was not detected in this workspace.',
                    severity: 'minor',
                    status: 'open',
                  }),
                ]),
                reason: null,
              },
              latestReviewStatus: null,
            },
          ],
        },
      });
    });
  });

  it('keeps an enriched snapshot failure separate from scan state', async () => {
    invokeMock.mockRejectedValueOnce('Postgres is unavailable');
    workspace.workspacePath.set('D:/repos/ForgeGate');
    workspace.angularComponents.set([angularDeclaration()]);

    workspace.scanProgress.set({
      phase: 'complete',
      state: 'complete',
      label: 'Workspace scan complete',
      completed: 5,
      total: 5,
    });

    await vi.waitFor(() => {
      expect(workspace.persistenceError()).toBe('Postgres is unavailable');
    });
    expect(workspace.scanProgress()?.state).toBe('complete');
    expect(workspace.error()).toBeNull();
  });
});
