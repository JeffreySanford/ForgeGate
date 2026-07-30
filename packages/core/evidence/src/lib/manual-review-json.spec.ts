import { describe, expect, it } from 'vitest';
import { parseManualReview } from './manual-review-json';

const validReview = {
  id: 'acme-button-keyboard-2026-07-24',
  componentVersionId: 'acme.button-library.acme-button@0.1.0',
  procedureId: 'keyboard-and-screen-reader-review',
  procedureVersion: '1.0.0',
  reviewerIdentity: 'jane.doe@example.com',
  reviewerRole: 'accessibility-reviewer',
  date: '2026-07-24T16:00:00.000Z',
  operatingSystem: 'macOS 15',
  browser: 'Safari 18',
  assistiveTechnology: 'VoiceOver',
  storyOrScenario: 'default',
  status: 'passed',
  notes: 'Tab order, focus visibility, and announcement all verified.',
  commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
};

describe('parseManualReview', () => {
  it('parses a schema-valid repository manual review record', () => {
    expect(parseManualReview(JSON.stringify(validReview))).toEqual(
      validReview,
    );
  });

  it('rejects malformed JSON', () => {
    expect(() => parseManualReview('{')).toThrow(
      'Manual review is not valid JSON',
    );
  });

  it('rejects unknown statuses and missing provenance', () => {
    expect(() =>
      parseManualReview(
        JSON.stringify({
          ...validReview,
          status: 'green',
          operatingSystem: undefined,
        }),
      ),
    ).toThrow('Manual review does not match the schema');
  });

  it('rejects a record missing the required reviewer identity', () => {
    const { reviewerIdentity: _reviewerIdentity, ...withoutReviewer } =
      validReview;
    expect(() =>
      parseManualReview(JSON.stringify(withoutReviewer)),
    ).toThrow('Manual review does not match the schema');
  });

  it('parses real per-step results from a guided walkthrough', () => {
    const withSteps = {
      ...validReview,
      stepResults: [
        {
          stepIndex: 0,
          action: 'Move focus to the button using Tab.',
          expected: 'The accessible name and button role are announced.',
          status: 'passed',
        },
        {
          stepIndex: 1,
          action: 'Activate using Space.',
          expected: 'The configured action occurs exactly once.',
          status: 'failed',
          note: 'Activation fired twice.',
        },
      ],
    };
    expect(parseManualReview(JSON.stringify(withSteps))).toEqual(withSteps);
  });

  it('rejects a step result missing its required status', () => {
    expect(() =>
      parseManualReview(
        JSON.stringify({
          ...validReview,
          stepResults: [
            { stepIndex: 0, action: 'Do a thing.', expected: 'It works.' },
          ],
        }),
      ),
    ).toThrow('Manual review does not match the schema');
  });
});
