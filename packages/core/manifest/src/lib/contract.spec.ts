import { createComponentContract } from './contract';

describe('createComponentContract', () => {
  it('defaults missing member lists to empty arrays', () => {
    const contract = createComponentContract({ id: 'c-1', componentVersionId: 'cv-1' });
    expect(contract.inputs).toEqual([]);
    expect(contract.outputs).toEqual([]);
    expect(contract.content).toEqual([]);
    expect(contract.publicMethods).toEqual([]);
    expect(contract.styleParts).toEqual([]);
  });

  it('keeps provided members', () => {
    const contract = createComponentContract({
      id: 'c-1',
      componentVersionId: 'cv-1',
      inputs: [{ name: 'disabled', type: 'boolean', required: false }],
    });
    expect(contract.inputs).toHaveLength(1);
  });

  it('rejects a missing componentVersionId', () => {
    expect(() => createComponentContract({ id: 'c-1', componentVersionId: '' })).toThrow(
      'requires a componentVersionId',
    );
  });
});
