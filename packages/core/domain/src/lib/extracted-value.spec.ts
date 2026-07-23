import { confirmedValue, inferredValue, unsupportedValue } from './extracted-value';

describe('extracted value helpers', () => {
  it('marks a confirmed value with its source', () => {
    expect(confirmedValue('button', 'user')).toEqual({
      value: 'button',
      state: 'confirmed',
      source: 'user',
    });
  });

  it('marks an inferred value with a reason', () => {
    expect(inferredValue(2, 'framework.react', 'derived from default props')).toEqual({
      value: 2,
      state: 'inferred',
      source: 'framework.react',
      reason: 'derived from default props',
    });
  });

  it('represents an unsupported extraction as a null value with a reason', () => {
    expect(unsupportedValue('framework.react', 'Polymorphic generic props could not be resolved')).toEqual({
      value: null,
      state: 'unsupported',
      source: 'framework.react',
      reason: 'Polymorphic generic props could not be resolved',
    });
  });
});
