import {
  Component,
  computed,
  inject,
  input,
  type OnInit,
  signal,
} from '@angular/core';
import type { ComponentManifest } from '@forgegate/core-manifest';
import type { StarlightPageTemplate } from '../starlight-page';
import { WorkspaceService } from '../workspace.service';

/**
 * Generates a real Starlight "designer-heavy" documentation page for a
 * component (`generateDesignerStarlightComponentPage`) and stages it for
 * review before anything is written into the detected Starlight project —
 * per documentation/12-starlight-integration.md's "MVP acceptance" (show
 * a diff, preserve a user-authored section) and P2 entry gate 2's
 * staged/diff/approve/discard discipline, the same shape
 * `ManualReviewWalkthrough` already uses for manual reviews.
 */
@Component({
  selector: 'app-starlight-page-generator',
  templateUrl: './starlight-page-generator.html',
  styleUrl: './starlight-page-generator.css',
})
export class StarlightPageGenerator implements OnInit {
  protected readonly workspace = inject(WorkspaceService);
  readonly manifest = input.required<ComponentManifest>();
  readonly registryManifests = input<readonly ComponentManifest[]>([]);
  protected readonly selectedTemplate =
    signal<StarlightPageTemplate>('designer');
  protected readonly templateOptions = this.workspace.starlightTemplates;
  protected readonly selectedTemplateDescription = computed(
    () =>
      this.templateOptions.find(
        (option) => option.id === this.selectedTemplate(),
      )?.description ?? '',
  );

  ngOnInit(): void {
    this.selectedTemplate.set(
      this.workspace.starlightDefaultTemplateFor(this.manifest()),
    );
  }

  protected generate(): void {
    void this.workspace.generateAndStageStarlightPage(
      this.manifest(),
      this.selectedTemplate(),
      this.registryManifests().length
        ? this.registryManifests()
        : [this.manifest()],
    );
  }

  protected approve(): void {
    void this.workspace.approveStagedStarlightPage();
  }

  protected discard(): void {
    void this.workspace.discardStagedStarlightPage();
  }
}
