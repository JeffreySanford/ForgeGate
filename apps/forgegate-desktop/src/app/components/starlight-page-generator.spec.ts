import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { createComponentManifest } from '@forgegate/core-manifest';
import { StarlightPageGenerator } from './starlight-page-generator';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService } from '../workspace.service';

@Component({
  imports: [StarlightPageGenerator],
  template: `<app-starlight-page-generator
    [manifest]="manifest"
    [registryManifests]="registryManifests"
  />`,
})
class HostComponent {
  manifest!: ComponentManifest;
  registryManifests: readonly ComponentManifest[] = [];
}

function manifest(): ComponentManifest {
  return createComponentManifest({
    id: 'acme.design-system.acme-button',
    framework: 'web-components',
    adapter: 'framework.web-components',
    packagePath: '.',
    componentVersion: '0.1.0',
  });
}

describe('StarlightPageGenerator', () => {
  let workspace: WorkspaceService;
  let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    workspace = TestBed.inject(WorkspaceService);
  });

  it('states plainly when no Starlight project was detected', async () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifest();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No Starlight project was detected',
    );
    await expectNoAccessibilityViolations(fixture.nativeElement);
  });

  it('generates the selected template via the workspace service when a Starlight project is detected', () => {
    workspace.workspaceScan.set({
      packageName: null,
      packageManager: null,
      workspaceManager: null,
      storybookProjects: [],
      starlightProjects: ['apps/starlight'],
      hasZeroheight: false,
      tokenFiles: [],
      testRunners: [],
      visualRegressionProviders: [],
      ciProviders: [],
      customElementsManifests: [],
      componentPackages: [],
    });
    const generateSpy = vi
      .spyOn(workspace, 'generateAndStageStarlightPage')
      .mockResolvedValue();

    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifest();
    fixture.componentInstance.registryManifests = [
      fixture.componentInstance.manifest,
    ];
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons
      .find((button) =>
        button.textContent?.includes('Developer component page'),
      )
      ?.click();
    fixture.detectChanges();
    buttons
      .find((button) => button.textContent?.includes('Generate selected'))
      ?.click();

    expect(generateSpy).toHaveBeenCalledWith(
      fixture.componentInstance.manifest,
      'developer',
      [fixture.componentInstance.manifest],
    );
  });

  it('starts from the manifest/config default template before manual selection', () => {
    workspace.workspaceScan.set({
      packageName: null,
      packageManager: null,
      workspaceManager: null,
      storybookProjects: [],
      starlightProjects: ['apps/starlight'],
      hasZeroheight: false,
      tokenFiles: [],
      testRunners: [],
      visualRegressionProviders: [],
      ciProviders: [],
      customElementsManifests: [],
      componentPackages: [],
    });
    workspace.repositoryConfig.set({
      configVersion: '0.1.0',
      projectMappings: [],
      packageMappings: [],
      commandMappings: {},
      documentationMappings: {},
      adapterConfiguration: {
        starlight: {
          componentAudiences: {
            'acme.design-system.acme-button': 'developer-heavy',
          },
        },
      },
      ignorePatterns: [],
      safeWriteLocations: ['apps/starlight/src/content/docs/**'],
    });
    const generateSpy = vi
      .spyOn(workspace, 'generateAndStageStarlightPage')
      .mockResolvedValue();

    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifest();
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons
      .find((button) => button.textContent?.includes('Generate selected'))
      ?.click();

    expect(generateSpy).toHaveBeenCalledWith(
      fixture.componentInstance.manifest,
      'developer',
      [fixture.componentInstance.manifest],
    );
  });

  it('shows the real staged diff and routes Approve/Discard to the workspace service', () => {
    workspace.workspaceScan.set({
      packageName: null,
      packageManager: null,
      workspaceManager: null,
      storybookProjects: [],
      starlightProjects: ['apps/starlight'],
      hasZeroheight: false,
      tokenFiles: [],
      testRunners: [],
      visualRegressionProviders: [],
      ciProviders: [],
      customElementsManifests: [],
      componentPackages: [],
    });
    const write = {
      stagingId: 'stg-1',
      relativePath: 'apps/starlight/src/content/docs/components/acme-button.mdx',
      previousContent: null,
      newContent: '# Acme Button',
    };
    workspace.stagedStarlightPage.set({
      componentId: 'acme.design-system.acme-button',
      template: 'designer',
      write,
      writes: [write],
    });

    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifest();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('# Acme Button');

    const approveSpy = vi
      .spyOn(workspace, 'approveStagedStarlightPage')
      .mockResolvedValue();
    const discardSpy = vi
      .spyOn(workspace, 'discardStagedStarlightPage')
      .mockResolvedValue();

    const buttons = Array.from(
      compiled.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Approve'))?.click();
    expect(approveSpy).toHaveBeenCalledTimes(1);

    buttons.find((button) => button.textContent?.includes('Discard'))?.click();
    expect(discardSpy).toHaveBeenCalledTimes(1);
  });

  it('shows Starlight build validation status after approval', () => {
    workspace.workspaceScan.set({
      packageName: null,
      packageManager: null,
      workspaceManager: null,
      storybookProjects: [],
      starlightProjects: ['apps/starlight'],
      hasZeroheight: false,
      tokenFiles: [],
      testRunners: [],
      visualRegressionProviders: [],
      ciProviders: [],
      customElementsManifests: [],
      componentPackages: [],
    });
    workspace.starlightPageResult.set({
      path: 'D:/repos/ForgeGate/apps/starlight/src/content/docs/components/acme-button.mdx',
    });
    workspace.starlightBuildResult.set({
      exitCode: 0,
      stdout: 'built',
      stderr: '',
      timedOut: false,
      cancelled: false,
      durationMs: 1200,
      artifactPath: null,
    });

    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifest();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Starlight build validation passed',
    );
    expect(fixture.nativeElement.textContent).toContain('1200ms');
  });

  it('shows when Starlight build validation was skipped', () => {
    workspace.workspaceScan.set({
      packageName: null,
      packageManager: null,
      workspaceManager: null,
      storybookProjects: [],
      starlightProjects: ['apps/starlight'],
      hasZeroheight: false,
      tokenFiles: [],
      testRunners: [],
      visualRegressionProviders: [],
      ciProviders: [],
      customElementsManifests: [],
      componentPackages: [],
    });
    workspace.starlightBuildSkipped.set(
      'No starlightBuild command is configured in .forgegate/config.yaml.',
    );

    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifest();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No starlightBuild command is configured',
    );
  });
});
