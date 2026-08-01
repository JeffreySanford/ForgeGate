import type { ManualReviewStepResult } from '@forgegate/core-evidence';
import { findingsFromManualReviewStepResults } from './manual-review-findings';

const review = {
  id: 'acme-button-keyboard-review-1',
  procedureId: 'keyboard-and-screen-reader-review',
};

function step(
  overrides: Partial<ManualReviewStepResult>,
): ManualReviewStepResult {
  return {
    stepIndex: 0,
    action: 'Activate using Space.',
    expected: 'The configured action occurs exactly once.',
    status: 'passed',
    ...overrides,
  };
}

describe('findingsFromManualReviewStepResults', () => {
  it('creates no findings when every step passed', () => {
    const findings = findingsFromManualReviewStepResults(
      'acme.button-library.acme-button',
      review,
      [step({ status: 'passed' }), step({ stepIndex: 1, status: 'skipped' })],
    );
    expect(findings).toEqual([]);
  });

  it('creates one real, linked finding per failed or blocked step, and none for other statuses', () => {
    const findings = findingsFromManualReviewStepResults(
      'acme.button-library.acme-button',
      review,
      [
        step({ stepIndex: 0, status: 'passed' }),
        step({
          stepIndex: 1,
          status: 'failed',
          note: 'Activation fired twice.',
        }),
        step({ stepIndex: 2, status: 'blocked' }),
        step({ stepIndex: 3, status: 'not-applicable' }),
      ],
    );

    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      id: 'acme-button-keyboard-review-1-step-1',
      componentId: 'acme.button-library.acme-button',
      scenario: 'Activate using Space.',
      description:
        'Activate using Space. — expected: The configured action occurs exactly once. Activation fired twice.',
      severity: 'serious',
      sourceEvidenceId: 'acme-button-keyboard-review-1',
      standardOrPolicyRef: 'keyboard-and-screen-reader-review',
      status: 'open',
    });
    expect(findings[1]?.id).toBe('acme-button-keyboard-review-1-step-2');
  });

  it('describes a failed step honestly even without a reviewer note', () => {
    const findings = findingsFromManualReviewStepResults(
      'acme.button-library.acme-button',
      review,
      [step({ status: 'failed', note: undefined })],
    );

    expect(findings[0]?.description).toBe(
      'Activate using Space. — expected: The configured action occurs exactly once., but the review recorded failed.',
    );
  });

  it("attributes a step's finding to its own componentId when set, not the review's default", () => {
    const findings = findingsFromManualReviewStepResults(
      'forgegate.desktop.shell',
      review,
      [
        step({
          status: 'failed',
          componentId: 'acme.design-system.acme-button',
        }),
      ],
    );

    expect(findings[0]?.componentId).toBe('acme.design-system.acme-button');
  });

  it('falls back to the review-level componentId when a step has none', () => {
    const findings = findingsFromManualReviewStepResults(
      'forgegate.desktop.shell',
      review,
      [step({ status: 'failed' })],
    );

    expect(findings[0]?.componentId).toBe('forgegate.desktop.shell');
  });

  it('produces stable, deterministic ids so re-deriving the same review never duplicates findings', () => {
    const stepResults = [step({ stepIndex: 4, status: 'blocked' })];
    const first = findingsFromManualReviewStepResults(
      'acme.button-library.acme-button',
      review,
      stepResults,
    );
    const second = findingsFromManualReviewStepResults(
      'acme.button-library.acme-button',
      review,
      stepResults,
    );
    expect(first).toEqual(second);
  });
});
