import type { ResultStatus, Severity } from '@forgegate/core-domain';

/** Records one tool execution and where its raw artifacts live, per documentation/16-data-and-schema-model.md ("TestExecution"). */
export interface TestExecution {
  readonly id: string;
  readonly componentVersionId: string;
  readonly gate: string;
  readonly tool: string;
  readonly toolVersion: string;
  readonly adapterVersion: string;
  readonly status: ResultStatus;
  readonly startedAt: string;
  readonly durationMs?: number;
  readonly commitOrFingerprint: string;
  readonly rawArtifactRef?: string;
}

export type FindingStatus =
  | 'open'
  | 'resolved'
  | 'confirmed-issue'
  | 'false-positive'
  | 'not-applicable'
  | 'deferred';

/** A defect, incomplete result, or policy concern requiring disposition, per documentation/07-compliance-testing.md ("Findings"). */
export interface Finding {
  readonly id: string;
  readonly componentId: string;
  readonly scenario?: string;
  readonly description: string;
  readonly severity: Severity;
  readonly sourceEvidenceId?: string;
  readonly standardOrPolicyRef?: string;
  readonly owner?: string;
  readonly status: FindingStatus;
  readonly dueDate?: string;
  readonly resolution?: string;
  readonly exceptionId?: string;
}

export function createFinding(input: {
  id: string;
  componentId: string;
  description: string;
  severity: Severity;
  scenario?: string;
  sourceEvidenceId?: string;
  standardOrPolicyRef?: string;
  owner?: string;
}): Finding {
  if (!input.description.trim()) {
    throw new Error('Finding requires a non-empty description');
  }
  return { ...input, status: 'open' };
}

/**
 * One step's real, recorded outcome within a manual review, per
 * documentation/09-manual-review-and-evidence.md ("Procedure model" /
 * "Review result states"). `action` and `expected` are captured here too,
 * not just referenced by index, so the record stays self-contained and
 * readable even without the original `ManualProcedure` file to hand — a
 * reviewer years later shouldn't need to go find the procedure that
 * produced this evidence just to understand what was checked.
 */
export interface ManualReviewStepResult {
  readonly stepIndex: number;
  readonly action: string;
  readonly expected: string;
  readonly status: ResultStatus;
  readonly note?: string;
  /**
   * The specific real component this step actually reviewed, when a review
   * covers more than one component (e.g. a self-review walking every
   * discovered component's own assurance record). Optional and honestly
   * absent for a review scoped to a single subject throughout — most
   * `ManualReview`s still won't set this.
   */
  readonly componentId?: string;
}

/** One execution of a manual procedure in a specific environment, per documentation/07-compliance-testing.md ("Manual result model"). */
export interface ManualReview {
  readonly id: string;
  readonly componentVersionId: string;
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly reviewerIdentity: string;
  readonly reviewerRole?: string;
  readonly date: string;
  readonly operatingSystem: string;
  readonly browser?: string;
  readonly assistiveTechnology?: string;
  readonly storyOrScenario?: string;
  readonly status: ResultStatus;
  readonly notes?: string;
  readonly commitOrFingerprint: string;
  /** Real per-step results, when the procedure was followed step by step
   * through the guided walkthrough. Optional because a hand-authored
   * review (still a real, valid `ManualReview`) may only ever record one
   * overall result. */
  readonly stepResults?: readonly ManualReviewStepResult[];
}

/** An authorized decision attached to scope, evidence, and policy, per documentation/16-data-and-schema-model.md ("Approval"). */
export interface Approval {
  readonly id: string;
  readonly componentVersionId: string;
  readonly evidenceIds: readonly string[];
  readonly policyId: string;
  readonly policyVersion: string;
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly commitOrFingerprint: string;
  readonly stale: boolean;
}

export function createApproval(input: {
  id: string;
  componentVersionId: string;
  evidenceIds: readonly string[];
  policyId: string;
  policyVersion: string;
  approvedBy: string;
  approvedAt: string;
  commitOrFingerprint: string;
}): Approval {
  return { ...input, stale: false };
}

/** An approved deviation or accepted risk against a finding, per documentation/16-data-and-schema-model.md ("Exception"). */
export interface Exception {
  readonly id: string;
  readonly findingId: string;
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly rationale: string;
  readonly expiresAt?: string;
}

export function createException(input: {
  id: string;
  findingId: string;
  approvedBy: string;
  approvedAt: string;
  rationale: string;
  expiresAt?: string;
}): Exception {
  if (!input.rationale.trim()) {
    throw new Error('Exception requires a non-empty rationale');
  }
  return { ...input };
}

/**
 * An exported, integrity-checked evidence bundle, per
 * documentation/16-data-and-schema-model.md ("EvidencePackage") and the
 * "no stored credentials" requirement in documentation/21-mvp-acceptance-criteria.md.
 * `includesCredentials` is not a settable input: it is always false.
 */
export interface EvidencePackage {
  readonly id: string;
  readonly componentVersionId: string;
  readonly exportedAt: string;
  readonly checksums: Readonly<Record<string, string>>;
  readonly contents: readonly string[];
  readonly includesCredentials: false;
}

export function createEvidencePackage(input: {
  id: string;
  componentVersionId: string;
  exportedAt: string;
  checksums: Readonly<Record<string, string>>;
  contents: readonly string[];
}): EvidencePackage {
  if (input.contents.length === 0) {
    throw new Error('EvidencePackage must include at least one content item');
  }
  return { ...input, includesCredentials: false };
}
