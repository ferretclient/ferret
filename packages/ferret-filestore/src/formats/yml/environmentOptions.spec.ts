import { describe, it, expect } from '@jest/globals';
import { parseEnvironment, stringifyEnvironment } from '../../index';

const ymlEnvironment = [
  'name: Production',
  'variables:',
  '  - name: host',
  '    value: api.example.com',
  '  - name: company',
  '    value: Company1',
  '    options:',
  '      - key: Company1',
  '        value: 12345',
  '      - key: Company2',
  '        value: "43214"',
  ''
].join('\n');

describe('yml options environment variables', () => {
  it('parses the options list and keeps values as strings', () => {
    const environment = parseEnvironment(ymlEnvironment, { format: 'yml' });
    const company = environment.variables.find((v: any) => v.name === 'company');

    expect(company).toMatchObject({
      value: 'Company1',
      dataType: 'options',
      options: [
        { key: 'Company1', value: '12345' },
        { key: 'Company2', value: '43214' }
      ]
    });
  });

  it('round-trips through stringify and parse', () => {
    const environment = parseEnvironment(ymlEnvironment, { format: 'yml' });
    const reparsed = parseEnvironment(stringifyEnvironment(environment, { format: 'yml' }), { format: 'yml' });

    const pick = (env: any) => env.variables.map(({ name, value, dataType, options }: any) => ({ name, value, dataType, options }));
    expect(pick(reparsed)).toEqual(pick(environment));
  });

  it('writes the default key as a plain value next to the options', () => {
    const output = stringifyEnvironment(
      {
        uid: 'env1',
        name: 'Production',
        variables: [
          {
            uid: 'v1',
            name: 'company',
            value: 'Company2',
            type: 'text',
            enabled: true,
            secret: false,
            dataType: 'options',
            options: [{ key: 'Company1', value: '12345' }, { key: 'Company2', value: '43214' }]
          }
        ]
      },
      { format: 'yml' }
    );

    expect(output).toContain('value: Company2');
    expect(output).toContain('options:');
    expect(output).not.toContain('type: options');
  });
});
