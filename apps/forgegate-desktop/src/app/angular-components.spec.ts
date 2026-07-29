import { discoverAngularComponents, parseAngularComponents } from './angular-components';

describe('parseAngularComponents', () => {
  it('returns nothing for a file with no @Component', () => {
    expect(parseAngularComponents('a.ts', 'export class NotAComponent {}')).toEqual([]);
  });

  /**
   * Verbatim shape from phase-2-cosmic's real `header.component.ts` —
   * double-quoted selector, `standalone: false`, decorator `@Output` with an
   * `EventEmitter`. Written out rather than simplified so the test breaks if
   * the parser stops handling what real Angular 21 source actually looks like.
   */
  it('parses a real decorator-based Angular 21 component', () => {
    const source = `
import { Component, EventEmitter, Output, inject } from "@angular/core";

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
  standalone: false,
})
export class HeaderComponent {
  private readonly dialog = inject(MatDialog);

  @Output() toggleSidebar = new EventEmitter<void>();

  onToggleSidebar(): void {}
}`;

    const [component] = parseAngularComponents('apps/frontend/src/app/base/header/header.component.ts', source);

    expect(component?.className).toBe('HeaderComponent');
    expect(component?.selector).toBe('app-header');
    expect(component?.confidence).toBe('confirmed');
    expect(component?.sourceFile).toBe('apps/frontend/src/app/base/header/header.component.ts');
    expect(component?.outputs).toEqual([
      { name: 'toggleSidebar', api: 'decorator', required: false },
    ]);
    expect(component?.inputs).toEqual([]);
  });

  it('parses the real @Input shapes found in that repository', () => {
    const source = `
@Component({ selector: "app-sidebar" })
export class SidebarComponent {
  @Input() collapsed = false;
  @Input() lineage: Record<string, unknown> | undefined;
  @Input() infra!: InfrastructureTelemetrySnapshot;
  @Input() alertSlo: AlertSloMetrics | null = null;
}`;

    const [component] = parseAngularComponents('sidebar.component.ts', source);
    const byName = new Map(component?.inputs.map((input) => [input.name, input]));

    expect([...byName.keys()]).toEqual(['collapsed', 'lineage', 'infra', 'alertSlo']);
    // `!` is how a required input is written in practice.
    expect(byName.get('infra')?.required).toBe(true);
    expect(byName.get('infra')?.type).toBe('InfrastructureTelemetrySnapshot');
    expect(byName.get('collapsed')?.required).toBe(false);
    expect(byName.get('lineage')?.type).toBe('Record<string, unknown> | undefined');
  });

  it('reads an aliased input and an explicitly required one', () => {
    const source = `
@Component({ selector: 'app-x' })
export class XComponent {
  @Input('dataLabel') label?: string;
  @Input({ required: true }) value: number;
}`;

    const [component] = parseAngularComponents('x.ts', source);
    const byName = new Map(component?.inputs.map((input) => [input.name, input]));

    expect(byName.get('label')?.alias).toBe('dataLabel');
    expect(byName.get('label')?.required).toBe(false);
    expect(byName.get('value')?.required).toBe(true);
  });

  it('parses the signal-based input/output/model API', () => {
    const source = `
@Component({ selector: 'app-signal' })
export class SignalComponent {
  readonly label = input<string>();
  readonly value = input.required<number>();
  readonly checked = model<boolean>(false);
  readonly changed = output<string>();
}`;

    const [component] = parseAngularComponents('signal.ts', source);
    const inputs = new Map(component?.inputs.map((input) => [input.name, input]));

    expect(inputs.get('label')).toEqual({ name: 'label', api: 'signal', required: false, type: 'string' });
    expect(inputs.get('value')?.required).toBe(true);
    // model() is two-way; reported as an input rather than a third category.
    expect(inputs.get('checked')?.api).toBe('signal');
    expect(component?.outputs).toEqual([
      { name: 'changed', api: 'signal', required: false, type: 'string' },
    ]);
  });

  it('marks a component whose selector cannot be read as a candidate, not confirmed', () => {
    const source = `
@Component({ selector: COMPUTED_SELECTOR })
export class ComputedComponent {}`;

    const [component] = parseAngularComponents('computed.ts', source);
    expect(component?.selector).toBeNull();
    expect(component?.confidence).toBe('candidate');
  });

  it('separates two components declared in the same file', () => {
    const source = `
@Component({ selector: 'app-one' })
export class OneComponent { @Input() a!: string; }

@Component({ selector: 'app-two' })
export class TwoComponent { @Input() b!: number; }`;

    const components = parseAngularComponents('two.ts', source);

    expect(components.map((c) => c.className)).toEqual(['OneComponent', 'TwoComponent']);
    expect(components[0]?.inputs.map((i) => i.name)).toEqual(['a']);
    expect(components[1]?.inputs.map((i) => i.name)).toEqual(['b']);
  });

  it('drops a decorator with no following class rather than reporting it unnamed', () => {
    expect(parseAngularComponents('a.ts', '@Component({ selector: "x" })')).toEqual([]);
  });
});

describe('discoverAngularComponents', () => {
  it('scans many files and reports how many were examined', () => {
    const result = discoverAngularComponents([
      { path: 'a.component.ts', contents: `@Component({ selector: 'a' }) export class A {}` },
      { path: 'b.ts', contents: 'export const notAComponent = 1;' },
    ]);

    expect(result.scannedFileCount).toBe(2);
    expect(result.declarations.map((d) => d.className)).toEqual(['A']);
  });
});
