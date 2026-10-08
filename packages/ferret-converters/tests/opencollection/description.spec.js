import { describe, it, expect } from '@jest/globals';
import { ferretToOpenCollection, openCollectionToFerret } from '../../dist/esm/index.js';

describe('opencollection description round-trip', () => {
  it('preserves description on headers and vars when converting Ferret -> OpenCollection -> Ferret', () => {
    const ferretCollection = {
      uid: 'c1',
      name: 'Test',
      version: '1',
      items: [],
      root: {
        request: {
          headers: [
            { uid: 'h1', name: 'X-API-Key', value: 'secret', enabled: true, description: 'API key for auth' }
          ],
          vars: {
            req: [
              { uid: 'v1', name: 'baseUrl', value: 'https://api.example.com', enabled: true, description: 'Base API URL' }
            ],
            res: []
          }
        }
      }
    };

    const openCollection = ferretToOpenCollection(ferretCollection);

    expect(openCollection.request).toBeDefined();
    expect(openCollection.request.headers).toHaveLength(1);
    expect(openCollection.request.headers[0]).toMatchObject({
      name: 'X-API-Key',
      value: 'secret',
      description: 'API key for auth'
    });
    expect(openCollection.request.variables).toHaveLength(1);
    expect(openCollection.request.variables[0]).toMatchObject({
      name: 'baseUrl',
      value: 'https://api.example.com',
      description: 'Base API URL'
    });

    const backToFerret = openCollectionToFerret(openCollection);

    expect(backToFerret.root.request.headers).toHaveLength(1);
    expect(backToFerret.root.request.headers[0].description).toBe('API key for auth');
    expect(backToFerret.root.request.vars.req).toHaveLength(1);
    expect(backToFerret.root.request.vars.req[0].description).toBe('Base API URL');
  });

  it('does not set description when input has no description', () => {
    const ferretCollection = {
      uid: 'c2',
      name: 'No Desc',
      version: '1',
      items: [],
      root: {
        request: {
          headers: [
            { uid: 'h2', name: 'Content-Type', value: 'application/json', enabled: true }
          ],
          vars: {
            req: [{ uid: 'v2', name: 'port', value: '3000', enabled: true }],
            res: []
          }
        }
      }
    };

    const openCollection = ferretToOpenCollection(ferretCollection);
    expect(openCollection.request.headers[0]).not.toHaveProperty('description');
    expect(openCollection.request.variables[0]).not.toHaveProperty('description');

    const backToFerret = openCollectionToFerret(openCollection);
    expect(backToFerret.root.request.headers[0]).not.toHaveProperty('description');
    expect(backToFerret.root.request.vars.req[0]).not.toHaveProperty('description');
  });

  it('preserves description when converting OpenCollection -> Ferret -> OpenCollection', () => {
    const openCollection = {
      opencollection: '1.0.0',
      info: { name: 'OC Test' },
      request: {
        headers: [
          { name: 'Authorization', value: 'Bearer x', description: 'Auth header' }
        ],
        variables: [

          { name: 'token', value: 'abc', description: 'Request token' }
        ]
      }
    };

    const ferretCollection = openCollectionToFerret(openCollection);

    expect(ferretCollection.root.request.headers).toHaveLength(1);
    expect(ferretCollection.root.request.headers[0].description).toBe('Auth header');
    expect(ferretCollection.root.request.vars.req).toHaveLength(1);
    expect(ferretCollection.root.request.vars.req[0].description).toBe('Request token');

    const backToOC = ferretToOpenCollection(ferretCollection);

    expect(backToOC.request.headers[0].description).toBe('Auth header');
    expect(backToOC.request.variables[0].description).toBe('Request token');
  });

  describe('request params description', () => {
    it('Ferret→OC→Ferret: preserves description, omits when absent or whitespace-only', () => {
      const ferretCollection = {
        uid: 'c-p1',
        name: 'Test',
        version: '1',
        items: [
          {
            uid: 'i-p1',
            type: 'http-request',
            name: 'R',
            request: {
              method: 'GET',
              url: 'https://example.com',
              params: [
                { uid: 'p1', name: 'q', value: 'search', type: 'query', enabled: true, description: 'Search term' },
                { uid: 'p2', name: 'id', value: '42', type: 'path', enabled: true, description: 'Resource ID' },
                { uid: 'p3', name: 'nod', value: 'v', type: 'query', enabled: true },
                { uid: 'p4', name: 'ws', value: 'v', type: 'query', enabled: true, description: '   ' }
              ],
              headers: []
            }
          }
        ],
        root: {}
      };

      const oc = ferretToOpenCollection(ferretCollection);
      const ocParams = oc.items[0].http.params;
      expect(ocParams).toHaveLength(4);
      expect(ocParams[0]).toMatchObject({ name: 'q', description: 'Search term' });
      expect(ocParams[1]).toMatchObject({ name: 'id', description: 'Resource ID' });
      expect(ocParams[2]).not.toHaveProperty('description');
      expect(ocParams[3]).not.toHaveProperty('description');

      const back = openCollectionToFerret(oc);
      const backParams = back.items[0].request.params;
      expect(backParams[0]).toMatchObject({ name: 'q', description: 'Search term' });
      expect(backParams[1]).toMatchObject({ name: 'id', description: 'Resource ID' });
      expect(backParams[2]).not.toHaveProperty('description');
      expect(backParams[3]).not.toHaveProperty('description');
    });

    it('OC→Ferret→OC: preserves description, omits when absent or whitespace-only', () => {
      const openCollection = {
        opencollection: '1.0.0',
        info: { name: 'Test' },
        items: [
          {
            info: { name: 'R', type: 'http' },
            http: {
              method: 'GET',
              url: 'https://example.com',
              params: [
                { name: 'q', value: 'search', type: 'query', description: 'Search term' },
                { name: 'id', value: '42', type: 'path', description: 'Resource ID' },
                { name: 'nod', value: 'v', type: 'query' },
                { name: 'ws', value: 'v', type: 'query', description: '   ' }
              ]
            }
          }
        ]
      };

      const ferret = openCollectionToFerret(openCollection);
      const ferretParams = ferret.items[0].request.params;
      expect(ferretParams[0]).toMatchObject({ name: 'q', description: 'Search term' });
      expect(ferretParams[1]).toMatchObject({ name: 'id', description: 'Resource ID' });
      expect(ferretParams[2]).not.toHaveProperty('description');
      expect(ferretParams[3]).not.toHaveProperty('description');

      const backOC = ferretToOpenCollection(ferret);
      const backParams = backOC.items[0].http.params;
      expect(backParams[0]).toMatchObject({ name: 'q', description: 'Search term' });
      expect(backParams[1]).toMatchObject({ name: 'id', description: 'Resource ID' });
      expect(backParams[2]).not.toHaveProperty('description');
      expect(backParams[3]).not.toHaveProperty('description');
    });
  });

  describe('form-urlencoded body description', () => {
    it('Ferret→OC→Ferret: preserves description, omits when absent or whitespace-only', () => {
      const ferretCollection = {
        uid: 'c-f1',
        name: 'Test',
        version: '1',
        items: [
          {
            uid: 'i-f1',
            type: 'http-request',
            name: 'R',
            request: {
              method: 'POST',
              url: 'https://example.com',
              headers: [],
              body: {
                mode: 'formUrlEncoded',
                formUrlEncoded: [
                  { uid: 'f1', name: 'field', value: 'val', enabled: true, description: 'A form field' },
                  { uid: 'f2', name: 'nod', value: 'v', enabled: true },
                  { uid: 'f3', name: 'ws', value: 'v', enabled: true, description: '   ' }
                ]
              }
            }
          }
        ],
        root: {}
      };

      const oc = ferretToOpenCollection(ferretCollection);
      const ocBody = oc.items[0].http.body;
      expect(ocBody.type).toBe('form-urlencoded');
      expect(ocBody.data).toHaveLength(3);
      expect(ocBody.data[0]).toMatchObject({ name: 'field', description: 'A form field' });
      expect(ocBody.data[1]).not.toHaveProperty('description');
      expect(ocBody.data[2]).not.toHaveProperty('description');

      const back = openCollectionToFerret(oc);
      const backForm = back.items[0].request.body.formUrlEncoded;
      expect(backForm[0]).toMatchObject({ name: 'field', description: 'A form field' });
      expect(backForm[1]).not.toHaveProperty('description');
      expect(backForm[2]).not.toHaveProperty('description');
    });

    it('OC→Ferret→OC: preserves description, omits when absent or whitespace-only', () => {
      const openCollection = {
        opencollection: '1.0.0',
        info: { name: 'Test' },
        items: [
          {
            info: { name: 'R', type: 'http' },
            http: {
              method: 'POST',
              url: 'https://example.com',
              body: {
                type: 'form-urlencoded',
                data: [
                  { name: 'field', value: 'val', description: 'A form field' },
                  { name: 'nod', value: 'v' },
                  { name: 'ws', value: 'v', description: '   ' }
                ]
              }
            }
          }
        ]
      };

      const ferret = openCollectionToFerret(openCollection);
      const ferretForm = ferret.items[0].request.body.formUrlEncoded;
      expect(ferretForm[0]).toMatchObject({ name: 'field', description: 'A form field' });
      expect(ferretForm[1]).not.toHaveProperty('description');
      expect(ferretForm[2]).not.toHaveProperty('description');

      const backOC = ferretToOpenCollection(ferret);
      const backData = backOC.items[0].http.body.data;
      expect(backData[0]).toMatchObject({ name: 'field', description: 'A form field' });
      expect(backData[1]).not.toHaveProperty('description');
      expect(backData[2]).not.toHaveProperty('description');
    });
  });

  describe('multipart-form body description', () => {
    it('Ferret→OC→Ferret: preserves description, omits when absent or whitespace-only', () => {
      const ferretCollection = {
        uid: 'c-m1',
        name: 'Test',
        version: '1',
        items: [
          {
            uid: 'i-m1',
            type: 'http-request',
            name: 'R',
            request: {
              method: 'POST',
              url: 'https://example.com',
              headers: [],
              body: {
                mode: 'multipartForm',
                multipartForm: [
                  { uid: 'm1', name: 'file', value: '', type: 'text', enabled: true, description: 'Upload field' },
                  { uid: 'm2', name: 'nod', value: '', type: 'text', enabled: true },
                  { uid: 'm3', name: 'ws', value: '', type: 'text', enabled: true, description: '   ' }
                ]
              }
            }
          }
        ],
        root: {}
      };

      const oc = ferretToOpenCollection(ferretCollection);
      const ocBody = oc.items[0].http.body;
      expect(ocBody.type).toBe('multipart-form');
      expect(ocBody.data).toHaveLength(3);
      expect(ocBody.data[0]).toMatchObject({ name: 'file', description: 'Upload field' });
      expect(ocBody.data[1]).not.toHaveProperty('description');
      expect(ocBody.data[2]).not.toHaveProperty('description');

      const back = openCollectionToFerret(oc);
      const backMultipart = back.items[0].request.body.multipartForm;
      expect(backMultipart[0]).toMatchObject({ name: 'file', description: 'Upload field' });
      expect(backMultipart[1]).not.toHaveProperty('description');
      expect(backMultipart[2]).not.toHaveProperty('description');
    });

    it('OC→Ferret→OC: preserves description, omits when absent or whitespace-only', () => {
      const openCollection = {
        opencollection: '1.0.0',
        info: { name: 'Test' },
        items: [
          {
            info: { name: 'R', type: 'http' },
            http: {
              method: 'POST',
              url: 'https://example.com',
              body: {
                type: 'multipart-form',
                data: [
                  { name: 'file', type: 'text', value: '', description: 'Upload field' },
                  { name: 'nod', type: 'text', value: '' },
                  { name: 'ws', type: 'text', value: '', description: '   ' }
                ]
              }
            }
          }
        ]
      };

      const ferret = openCollectionToFerret(openCollection);
      const ferretMultipart = ferret.items[0].request.body.multipartForm;
      expect(ferretMultipart[0]).toMatchObject({ name: 'file', description: 'Upload field' });
      expect(ferretMultipart[1]).not.toHaveProperty('description');
      expect(ferretMultipart[2]).not.toHaveProperty('description');

      const backOC = ferretToOpenCollection(ferret);
      const backData = backOC.items[0].http.body.data;
      expect(backData[0]).toMatchObject({ name: 'file', description: 'Upload field' });
      expect(backData[1]).not.toHaveProperty('description');
      expect(backData[2]).not.toHaveProperty('description');
    });
  });

  describe('file body description', () => {
    it('Ferret→OC→Ferret: preserves description, omits when absent or whitespace-only', () => {
      const ferretCollection = {
        uid: 'c-f1',
        name: 'Test',
        version: '1',
        items: [
          {
            uid: 'i-f1',
            type: 'http-request',
            name: 'R',
            request: {
              method: 'POST',
              url: 'https://example.com',
              headers: [],
              body: {
                mode: 'file',
                file: [
                  { uid: 'f1', filePath: '/tmp/readme.pdf', contentType: 'application/pdf', selected: true, description: 'Upload doc' },
                  { uid: 'f2', filePath: '/tmp/other.bin', contentType: 'application/octet-stream', selected: false },
                  { uid: 'f3', filePath: '/tmp/plain.bin', contentType: 'application/octet-stream', selected: false, description: '   ' }
                ]
              }
            }
          }
        ],
        root: {}
      };

      const oc = ferretToOpenCollection(ferretCollection);
      const ocBody = oc.items[0].http.body;
      expect(ocBody.type).toBe('file');
      expect(ocBody.data).toHaveLength(3);
      expect(ocBody.data[0]).toMatchObject({ filePath: '/tmp/readme.pdf', description: 'Upload doc' });
      expect(ocBody.data[1]).not.toHaveProperty('description');
      expect(ocBody.data[2]).not.toHaveProperty('description');

      const back = openCollectionToFerret(oc);
      const backFile = back.items[0].request.body.file;
      expect(backFile[0]).toMatchObject({ filePath: '/tmp/readme.pdf', description: 'Upload doc' });
      expect(backFile[1].description).toBeFalsy();
      expect(backFile[2].description).toBeFalsy();
    });

    it('OC→Ferret→OC: preserves description, omits when absent or whitespace-only', () => {
      const openCollection = {
        opencollection: '1.0.0',
        info: { name: 'Test' },
        items: [
          {
            info: { name: 'R', type: 'http' },
            http: {
              method: 'POST',
              url: 'https://example.com',
              body: {
                type: 'file',
                data: [
                  { filePath: '/tmp/readme.pdf', contentType: 'application/pdf', selected: true, description: 'Upload doc' },
                  { filePath: '/tmp/other.bin', contentType: 'application/octet-stream', selected: false },
                  { filePath: '/tmp/plain.bin', contentType: 'application/octet-stream', selected: false, description: '   ' }
                ]
              }
            }
          }
        ]
      };

      const ferret = openCollectionToFerret(openCollection);
      const ferretFile = ferret.items[0].request.body.file;
      expect(ferretFile[0]).toMatchObject({ filePath: '/tmp/readme.pdf', description: 'Upload doc' });
      expect(ferretFile[1].description).toBeFalsy();
      expect(ferretFile[2].description).toBeFalsy();

      const backOC = ferretToOpenCollection(ferret);
      const backData = backOC.items[0].http.body.data;
      expect(backData[0]).toMatchObject({ filePath: '/tmp/readme.pdf', description: 'Upload doc' });
      expect(backData[1]).not.toHaveProperty('description');
      expect(backData[2]).not.toHaveProperty('description');
    });
  });
});
