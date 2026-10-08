jest.mock('electron', () => ({
  ipcMain: { emit: jest.fn(), handle: jest.fn() },
  app: { getPath: jest.fn(() => require('node:os').tmpdir()) }
}));

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { importBrunoCollectionFolder, convertBrunoCollectionDir } = require('./bruno-import');

const writeFiles = (root, files) => {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
};

const BRUNO_REQUEST = [
  'meta {',
  '  name: Get user',
  '  type: http',
  '  seq: 1',
  '}',
  '',
  'get {',
  '  url: {{baseUrl}}/users/1',
  '  body: none',
  '  auth: none',
  '}',
  '',
  'script:post-response {',
  '  bru.setVar("userId", res.body.id);',
  '}',
  ''
].join('\n');

describe('Bruno collection import', () => {
  let workRoot;
  let sourceDir;
  let targetDir;

  beforeEach(() => {
    workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ferret-bruno-import-spec-'));
    sourceDir = path.join(workRoot, 'Shop API');
    targetDir = path.join(workRoot, 'collections');
    fs.mkdirSync(targetDir);
    writeFiles(sourceDir, {
      'bruno.json': JSON.stringify({ version: '1', name: 'Shop API', type: 'collection', ignore: ['node_modules', '.git'] }),
      'collection.bru': 'script:pre-request {\n  bru.setVar("startedAt", Date.now());\n}\n',
      'environments/dev.bru': 'vars {\n  baseUrl: https://api.example.com\n}\n',
      'users/Get user.bru': BRUNO_REQUEST,
      'README.md': 'Notes about bru.setVar',
      '.git/HEAD': 'ref: refs/heads/main',
      'node_modules/lib/index.js': 'module.exports = 1;'
    });
  });

  afterEach(() => {
    fs.rmSync(workRoot, { recursive: true, force: true });
  });

  it('imports a converted copy and opens it, leaving the source folder untouched', async () => {
    const mainWindow = { webContents: { send: jest.fn() } };

    const importedPath = await importBrunoCollectionFolder(mainWindow, sourceDir, targetDir);

    expect(importedPath).toBe(path.join(targetDir, 'Shop API'));
    expect(fs.existsSync(path.join(importedPath, 'ferret.json'))).toBe(true);
    expect(fs.existsSync(path.join(importedPath, 'bruno.json'))).toBe(false);
    expect(fs.readFileSync(path.join(importedPath, 'collection.fer'), 'utf8')).toContain('fer.setVar("startedAt", Date.now());');
    expect(fs.existsSync(path.join(importedPath, 'environments', 'dev.fer'))).toBe(true);
    expect(fs.readFileSync(path.join(importedPath, 'users', 'Get user.fer'), 'utf8')).toContain('fer.setVar("userId", res.body.id);');
    expect(fs.readFileSync(path.join(importedPath, 'README.md'), 'utf8')).toBe('Notes about bru.setVar');
    expect(fs.existsSync(path.join(importedPath, '.git'))).toBe(false);
    expect(fs.existsSync(path.join(importedPath, 'node_modules'))).toBe(false);

    expect(fs.existsSync(path.join(sourceDir, 'bruno.json'))).toBe(true);
    expect(fs.readFileSync(path.join(sourceDir, 'users', 'Get user.bru'), 'utf8')).toBe(BRUNO_REQUEST);

    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      'main:collection-opened',
      importedPath,
      expect.any(String),
      expect.objectContaining({ name: 'Shop API' })
    );
  });

  it('rejects a folder that is not a collection', async () => {
    const emptyDir = path.join(workRoot, 'empty');
    fs.mkdirSync(emptyDir);

    await expect(importBrunoCollectionFolder({ webContents: { send: jest.fn() } }, emptyDir, targetDir)).rejects.toThrow(
      'Not a Bruno collection'
    );
  });

  it('leaves a Ferret collection unchanged', async () => {
    const ferretDir = path.join(workRoot, 'ferret');
    writeFiles(ferretDir, {
      'ferret.json': '{"version":"1","name":"F","type":"collection"}',
      'Get.fer': BRUNO_REQUEST.replace('bru.setVar', 'fer.setVar')
    });

    await convertBrunoCollectionDir(ferretDir);

    expect(fs.readdirSync(ferretDir).sort()).toEqual(['Get.fer', 'ferret.json']);
    expect(fs.readFileSync(path.join(ferretDir, 'Get.fer'), 'utf8')).toBe(BRUNO_REQUEST.replace('bru.setVar', 'fer.setVar'));
  });
});
