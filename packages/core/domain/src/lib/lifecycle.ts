/**
 * Lifecycle status of a component version, per documentation/16-data-and-schema-model.md
 * and documentation/02-system-architecture.md ("Lifecycle and status").
 */
export type LifecycleStatus =
  | 'proposal'
  | 'candidate'
  | 'approved'
  | 'deprecated'
  | 'retired';

/**
 * Blocked/warning are independent of lifecycle status: a candidate or an
 * approved component can be blocked or carry warnings without changing
 * which lifecycle stage it is in.
 */
export type ReadinessFlag = 'blocked' | 'warning' | 'clear';

const ALLOWED_TRANSITIONS: Readonly<Record<LifecycleStatus, readonly LifecycleStatus[]>> = {
  proposal: ['candidate', 'retired'],
  candidate: ['approved', 'proposal', 'retired'],
  approved: ['deprecated', 'retired'],
  deprecated: ['retired', 'approved'],
  retired: [],
};

export interface LifecycleTransition {
  readonly from: LifecycleStatus;
  readonly to: LifecycleStatus;
  readonly changedBy: string;
  readonly reason: string;
  readonly at: string;
}

export function isLifecycleTransitionAllowed(
  from: LifecycleStatus,
  to: LifecycleStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertLifecycleTransitionAllowed(
  from: LifecycleStatus,
  to: LifecycleStatus,
): void {
  if (!isLifecycleTransitionAllowed(from, to)) {
    throw new Error(`Lifecycle transition from "${from}" to "${to}" is not allowed`);
  }
}
