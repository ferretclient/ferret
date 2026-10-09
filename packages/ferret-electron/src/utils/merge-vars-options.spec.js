jest.mock('electron', () => ({
  ipcMain: { emit: jest.fn(), handle: jest.fn() },
  app: { getPath: jest.fn(() => require('node:os').tmpdir()), getVersion: jest.fn(() => '0.0.0') }
}));

// Requiring the collection utils pulls in the preferences store, which needs a real Electron app.
jest.mock('electron-store', () => jest.fn().mockImplementation(() => ({ get: jest.fn(() => ({})), set: jest.fn(), onDidChange: jest.fn() })));

const { mergeVars } = require('./collection');

// Twin of ferret-cli's merge-vars-options spec: a request must receive the chosen option's value.

const company = (value) => ({
  name: 'company',
  value,
  enabled: true,
  dataType: 'options',
  options: [
    { key: 'Company1', value: '12345' },
    { key: 'Company2', value: '43214' }
  ]
});

describe('mergeVars with options variables', () => {
  it('resolves an options variable on the collection, a folder and the request to the chosen option value', () => {
    const request = { vars: { req: [], res: [] } };
    const collection = { root: { request: { vars: { req: [company('Company1')], res: [] } } } };
    const tree = [
      { type: 'folder', root: { request: { vars: { req: [company('Company2')], res: [] } } } },
      { type: 'http-request', request: { vars: { req: [company('Company1')], res: [] } } }
    ];

    mergeVars(collection, request, tree);

    expect(request.collectionVariables).toEqual({ company: '12345' });
    expect(request.folderVariables).toEqual({ company: '43214' });
    expect(request.requestVariables).toEqual({ company: '12345' });
    expect(request.vars.req).toEqual([{ name: 'company', value: '12345', enabled: true, type: 'request' }]);
  });
});
