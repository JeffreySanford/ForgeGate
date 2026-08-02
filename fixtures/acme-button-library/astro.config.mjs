import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { forgeGateStarlightIntegration } from '../../packages/starlight/src/lib/plugin.ts';

export default defineConfig({
  site: 'https://fixture.forgegate.local',
  integrations: [
    starlight({
      title: 'Acme Button Library',
      // This fixture validates ForgeGate's generated report pages. Disabling
      // Starlight's default 404 route keeps the build output warning-free so
      // documentation validation noise does not mask real report failures.
      disable404Route: true,
      sidebar: [
        {
          label: 'Components',
          items: [
            { label: 'Registry', slug: 'components' },
            { label: 'Button', slug: 'components/acme-button--for-designers' },
          ],
        },
      ],
    }),
    forgeGateStarlightIntegration({
      filesystemDiscovery: true,
      reportDataRoot: 'src/data/forgegate/components',
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@forgegate/starlight': fileURLToPath(
          new URL('../../packages/starlight/src/index.ts', import.meta.url),
        ),
      },
    },
  },
});
