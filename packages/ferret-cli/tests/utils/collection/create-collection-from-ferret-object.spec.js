const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, expect, afterEach } = require('@jest/globals');
const { parseRequest, parseFolder } = require('@ferretclient/filestore');
const { createCollectionFromFerretObject } = require('../../../src/utils/collection');

describe('createCollectionFromFerretObject', () => {
  let outputDir;
  const createOutputDir = () => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ferret-cli-import-'));
    return outputDir;
  };
  const parseFerRequestFromPath = (filePath) => parseRequest(fs.readFileSync(filePath, 'utf8'), { format: 'fer' });
  const parseFerFolderFromPath = (filePath) => parseFolder(fs.readFileSync(filePath, 'utf8'), { format: 'fer' });

  afterEach(() => {
    if (outputDir && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('writes http and graphql requests from imported collection items', async () => {
    createOutputDir();

    await createCollectionFromFerretObject(
      {
        name: 'imported-collection',
        items: [
          {
            type: 'http-request',
            name: 'Get Users',
            filename: 'get-users.fer',
            seq: 1,
            request: {
              method: 'GET',
              url: 'https://api.example.com/users'
            }
          },
          {
            type: 'graphql-request',
            name: 'Get Viewer',
            filename: 'get-viewer.fer',
            seq: 2,
            request: {
              method: 'POST',
              url: 'https://api.example.com/graphql',
              body: {
                mode: 'graphql',
                graphql: {
                  query: 'query { viewer { id } }',
                  variables: '{}'
                }
              }
            }
          }
        ]
      },
      outputDir,
      { format: 'fer' }
    );

    const httpPath = path.join(outputDir, 'get-users.fer');
    const graphqlPath = path.join(outputDir, 'get-viewer.fer');

    expect(fs.existsSync(httpPath)).toBe(true);
    expect(fs.existsSync(graphqlPath)).toBe(true);

    const httpRequest = parseFerRequestFromPath(httpPath);
    const graphqlRequest = parseFerRequestFromPath(graphqlPath);

    expect(httpRequest).toHaveProperty('type', 'http-request');
    expect(httpRequest).toHaveProperty('request.method', 'GET');
    expect(graphqlRequest).toHaveProperty('type', 'graphql-request');
    expect(graphqlRequest).toHaveProperty('request.method', 'POST');
  });

  it('writes folder.fer in fer format', async () => {
    createOutputDir();

    await createCollectionFromFerretObject(
      {
        name: 'folder-collection',
        items: [
          {
            type: 'folder',
            name: 'Users',
            seq: 3,
            root: {
              meta: { name: 'Users' }
            },
            items: [
              {
                type: 'http-request',
                name: 'List Users',
                filename: 'list-users.fer',
                seq: 1,
                request: {
                  method: 'GET',
                  url: 'https://api.example.com/users'
                }
              }
            ]
          }
        ]
      },
      outputDir,
      { format: 'fer' }
    );

    const folderPath = path.join(outputDir, 'Users');
    const folderFerPath = path.join(folderPath, 'folder.fer');
    const nestedRequestPath = path.join(folderPath, 'list-users.fer');

    expect(fs.existsSync(folderFerPath)).toBe(true);
    expect(fs.existsSync(nestedRequestPath)).toBe(true);

    const folder = parseFerFolderFromPath(folderFerPath);
    const nestedRequest = parseFerRequestFromPath(nestedRequestPath);

    expect(folder).toHaveProperty('meta.name', 'Users');
    expect(folder).toHaveProperty('meta.seq', 3);
    expect(nestedRequest).toHaveProperty('type', 'http-request');
    expect(nestedRequest).toHaveProperty('request.method', 'GET');
  });

  it('writes examples from imported collection items', async () => {
    createOutputDir();

    await createCollectionFromFerretObject(
      {
        name: 'examples-collection',
        items: [
          {
            type: 'http-request',
            name: 'Get Users',
            filename: 'get-users.fer',
            seq: 1,
            request: {
              method: 'GET',
              url: 'https://api.example.com/users'
            },
            examples: [
              {
                uid: 'ex1',
                name: 'Success Response',
                type: 'http-request',
                request: {
                  url: 'https://api.example.com/users',
                  method: 'GET',
                  headers: [],
                  params: [],
                  body: { mode: 'none' }
                },
                response: {
                  status: 200,
                  statusText: 'OK',
                  headers: [{ uid: 'h1', name: 'Content-Type', value: 'application/json', enabled: true }],
                  body: {
                    type: 'json',
                    content: JSON.stringify([{ id: 1, name: 'John' }], null, 2)
                  }
                }
              }
            ]
          }
        ]
      },
      outputDir,
      { format: 'fer' }
    );

    const httpPath = path.join(outputDir, 'get-users.fer');
    expect(fs.existsSync(httpPath)).toBe(true);

    const parsed = parseFerRequestFromPath(httpPath);
    expect(parsed.examples).toBeDefined();
    expect(parsed.examples).toHaveLength(1);
    expect(parsed.examples[0].name).toBe('Success Response');
    expect(Number(parsed.examples[0].response.status)).toBe(200);
    expect(parsed.examples[0].response.body.content).toContain('John');
  });

  it('throws for unsupported item types', async () => {
    createOutputDir();

    await expect(
      createCollectionFromFerretObject(
        {
          name: 'invalid-item-type-collection',
          items: [
            {
              type: 'unsupported-type',
              name: 'Unsupported'
            }
          ]
        },
        outputDir,
        { format: 'fer' }
      )
    ).rejects.toThrow('Unsupported item type: unsupported-type');
  });
});
