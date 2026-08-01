import { describe, expect, it } from 'vitest';
import {
  freshnessLabel,
  isCurrentAgainstCommit,
  isStaleAgainstCommit,
} from './evidence-freshness';

const commitA = 'a'.repeat(40);
const commitB = 'b'.repeat(40);

describe('isCurrentAgainstCommit', () => {
  it('is true when the fingerprint matches the current commit, case-insensitively', () => {
    expect(isCurrentAgainstCommit(commitA.toUpperCase(), commitA)).toBe(true);
  });

  it('is false when the fingerprint does not match', () => {
    expect(isCurrentAgainstCommit(commitA, commitB)).toBe(false);
  });

  it('is false when there is no current commit to compare against', () => {
    expect(isCurrentAgainstCommit(commitA, null)).toBe(false);
    expect(isCurrentAgainstCommit(commitA, undefined)).toBe(false);
  });

  it('is false for a non-commit fingerprint even if it equals the current commit string', () => {
    expect(isCurrentAgainstCommit('not-a-commit', 'not-a-commit')).toBe(false);
  });
});

describe('isStaleAgainstCommit', () => {
  it('is true when the fingerprint is a real commit that does not match', () => {
    expect(isStaleAgainstCommit(commitA, commitB)).toBe(true);
  });

  it('is false when the fingerprint matches the current commit', () => {
    expect(isStaleAgainstCommit(commitA, commitA)).toBe(false);
  });

  it('is false for a non-commit fingerprint — nothing to evaluate staleness against', () => {
    expect(isStaleAgainstCommit('sha256:abc', commitB)).toBe(false);
  });

  it('is false when there is no current commit', () => {
    expect(isStaleAgainstCommit(commitA, null)).toBe(false);
  });
});

describe('freshnessLabel', () => {
  it('reports Current for a matching real commit', () => {
    expect(freshnessLabel(commitA, commitA)).toBe('Current');
  });

  it('reports Stale with the recorded short commit for a mismatch', () => {
    expect(freshnessLabel(commitA, commitB)).toBe(
      `Stale — recorded at ${commitA.slice(0, 8)}`,
    );
  });

  it('reports not evaluated for a non-commit fingerprint', () => {
    expect(freshnessLabel('sha256:abc', commitA)).toBe(
      'Not evaluated — evidence uses a source fingerprint rather than a Git commit',
    );
  });
});
