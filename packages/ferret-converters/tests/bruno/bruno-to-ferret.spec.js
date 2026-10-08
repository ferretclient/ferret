import { describe, it, expect } from '@jest/globals';
import { brunoToFerret, isBrunoCollectionExport } from '../../src/bruno/bruno-to-ferret';

const brunoExport = {
  version: '1',
  name: 'Shop API',
  exportedUsing: 'Bruno/v2.0.0',
  brunoConfig: { version: '1', name: 'Shop API', type: 'collection', scripts: { flow: 'sequential' } },
  root: {
    request: {
      script: { req: 'bru.setVar("base", "https://bru.example.com");' },
      tests: 'test("ok", () => expect(bru.getVar("base")).to.exist);'
    }
  },
  items: [
    {
      type: 'folder',
      name: 'Users',
      root: { request: { script: { res: 'bru.setVar("folder", true);' } } },
      items: [
        {
          type: 'http-request',
          name: 'Get user',
          request: {
            url: 'https://bru.example.com/users/{{id}}',
            method: 'GET',
            body: { mode: 'json', json: '{"note": "bru.setVar is not code here"}' },
            script: { req: 'await bru.runRequest("Users/Login.bru");', res: '' },
            tests: ''
          },
          app: { enabled: true, code: '<script>window.bru.ctx.submitRequest();</script>' }
        },
        {
          type: 'grpc-request',
          name: 'Stream',
          request: { script: { beforeCallStart: 'bru.setVar("s", 1);' } }
        }
      ]
    }
  ]
};

describe('brunoToFerret', () => {
  const ferret = brunoToFerret(brunoExport);

  it('renames brunoConfig to ferretConfig', () => {
    expect(ferret.brunoConfig).toBeUndefined();
    expect(ferret.ferretConfig).toEqual(brunoExport.brunoConfig);
  });

  it('converts collection, folder, request and gRPC scripts and tests', () => {
    expect(ferret.root.request.script.req).toBe('fer.setVar("base", "https://bru.example.com");');
    expect(ferret.root.request.tests).toBe('test("ok", () => expect(fer.getVar("base")).to.exist);');
    expect(ferret.items[0].root.request.script.res).toBe('fer.setVar("folder", true);');
    expect(ferret.items[0].items[0].request.script.req).toBe('await fer.runRequest("Users/Login.fer");');
    expect(ferret.items[0].items[1].request.script.beforeCallStart).toBe('fer.setVar("s", 1);');
  });

  it('converts Collection App code', () => {
    expect(ferret.items[0].items[0].app.code).toBe('<script>window.fer.ctx.submitRequest();</script>');
  });

  it('leaves URLs and request bodies untouched and does not mutate the input', () => {
    expect(ferret.items[0].items[0].request.url).toBe('https://bru.example.com/users/{{id}}');
    expect(ferret.items[0].items[0].request.body.json).toBe('{"note": "bru.setVar is not code here"}');
    expect(brunoExport.items[0].items[0].request.script.req).toContain('bru.runRequest');
  });
});

describe('isBrunoCollectionExport', () => {
  it('recognises Bruno exports by brunoConfig or exportedUsing', () => {
    expect(isBrunoCollectionExport(brunoExport)).toBe(true);
    expect(isBrunoCollectionExport({ items: [], exportedUsing: 'Bruno/v1.30.0' })).toBe(true);
  });

  it('rejects Ferret exports and non-collections', () => {
    expect(isBrunoCollectionExport({ items: [], ferretConfig: {}, exportedUsing: 'Ferret/v0.1.0' })).toBe(false);
    expect(isBrunoCollectionExport({ brunoConfig: {} })).toBe(false);
    expect(isBrunoCollectionExport(null)).toBe(false);
  });
});
