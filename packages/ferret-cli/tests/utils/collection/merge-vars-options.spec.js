const { mergeVars } = require('../../../src/utils/collection');

// An `options` variable holds named choices; the request must receive the chosen option's value,
// not its name (the Electron runtime resolves it the same way).

const company = (value, extra = {}) => ({
  name: 'company',
  value,
  enabled: true,
  dataType: 'options',
  options: [
    { key: 'Company1', value: '12345' },
    { key: 'Company2', value: '43214' }
  ],
  ...extra
});

const run = ({ collectionVars = [], folderVars = [], requestVars = [] }) => {
  const request = { vars: { req: [], res: [] } };
  const collection = { root: { request: { vars: { req: collectionVars, res: [] } } } };
  const tree = [
    { type: 'folder', root: { request: { vars: { req: folderVars, res: [] } } } },
    { type: 'http-request', request: { vars: { req: requestVars, res: [] } } }
  ];
  mergeVars(collection, request, tree);
  return request;
};

describe('mergeVars with options variables', () => {
  it('sends the value of the chosen option from a request variable', () => {
    const request = run({ requestVars: [company('Company2')] });

    expect(request.vars.req).toEqual([{ name: 'company', value: '43214', enabled: true, type: 'request' }]);
    expect(request.requestVariables).toEqual({ company: '43214' });
  });

  it('works the same on a folder and on the collection', () => {
    expect(run({ folderVars: [company('Company1')] }).folderVariables).toEqual({ company: '12345' });
    expect(run({ collectionVars: [company('Company2')] }).collectionVariables).toEqual({ company: '43214' });
  });

  it('falls back to the first option when no default is set', () => {
    expect(run({ requestVars: [company('')] }).requestVariables).toEqual({ company: '12345' });
  });

  it('lets a request variable override an outer one, and ignores a disabled options variable', () => {
    const request = run({ collectionVars: [company('Company1')], requestVars: [company('Company2')] });
    expect(request.vars.req[0].value).toBe('43214');

    expect(run({ requestVars: [company('Company2', { enabled: false })] }).vars.req).toEqual([]);
  });

  it('leaves ordinary variables unchanged', () => {
    const request = run({ requestVars: [{ name: 'host', value: 'example.com', enabled: true }] });
    expect(request.requestVariables).toEqual({ host: 'example.com' });
  });
});
