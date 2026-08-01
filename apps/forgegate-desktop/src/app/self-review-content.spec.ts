import { describe, expect, it } from 'vitest';
import {
  COMPONENT_RECORD_CHECK_TEMPLATES,
  SELF_REVIEW_AREAS,
  buildComponentRecordSteps,
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

  it('preserves extra fields (e.g. componentId) on each flattened step', () => {
    const flat = flattenSelfReviewSteps([
      {
        id: 'a',
        title: 'Area A',
        summary: '',
        steps: [{ action: 'do it', expected: 'works', componentId: 'x' }],
      },
    ]);
    expect(flat[0]?.componentId).toBe('x');
  });
});

describe('buildComponentRecordSteps', () => {
  it('returns nothing when there are no real discovered components', () => {
    expect(buildComponentRecordSteps([])).toEqual([]);
  });

  it('generates one step per check template per component, substituting the real component name', () => {
    const steps = buildComponentRecordSteps([
      { id: 'acme.button', name: 'Button' },
    ]);
    expect(steps).toHaveLength(COMPONENT_RECORD_CHECK_TEMPLATES.length);
    for (const step of steps) {
      expect(step.componentId).toBe('acme.button');
      expect(step.componentName).toBe('Button');
      expect(step.action).not.toContain('{component}');
      expect(step.action).toContain('Button');
    }
  });

  it('orders steps component-major: every check for component 1, then every check for component 2', () => {
    const steps = buildComponentRecordSteps([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ]);
    const checksPerComponent = COMPONENT_RECORD_CHECK_TEMPLATES.length;
    expect(steps).toHaveLength(checksPerComponent * 2);
    expect(
      steps
        .slice(0, checksPerComponent)
        .every((step) => step.componentId === 'a'),
    ).toBe(true);
    expect(
      steps.slice(checksPerComponent).every((step) => step.componentId === 'b'),
    ).toBe(true);
  });
});
