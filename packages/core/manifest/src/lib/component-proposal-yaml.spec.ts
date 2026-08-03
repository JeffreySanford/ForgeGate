import { parseComponentProposal } from './component-proposal-yaml';

const validYaml = `
identity:
  id: proposal.acme-button-2
  status: draft
  createdAt: 2026-08-01T00:00:00.000Z
  updatedAt: 2026-08-01T00:00:00.000Z
blueprint:
  blueprintId: blueprint.button
  blueprintVersion: 1.0.0
target:
  componentName: acme-icon-button
  packagePath: packages/acme-icon-button
  adapter: framework.web-components
purpose: Trigger a compact, icon-only variant of the primary button.
nativeSemanticConfirmed: true
contract:
  inputs:
    - name: icon
      type: string
      required: true
      description: The icon glyph to render.
  outputs: []
  content: []
  publicMethods: []
  styleParts: []
requiredStates: [default, hover, disabled]
variantSelections:
  - fieldPath: contract.properties.appearance
    value: outlined
anatomyParts:
  - id: leading-icon
    label: Leading icon
    required: false
    publicSlot: true
    publicPart: true
tokenMappings:
  - slotId: root.background
    tokenPath: primitive.color.blue.50
behavior:
  keyboardBehaviorSummary: Enter and Space activate the button.
  accessibleNameStrategy: The icon has a required aria-label since there is no visible text.
  focusBehavior: Receives a visible focus ring; no focus trapping.
  loadingBehavior: Disables activation and shows a spinner in place of the icon.
  announcementStrategy: The loading state change is announced via a polite live region.
contentFixtures:
  - id: default-icon
    label: Default icon
    value: check
`;

describe('parseComponentProposal', () => {
  it('parses a real, versioned proposal referencing a real blueprint', () => {
    const proposal = parseComponentProposal(validYaml);

    expect(proposal.identity.id).toBe('proposal.acme-button-2');
    expect(proposal.identity.status).toBe('draft');
    expect(proposal.blueprint.blueprintId).toBe('blueprint.button');
    expect(proposal.target.componentName).toBe('acme-icon-button');
    expect(proposal.purpose).toBe(
      'Trigger a compact, icon-only variant of the primary button.',
    );
    expect(proposal.nativeSemanticConfirmed).toBe(true);
    expect(proposal.contract.inputs).toEqual([
      {
        name: 'icon',
        type: 'string',
        required: true,
        description: 'The icon glyph to render.',
      },
    ]);
    expect(proposal.contract.outputs).toEqual([]);
    expect(proposal.requiredStates).toEqual(['default', 'hover', 'disabled']);
    expect(proposal.variantSelections).toEqual([
      { fieldPath: 'contract.properties.appearance', value: 'outlined' },
    ]);
    expect(proposal.anatomyParts).toEqual([
      {
        id: 'leading-icon',
        label: 'Leading icon',
        required: false,
        publicSlot: true,
        publicPart: true,
      },
    ]);
    expect(proposal.tokenMappings).toEqual([
      { slotId: 'root.background', tokenPath: 'primitive.color.blue.50' },
    ]);
    expect(proposal.behavior).toEqual({
      keyboardBehaviorSummary: 'Enter and Space activate the button.',
      accessibleNameStrategy:
        'The icon has a required aria-label since there is no visible text.',
      focusBehavior: 'Receives a visible focus ring; no focus trapping.',
      loadingBehavior:
        'Disables activation and shows a spinner in place of the icon.',
      announcementStrategy:
        'The loading state change is announced via a polite live region.',
    });
    expect(proposal.contentFixtures).toEqual([
      { id: 'default-icon', label: 'Default icon', value: 'check' },
    ]);
  });

  it('rejects a proposal missing the required behavior field', () => {
    const invalid = validYaml.replace(/behavior:[\s\S]*$/, '');
    expect(() => parseComponentProposal(invalid)).toThrow(
      'does not match the schema',
    );
  });

  it('rejects a proposal missing the required contentFixtures field', () => {
    const invalid = validYaml.replace(/contentFixtures:[\s\S]*$/, '');
    expect(() => parseComponentProposal(invalid)).toThrow(
      'does not match the schema',
    );
  });

  it('rejects a proposal missing the required anatomyParts field', () => {
    const invalid = validYaml.replace(/anatomyParts:[\s\S]*$/, '');
    expect(() => parseComponentProposal(invalid)).toThrow(
      'does not match the schema',
    );
  });

  it('rejects a proposal missing the required contract field', () => {
    const invalid = validYaml.replace(/contract:[\s\S]*$/, '');
    expect(() => parseComponentProposal(invalid)).toThrow(
      'does not match the schema',
    );
  });

  it('rejects a proposal missing the required requiredStates field', () => {
    const invalid = validYaml.replace(/requiredStates:.*\n/, '');
    expect(() => parseComponentProposal(invalid)).toThrow(
      'does not match the schema',
    );
  });

  it('rejects malformed YAML', () => {
    expect(() => parseComponentProposal('identity: [unterminated')).toThrow(
      'not valid YAML',
    );
  });

  it('rejects YAML that parses but fails the schema', () => {
    expect(() => parseComponentProposal('identity:\n  id: x')).toThrow(
      'does not match the schema',
    );
  });

  it('rejects an unknown proposal status', () => {
    const invalid = validYaml.replace('status: draft', 'status: unstarted');
    expect(() => parseComponentProposal(invalid)).toThrow(
      'does not match the schema',
    );
  });

  it('rejects a proposal missing the required nativeSemanticConfirmed field', () => {
    const invalid = validYaml.replace('nativeSemanticConfirmed: true\n', '');
    expect(() => parseComponentProposal(invalid)).toThrow(
      'does not match the schema',
    );
  });
});
