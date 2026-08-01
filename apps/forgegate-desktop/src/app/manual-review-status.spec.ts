import { describe, expect, it } from 'vitest';
import { worstStatus } from './manual-review-status';

describe('worstStatus', () => {
  it('returns the single status when given one', () => {
    expect(worstStatus(['passed'])).toBe('passed');
  });

  it('treats blocked as worse than failed', () => {
    expect(worstStatus(['failed', 'blocked'])).toBe('blocked');
  });

  it('treats unknown as worse than passed but better than incomplete', () => {
    expect(worstStatus(['passed', 'unknown'])).toBe('unknown');
    expect(worstStatus(['unknown', 'incomplete'])).toBe('incomplete');
  });

  it('treats skipped as worse than not-applicable, both worse than passed', () => {
    expect(worstStatus(['not-applicable', 'skipped'])).toBe('skipped');
    expect(worstStatus(['passed', 'not-applicable'])).toBe('not-applicable');
  });

  it('returns passed only when every status is passed', () => {
    expect(worstStatus(['passed', 'passed'])).toBe('passed');
  });
});
