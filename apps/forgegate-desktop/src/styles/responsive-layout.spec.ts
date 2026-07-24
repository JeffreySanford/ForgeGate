import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = join(__dirname, '..', 'app');
const styles = {
  shell: readFileSync(join(appRoot, 'app.css'), 'utf8'),
  workspace: readFileSync(
    join(appRoot, 'workspace', 'workspace-page.css'),
    'utf8',
  ),
  inventory: readFileSync(
    join(appRoot, 'components', 'components-page.css'),
    'utf8',
  ),
  component: readFileSync(
    join(appRoot, 'components', 'component-detail-page.css'),
    'utf8',
  ),
};

describe('responsive desktop layout contracts', () => {
  it('defines medium and narrow shell breakpoints', () => {
    expect(styles.shell).toMatch(/@media \(max-width: 64rem\)/);
    expect(styles.shell).toMatch(/@media \(max-width: 48rem\)/);
    expect(styles.shell).toMatch(
      /@media \(max-width: 48rem\)[\s\S]*?\.app-shell\s*{[\s\S]*?flex-direction:\s*column/,
    );
  });

  it.each(['workspace', 'inventory', 'component'] as const)(
    'keeps the %s route width-bounded and narrow-window aware',
    (route) => {
      expect(styles[route]).toMatch(/width:\s*100%/);
      expect(styles[route]).toMatch(/@media \(max-width: (?:48rem|760px)\)/);
    },
  );

  it('provides deliberate local overflow regions for dense diagnostics and inventory', () => {
    expect(styles.workspace).toMatch(/overflow-x:\s*auto/);
    expect(styles.inventory).toMatch(
      /\.components-page__table-scroll\s*{[\s\S]*?overflow-x:\s*auto/,
    );
    expect(styles.component).toMatch(
      /\.component-detail__panel\s*{[\s\S]*?overflow-x:\s*auto/,
    );
  });
});
