const parser = require('../src/ferToJson');
const jsonToFer = require('../src/jsonToFer');
const collectionFerToJson = require('../src/collectionFerToJson');
const jsonToCollectionFer = require('../src/jsonToCollectionFer');

// An `options` variable can also live on a request, folder or collection: an `@options` marker plus
// one `@option('key=value')` per choice, and the value is the chosen option's key.

const REQUEST_FER = `meta {
  name: Companies
  type: http
  seq: 1
}

get {
  url: {{host}}/companies({{company}})
  body: none
  auth: none
}

vars:pre-request {
  @options
  @option('Company1=12345')
  @option('Company 2=id=43214')
  @description('Business Central company')
  company: Company1
  plain: text
}
`;

describe('options variables on a request', () => {
  it('parses @options and its @option entries', () => {
    const [company, plain] = parser(REQUEST_FER).vars.req;

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
    expect(plain.dataType).toBeUndefined();
    expect(plain.options).toBeUndefined();
  });

  it('writes each option once and reads the same variable back', () => {
    const written = jsonToFer(parser(REQUEST_FER));

    expect(written.match(/@options/g)).toHaveLength(1);
    expect(written.match(/@option\(/g)).toHaveLength(2);
    expect(parser(written).vars.req).toEqual(parser(REQUEST_FER).vars.req);
  });

  it('keeps a disabled options variable disabled', () => {
    const disabled = REQUEST_FER.replace('  company: Company1', '  ~company: Company1');

    // disabled variables are written after the enabled ones
    const company = parser(jsonToFer(parser(disabled))).vars.req.find((variable) => variable.name === 'company');

    expect(company).toMatchObject({ name: 'company', enabled: false, dataType: 'options', options: expect.any(Array) });
  });
});

const COLLECTION_FER = `vars:pre-request {
  @options
  @option('Dev=https://dev.example.com')
  @option('Prod=https://example.com')
  baseUrl: Dev
}
`;

describe('options variables on a collection or folder', () => {
  it('round-trips through the collection file format', () => {
    const parsed = collectionFerToJson(COLLECTION_FER);

    expect(parsed.vars.req[0]).toMatchObject({
      name: 'baseUrl',
      value: 'Dev',
      dataType: 'options',
      options: [
        { key: 'Dev', value: 'https://dev.example.com' },
        { key: 'Prod', value: 'https://example.com' }
      ]
    });

    const written = jsonToCollectionFer(parsed);
    expect(written.match(/@options/g)).toHaveLength(1);
    expect(collectionFerToJson(written)).toEqual(parsed);
  });
});
