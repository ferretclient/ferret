const { fromOpenCollectionVariables, toOpenCollectionVariables } = require('../../src/opencollection/common/variables');

describe('options variables on a request, folder or collection (OpenCollection)', () => {
  const company = {
    uid: 'u1',
    name: 'company',
    value: 'Company1',
    enabled: true,
    dataType: 'options',
    options: [
      { key: 'Company1', value: '12345' },
      { key: 'Company2', value: '43214' }
    ]
  };

  it('exports the default key and the option list', () => {
    expect(toOpenCollectionVariables([company])).toEqual([
      {
        name: 'company',
        value: 'Company1',
        options: [
          { key: 'Company1', value: '12345' },
          { key: 'Company2', value: '43214' }
        ]
      }
    ]);
  });

  it('imports it back as an options variable', () => {
    const { req } = fromOpenCollectionVariables(toOpenCollectionVariables([company]));

    expect(req[0]).toMatchObject({ name: 'company', value: 'Company1', dataType: 'options', options: company.options });
  });

  it('leaves other variables as they were', () => {
    const [out] = toOpenCollectionVariables([{ uid: 'u2', name: 'port', value: 3000, enabled: true, dataType: 'number' }]);
    expect(out).toEqual({ name: 'port', value: { type: 'number', data: '3000' } });
  });
});
