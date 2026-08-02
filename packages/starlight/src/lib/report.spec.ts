import type { ForgeGateComponentReport } from './report';
import { contractMemberCount, notConnectedCount, openFindingCount } from './report';

describe('contractMemberCount', () => {
  it('counts every public contract group in a component report', () => {
    const report: ForgeGateComponentReport = {
      componentId: 'acme.button-library.acme-button',
      version: '0.1.0',
      lifecycle: 'candidate',
      evidenceCommit: 'fixture',
      packagePath: '.',
      tier: 'balanced',
      states: [],
      tokens: [],
      contract: {
        inputs: [{ name: 'label' }],
        outputs: [{ name: 'activate' }],
        content: [{ name: 'default' }],
        publicMethods: [{ name: 'focus' }],
        styleParts: [{ name: 'control' }],
      },
      manualProcedures: [],
      evidence: {
        automated: [],
        manualReviews: [],
        findings: [],
        releaseDecision: {
          status: 'not-connected',
          reason: 'No policy is authored.',
          blockingFindingIds: [],
          evidenceIds: [],
        },
        notConnected: [],
      },
      documentation: [],
    };

    expect(contractMemberCount(report)).toBe(5);
  });

  it('returns zero when no report is connected yet', () => {
    expect(contractMemberCount(undefined)).toBe(0);
  });
});

describe('openFindingCount', () => {
  it('counts only open findings in the report evidence summary', () => {
    expect(
      openFindingCount({
        componentId: 'acme.button-library.acme-button',
        version: '0.1.0',
        lifecycle: 'candidate',
        evidenceCommit: 'fixture',
        packagePath: '.',
        tier: 'balanced',
        states: [],
        tokens: [],
        contract: {
          inputs: [],
          outputs: [],
          content: [],
          publicMethods: [],
          styleParts: [],
        },
        manualProcedures: [],
        evidence: {
          automated: [],
          manualReviews: [],
          findings: [
            {
              id: 'open',
              description: 'Open issue.',
              severity: 'serious',
              status: 'open',
            },
            {
              id: 'resolved',
              description: 'Resolved issue.',
              severity: 'minor',
              status: 'resolved',
            },
          ],
          releaseDecision: {
            status: 'not-connected',
            reason: 'No policy is authored.',
            blockingFindingIds: [],
            evidenceIds: [],
          },
          notConnected: [],
        },
        documentation: [],
      }),
    ).toBe(1);
  });
});

describe('notConnectedCount', () => {
  it('counts explicit evidence gaps in a report', () => {
    expect(
      notConnectedCount({
        componentId: 'acme.button-library.acme-button',
        version: '0.1.0',
        lifecycle: 'candidate',
        evidenceCommit: 'fixture',
        packagePath: '.',
        tier: 'balanced',
        states: [],
        tokens: [],
        contract: {
          inputs: [],
          outputs: [],
          content: [],
          publicMethods: [],
          styleParts: [],
        },
        manualProcedures: [],
        evidence: {
          automated: [],
          manualReviews: [],
          findings: [],
          releaseDecision: {
            status: 'not-connected',
            reason: 'No policy is authored.',
            blockingFindingIds: [],
            evidenceIds: [],
          },
          notConnected: [
            { section: 'automated', reason: 'No automated evidence.' },
          ],
        },
        documentation: [],
      }),
    ).toBe(1);
  });
});
