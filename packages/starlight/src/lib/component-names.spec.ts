import { FORGEGATE_STARLIGHT_COMPONENT_NAMES } from './component-names';

describe('FORGEGATE_STARLIGHT_COMPONENT_NAMES', () => {
  it('exports every presentation component used by generated Starlight MDX', () => {
    expect(FORGEGATE_STARLIGHT_COMPONENT_NAMES).toEqual([
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
    ]);
  });
});
