# Storybook adapter

Parses a real Storybook story index (a locally built `storybook-static/index.json`,
or a running local Storybook server's own `/index.json`) and maps story entries to
component source files. `describeStorybookAdapterCapabilities` declares this
adapter's real, current capabilities honestly — it does not run interaction
tests, accessibility checks, visual review, or Storybook itself.
