import { describe, expect, it } from 'vitest';
import {
  SELF_REVIEW_AREAS,
  flattenSelfReviewSteps,
} from './self-review-content';

describe('SELF_REVIEW_AREAS', () => {
  it('has a unique id and at least one step for every area', () => {
    const ids = SELF_REVIEW_AREAS.map((area) => area.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const area of SELF_REVIEW_AREAS) {
      expect(area.steps.length).toBeGreaterThan(0);
    }
  });

  it('gives every step a real action and an expected outcome', () => {
    for (const area of SELF_REVIEW_AREAS) {
      for (const step of area.steps) {
        expect(step.action.trim().length).toBeGreaterThan(0);
        expect(step.expected.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('flattenSelfReviewSteps', () => {
  it('flattens every area in order and prefixes each action with its area title', () => {
    const flat = flattenSelfReviewSteps(SELF_REVIEW_AREAS);
    const expectedCount = SELF_REVIEW_AREAS.reduce(
      (sum, area) => sum + area.steps.length,
      0,
    );
    expect(flat).toHaveLength(expectedCount);
    expect(flat[0]?.action).toContain(`[${SELF_REVIEW_AREAS[0]?.title}]`);
  });

  it("preserves each step's expected outcome unchanged", () => {
    const flat = flattenSelfReviewSteps(SELF_REVIEW_AREAS);
    expect(flat[0]?.expected).toBe(SELF_REVIEW_AREAS[0]?.steps[0]?.expected);
  });

  it('returns an empty list for an empty input', () => {
    expect(flattenSelfReviewSteps([])).toEqual([]);
  });
});
