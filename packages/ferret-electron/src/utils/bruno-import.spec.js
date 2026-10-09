jest.mock('electron', () => ({
  ipcMain: { emit: jest.fn(), handle: jest.fn() },
  app: { getPath: jest.fn(() => require('node:os').tmpdir()) }
}));

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { importBrunoCollectionFolder, convertBrunoCollectionDir, findBrunoCollections, importBrunoFolder } = require('./bruno-import');

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

  describe('a folder that holds several collections', () => {
    let parentDir;

    const brunoCollection = (dir) => ({
      [`${dir}/bruno.json`]: JSON.stringify({ version: '1', name: path.basename(dir), type: 'collection' }),
      [`${dir}/Get.bru`]: BRUNO_REQUEST
    });

    beforeEach(() => {
      parentDir = path.join(workRoot, 'all-bruno');
      writeFiles(parentDir, {
        ...brunoCollection('Billing'),
        ...brunoCollection('Team/Orders'),
        'Team/notes.txt': 'not a collection',
        'node_modules/Hidden/bruno.json': '{"version":"1","name":"Hidden","type":"collection"}',
        'Empty/readme.md': 'nothing here'
      });
    });

    it('finds each collection once, skipping node_modules and not searching inside a collection', async () => {
      writeFiles(parentDir, brunoCollection('Billing/Nested'));

      const found = await findBrunoCollections(parentDir);

      expect(found).toEqual([path.join(parentDir, 'Billing'), path.join(parentDir, 'Team', 'Orders')]);
    });

    it('treats the folder itself as the only collection when it is one', async () => {
      expect(await findBrunoCollections(sourceDir)).toEqual([sourceDir]);
    });

    it('does not look deeper than four levels', async () => {
      writeFiles(parentDir, brunoCollection('a/b/c/d/Deep'));
      writeFiles(parentDir, brunoCollection('a/b/c/Reachable'));

      const found = await findBrunoCollections(parentDir);

      expect(found).toContain(path.join(parentDir, 'a', 'b', 'c', 'Reachable'));
      expect(found).not.toContain(path.join(parentDir, 'a', 'b', 'c', 'd', 'Deep'));
    });

    it('converts and imports every collection and leaves the sources untouched', async () => {
      const mainWindow = { webContents: { send: jest.fn() } };

      const result = await importBrunoFolder(mainWindow, parentDir, targetDir);

      expect(result.failed).toEqual([]);
      expect(result.imported).toEqual([path.join(targetDir, 'Billing'), path.join(targetDir, 'Orders')]);
      for (const importedPath of result.imported) {
        expect(fs.existsSync(path.join(importedPath, 'ferret.json'))).toBe(true);
        expect(fs.readFileSync(path.join(importedPath, 'Get.fer'), 'utf8')).toContain('fer.setVar("userId", res.body.id);');
      }
      expect(mainWindow.webContents.send).toHaveBeenCalledTimes(2);
      expect(fs.existsSync(path.join(parentDir, 'Billing', 'bruno.json'))).toBe(true);
    });

    it('keeps importing when one collection fails and reports it', async () => {
      writeFiles(parentDir, { 'Broken/bruno.json': '{}', 'Broken/Clash.bru': BRUNO_REQUEST, 'Broken/Clash.fer': 'already here' });

      const result = await importBrunoFolder({ webContents: { send: jest.fn() } }, parentDir, targetDir);

      expect(result.imported).toHaveLength(2);
      expect(result.failed).toEqual([{ path: path.join(parentDir, 'Broken'), message: expect.stringContaining('already exists') }]);
    });

    it('rejects a folder without any Bruno collection', async () => {
      await expect(importBrunoFolder({ webContents: { send: jest.fn() } }, path.join(parentDir, 'Empty'), targetDir)).rejects.toThrow(
        'No Bruno collections found'
      );
    });
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
