import { describe, expect, it } from 'vitest';
import { parseManualProcedure } from './manual-procedure-yaml';

const validYaml = `
id: button.screen-reader.windows
version: 1.0.0
appliesTo: [button]
environment:
  operatingSystem: Windows
  assistiveTechnology: [JAWS, NVDA]
steps:
  - action: Move focus to the button using Tab.
    expected: The accessible name and button role are announced.
  - action: Activate using Space.
    expected: The configured action occurs exactly once.
`;

describe('parseManualProcedure', () => {
  it('parses a schema-valid repository procedure, matching the documented example shape', () => {
    const procedure = parseManualProcedure(validYaml);
    expect(procedure).toEqual({
      id: 'button.screen-reader.windows',
      version: '1.0.0',
      appliesTo: ['button'],
      environment: {
        operatingSystem: 'Windows',
        assistiveTechnology: ['JAWS', 'NVDA'],
      },
      steps: [
        {
          action: 'Move focus to the button using Tab.',
          expected: 'The accessible name and button role are announced.',
        },
        {
          action: 'Activate using Space.',
          expected: 'The configured action occurs exactly once.',
        },
      ],
    });
  });

  it('rejects malformed YAML', () => {
    expect(() => parseManualProcedure('id: [unterminated')).toThrow(
      'Manual procedure is not valid YAML',
    );
  });

  it('rejects a procedure with no steps', () => {
    expect(() =>
      parseManualProcedure('id: x\nversion: 1.0.0\nappliesTo: [button]\nsteps: []'),
    ).toThrow('Manual procedure does not match the schema');
  });

  it('rejects a step missing its expected result', () => {
    expect(() =>
      parseManualProcedure(
        'id: x\nversion: 1.0.0\nappliesTo: [button]\nsteps:\n  - action: Do a thing.',
      ),
    ).toThrow('Manual procedure does not match the schema');
  });
});
