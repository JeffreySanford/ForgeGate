import { TestBed } from '@angular/core/testing';
import { EvidenceHistoryTrendView } from './evidence-history-trend-view';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService } from '../workspace.service';

describe('EvidenceHistoryTrendView', () => {
  let workspace: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvidenceHistoryTrendView],
    }).compileComponents();
    workspace = TestBed.inject(WorkspaceService);
  });

  it('shows an explicit empty state when no workspace is open', async () => {
    const fixture = TestBed.createComponent(EvidenceHistoryTrendView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain(
      'Open a workspace',
    );
    expect(compiled.querySelector('table')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('states when persistence is not configured', async () => {
    workspace.workspacePath.set('D:/repos/ForgeGate');
    workspace.evidenceHistoryTrend.set({
      configured: false,
      connected: false,
      snapshots: [],
      error: null,
    });

    const fixture = TestBed.createComponent(EvidenceHistoryTrendView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain(
      'FORGEGATE_DATABASE_URL',
    );

    await expectNoAccessibilityViolations(compiled);
  });

  it('renders seeded snapshot trends without hiding that they are seeded', async () => {
    workspace.workspacePath.set('D:/repos/ForgeGate');
    workspace.evidenceHistoryTrend.set({
      configured: true,
      connected: true,
      snapshots: [
        {
          id: 1,
          scannedAt: '2026-01-15T15:00:00Z',
          sourceCommit: 'a'.repeat(40),
          dirty: false,
          componentCount: 8,
          readinessSummary: {
            total: 8,
            readiness: { unknown: 8 },
            lifecycle: { proposal: 8 },
          },
          adapterSummary: { total: 2, byStatus: { loaded: 1, partial: 1 } },
          seeded: true,
          seedLabel: 'dev-history-2026-07',
        },
        {
          id: 2,
          scannedAt: '2026-06-24T15:00:00Z',
          sourceCommit: 'b'.repeat(40),
          dirty: true,
          componentCount: 12,
          readinessSummary: {
            total: 12,
            readiness: { unknown: 12 },
            lifecycle: { candidate: 12 },
          },
          adapterSummary: { total: 3, byStatus: { loaded: 2, partial: 1 } },
          seeded: true,
          seedLabel: 'dev-history-2026-07',
        },
      ],
      error: null,
    });

    const fixture = TestBed.createComponent(EvidenceHistoryTrendView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const summaryCells = Array.from(
      compiled.querySelectorAll('.evidence-history-trend__summary div'),
    ).map((item) =>
      Array.from(item.querySelectorAll('span')).map((span) =>
        span.textContent?.trim(),
      ),
    );
    expect(summaryCells).toEqual([
      ['2', 'Snapshots'],
      ['12', 'Latest components'],
      ['+4', 'Component delta'],
    ]);
    expect(compiled.textContent).toContain('Seeded development history');
    expect(compiled.textContent).toContain('dev-history-2026-07');
    expect(compiled.textContent).toContain('8 unknown');
    expect(compiled.textContent).toContain('2 loaded, 1 partial');
    expect(compiled.textContent).toContain('dirty');

    await expectNoAccessibilityViolations(compiled);
  });
});
