import { describeStorybookAdapterCapabilities } from './storybook-adapter-capabilities';

describe('describeStorybookAdapterCapabilities', () => {
  it('honestly reports which capabilities are real today', () => {
    expect(describeStorybookAdapterCapabilities()).toEqual({
      staticIndexParsing: true,
      liveServerQuery: true,
      storyToComponentMapping: true,
      interactionTestExecution: false,
      accessibilityCheckExecution: false,
      visualReviewIntegration: false,
      runningStorybook: false,
    });
  });
});
