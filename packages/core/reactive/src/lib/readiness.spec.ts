import { createFinding } from '@forgegate/core-evidence';
import { TestScheduler } from 'rxjs/testing';
import { computeReadiness, hasFailingGate, readiness$ } from './readiness';

const openCritical = createFinding({
  id: 'f-1',
  componentId: 'up.design-system.button',
  description: 'Missing accessible name',
  severity: 'critical',
});

const openMinor = createFinding({
  id: 'f-2',
  componentId: 'up.design-system.button',
  description: 'Inconsistent focus ring color',
  severity: 'minor',
});

const resolvedCritical = { ...openCritical, status: 'resolved' as const };

describe('computeReadiness', () => {
  it('is clear with no findings', () => {
    expect(computeReadiness([])).toBe('clear');
  });

  it('is blocked when an open finding is critical or serious', () => {
    expect(computeReadiness([openCritical])).toBe('blocked');
  });

  it('is warning when open findings exist but none are critical or serious', () => {
    expect(computeReadiness([openMinor])).toBe('warning');
  });

  it('is clear when the only critical finding has been resolved', () => {
    expect(computeReadiness([resolvedCritical])).toBe('clear');
  });
});

describe('readiness$ (marble)', () => {
  it('recomputes readiness as the findings stream changes', () => {
    const scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    scheduler.run(({ cold, expectObservable }) => {
      // a = no findings, b = one critical open finding, c = the same
      // finding resolved.
      const findings$ = cold('a-b-c-|', {
        a: [],
        b: [openCritical],
        c: [resolvedCritical],
      });

      expectObservable(readiness$(findings$)).toBe('x-y-z-|', {
        x: 'clear',
        y: 'blocked',
        z: 'clear',
      });
    });
  });

  it('suppresses a re-emission when readiness has not actually changed', () => {
    const scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    scheduler.run(({ cold, expectObservable }) => {
      // a = no findings, b = one critical open finding, c = a *different*
      // critical finding (still blocked, no change), d = both resolved.
      const secondCritical = createFinding({
        id: 'f-3',
        componentId: 'up.design-system.button',
        description: 'Also missing a landmark role',
        severity: 'critical',
      });

      const findings$ = cold('a-b-c-d|', {
        a: [],
        b: [openCritical],
        c: [openCritical, secondCritical],
        d: [resolvedCritical, { ...secondCritical, status: 'resolved' as const }],
      });

      expectObservable(readiness$(findings$)).toBe('x-y---z|', {
        x: 'clear',
        y: 'blocked',
        z: 'clear',
      });
    });
  });
});

describe('hasFailingGate', () => {
  it('is true when any execution failed or is blocked', () => {
    expect(
      hasFailingGate([
        {
          id: 'e-1',
          componentVersionId: 'cv-1',
          gate: 'axe',
          tool: 'axe-core',
          toolVersion: '4.0.0',
          adapterVersion: '0.1.0',
          status: 'failed',
          startedAt: new Date().toISOString(),
          commitOrFingerprint: 'a'.repeat(40),
        },
      ]),
    ).toBe(true);
  });

  it('is false when every execution passed or was skipped', () => {
    expect(
      hasFailingGate([
        {
          id: 'e-1',
          componentVersionId: 'cv-1',
          gate: 'axe',
          tool: 'axe-core',
          toolVersion: '4.0.0',
          adapterVersion: '0.1.0',
          status: 'passed',
          startedAt: new Date().toISOString(),
          commitOrFingerprint: 'a'.repeat(40),
        },
      ]),
    ).toBe(false);
  });
});
