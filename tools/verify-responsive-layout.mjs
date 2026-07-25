import { chromium } from '@playwright/test';
import express from 'express';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

const require = createRequire(import.meta.url);
const playwrightTestEntry = require.resolve('@playwright/test');
const playwrightCoreEntry = require.resolve('playwright-core', {
  paths: [playwrightTestEntry],
});
const { getComparator } = require(
  resolve(dirname(playwrightCoreEntry), 'lib/coreBundle.js'),
).utils;
const comparePng = getComparator('image/png');

const repositoryRoot = resolve(import.meta.dirname, '..');
const browserRoot = resolve(
  repositoryRoot,
  'dist/apps/forgegate-desktop/browser',
);
const evidenceRoot = resolve(repositoryRoot, 'dist/responsive-evidence');
const baselineRoot = resolve(
  repositoryRoot,
  'apps/forgegate-desktop/visual-baselines/windows-edge',
);
const fixtureRoot = resolve(repositoryRoot, 'fixtures/acme-button-library');
const updateBaselines = process.argv.includes('--update-baselines');
const maximumDiffRatio = 0.005;

if (!existsSync(resolve(browserRoot, 'index.html'))) {
  throw new Error(
    'Development build not found. Run the forgegate-desktop development build first.',
  );
}

const edgePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = existsSync(edgePath) ? edgePath : undefined;
if (process.platform !== 'win32' || !executablePath) {
  throw new Error(
    'The ForgeGate visual gate requires Windows and the installed Microsoft Edge executable.',
  );
}
const fixture = {
  cem: JSON.parse(
    readFileSync(resolve(fixtureRoot, 'custom-elements.json'), 'utf8'),
  ),
  componentManifest: parseYaml(
    readFileSync(
      resolve(
        fixtureRoot,
        '.forgegate/components/acme.button-library.acme-button.yaml',
      ),
      'utf8',
    ),
  ),
  storybookIndex: JSON.parse(
    readFileSync(resolve(fixtureRoot, 'storybook-static/index.json'), 'utf8'),
  ),
  testExecution: JSON.parse(
    readFileSync(
      resolve(fixtureRoot, '.forgegate/evidence/acme-button-unit.json'),
      'utf8',
    ),
  ),
};

const app = express();
app.use(express.static(browserRoot));
app.get('*', (_request, response) => {
  response.sendFile(resolve(browserRoot, 'index.html'));
});
const server = await new Promise((resolveServer) => {
  const listening = app.listen(0, '127.0.0.1', () => resolveServer(listening));
});
const address = server.address();
if (!address || typeof address === 'string') {
  server.close();
  throw new Error('Responsive-check server did not expose a TCP port');
}

mkdirSync(evidenceRoot, { recursive: true });
if (updateBaselines) {
  mkdirSync(baselineRoot, { recursive: true });
}
const browser = await chromium.launch({
  executablePath,
  headless: true,
});
const baseUrl = `http://127.0.0.1:${address.port}`;
const cases = [
  {
    name: 'wide-light',
    width: 1440,
    height: 900,
    colorScheme: 'light',
    forcedColors: 'none',
    reducedMotion: 'no-preference',
  },
  {
    name: 'medium-dark',
    width: 960,
    height: 900,
    colorScheme: 'dark',
    forcedColors: 'none',
    reducedMotion: 'no-preference',
  },
  {
    name: 'zoom-200-equivalent-reduced-motion',
    width: 640,
    height: 900,
    colorScheme: 'light',
    forcedColors: 'none',
    reducedMotion: 'reduce',
  },
  {
    name: 'zoom-400-equivalent-forced-colors',
    width: 320,
    height: 900,
    colorScheme: 'light',
    forcedColors: 'active',
    reducedMotion: 'reduce',
  },
];
const routes = [
  { name: 'workspace', path: '/workspace' },
  { name: 'inventory', path: '/components' },
  {
    name: 'component',
    path: '/components/acme.button-library.acme-button',
  },
];
const report = [];

async function seedWorkspace(page) {
  await page.waitForFunction(
    () =>
      globalThis.ng?.getComponent?.(document.querySelector('app-root'))?.[
        'workspace'
      ],
  );
  await page.evaluate((fixtureData) => {
    const appComponent = globalThis.ng.getComponent(
      document.querySelector('app-root'),
    );
    const workspace = appComponent['workspace'];
    workspace.workspacePath.set('fixtures/acme-button-library');
    workspace.gitStatus.set({
      branch: 'responsive-check',
      commit: 'a'.repeat(40),
      dirty: false,
    });
    workspace.workspaceScan.set({
      packageName: '@acme/button-library',
      packageManager: 'npm',
      workspaceManager: null,
      storybookProjects: ['.storybook'],
      starlightProjects: ['.'],
      hasZeroheight: false,
      tokenFiles: ['tokens/acme.tokens.json'],
      testRunners: ['node:test'],
      visualRegressionProviders: [],
      ciProviders: ['github-actions'],
      customElementsManifests: ['custom-elements.json'],
      componentPackages: [],
      componentManifests: [
        '.forgegate/components/acme.button-library.acme-button.yaml',
      ],
      testEvidenceFiles: ['.forgegate/evidence/acme-button-unit.json'],
      uiTechnologies: [],
    });
    workspace.customElementsManifest.set(fixtureData.cem);
    workspace.componentManifestOverrides.set([fixtureData.componentManifest]);
    workspace.storybookIndex.set(fixtureData.storybookIndex);
    workspace.testExecutions.set([fixtureData.testExecution]);
  }, fixture);
  await page.waitForTimeout(0);
}

try {
  for (const viewport of cases) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: viewport.colorScheme,
      forcedColors: viewport.forcedColors,
      reducedMotion: viewport.reducedMotion,
    });
    const page = await context.newPage();
    for (const route of routes) {
      await page.goto(`${baseUrl}${route.path}`);
      await seedWorkspace(page);
      await page.waitForLoadState('networkidle');

      const geometry = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        mainWidth: document.querySelector('main')?.getBoundingClientRect()
          .width,
        containers: [
          '.workspace-page',
          'app-system-map',
          '.system-map-panel',
          '.system-map-wrap',
          '.system-map',
        ].map((selector) => {
          const element = document.querySelector(selector);
          const rectangle = element?.getBoundingClientRect();
          const style = element ? getComputedStyle(element) : null;
          return {
            selector,
            left: rectangle?.left,
            right: rectangle?.right,
            width: rectangle?.width,
            minWidth: style?.minWidth,
            maxWidth: style?.maxWidth,
            overflowX: style?.overflowX,
          };
        }),
        overflowSources: Array.from(document.querySelectorAll('body *'))
          .map((element) => {
            const rectangle = element.getBoundingClientRect();
            return {
              element:
                element.id ||
                (typeof element.className === 'string'
                  ? element.className
                  : element.className?.baseVal) ||
                element.tagName.toLowerCase(),
              left: Math.round(rectangle.left),
              right: Math.round(rectangle.right),
              scrollWidth: element.scrollWidth,
              clientWidth: element.clientWidth,
            };
          })
          .filter(
            (item) =>
              item.right > document.documentElement.clientWidth + 1 ||
              item.left < -1,
          )
          .slice(0, 12),
      }));
      if (geometry.scrollWidth > geometry.clientWidth + 1) {
        throw new Error(
          `${route.name} overflows the page at ${viewport.name}: ${geometry.scrollWidth}px > ${geometry.clientWidth}px\n${JSON.stringify({ containers: geometry.containers, overflowSources: geometry.overflowSources }, null, 2)}`,
        );
      }
      if (
        !geometry.mainWidth ||
        geometry.mainWidth > geometry.clientWidth + 1
      ) {
        throw new Error(
          `${route.name} main landmark is not width-bounded at ${viewport.name}`,
        );
      }

      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const active = document.activeElement;
        const style = active ? getComputedStyle(active) : null;
        return {
          tag: active?.tagName ?? null,
          outlineStyle: style?.outlineStyle ?? null,
          outlineWidth: style?.outlineWidth ?? null,
        };
      });
      if (
        !focus.tag ||
        focus.outlineStyle === 'none' ||
        focus.outlineWidth === '0px'
      ) {
        throw new Error(
          `${route.name} has no visible first keyboard focus at ${viewport.name}`,
        );
      }

      const preferences = await page.evaluate(() => ({
        darkScheme: matchMedia('(prefers-color-scheme: dark)').matches,
        forcedColors: matchMedia('(forced-colors: active)').matches,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        canvasToken: getComputedStyle(document.documentElement)
          .getPropertyValue('--fg-color-canvas')
          .trim(),
        unknownStatusToken: getComputedStyle(document.documentElement)
          .getPropertyValue('--fg-color-status-unknown')
          .trim(),
        motionSmall: getComputedStyle(document.documentElement)
          .getPropertyValue('--fg-motion-duration-sm')
          .trim(),
        motionMedium: getComputedStyle(document.documentElement)
          .getPropertyValue('--fg-motion-duration-md')
          .trim(),
      }));
      if (
        preferences.darkScheme !== (viewport.colorScheme === 'dark') ||
        preferences.forcedColors !== (viewport.forcedColors === 'active') ||
        preferences.reducedMotion !== (viewport.reducedMotion === 'reduce')
      ) {
        throw new Error(
          `${route.name} did not receive the requested browser preferences at ${viewport.name}: ${JSON.stringify(preferences)}`,
        );
      }
      if (
        viewport.reducedMotion === 'reduce' &&
        (preferences.motionSmall !== '0ms' ||
          preferences.motionMedium !== '0ms')
      ) {
        throw new Error(
          `${route.name} did not zero ForgeGate motion tokens at ${viewport.name}`,
        );
      }
      if (
        viewport.forcedColors === 'active' &&
        preferences.unknownStatusToken.toLowerCase() !== 'canvastext'
      ) {
        throw new Error(
          `${route.name} did not map status tokens to system colors at ${viewport.name}`,
        );
      }

      const screenshot = `${viewport.name}-${route.name}.png`;
      const actualPath = resolve(evidenceRoot, screenshot);
      const actualPng = await page.screenshot({
        path: actualPath,
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
        mask: [page.locator('.component-detail__preview-frame')],
        maskColor: '#c5cfdf',
      });
      const baselinePath = resolve(baselineRoot, screenshot);
      let visualComparison;
      if (updateBaselines) {
        writeFileSync(baselinePath, actualPng);
        visualComparison = {
          status: 'updated',
          maximumDiffRatio,
        };
      } else {
        visualComparison = compareScreenshot({
          actualPng,
          actualPath,
          baselinePath,
          screenshot,
        });
      }
      report.push({
        viewport,
        route,
        geometry,
        focus,
        preferences,
        screenshot,
        visualComparison,
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose())),
  );
}

writeFileSync(
  resolve(evidenceRoot, 'report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  `${updateBaselines ? 'Updated visual baselines and verified' : 'Responsive and visual regression checks passed for'} ${report.length} rendered route/viewport combinations.`,
);

function compareScreenshot({
  actualPng,
  actualPath,
  baselinePath,
  screenshot,
}) {
  if (!existsSync(baselinePath)) {
    throw new Error(
      `Missing visual baseline ${baselinePath}. Run "pnpm exec nx run forgegate-desktop:visual-baselines-update" and review the generated images.`,
    );
  }
  const result = comparePng(actualPng, readFileSync(baselinePath), {
    threshold: 0.15,
    maxDiffPixelRatio: maximumDiffRatio,
  });
  if (result) {
    const diffPath = resolve(
      evidenceRoot,
      screenshot.replace('.png', '.diff.png'),
    );
    if (result.diff) {
      writeFileSync(diffPath, result.diff);
    }
    throw new Error(
      `${screenshot} differs from its reviewed baseline (allowed ${(maximumDiffRatio * 100).toFixed(3)}%): ${result.errorMessage} Actual: ${actualPath}.${result.diff ? ` Diff: ${diffPath}` : ''}`,
    );
  }
  return {
    status: 'matched',
    maximumDiffRatio,
  };
}
