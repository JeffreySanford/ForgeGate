/**
 * A real Angular component-discovery adapter — the single biggest coverage
 * gap in the product. Until now the only component-discovery adapter was
 * Web Components/CEM, so an Angular design system (Angular Material
 * wrappers being the common case) produced an empty inventory and every
 * downstream P1 view was blank for it.
 *
 * **This is a source scan, not a compiler-accurate analysis, and that is a
 * deliberate trade rather than an oversight.** Angular's real contract is
 * only fully knowable by running its compiler, which ForgeGate cannot do
 * from the webview and would not want to do implicitly against a user's
 * repository. CEM, by contrast, is a build *output* — the Web Components
 * adapter reads a file the repository already generated, which is why that
 * one can be `'confirmed'`. Here the evidence is the source text itself, so
 * every declaration is reported with an explicit confidence and the UI is
 * expected to say so. This mirrors the existing native-pattern adapter,
 * which already scans source and reports confidence rather than pretending
 * to certainty.
 *
 * Known limits, disclosed rather than hidden:
 * - A `@Component` inside a comment or a string would be matched.
 * - Members are attributed to the nearest preceding `@Component` class in
 *   the same file; a file mixing a component and an unrelated class that
 *   also uses `@Input` could mis-attribute.
 * - Types are captured as written, not resolved — an aliased or imported
 *   type is reported verbatim.
 */

export type AngularMemberApi = 'decorator' | 'signal';

export interface AngularMember {
  readonly name: string;
  /** Public template name when it differs from the class property. */
  readonly alias?: string;
  readonly api: AngularMemberApi;
  readonly required: boolean;
  /** Declared type as written in source, when one is recoverable. */
  readonly type?: string;
}

export interface AngularComponentDeclaration {
  readonly className: string;
  readonly selector: string | null;
  readonly sourceFile: string;
  readonly inputs: readonly AngularMember[];
  readonly outputs: readonly AngularMember[];
  /**
   * `'confirmed'` when the declaration has both a `@Component` decorator and
   * a resolvable selector — the two things that make it addressable in a
   * template. `'candidate'` when it is decorated but the selector could not
   * be read (a computed or re-exported selector, say), which is still worth
   * surfacing but not worth claiming as a known component.
   */
  readonly confidence: 'confirmed' | 'candidate';
}

const COMPONENT_DECORATOR = /@Component\s*\(/g;
const SELECTOR = /selector\s*:\s*(['"`])([^'"`]+)\1/;
const CLASS_NAME = /export\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/;

/** `@Input() name: T` / `@Input('alias') name` / `@Input({ required: true }) name!: T` */
const DECORATOR_INPUT =
  /@Input\s*\(\s*(?:(['"`])([^'"`]+)\1|\{([^}]*)\})?\s*\)\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*(!|\?)?\s*(?::\s*([^;=\n]+))?/g;

/** `@Output() name = new EventEmitter<T>()` */
const DECORATOR_OUTPUT =
  /@Output\s*\(\s*(?:(['"`])([^'"`]+)\1)?\s*\)\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*(?::\s*([^;=\n]+))?/g;

/** `name = input<T>()` / `name = input.required<T>()` / `name = model<T>()` */
const SIGNAL_INPUT =
  /(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*=\s*(input|model)(\.required)?\s*(?:<([^>]*)>)?\s*\(/g;

/** `name = output<T>()` */
const SIGNAL_OUTPUT =
  /(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*=\s*output\s*(?:<([^>]*)>)?\s*\(/g;

function cleanType(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Splits a source file into one chunk per `@Component` decorator, each
 * running to the next decorator (or end of file). Members found in a chunk
 * belong to that chunk's component.
 */
function componentChunks(source: string): readonly string[] {
  const starts: number[] = [];
  COMPONENT_DECORATOR.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = COMPONENT_DECORATOR.exec(source)) !== null) {
    starts.push(match.index);
  }
  return starts.map((start, index) => source.slice(start, starts[index + 1] ?? source.length));
}

function collectInputs(chunk: string): AngularMember[] {
  const members: AngularMember[] = [];

  DECORATOR_INPUT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DECORATOR_INPUT.exec(chunk)) !== null) {
    const [, , alias, options, name, definiteOrOptional, type] = match;
    if (!name) continue;
    members.push({
      name,
      ...(alias ? { alias } : {}),
      api: 'decorator',
      // Either `@Input({ required: true })` or the `!` definite-assignment
      // assertion, which is how a required input is written in practice.
      required: /required\s*:\s*true/.test(options ?? '') || definiteOrOptional === '!',
      ...(cleanType(type) ? { type: cleanType(type) } : {}),
    });
  }

  SIGNAL_INPUT.lastIndex = 0;
  while ((match = SIGNAL_INPUT.exec(chunk)) !== null) {
    const [, name, , requiredMarker, type] = match;
    if (!name) continue;
    // `model()` is two-way, but ManifestContract has no two-way concept, so
    // it is reported as an input rather than inventing a third category.
    members.push({
      name,
      api: 'signal',
      required: requiredMarker !== undefined,
      ...(cleanType(type) ? { type: cleanType(type) } : {}),
    });
  }

  return members;
}

function collectOutputs(chunk: string): AngularMember[] {
  const members: AngularMember[] = [];

  DECORATOR_OUTPUT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DECORATOR_OUTPUT.exec(chunk)) !== null) {
    const [, , alias, name, type] = match;
    if (!name) continue;
    members.push({
      name,
      ...(alias ? { alias } : {}),
      api: 'decorator',
      required: false,
      ...(cleanType(type) ? { type: cleanType(type) } : {}),
    });
  }

  SIGNAL_OUTPUT.lastIndex = 0;
  while ((match = SIGNAL_OUTPUT.exec(chunk)) !== null) {
    const [, name, type] = match;
    if (!name) continue;
    members.push({
      name,
      api: 'signal',
      required: false,
      ...(cleanType(type) ? { type: cleanType(type) } : {}),
    });
  }

  return members;
}

/**
 * Finds every Angular component declared in one source file. Returns an
 * empty list for a file with no `@Component`, so callers can pass every
 * discovered source file without pre-filtering.
 */
export function parseAngularComponents(
  sourceFile: string,
  source: string,
): readonly AngularComponentDeclaration[] {
  return componentChunks(source).flatMap((chunk) => {
    const className = CLASS_NAME.exec(chunk)?.[1];
    if (!className) {
      // A decorator with no following class is not something ForgeGate can
      // name or link to, so it is dropped rather than reported as unnamed.
      return [];
    }
    const selector = SELECTOR.exec(chunk)?.[2] ?? null;
    return [
      {
        className,
        selector,
        sourceFile,
        inputs: collectInputs(chunk),
        outputs: collectOutputs(chunk),
        confidence: selector ? ('confirmed' as const) : ('candidate' as const),
      },
    ];
  });
}

export interface AngularDiscoveryResult {
  readonly declarations: readonly AngularComponentDeclaration[];
  readonly scannedFileCount: number;
}

/**
 * Scans many files at once. Files are supplied already-read by the caller
 * (the Rust side owns filesystem access), so this stays a pure function.
 */
export function discoverAngularComponents(
  files: readonly { readonly path: string; readonly contents: string }[],
): AngularDiscoveryResult {
  return {
    declarations: files.flatMap((file) => parseAngularComponents(file.path, file.contents)),
    scannedFileCount: files.length,
  };
}
