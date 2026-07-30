import { describe, expect, it } from 'vitest';
import { parseException } from './exception-json';

const validException = {
  id: 'acme-button-token-exception',
  findingId: 'acme.button-library.acme-button-blocking-0',
  approvedBy: 'lead-reviewer@example.com',
  approvedAt: '2026-07-24T16:00:00.000Z',
  rationale: 'Token migration scheduled for next quarter; risk accepted until then.',
  expiresAt: '2026-10-01T00:00:00.000Z',
};

describe('parseException', () => {
  it('parses a schema-valid repository exception record', () => {
    expect(parseException(JSON.stringify(validException))).toEqual(
      validException,
    );
  });

  it('rejects malformed JSON', () => {
    expect(() => parseException('{')).toThrow('Exception is not valid JSON');
  });

  it('rejects a record missing the required rationale', () => {
    const { rationale: _rationale, ...withoutRationale } = validException;
    expect(() =>
      parseException(JSON.stringify(withoutRationale)),
    ).toThrow('Exception does not match the schema');
  });

  it('rejects a record missing the required finding reference', () => {
    const { findingId: _findingId, ...withoutFindingId } = validException;
    expect(() =>
      parseException(JSON.stringify(withoutFindingId)),
    ).toThrow('Exception does not match the schema');
  });
});
