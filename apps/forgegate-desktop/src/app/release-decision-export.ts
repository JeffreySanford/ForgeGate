import type { Finding } from '@forgegate/core-evidence';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { createReleaseDecision, type ReleaseDecision } from '@forgegate/core-policy';
import type { ExternalPolicyDocumentSnapshot } from './policy-document';

/**
 * Where an approval actually came from. This exists because ForgeGate has
 * no human approval flow yet, but the release-decision code path is real
 * and needs to be exercisable end to end — including the
 * `authorized-candidate` branch, which `createReleaseDecision` refuses to
 * produce without an approver.
 *
 * `'test-harness'` lets a test (or a human deliberately exploring the flow
 * against their own real repository) drive that branch. It is **not** a way
 * to quietly approve something: every artifact carrying a test-harness
 * approval is marked unmistakably — see `isRealApproval` and the
 * `notRealApproval` flag written into `release-decision.json`, plus the
 * banner `renderEvidenceReport` shows. The distinction is deliberately a
 * required field rather than an optional one, so a caller cannot obtain an
 * authorized decision without stating, in the type system, which kind of
 * approval it is.
 */
export type ApproverProvenance = 'human' | 'test-harness';

export interface EvidenceApprover {
  readonly identity: string;
  readonly provenance: ApproverProvenance;
}

export function isRealApproval(
  approver: EvidenceApprover | null | undefined,
): boolean {
  return approver?.provenance === 'human';
}

export interface ReleaseDecisionExport {
  readonly decision: ReleaseDecision;
  /**
   * True when this decision's `authorized-candidate` outcome rests on a
   * test-harness approval rather than a real human one. Always false for a
   * `blocked` outcome, which needs no approver at all and is therefore
   * always a real decision.
   */
  readonly notRealApproval: boolean;
}

export interface PolicySnapshotExport {
  readonly id: string;
  readonly componentVersionId: string;
  readonly policyId: string;
  readonly policyVersion: string;
  readonly engine: 'forgegate.release-decision';
  readonly engineVersion: '0.1.0';
  readonly evaluatedAt: string;
  readonly commit: string;
  readonly evidenceIds: readonly string[];
  readonly findingIds: readonly string[];
  readonly externalPolicyDocument?: ExternalPolicyDocumentSnapshot;
  readonly rules: readonly {
    readonly id: string;
    readonly description: string;
    readonly outcome: 'passed' | 'blocked' | 'not-applicable';
    readonly evidence: readonly string[];
  }[];
  readonly limitations: readonly string[];
}

/**
 * Why a release decision could not be produced, in the caller's words —
 * surfaced in `manifest.json`'s `excludes` map so an absent
 * `release-decision.json` always says why.
 */
export type ReleaseDecisionUnavailableReason = string;
export type PolicySnapshotUnavailableReason = string;

function policyInputsUnavailable(
  manifest: ComponentManifest,
  commit: string | null,
): PolicySnapshotUnavailableReason | null {
  if (!manifest.policyId || !manifest.policyVersion) {
    return 'No policy is authored for this component — a policy snapshot must cite both a policy id and its version.';
  }
  if (!commit) {
    return 'No repository commit is available — a policy snapshot must be tied to the exact source state it evaluated.';
  }
  return null;
}

function componentVersionId(manifest: ComponentManifest): string {
  return manifest.componentVersion
    ? `${manifest.id}@${manifest.componentVersion}`
    : manifest.id;
}

/**
 * Captures the current built-in ForgeGate release-policy ruleset and the
 * exact inputs it evaluated. This is a real snapshot of today's narrow
 * policy behavior, not a general policy engine: the `limitations` field is
 * intentionally part of the artifact so downstream readers cannot mistake
 * it for a complete organizational policy evaluation.
 */
export function computePolicySnapshot(input: {
  manifest: ComponentManifest;
  findings: readonly Finding[];
  commit: string | null;
  evaluatedAt: string;
  evidenceIds: readonly string[];
  approver?: EvidenceApprover | null;
  externalPolicyDocument?: ExternalPolicyDocumentSnapshot | null;
}): PolicySnapshotExport | { unavailable: PolicySnapshotUnavailableReason } {
  const unavailable = policyInputsUnavailable(input.manifest, input.commit);
  if (unavailable) {
    return { unavailable };
  }
  const policyId = input.manifest.policyId;
  const policyVersion = input.manifest.policyVersion;
  const commit = input.commit;
  if (!policyId || !policyVersion || !commit) {
    return { unavailable: 'Policy snapshot inputs became unavailable.' };
  }
  const approver = input.approver ?? null;
  const findingIds = input.findings.map((finding) => finding.id);
  const hasBlockingFindings = findingIds.length > 0;
  return {
    id: `${input.manifest.id}-policy-snapshot`,
    componentVersionId: componentVersionId(input.manifest),
    policyId,
    policyVersion,
    engine: 'forgegate.release-decision',
    engineVersion: '0.1.0',
    evaluatedAt: input.evaluatedAt,
    commit,
    evidenceIds: input.evidenceIds,
    findingIds,
    ...(input.externalPolicyDocument
      ? { externalPolicyDocument: input.externalPolicyDocument }
      : {}),
    rules: [
      {
        id: 'blocking-findings-block-release',
        description:
          'Any connected finding blocks release authorization until resolved or dispositioned.',
        outcome: hasBlockingFindings ? 'blocked' : 'passed',
        evidence: findingIds,
      },
      {
        id: 'authorized-candidate-requires-approver',
        description:
          'A clean component can only be marked authorized-candidate when a named approver is supplied.',
        outcome: hasBlockingFindings
          ? 'not-applicable'
          : approver
            ? 'passed'
            : 'blocked',
        evidence: approver ? [approver.identity] : [],
      },
    ],
    limitations: [
      "This snapshot captures ForgeGate's current built-in release-decision rules only.",
      input.externalPolicyDocument
        ? 'An external repository policy document is snapshotted for provenance, but the current evaluator still applies only the built-in release-decision rules.'
        : 'It does not load an external policy document, compliance control catalog, expiry calendar, or organization-specific waiver rules.',
    ],
  };
}

/**
 * Produces a real `ReleaseDecision` when ForgeGate genuinely has the inputs
 * for one, and explains itself when it does not.
 *
 * Two important properties, both inherited from `createReleaseDecision`
 * rather than reimplemented here:
 *
 * 1. A `blocked` outcome needs no approver. Any component with blocking
 *    findings therefore yields a fully real decision today, with no human
 *    approval flow and no test seam involved — this is the common case.
 * 2. An `authorized-candidate` outcome requires an approver. Without one,
 *    this returns a reason rather than inventing an approval, which is
 *    exactly the silent-approval failure mode
 *    `documentation/20-risks-and-decisions.md` warns against.
 *
 * A decision also requires a real policy reference. `policyId` alone is not
 * enough: a decision that cannot name the *version* of the policy it was
 * evaluated against cannot be verified later.
 */
export function computeReleaseDecision(input: {
  manifest: ComponentManifest;
  findings: readonly Finding[];
  commit: string | null;
  decidedAt: string;
  evidenceIds: readonly string[];
  approver?: EvidenceApprover | null;
}): ReleaseDecisionExport | { unavailable: ReleaseDecisionUnavailableReason } {
  const { manifest, findings, commit, decidedAt, evidenceIds } = input;
  const approver = input.approver ?? null;

  const unavailable = policyInputsUnavailable(manifest, commit);
  if (unavailable) {
    return {
      unavailable: unavailable.replace('policy snapshot', 'release decision'),
    };
  }
  const policyId = manifest.policyId;
  const policyVersion = manifest.policyVersion;
  if (!policyId || !policyVersion || !commit) {
    return { unavailable: 'Release decision inputs became unavailable.' };
  }

  const blockingFindingIds = findings.map((finding) => finding.id);

  if (blockingFindingIds.length === 0 && !approver) {
    return {
      unavailable:
        'No blocking findings remain, but authorizing a release candidate requires a named approver and ForgeGate has no approval flow yet.',
    };
  }

  const decision = createReleaseDecision({
    id: `${manifest.id}-release-decision`,
    componentVersionId: componentVersionId(manifest),
    policyId,
    policyVersion,
    evidenceIds,
    commit,
    blockingFindingIds,
    // A blocked outcome records no approver at all: nobody approved
    // anything, and writing a name there would misrepresent that.
    approver: blockingFindingIds.length > 0 ? undefined : approver?.identity,
    decidedAt,
  });

  return {
    decision,
    notRealApproval:
      decision.outcome === 'authorized-candidate' && !isRealApproval(approver),
  };
}
