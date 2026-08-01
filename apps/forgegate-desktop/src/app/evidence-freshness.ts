/**
 * Compares a piece of evidence's recorded `commitOrFingerprint` against the
 * workspace's current commit — the same real staleness comparison used for
 * test executions, manual reviews, and documentation drift throughout the
 * app, extracted here so every call site can't silently disagree about what
 * "current" means. A non-commit fingerprint (e.g. a content hash rather
 * than a real 40-hex Git commit) is never claimed current or stale — it's
 * reported as not evaluated, since there is nothing to compare it against.
 */

const COMMIT_HASH_PATTERN = /^[0-9a-f]{40}$/i;

export function isCurrentAgainstCommit(
  fingerprint: string,
  currentCommit: string | null | undefined,
): boolean {
  return (
    !!currentCommit &&
    COMMIT_HASH_PATTERN.test(fingerprint) &&
    fingerprint.toLowerCase() === currentCommit.toLowerCase()
  );
}

export function isStaleAgainstCommit(
  fingerprint: string,
  currentCommit: string | null | undefined,
): boolean {
  if (!COMMIT_HASH_PATTERN.test(fingerprint)) {
    return false;
  }
  return (
    !!currentCommit && fingerprint.toLowerCase() !== currentCommit.toLowerCase()
  );
}

export function freshnessLabel(
  fingerprint: string,
  currentCommit: string | null | undefined,
): string {
  if (!COMMIT_HASH_PATTERN.test(fingerprint)) {
    return 'Not evaluated — evidence uses a source fingerprint rather than a Git commit';
  }
  return isCurrentAgainstCommit(fingerprint, currentCommit)
    ? 'Current'
    : `Stale — recorded at ${fingerprint.slice(0, 8)}`;
}
