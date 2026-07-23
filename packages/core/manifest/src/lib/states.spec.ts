import { createComponentState } from './states';

describe('createComponentState', () => {
  it('builds a required state', () => {
    const state = createComponentState({
      id: 's-1',
      componentVersionId: 'cv-1',
      name: 'disabled',
      required: true,
    });
    expect(state.required).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(() =>
      createComponentState({ id: 's-1', componentVersionId: 'cv-1', name: '', required: true }),
    ).toThrow('non-empty name');
  });
});
