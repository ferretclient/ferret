import { getTypeChangeFields } from './index';

const options = [{ key: 'Company1', value: '12345' }, { key: 'Company2', value: '43214' }];

describe('getTypeChangeFields', () => {
  it('returns null when the type does not change', () => {
    expect(getTypeChangeFields({ value: 'a' }, 'string')).toBeNull();
    expect(getTypeChangeFields({ value: 'Company1', dataType: 'options', options }, 'options')).toBeNull();
  });

  it('seeds an options list from the current value when switching to options', () => {
    expect(getTypeChangeFields({ value: '12345' }, 'options')).toEqual({
      dataType: 'options',
      options: [{ key: 'Default', value: '12345' }],
      value: 'Default'
    });
    expect(getTypeChangeFields({ value: '' }, 'options')).toEqual({ dataType: 'options', options: [], value: '' });
  });

  it('keeps the resolved value when leaving options', () => {
    expect(getTypeChangeFields({ value: 'Company2', dataType: 'options', options }, 'string')).toEqual({
      dataType: undefined,
      options: undefined,
      value: '43214'
    });
  });

  it('only sets dataType between scalar types', () => {
    expect(getTypeChangeFields({ value: '1' }, 'number')).toEqual({ dataType: 'number' });
  });
});
