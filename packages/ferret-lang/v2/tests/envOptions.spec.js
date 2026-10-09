const envToJson = require('../src/envToJson');
const jsonToEnv = require('../src/jsonToEnv');

const OPTIONS_ENV = `vars {
  host: api.example.com
  @options
  @option('Company1=12345')
  @option('Company 2=id=43214')
  @description('Business Central company')
  company: Company1
}
`;

describe('options environment variables', () => {
  it('parses @options and its @option entries', () => {
    const [, company] = envToJson(OPTIONS_ENV).variables;

    expect(company).toMatchObject({
      name: 'company',
      value: 'Company1',
      enabled: true,
      dataType: 'options',
      description: 'Business Central company',
      options: [
        { key: 'Company1', value: '12345' },
        // only the first "=" separates key from value
        { key: 'Company 2', value: 'id=43214' }
      ]
    });
  });

  it('round-trips through jsonToEnv without loss', () => {
    const parsed = envToJson(OPTIONS_ENV);
    const reparsed = envToJson(jsonToEnv(parsed));

    expect(reparsed.variables[1]).toMatchObject({
      name: 'company',
      value: 'Company1',
      dataType: 'options',
      description: 'Business Central company',
      options: parsed.variables[1].options
    });
  });

  it('writes options from a variable built in memory', () => {
    const output = jsonToEnv({
      variables: [
        {
          name: 'company',
          value: 'Company2',
          enabled: true,
          secret: false,
          dataType: 'options',
          options: [{ key: 'Company1', value: '12345' }, { key: 'Company2', value: '43214' }]
        }
      ]
    });

    expect(output).toContain('@options\n  @option(\'Company1=12345\')\n  @option(\'Company2=43214\')\n  company: Company2');
  });

  it('does not duplicate option annotations when re-saving a parsed variable with edited options', () => {
    const parsed = envToJson(OPTIONS_ENV);
    parsed.variables[1].options = [{ key: 'Only', value: '1' }];

    const output = jsonToEnv(parsed);

    expect(output.match(/@option\(/g)).toHaveLength(1);
    expect(output.match(/@options/g)).toHaveLength(1);
  });

  it('leaves other variables untouched when switching a variable away from options', () => {
    const parsed = envToJson(OPTIONS_ENV);
    delete parsed.variables[1].dataType;
    delete parsed.variables[1].options;

    expect(jsonToEnv(parsed)).not.toContain('@option');
  });
});
