import { buildComponentId, buildProcedureId, generateRecordId } from './identifiers';

describe('buildComponentId', () => {
  it('joins organization, library, and component with dots', () => {
    expect(buildComponentId('up', 'design-system', 'button')).toBe('up.design-system.button');
  });

  it('rejects a segment containing a dot', () => {
    expect(() => buildComponentId('up.gov', 'design-system', 'button')).toThrow();
  });

  it('rejects an empty segment', () => {
    expect(() => buildComponentId('', 'design-system', 'button')).toThrow();
  });
});

describe('buildProcedureId', () => {
  it('joins blueprint, component, review, and environment with dots', () => {
    expect(buildProcedureId('button', 'button', 'screen-reader', 'jaws-windows')).toBe(
      'button.button.screen-reader.jaws-windows',
    );
  });
});

describe('generateRecordId', () => {
  it('generates distinct identifiers', () => {
    expect(generateRecordId()).not.toBe(generateRecordId());
  });
});
