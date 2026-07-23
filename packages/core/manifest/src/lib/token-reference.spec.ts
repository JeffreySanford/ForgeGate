import { createTokenReference } from './token-reference';

describe('createTokenReference', () => {
  it('defaults required to true', () => {
    const token = createTokenReference({
      id: 't-1',
      componentVersionId: 'cv-1',
      tokenPath: 'color.primary.500',
      category: 'color',
    });
    expect(token.required).toBe(true);
  });

  it('rejects an empty token path', () => {
    expect(() =>
      createTokenReference({ id: 't-1', componentVersionId: 'cv-1', tokenPath: '', category: 'color' }),
    ).toThrow('non-empty tokenPath');
  });
});
