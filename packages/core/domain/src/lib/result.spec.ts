import { isBlockingResult } from './result';

describe('isBlockingResult', () => {
  it('treats failed as blocking', () => {
    expect(isBlockingResult('failed')).toBe(true);
  });

  it('treats blocked as blocking', () => {
    expect(isBlockingResult('blocked')).toBe(true);
  });

  it('treats passed as non-blocking', () => {
    expect(isBlockingResult('passed')).toBe(false);
  });

  it('treats skipped and not-applicable as non-blocking', () => {
    expect(isBlockingResult('skipped')).toBe(false);
    expect(isBlockingResult('not-applicable')).toBe(false);
  });

  it('treats incomplete as blocking only at critical or serious severity', () => {
    expect(isBlockingResult('incomplete', 'critical')).toBe(true);
    expect(isBlockingResult('incomplete', 'serious')).toBe(true);
    expect(isBlockingResult('incomplete', 'minor')).toBe(false);
    expect(isBlockingResult('incomplete')).toBe(false);
  });
});
