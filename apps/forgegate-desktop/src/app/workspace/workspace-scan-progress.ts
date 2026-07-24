import { Component, inject } from '@angular/core';
import type {
  WorkspaceScanPhase,
  WorkspaceScanProgress,
} from '../workspace.service';
import { WorkspaceService } from '../workspace.service';

interface ScanStep {
  readonly phase: Exclude<
    WorkspaceScanPhase,
    'selecting' | 'complete' | 'failed'
  >;
  readonly label: string;
}

const SCAN_STEPS: readonly ScanStep[] = [
  { phase: 'repository', label: 'Repository and configuration' },
  { phase: 'contracts', label: 'Component contracts' },
  { phase: 'governance', label: 'Component governance' },
  { phase: 'storybook', label: 'Storybook stories' },
  { phase: 'native-patterns', label: 'Native and library patterns' },
];

@Component({
  selector: 'app-workspace-scan-progress',
  templateUrl: './workspace-scan-progress.html',
  styleUrl: './workspace-scan-progress.css',
})
export class WorkspaceScanProgressView {
  protected readonly workspace = inject(WorkspaceService);
  protected readonly steps = SCAN_STEPS;

  protected stepStatus(
    stepIndex: number,
    progress: WorkspaceScanProgress,
  ): 'Complete' | 'Checking' | 'Pending' | 'Not checked' {
    if (stepIndex < progress.completed) return 'Complete';
    if (progress.state === 'failed') return 'Not checked';
    if (
      progress.state === 'running' &&
      progress.phase !== 'selecting' &&
      stepIndex === progress.completed
    ) {
      return 'Checking';
    }
    return progress.state === 'complete' ? 'Complete' : 'Pending';
  }
}
