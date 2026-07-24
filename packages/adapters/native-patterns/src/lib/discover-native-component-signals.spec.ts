import { discoverNativeComponentSignals } from './discover-native-component-signals';

describe('discoverNativeComponentSignals', () => {
  it('confirms PrimeNG enhanced native buttons when the dependency is detected', () => {
    const signals = discoverNativeComponentSignals(
      [{ path: 'src/app.html', content: '<button pButton>Save</button>' }],
      [{ id: 'primeng' }],
    );

    expect(signals).toEqual([
      expect.objectContaining({
        kind: 'enhanced-native',
        selector: 'button[pButton]',
        provider: 'primeng',
        confidence: 'confirmed',
        line: 1,
      }),
    ]);
  });

  it('recognizes Angular Material attribute variants', () => {
    const signals = discoverNativeComponentSignals(
      [
        {
          path: 'src/app.html',
          content: '\n<button mat-raised-button>Save</button>',
        },
      ],
      [{ id: 'angular-material' }],
    );

    expect(signals[0]).toMatchObject({
      selector: 'button[mat-button]',
      provider: 'angular-material',
      confidence: 'confirmed',
      line: 2,
    });
  });

  it('detects Bootstrap component classes without treating utility classes as components', () => {
    const signals = discoverNativeComponentSignals(
      [
        {
          path: 'src/view.html',
          content:
            '<button class="btn btn-primary">Save</button><div class="d-flex"></div>',
        },
      ],
      [{ id: 'bootstrap' }],
    );

    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      kind: 'css-component',
      selector: 'button.btn',
      confidence: 'confirmed',
    });
  });

  it('reports repository CSS definitions and Storybook native patterns as candidates', () => {
    const signals = discoverNativeComponentSignals(
      [
        {
          path: 'src/button.css',
          content: '.ds-button { color: blue; }',
        },
        {
          path: 'src/button.stories.ts',
          content: 'export const Basic = () => `<button>Save</button>`;',
        },
      ],
      [],
    );

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          selector: '.ds-button',
          provider: 'repository',
          confidence: 'candidate',
        }),
        expect.objectContaining({
          selector: 'button',
          provider: 'native-html',
          confidence: 'candidate',
        }),
      ]),
    );
  });

  it('does not promote ordinary native element usage outside a story', () => {
    expect(
      discoverNativeComponentSignals(
        [{ path: 'src/page.html', content: '<button>Save</button>' }],
        [],
      ),
    ).toEqual([]);
  });
});
