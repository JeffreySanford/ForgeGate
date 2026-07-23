import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { GENERATE_CEM_ARGS, GENERATE_CEM_COMMAND } from './app/workspace.service';

const execFileAsync = promisify(execFile);

/**
 * Walks up from `process.cwd()` looking for `fixtures/acme-button-library`,
 * rather than trusting `import.meta.url` (which isn't a real `file://` URL
 * once vitest/vite has transformed this module) or assuming a fixed cwd
 * (Nx and a plain `vitest` invocation don't agree on one).
 */
async function findRepoRoot(startDir: string): Promise<string> {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    try {
      await stat(join(dir, 'fixtures/acme-button-library'));
      return dir;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
  }
  throw new Error(`Could not find fixtures/acme-button-library above ${startDir}`);
}

/**
 * Every other test that touches GENERATE_CEM_ARGS mocks `invoke` and just
 * asserts the array matches itself — that mirror caught nothing when the
 * package name was misspelled (`@custom-elements-manifest/analyze` instead
 * of the real `.../analyzer`) and the required `analyze` subcommand was
 * missing entirely: a real user hit an `npm error 404` from the actual
 * command this app runs on their behalf. This test runs the real command
 * against a real, disposable copy of the fixture repository — no mocks —
 * so a future typo in `GENERATE_CEM_COMMAND`/`GENERATE_CEM_ARGS` fails CI
 * instead of only failing for a user who clicks "Generate Custom Elements
 * Manifest".
 *
 * Deliberately network-dependent and slow (first-run npx package
 * resolution) — an acceptable, narrow exception for the one command
 * ForgeGate actually shells out to run on a user's real workspace.
 */
describe('GENERATE_CEM_COMMAND / GENERATE_CEM_ARGS (real command, no mocks)', () => {
  it(
    'actually generates a Custom Elements Manifest describing acme-button when run for real',
    async () => {
      const repoRoot = await findRepoRoot(process.cwd());
      const fixtureSource = join(repoRoot, 'fixtures/acme-button-library');

      const tempDir = await mkdtemp(join(tmpdir(), 'forgegate-cem-command-test-'));
      try {
        await cp(fixtureSource, tempDir, { recursive: true });

        await execFileAsync(GENERATE_CEM_COMMAND, [...GENERATE_CEM_ARGS], {
          cwd: tempDir,
          shell: true,
          timeout: 150_000,
        });

        const manifest = JSON.parse(await readFile(join(tempDir, 'custom-elements.json'), 'utf-8'));
        const tagNames = manifest.modules.flatMap((module: { declarations?: { tagName?: string }[] }) =>
          (module.declarations ?? []).map((declaration) => declaration.tagName),
        );
        expect(tagNames).toContain('acme-button');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    },
    180_000,
  );
});
