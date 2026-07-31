export const FORGEGATE_STARLIGHT_COMPONENT_NAMES = [
  'AccessibilityRequirements',
  'ApiTable',
  'ComponentRegistry',
  'ComponentStatus',
  'ConsumerValidation',
  'EvidenceSummary',
  'ReleaseHistory',
  'StateMatrix',
  'StoryPreview',
  'TokenTable',
] as const;

export type ForgeGateStarlightComponentName =
  (typeof FORGEGATE_STARLIGHT_COMPONENT_NAMES)[number];
