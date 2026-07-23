import { assertLifecycleTransitionAllowed, isLifecycleTransitionAllowed } from './lifecycle';

describe('lifecycle transitions', () => {
  it('allows proposal to candidate', () => {
    expect(isLifecycleTransitionAllowed('proposal', 'candidate')).toBe(true);
  });

  it('allows candidate to approved', () => {
    expect(isLifecycleTransitionAllowed('candidate', 'approved')).toBe(true);
  });

  it('rejects skipping straight from proposal to approved', () => {
    expect(isLifecycleTransitionAllowed('proposal', 'approved')).toBe(false);
  });

  it('rejects any transition out of retired', () => {
    expect(isLifecycleTransitionAllowed('retired', 'candidate')).toBe(false);
    expect(isLifecycleTransitionAllowed('retired', 'approved')).toBe(false);
  });

  it('allows a deprecated component to be reinstated as approved', () => {
    expect(isLifecycleTransitionAllowed('deprecated', 'approved')).toBe(true);
  });

  it('throws with a descriptive message for a disallowed transition', () => {
    expect(() => assertLifecycleTransitionAllowed('proposal', 'approved')).toThrow(
      'Lifecycle transition from "proposal" to "approved" is not allowed',
    );
  });
});
