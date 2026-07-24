export interface SourceFile {
  path: string;
  content: string;
}

export interface DetectedTechnology {
  id: string;
}

export type NativeComponentSignalKind =
  'enhanced-native' | 'css-component' | 'native-pattern';

export interface NativeComponentSignal {
  kind: NativeComponentSignalKind;
  selector: string;
  nativeElement: string | null;
  provider: string;
  sourceFile: string;
  line: number;
  confidence: 'confirmed' | 'candidate';
  evidence: string;
}

const ENHANCEMENTS = [
  {
    provider: 'primeng',
    selector: '[pButton]',
    attribute: /\bpButton\b/i,
  },
  {
    provider: 'angular-material',
    selector: '[mat-button]',
    attribute:
      /\b(?:mat-button|mat-raised-button|mat-flat-button|mat-stroked-button|mat-icon-button|mat-fab|mat-mini-fab)\b/i,
  },
] as const;

const NATIVE_ELEMENTS = 'button|a|input|select|textarea';

function lineAt(content: string, offset: number): number {
  return content.slice(0, offset).split('\n').length;
}

function classesFrom(attributes: string): string[] {
  const match = attributes.match(/\bclass\s*=\s*(['"])([\s\S]*?)\1/i);
  return match?.[2]?.split(/\s+/).filter(Boolean) ?? [];
}

function isStoryFile(path: string): boolean {
  return /\.stories\.[cm]?[jt]sx?$/i.test(path);
}

export function discoverNativeComponentSignals(
  files: readonly SourceFile[],
  technologies: readonly DetectedTechnology[],
): NativeComponentSignal[] {
  const technologyIds = new Set(technologies.map(({ id }) => id));
  const signals: NativeComponentSignal[] = [];

  for (const file of files) {
    const tagPattern = new RegExp(`<(${NATIVE_ELEMENTS})\\b([^>]*)>`, 'gi');
    for (const match of file.content.matchAll(tagPattern)) {
      const nativeElement = match[1]?.toLowerCase();
      const attributes = match[2] ?? '';
      if (!nativeElement || match.index === undefined) {
        continue;
      }
      let matchedContract = false;

      for (const enhancement of ENHANCEMENTS) {
        if (!enhancement.attribute.test(attributes)) {
          continue;
        }
        matchedContract = true;
        signals.push({
          kind: 'enhanced-native',
          selector: `${nativeElement}${enhancement.selector}`,
          nativeElement,
          provider: enhancement.provider,
          sourceFile: file.path,
          line: lineAt(file.content, match.index),
          confidence: technologyIds.has(enhancement.provider)
            ? 'confirmed'
            : 'candidate',
          evidence: `Native <${nativeElement}> enhanced by ${enhancement.selector}`,
        });
      }

      const classes = classesFrom(attributes);
      if (classes.includes('btn')) {
        matchedContract = true;
        signals.push({
          kind: 'css-component',
          selector: `${nativeElement}.btn`,
          nativeElement,
          provider: 'bootstrap',
          sourceFile: file.path,
          line: lineAt(file.content, match.index),
          confidence: technologyIds.has('bootstrap')
            ? 'confirmed'
            : 'candidate',
          evidence:
            'Bootstrap component class "btn" applied to a native element',
        });
      }

      if (!matchedContract && isStoryFile(file.path)) {
        signals.push({
          kind: 'native-pattern',
          selector: nativeElement,
          nativeElement,
          provider: 'native-html',
          sourceFile: file.path,
          line: lineAt(file.content, match.index),
          confidence: 'candidate',
          evidence: `Native <${nativeElement}> rendered in a Storybook story`,
        });
      }
    }

    if (/\.(?:css|scss|sass|less)$/i.test(file.path)) {
      const selectorPattern =
        /\.([a-z][\w-]*(?:button|btn)[\w-]*)\b(?=[^{]*\{)/gi;
      for (const match of file.content.matchAll(selectorPattern)) {
        const className = match[1];
        if (!className || className === 'btn' || match.index === undefined) {
          continue;
        }
        signals.push({
          kind: 'css-component',
          selector: `.${className}`,
          nativeElement: null,
          provider: 'repository',
          sourceFile: file.path,
          line: lineAt(file.content, match.index),
          confidence: 'candidate',
          evidence: 'Repository-owned component-like CSS selector definition',
        });
      }
    }
  }

  return signals.filter(
    (signal, index) =>
      signals.findIndex(
        (candidate) =>
          candidate.kind === signal.kind &&
          candidate.selector === signal.selector &&
          candidate.sourceFile === signal.sourceFile &&
          candidate.line === signal.line,
      ) === index,
  );
}
