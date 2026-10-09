jest.mock('electron', () => ({
  ipcMain: { emit: jest.fn(), handle: jest.fn() },
  app: { getPath: jest.fn(() => require('node:os').tmpdir()) }
}));

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const yaml = require('js-yaml');
const { importBrunoWorkspaceFolder, isWorkspaceDir } = require('./bruno-workspace-import');

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
  '  url: http://localhost/users/1',
  '  body: none',
  '  auth: none',
  '}',
  '',
  'script:post-response {',
  '  bru.setVar("userId", 1);',
  '}',
  ''
].join('\n');

const OPENCOLLECTION_YML = (name) => `opencollection: 1.0.0\n\ninfo:\n  name: ${name}\nbundled: false\nextensions:\n  bruno:\n    ignore:\n      - node_modules\n      - .git\n`;

const workspaceYml = (collections) => [
  'opencollection: 1.0.0',
  'info:',
  '  name: "test"',
  '  type: workspace',
  '',
  'collections:',
  ...collections.flatMap(({ name, path: collectionPath }) => [`  - name: "${name}"`, `    path: "${collectionPath}"`]),
  '',
  'specs:',
  '',
  'docs: \'\'',
  ''
].join('\n');

describe('Bruno workspace import', () => {
  let workRoot;
  let workspaceDir;
  let targetDir;

  beforeEach(() => {
    workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ferret-bruno-workspace-spec-'));
    workspaceDir = path.join(workRoot, 'test');
    targetDir = path.join(workRoot, 'workspaces');
    fs.mkdirSync(targetDir);
  });

  afterEach(() => {
    fs.rmSync(workRoot, { recursive: true, force: true });
  });

  it('recognises a workspace folder by its workspace.yml', () => {
    writeFiles(workspaceDir, { 'workspace.yml': workspaceYml([]) });
    expect(isWorkspaceDir(workspaceDir)).toBe(true);
    expect(isWorkspaceDir(path.join(workRoot, 'missing'))).toBe(false);

    writeFiles(path.join(workRoot, 'plain'), { 'notes.txt': 'x' });
    expect(isWorkspaceDir(path.join(workRoot, 'plain'))).toBe(false);
  });

  it('converts the listed collections and global environments and keeps the workspace name and order', async () => {
    writeFiles(workspaceDir, {
      'workspace.yml': workspaceYml([
        { name: 'collection1', path: 'collections/collection1' },
        { name: 'legacy', path: 'collections/legacy' }
      ]),
      'collections/collection1/opencollection.yml': OPENCOLLECTION_YML('collection1'),
      'collections/collection1/Untitled.yml': 'info:\n  name: Untitled\n  type: http\n  seq: 1\n\nhttp:\n  method: GET\n  url: example.com\n',
      'collections/legacy/bruno.json': JSON.stringify({ version: '1', name: 'legacy', type: 'collection' }),
      'collections/legacy/Get user.bru': BRUNO_REQUEST,
      'environments/shared.yml': 'name: shared\nvariables:\n  - name: host\n    value: example.com\n'
    });

    const result = await importBrunoWorkspaceFolder(workspaceDir, targetDir);

    expect(result.workspacePath).toBe(path.join(targetDir, 'test'));
    expect(result.collectionCount).toBe(2);
    expect(result.warnings).toEqual([]);

    const imported = path.join(targetDir, 'test');
    const config = yaml.load(fs.readFileSync(path.join(imported, 'workspace.yml'), 'utf8'));
    expect(config.info).toEqual({ name: 'test', type: 'workspace' });
    expect(config.collections).toEqual([
      { name: 'collection1', path: 'collections/collection1' },
      { name: 'legacy', path: 'collections/legacy' }
    ]);

    expect(fs.readFileSync(path.join(imported, 'collections/collection1/opencollection.yml'), 'utf8')).toContain('ferret:');
    expect(fs.readFileSync(path.join(imported, 'collections/collection1/opencollection.yml'), 'utf8')).not.toContain('bruno:');
    expect(fs.existsSync(path.join(imported, 'collections/legacy/ferret.json'))).toBe(true);
    expect(fs.existsSync(path.join(imported, 'collections/legacy/bruno.json'))).toBe(false);
    expect(fs.readFileSync(path.join(imported, 'collections/legacy/Get user.fer'), 'utf8')).toContain('fer.setVar("userId", 1);');
    expect(fs.readFileSync(path.join(imported, 'environments/shared.yml'), 'utf8')).toContain('host');
  });

  it('leaves the source workspace untouched', async () => {
    writeFiles(workspaceDir, {
      'workspace.yml': workspaceYml([{ name: 'legacy', path: 'collections/legacy' }]),
      'collections/legacy/bruno.json': JSON.stringify({ version: '1', name: 'legacy', type: 'collection' }),
      'collections/legacy/Get user.bru': BRUNO_REQUEST
    });

    await importBrunoWorkspaceFolder(workspaceDir, targetDir);

    expect(fs.existsSync(path.join(workspaceDir, 'collections/legacy/bruno.json'))).toBe(true);
    expect(fs.readFileSync(path.join(workspaceDir, 'collections/legacy/Get user.bru'), 'utf8')).toBe(BRUNO_REQUEST);
    expect(fs.readFileSync(path.join(workspaceDir, 'workspace.yml'), 'utf8')).toContain('collections/legacy');
  });

  it('moves a collection stored outside the workspace into collections/ and repoints its entry', async () => {
    const outside = path.join(workRoot, 'elsewhere', 'legacy-proxy');
    writeFiles(outside, {
      'bruno.json': JSON.stringify({ version: '1', name: 'legacy-proxy', type: 'collection' }),
      'Get user.bru': BRUNO_REQUEST
    });
    writeFiles(workspaceDir, {
      'workspace.yml': workspaceYml([{ name: 'legacy-proxy', path: '../elsewhere/legacy-proxy' }])
    });

    const result = await importBrunoWorkspaceFolder(workspaceDir, targetDir);

    const imported = result.workspacePath;
    const config = yaml.load(fs.readFileSync(path.join(imported, 'workspace.yml'), 'utf8'));
    expect(config.collections).toEqual([{ name: 'legacy-proxy', path: 'collections/legacy-proxy' }]);
    expect(fs.existsSync(path.join(imported, 'collections/legacy-proxy/ferret.json'))).toBe(true);
    expect(fs.readFileSync(path.join(imported, 'collections/legacy-proxy/Get user.fer'), 'utf8')).toContain('fer.setVar');
    expect(fs.existsSync(path.join(outside, 'bruno.json'))).toBe(true);
  });

  it('keeps an entry whose folder is missing and reports it', async () => {
    writeFiles(workspaceDir, {
      'workspace.yml': workspaceYml([{ name: 'gone', path: 'collections/gone' }]),
      'collections/other/bruno.json': JSON.stringify({ version: '1', name: 'other', type: 'collection' })
    });

    const result = await importBrunoWorkspaceFolder(workspaceDir, targetDir);

    expect(result.warnings).toEqual([expect.stringContaining('"gone" was not found')]);
    const config = yaml.load(fs.readFileSync(path.join(result.workspacePath, 'workspace.yml'), 'utf8'));
    expect(config.collections).toEqual([{ name: 'gone', path: 'collections/gone' }]);
  });

  it('never overwrites an existing workspace folder', async () => {
    writeFiles(workspaceDir, { 'workspace.yml': workspaceYml([]) });
    fs.mkdirSync(path.join(targetDir, 'test'));

    const result = await importBrunoWorkspaceFolder(workspaceDir, targetDir);

    expect(result.workspacePath).toBe(path.join(targetDir, 'test - 1'));
  });

  it('rejects a folder that is not a workspace', async () => {
    writeFiles(workspaceDir, { 'notes.txt': 'x' });

    await expect(importBrunoWorkspaceFolder(workspaceDir, targetDir)).rejects.toThrow('Not a Bruno workspace');
  });
});
