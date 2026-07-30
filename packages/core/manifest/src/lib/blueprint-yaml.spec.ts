import { parseBlueprint } from './blueprint-yaml';

const validYaml = `
id: blueprint.button
version: 1.1.0
name: Button
purpose: Trigger a primary or secondary application action.
preferredNativeElement: button
requiredStates:
  - default
  - hover
  - focus-visible
  - active
  - disabled
inspectorGroups:
  - id: appearance
    label: Appearance
    fields:
      - path: contract.properties.appearance
        label: Appearance
        control: segmented
        options: [filled, outlined, subtle]
        required: true
tokenSlots:
  - id: root.background
    label: Background
    types: [color]
    required: true
    visibleWhen: appearance != text
constraints:
  - when: iconPlacement == icon-only
    require: accessibleLabel
`;

describe('parseBlueprint', () => {
  it('parses a real, versioned blueprint with authoring metadata', () => {
    const blueprint = parseBlueprint(validYaml);

    expect(blueprint.id).toBe('blueprint.button');
    expect(blueprint.version).toBe('1.1.0');
    expect(blueprint.requiredStates).toContain('focus-visible');
    expect(blueprint.inspectorGroups[0]?.fields[0]?.path).toBe(
      'contract.properties.appearance',
    );
    expect(blueprint.tokenSlots[0]?.id).toBe('root.background');
    expect(blueprint.constraints?.[0]?.require).toBe('accessibleLabel');
  });

  it('rejects malformed YAML', () => {
    expect(() => parseBlueprint('id: [unterminated')).toThrow(
      'not valid YAML',
    );
  });

  it('rejects YAML that parses but fails the schema', () => {
    expect(() => parseBlueprint('id: blueprint.button')).toThrow(
      'does not match the schema',
    );
  });

  it('rejects an inspector field with an unknown control type', () => {
    const invalid = validYaml.replace('control: segmented', 'control: slider');
    expect(() => parseBlueprint(invalid)).toThrow('does not match the schema');
  });
});
