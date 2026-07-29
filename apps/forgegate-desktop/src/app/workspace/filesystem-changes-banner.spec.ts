import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService } from '../workspace.service';
import { FilesystemChangesBanner } from './filesystem-changes-banner';

describe('FilesystemChangesBanner', () => {
  let workspace: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilesystemChangesBanner],
    }).compileComponents();
    workspace = TestBed.inject(WorkspaceService);
  });

  it('stays out of the page when nothing has changed on disk', () => {
    const fixture = TestBed.createComponent(FilesystemChangesBanner);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('lists the changed paths reported by the watcher', () => {
    workspace.filesystemChangesDetected.set({
      paths: ['apps/frontend/src/app/button.ts', 'tokens/color.json'],
      truncated: false,
    });

    const fixture = TestBed.createComponent(FilesystemChangesBanner);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain(
      '2 files changed',
    );
    const items = compiled.querySelectorAll(
      '.filesystem-changes__paths li',
    );
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toBe('apps/frontend/src/app/button.ts');
  });

  it('notes truncation when the watcher capped the reported paths', () => {
    workspace.filesystemChangesDetected.set({
      paths: ['a.ts'],
      truncated: true,
    });

    const fixture = TestBed.createComponent(FilesystemChangesBanner);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('showing first 1');
  });

  it('calls the real rescanWorkspace when "Rescan workspace" is clicked', () => {
    workspace.filesystemChangesDetected.set({ paths: ['a.ts'], truncated: false });
    const rescanSpy = vi
      .spyOn(workspace, 'rescanWorkspace')
      .mockResolvedValue(undefined);

    const fixture = TestBed.createComponent(FilesystemChangesBanner);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    (buttons[0] as HTMLButtonElement).click();

    expect(rescanSpy).toHaveBeenCalledTimes(1);
  });

  it('calls the real dismissFilesystemChanges when "Dismiss" is clicked', () => {
    workspace.filesystemChangesDetected.set({ paths: ['a.ts'], truncated: false });

    const fixture = TestBed.createComponent(FilesystemChangesBanner);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    (buttons[1] as HTMLButtonElement).click();

    expect(workspace.filesystemChangesDetected()).toBeNull();
  });

  it('has no accessibility violations when a change notice is showing', async () => {
    workspace.filesystemChangesDetected.set({ paths: ['a.ts'], truncated: false });

    const fixture = TestBed.createComponent(FilesystemChangesBanner);
    fixture.detectChanges();

    await expectNoAccessibilityViolations(fixture.nativeElement);
  });
});
