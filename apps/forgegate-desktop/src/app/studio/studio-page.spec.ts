import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { Blueprint } from '@forgegate/core-manifest';
import { StudioPage } from './studio-page';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { TAURI_INVOKE } from '../tauri-invoke';
import { WorkspaceService } from '../workspace.service';

const invokeMock = vi.fn();

const buttonBlueprint: Blueprint = {
  id: 'blueprint.button',
  version: '1.0.0',
  name: 'Button',
  purpose: 'Trigger a primary or secondary application action.',
  preferredNativeElement: 'button',
  requiredStates: ['default', 'hover', 'focus-visible', 'active', 'disabled'],
  inspectorGroups: [
    {
      id: 'appearance',
      label: 'Appearance',
      fields: [
        {
          path: 'contract.properties.appearance',
          label: 'Appearance',
          control: 'segmented',
          options: ['filled', 'outlined', 'subtle'],
          required: true,
        },
      ],
    },
  ],
  tokenSlots: [
    {
      id: 'root.background',
      label: 'Background',
      types: ['color'],
      required: true,
    },
  ],
};

describe('StudioPage', () => {
  let workspace: WorkspaceService;
  let fixture: ReturnType<typeof TestBed.createComponent<StudioPage>>;

  beforeEach(() => {
    invokeMock.mockReset();
    TestBed.configureTestingModule({
      imports: [StudioPage],
      providers: [{ provide: TAURI_INVOKE, useValue: invokeMock }],
    });
    workspace = TestBed.inject(WorkspaceService);
  });

  it('shows an explicit empty state when no workspace is open', async () => {
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain(
      'No workspace open yet',
    );
    expect(compiled.querySelector('.studio-page__catalog')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('shows a distinct empty state when a workspace is open but no blueprint is authored', async () => {
    workspace.workspacePath.set('/repos/example');
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No blueprint is authored');

    await expectNoAccessibilityViolations(compiled);
  });

  it('lists every real discovered blueprint by name and purpose', async () => {
    workspace.workspacePath.set('/repos/example');
    workspace.blueprints.set([buttonBlueprint]);
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Button');
    expect(compiled.textContent).toContain(
      'Trigger a primary or secondary application action.',
    );

    await expectNoAccessibilityViolations(compiled);
  });

  it('selecting a blueprint shows its real authored metadata', async () => {
    workspace.workspacePath.set('/repos/example');
    workspace.blueprints.set([buttonBlueprint]);
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector(
      '.studio-page__catalog button',
    ) as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(compiled.textContent).toContain('blueprint.button');
    expect(compiled.textContent).toContain('button'); // preferred native element
    expect(compiled.textContent).toContain('default');
    expect(compiled.textContent).toContain('hover');
    expect(compiled.textContent).toContain('Background (color) — required');
    expect(compiled.textContent).toContain(
      'Define purpose and native semantics',
    );

    await expectNoAccessibilityViolations(compiled);
  });

  it('pre-fills the purpose field from the selected blueprint', async () => {
    workspace.workspacePath.set('/repos/example');
    workspace.blueprints.set([buttonBlueprint]);
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (
      compiled.querySelector(
        '.studio-page__catalog button',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const purposeField = compiled.querySelector(
      '#proposal-purpose',
    ) as HTMLTextAreaElement;
    expect(purposeField.value).toBe(
      'Trigger a primary or secondary application action.',
    );
  });

  it('pre-selects the blueprint required states and allows toggling and adding custom ones', async () => {
    workspace.workspacePath.set('/repos/example');
    workspace.blueprints.set([buttonBlueprint]);
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (
      compiled.querySelector(
        '.studio-page__catalog button',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const stateCheckboxes = Array.from(
      compiled.querySelectorAll('.studio-page__state-toggle input'),
    ) as HTMLInputElement[];
    expect(stateCheckboxes.every((cb) => cb.checked)).toBe(true);
    expect(stateCheckboxes.length).toBe(5);

    stateCheckboxes[0].click();
    fixture.detectChanges();
    expect(
      (
        compiled.querySelectorAll(
          '.studio-page__state-toggle input',
        ) as NodeListOf<HTMLInputElement>
      )[0].checked,
    ).toBe(false);

    const customStateInput = compiled.querySelector(
      '#proposal-custom-state',
    ) as HTMLInputElement;
    customStateInput.value = 'org-required-state';
    customStateInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (
      Array.from(compiled.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Add state'),
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('org-required-state (custom)');
  });

  it('sets a variant selection from a blueprint inspector field', async () => {
    workspace.workspacePath.set('/repos/example');
    workspace.blueprints.set([buttonBlueprint]);
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (
      compiled.querySelector(
        '.studio-page__catalog button',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const variantInput = compiled.querySelector(
      '#variant-contract\\.properties\\.appearance',
    ) as HTMLInputElement;
    expect(variantInput).not.toBeNull();
    variantInput.value = 'outlined';
    variantInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(variantInput.value).toBe('outlined');
  });

  it('adds and removes a contract member from a category', async () => {
    workspace.workspacePath.set('/repos/example');
    workspace.blueprints.set([buttonBlueprint]);
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (
      compiled.querySelector(
        '.studio-page__catalog button',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const addInputButton = Array.from(compiled.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Add input'),
    ) as HTMLButtonElement;
    addInputButton.click();
    fixture.detectChanges();

    expect(compiled.querySelector('#inputs-name-0')).not.toBeNull();

    const removeButton = compiled.querySelector(
      '.studio-page__contract-member button',
    ) as HTMLButtonElement;
    removeButton.click();
    fixture.detectChanges();

    expect(compiled.querySelector('#inputs-name-0')).toBeNull();
  });

  it('creates and stages a real ComponentProposal from the form, then approves it', async () => {
    workspace.workspacePath.set('/repos/example');
    workspace.blueprints.set([buttonBlueprint]);
    invokeMock.mockResolvedValueOnce({
      stagingId: 'staging-1',
      subdirectory: 'proposals',
      filename: 'proposal.acme-icon-button-123.yaml',
      previousContent: null,
      newContent: 'identity:\n  id: proposal.acme-icon-button-123\n',
    });
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (
      compiled.querySelector(
        '.studio-page__catalog button',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const setInputValue = (selector: string, value: string) => {
      const input = compiled.querySelector(selector) as
        HTMLInputElement | HTMLTextAreaElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    setInputValue('#proposal-component-name', 'acme-icon-button');
    setInputValue('#proposal-package-path', 'packages/acme-icon-button');
    setInputValue('#proposal-adapter', 'framework.web-components');
    fixture.detectChanges();

    (
      Array.from(compiled.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Add input'),
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    setInputValue('#inputs-name-0', 'icon');
    fixture.detectChanges();

    const createButton = Array.from(compiled.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Create proposal'),
    ) as HTMLButtonElement;
    expect(createButton.disabled).toBe(false);
    createButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(invokeMock).toHaveBeenCalledWith(
      'stage_proposal',
      expect.objectContaining({
        workspacePath: '/repos/example',
        proposalId: expect.stringContaining('proposal.acme-icon-button-'),
        content: expect.stringContaining('icon'),
      }),
    );
    expect(compiled.textContent).toContain('Review staged proposal');

    invokeMock.mockResolvedValueOnce(
      '.forgegate/proposals/proposal.acme-icon-button-123.yaml',
    );
    const approveButton = Array.from(compiled.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Approve'),
    ) as HTMLButtonElement;
    approveButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(invokeMock).toHaveBeenCalledWith(
      'approve_staged_evidence_write',
      expect.objectContaining({ workspacePath: '/repos/example' }),
    );
    expect(compiled.textContent).toContain('Proposal saved to');
    expect(workspace.proposals().length).toBe(1);

    await expectNoAccessibilityViolations(compiled);
  });

  it('"Choose a different blueprint" clears the selection', async () => {
    workspace.workspacePath.set('/repos/example');
    workspace.blueprints.set([buttonBlueprint]);
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (
      compiled.querySelector(
        '.studio-page__catalog button',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(compiled.querySelector('.studio-page__detail')).not.toBeNull();

    const clearButton = Array.from(compiled.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Choose a different blueprint'),
    ) as HTMLButtonElement;
    clearButton.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.studio-page__detail')).toBeNull();
  });

  it('shows a real error when a blueprint file failed to parse', async () => {
    workspace.workspacePath.set('/repos/example');
    workspace.blueprintError.set('.forgegate/blueprints/broken.yaml: bad YAML');
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain(
      'broken.yaml',
    );
  });
});
