let mockUidCounter = 0;
jest.mock('nanoid', () => ({
  customAlphabet: () => () => `uid${String(++mockUidCounter).padStart(18, '0')}`
}));

import { processFerretCollection } from './ferret-collection';

const makeExport = (overrides) => ({
  version: '1',
  name: 'Shop API',
  items: [
    {
      type: 'http-request',
      name: 'Get user',
      seq: 1,
      request: {
        url: 'https://api.example.com/users/1',
        method: 'GET',
        headers: [],
        params: [],
        body: { mode: 'none' },
        auth: { mode: 'none' },
        script: { req: 'bru.setVar("id", 1);', res: '' },
        vars: { req: [], res: [] },
        assertions: [],
        tests: 'test("ok", () => expect(bru.getVar("id")).to.equal(1));',
        docs: ''
      }
    }
  ],
  ...overrides
});

describe('processFerretCollection', () => {
  it('converts a Bruno export: config key and bru scripts', async () => {
    const collection = await processFerretCollection(
      makeExport({ exportedUsing: 'Bruno/v2.0.0', brunoConfig: { version: '1', name: 'Shop API', type: 'collection' } })
    );

    expect(collection.brunoConfig).toBeUndefined();
    expect(collection.ferretConfig).toEqual({ version: '1', name: 'Shop API', type: 'collection' });
    expect(collection.items[0].request.script.req).toBe('fer.setVar("id", 1);');
    expect(collection.items[0].request.tests).toBe('test("ok", () => expect(fer.getVar("id")).to.equal(1));');
  });

  it('imports a Ferret export unchanged', async () => {
    const collection = await processFerretCollection(makeExport({ exportedUsing: 'Ferret/v0.1.0' }));

    expect(collection.items[0].request.script.req).toBe('bru.setVar("id", 1);');
  });
});
