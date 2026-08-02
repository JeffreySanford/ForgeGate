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
