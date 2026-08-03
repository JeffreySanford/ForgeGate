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

  it('adds and removes an anatomy part', async () => {
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

    (
      Array.from(compiled.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Add anatomy part'),
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const idInput = compiled.querySelector('#anatomy-id-0') as HTMLInputElement;
    expect(idInput).not.toBeNull();
    idInput.value = 'leading-icon';
    idInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(idInput.value).toBe('leading-icon');

    const removeButton = compiled.querySelector(
      '.studio-page__anatomy-part button',
    ) as HTMLButtonElement;
    removeButton.click();
    fixture.detectChanges();
    expect(compiled.querySelector('#anatomy-id-0')).toBeNull();
  });

  it('adds, edits, and removes a content fixture, and reflects it in the reference preview', async () => {
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

    (
      Array.from(compiled.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Add content fixture'),
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const idInput = compiled.querySelector('#fixture-id-0') as HTMLInputElement;
    expect(idInput).not.toBeNull();
    idInput.value = 'default-label';
    idInput.dispatchEvent(new Event('input'));
    const valueInput = compiled.querySelector(
      '#fixture-value-0',
    ) as HTMLInputElement;
    valueInput.value = 'Submit order';
    valueInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(idInput.value).toBe('default-label');
    const surface = compiled.querySelector(
      '.studio-page__preview-surface',
    ) as HTMLElement;
    expect(surface.textContent?.trim()).toBe('Submit order');

    const removeButton = compiled.querySelector(
      '.studio-page__fixture button',
    ) as HTMLButtonElement;
    removeButton.click();
    fixture.detectChanges();
    expect(compiled.querySelector('#fixture-id-0')).toBeNull();
  });

  it('maps a blueprint token slot to a discovered DTCG token', async () => {
    workspace.workspacePath.set('/repos/example');
    workspace.blueprints.set([buttonBlueprint]);
    workspace.designTokens.set([
      { path: 'primitive.color.blue.50', type: 'color', value: '#eef' },
    ]);
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (
      compiled.querySelector(
        '.studio-page__catalog button',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const mappingInput = compiled.querySelector(
      '#token-mapping-root\\.background',
    ) as HTMLInputElement;
    expect(mappingInput).not.toBeNull();
    mappingInput.value = 'primitive.color.blue.50';
    mappingInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(mappingInput.value).toBe('primitive.color.blue.50');
  });

  it('captures real behavior and accessibility decisions, and resets them on a fresh blueprint selection', async () => {
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

    const keyboardField = compiled.querySelector(
      '#behavior-keyboardBehaviorSummary',
    ) as HTMLTextAreaElement;
    expect(keyboardField).not.toBeNull();
    expect(keyboardField.value).toBe('');
    keyboardField.value = 'Enter and Space activate the button.';
    keyboardField.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const accessibleNameField = compiled.querySelector(
      '#behavior-accessibleNameStrategy',
    ) as HTMLTextAreaElement;
    accessibleNameField.value = 'Icon-only variant requires a real aria-label.';
    accessibleNameField.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(keyboardField.value).toBe('Enter and Space activate the button.');
    expect(accessibleNameField.value).toBe(
      'Icon-only variant requires a real aria-label.',
    );

    (
      Array.from(compiled.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Choose a different blueprint'),
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    (
      compiled.querySelector(
        '.studio-page__catalog button',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const resetField = compiled.querySelector(
      '#behavior-keyboardBehaviorSummary',
    ) as HTMLTextAreaElement;
    expect(resetField.value).toBe('');
  });

  it('renders a real reference preview reflecting a mapped token, and labels it as not a repository implementation', async () => {
    workspace.workspacePath.set('/repos/example');
    workspace.blueprints.set([buttonBlueprint]);
    workspace.designTokens.set([
      { path: 'primitive.color.blue.50', type: 'color', value: '#3366ff' },
    ]);
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (
      compiled.querySelector(
        '.studio-page__catalog button',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('not a repository implementation');

    const mappingInput = compiled.querySelector(
      '#token-mapping-root\\.background',
    ) as HTMLInputElement;
    mappingInput.value = 'primitive.color.blue.50';
    mappingInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const surface = compiled.querySelector(
      '.studio-page__preview-surface',
    ) as HTMLElement;
    expect(surface.style.backgroundColor).toBe('rgb(51, 102, 255)');
    expect(compiled.textContent).toContain('root.background');
    expect(compiled.textContent).toContain('#3366ff');

    await expectNoAccessibilityViolations(compiled);
  });

  it('reports an unmapped token slot in the reference preview honestly rather than fabricating a value', async () => {
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

    expect(compiled.textContent).toContain('No token slots mapped yet');
  });

  it('lets a designer select a required state to preview, labeling that appearance does not yet vary by state', async () => {
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

    const stateSelect = compiled.querySelector(
      '#preview-state',
    ) as HTMLSelectElement;
    stateSelect.value = 'hover';
    stateSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const surface = compiled.querySelector(
      '.studio-page__preview-surface',
    ) as HTMLElement;
    expect(surface.getAttribute('data-state')).toBe('hover');
    expect(compiled.textContent).toContain('Previewing state:');
    expect(compiled.textContent).toContain(
      'appearance does not yet vary by state',
    );
  });

  it('lists real anatomy parts and a real accessibility summary in the reference preview', async () => {
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

    (
      Array.from(compiled.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Add anatomy part'),
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    const labelInput = compiled.querySelector(
      '#anatomy-label-0',
    ) as HTMLInputElement;
    labelInput.value = 'Leading icon';
    labelInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const checkbox = compiled.querySelector(
      '#proposal-native-semantic-confirmed',
    ) as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Leading icon');
    expect(compiled.textContent).toContain('Native semantic confirmed: Yes');
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

  it('exports a real handoff package after a proposal is approved, and never before', async () => {
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

    expect(compiled.textContent).not.toContain('Hand off to engineering');

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

    const createButton = Array.from(compiled.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Create proposal'),
    ) as HTMLButtonElement;
    createButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.textContent).not.toContain('Hand off to engineering');

    invokeMock.mockResolvedValueOnce(
      '.forgegate/proposals/proposal.acme-icon-button-123.yaml',
    );
    const approveButton = Array.from(compiled.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Approve'),
    ) as HTMLButtonElement;
    approveButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Hand off to engineering');
    expect(compiled.textContent).toContain(
      'No component, story, test, or manifest exists yet',
    );

    const handoffSpy = vi
      .spyOn(workspace, 'exportProposalHandoff')
      .mockResolvedValue();
    const handoffButton = Array.from(compiled.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Export handoff package'),
    ) as HTMLButtonElement;
    handoffButton.click();
    fixture.detectChanges();

    expect(handoffSpy).toHaveBeenCalledTimes(1);
    expect(handoffSpy.mock.calls[0]?.[0].target.componentName).toBe(
      'acme-icon-button',
    );
    expect(handoffSpy.mock.calls[0]?.[1].id).toBe('blueprint.button');

    await expectNoAccessibilityViolations(compiled);
  });

  it('has no automated accessibility violations with every section populated', async () => {
    workspace.workspacePath.set('/repos/example');
    workspace.blueprints.set([buttonBlueprint]);
    workspace.designTokens.set([
      { path: 'primitive.color.blue.50', type: 'color', value: '#eef' },
    ]);
    fixture = TestBed.createComponent(StudioPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (
      compiled.querySelector(
        '.studio-page__catalog button',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const clickButtonWithText = (text: string) => {
      (
        Array.from(compiled.querySelectorAll('button')).find((b) =>
          b.textContent?.includes(text),
        ) as HTMLButtonElement
      ).click();
    };
    const setInputValue = (selector: string, value: string) => {
      const input = compiled.querySelector(selector) as
        HTMLInputElement | HTMLTextAreaElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };

    clickButtonWithText('Add input');
    fixture.detectChanges();
    setInputValue('#inputs-name-0', 'icon');

    setInputValue('#proposal-custom-state', 'org-required-state');
    fixture.detectChanges();
    clickButtonWithText('Add state');

    setInputValue('#variant-contract\\.properties\\.appearance', 'outlined');

    clickButtonWithText('Add anatomy part');
    fixture.detectChanges();
    setInputValue('#anatomy-id-0', 'leading-icon');
    setInputValue('#anatomy-label-0', 'Leading icon');

    setInputValue(
      '#token-mapping-root\\.background',
      'primitive.color.blue.50',
    );
    fixture.detectChanges();

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
