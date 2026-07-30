import {
  createUnsupportedGenerationCapabilityDeclaration,
  type AdapterGenerationCapabilityDeclaration,
} from '@forgegate/adapter-sdk';

/**
 * The Web Components adapter's honest generation capability declaration,
 * per documentation/27-blueprint-studio.md ("Adapter capability
 * contract") and P2 entry gate 4. Today this adapter only detects and
 * parses *existing* components (`parseCustomElementsManifest`,
 * `mapCustomElementsManifest`) — it has no generation pipeline at all, so
 * every capability is declared `unsupported` rather than left undeclared
 * or partially filled in.
 */
export const WEB_COMPONENTS_ADAPTER_VERSION = '0.1.0';

export function webComponentsGenerationCapabilities(): AdapterGenerationCapabilityDeclaration {
  return createUnsupportedGenerationCapabilityDeclaration(
    'framework.web-components',
    WEB_COMPONENTS_ADAPTER_VERSION,
    ['No generation pipeline exists yet; this adapter only detects and parses existing components.'],
  );
}
