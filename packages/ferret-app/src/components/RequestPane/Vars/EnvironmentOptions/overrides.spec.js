import { applyOptionChoice, getChosenOptionValue, isOptionOverridden } from './overrides';

const createUid = () => 'new-uid';

describe('getChosenOptionValue', () => {
  it('uses the request override when there is one and the environment default otherwise', () => {
    const vars = [{ name: 'company', value: '43214', enabled: true }];
    expect(getChosenOptionValue({ vars, name: 'company', defaultValue: '12345' })).toBe('43214');
    expect(getChosenOptionValue({ vars: [], name: 'company', defaultValue: '12345' })).toBe('12345');
    expect(getChosenOptionValue({ vars: undefined, name: 'company', defaultValue: '12345' })).toBe('12345');
  });

  it('ignores a disabled override', () => {
    const vars = [{ name: 'company', value: '43214', enabled: false }];
    expect(getChosenOptionValue({ vars, name: 'company', defaultValue: '12345' })).toBe('12345');
  });
});

describe('isOptionOverridden', () => {
  it('is true only while the request holds an enabled variable of that name', () => {
    expect(isOptionOverridden({ vars: [{ name: 'company', value: '1', enabled: true }], name: 'company' })).toBe(true);
    expect(isOptionOverridden({ vars: [{ name: 'company', value: '1', enabled: false }], name: 'company' })).toBe(false);
    expect(isOptionOverridden({ vars: [{ name: 'other', value: '1', enabled: true }], name: 'company' })).toBe(false);
    expect(isOptionOverridden({ vars: undefined, name: 'company' })).toBe(false);
  });
});

describe('applyOptionChoice', () => {
  it('adds an override variable when a non-default option is chosen', () => {
    expect(applyOptionChoice({ vars: [], name: 'company', value: '43214', defaultValue: '12345', createUid })).toEqual([
      { uid: 'new-uid', name: 'company', value: '43214', description: '', enabled: true }
    ]);
  });

  it('updates an existing override in place and re-enables it', () => {
    const vars = [
      { uid: 'a', name: 'other', value: '1', enabled: true },
      { uid: 'b', name: 'company', value: '43214', description: 'kept', enabled: false }
    ];
    expect(applyOptionChoice({ vars, name: 'company', value: '99999', defaultValue: '12345', createUid })).toEqual([
      { uid: 'a', name: 'other', value: '1', enabled: true },
      { uid: 'b', name: 'company', value: '99999', description: 'kept', enabled: true }
    ]);
  });

  it('removes the override when the environment default is chosen, leaving other variables alone', () => {
    const vars = [
      { uid: 'a', name: 'other', value: '1', enabled: true },
      { uid: 'b', name: 'company', value: '43214', enabled: true }
    ];
    expect(applyOptionChoice({ vars, name: 'company', value: '12345', defaultValue: '12345', createUid })).toEqual([
      { uid: 'a', name: 'other', value: '1', enabled: true }
    ]);
  });
});
