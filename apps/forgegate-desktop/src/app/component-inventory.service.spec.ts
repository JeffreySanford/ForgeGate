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
            readiness: { unknown: 1 },
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
              readiness: 'unknown',
              findingSummary: {
                status: 'not-evaluated',
                findings: [],
                reason:
                  'ForgeGate has not derived per-component readiness findings yet.',
              },
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
