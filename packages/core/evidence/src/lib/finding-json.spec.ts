import { describe, expect, it } from 'vitest';
import { parseFinding } from './finding-json';

const validFinding = {
  id: 'acme-button-keyboard-review-1-step-1',
  componentId: 'acme.button-library.acme-button',
  scenario: 'Activate using Space.',
  description:
    'Activate using Space. — expected: The configured action occurs exactly once. Activation fired twice.',
  severity: 'serious',
  sourceEvidenceId: 'acme-button-keyboard-review-1',
  standardOrPolicyRef: 'keyboard-and-screen-reader-review',
  status: 'open',
};

describe('parseFinding', () => {
  it('parses a schema-valid repository finding record', () => {
    expect(parseFinding(JSON.stringify(validFinding))).toEqual(validFinding);
  });

  it('rejects malformed JSON', () => {
    expect(() => parseFinding('{')).toThrow('Finding is not valid JSON');
  });

  it('rejects an unknown severity', () => {
    expect(() =>
      parseFinding(JSON.stringify({ ...validFinding, severity: 'extreme' })),
    ).toThrow('Finding does not match the schema');
  });

  it('rejects a record missing the required description', () => {
    const withoutDescription = Object.fromEntries(
      Object.entries(validFinding).filter(([key]) => key !== 'description'),
    );
    expect(() =>
      parseFinding(JSON.stringify(withoutDescription)),
    ).toThrow('Finding does not match the schema');
  });
});
