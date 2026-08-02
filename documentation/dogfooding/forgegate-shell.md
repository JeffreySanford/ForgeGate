# ForgeGate Shell

ForgeGate's shell is now represented by the repository-owned component manifest
`.forgegate/components/forgegate.desktop.shell.yaml`.

This is a dogfood identity for the desktop application surfaces ForgeGate uses
to evaluate other repositories:

- persistent navigation
- workspace context bar
- workspace command center
- component inventory
- component assurance records
- accessibility self-review

The manifest is intentionally evidence-honest. Automated unit, lint, build,
e2e, and Starlight fixture checks can be run by the repository, but the required
manual keyboard and screen-reader review still needs a human reviewer using real
assistive technology. Until that review exists, ForgeGate must not claim its own
shell has passed the same release standard it applies to target components.
