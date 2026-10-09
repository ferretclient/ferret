import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';

const BRUNO_REQUEST = [
  'meta {',
  '  name: Get user',
  '  type: http',
  '  seq: 1',
  '}',
  '',
  'get {',
  '  url: http://localhost:8081/ping',
  '  body: none',
  '  auth: none',
  '}',
  '',
  'script:post-response {',
  '  bru.setVar("userId", 1);',
  '}',
  ''
].join('\n');

const write = (file: string, content: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

// Mirrors a workspace created by Bruno 3: a YAML collection inside the folder plus one stored elsewhere.
const createBrunoWorkspace = (root: string) => {
  const workspace = path.join(root, 'bruno-ws');
  write(path.join(workspace, 'workspace.yml'), [
    'opencollection: 1.0.0',
    'info:',
    '  name: "Brunoland"',
    '  type: workspace',
    '',
    'collections:',
    '  - name: "inside"',
    '    path: "collections/inside"',
    '  - name: "outside"',
    '    path: "../outside"',
    '',
    'specs:',
    '',
    'docs: \'\'',
    ''
  ].join('\n'));
  write(path.join(workspace, 'collections/inside/opencollection.yml'), 'opencollection: 1.0.0\n\ninfo:\n  name: inside\nbundled: false\nextensions:\n  bruno:\n    ignore:\n      - node_modules\n      - .git\n');
  write(path.join(workspace, 'collections/inside/Ping.yml'), 'info:\n  name: Ping\n  type: http\n  seq: 1\n\nhttp:\n  method: GET\n  url: http://localhost:8081/ping\n  auth: inherit\n');
  write(path.join(root, 'outside/bruno.json'), JSON.stringify({ version: '1', name: 'outside', type: 'collection' }));
  write(path.join(root, 'outside/Get user.bru'), BRUNO_REQUEST);
  return workspace;
};

test.describe('Import a Bruno workspace', () => {
  test('converts the workspace and its collections and opens it', async ({ page, electronApp, createTmpDir }) => {
    const source = await createTmpDir('bruno-source');
    const target = await createTmpDir('ferret-workspaces');
    const brunoWorkspace = createBrunoWorkspace(source);

    // The folder dialog is opened twice: for the Bruno workspace, then for the destination.
    await electronApp.evaluate(({ dialog }, { paths }) => {
      const queue = [...paths];
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [queue.shift()] });
    }, { paths: [brunoWorkspace, target] });

    await test.step('Choose the Bruno workspace folder and a destination', async () => {
      await page.getByTestId('workspace-menu').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Import workspace' }).click();

      await page.getByTestId('import-bruno-workspace').click();
      await expect(page.getByTestId('import-workspace-selected')).toHaveText('bruno-ws');

      await page.locator('#workspace-location').click();
      await expect(page.locator('#workspace-location')).toHaveValue(target);
      await page.getByRole('button', { name: 'Import', exact: true }).click();
    });

    const imported = path.join(target, 'Brunoland');

    await test.step('The Ferret workspace is open with both collections', async () => {
      await expect(page.getByTestId('workspace-name')).toHaveText('Brunoland', { timeout: 30000 });
      await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'inside' })).toBeVisible({ timeout: 30000 });
      await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'outside' })).toBeVisible({ timeout: 30000 });
    });

    await test.step('The files on disk are converted, and the outside collection was moved in', async () => {
      const workspaceYml = fs.readFileSync(path.join(imported, 'workspace.yml'), 'utf8');
      expect(workspaceYml).toContain('path: "collections/inside"');
      expect(workspaceYml).toContain('path: "collections/outside"');
      expect(fs.readFileSync(path.join(imported, 'collections/inside/opencollection.yml'), 'utf8')).toContain('ferret:');
      expect(fs.existsSync(path.join(imported, 'collections/outside/ferret.json'))).toBe(true);
      expect(fs.readFileSync(path.join(imported, 'collections/outside/Get user.fer'), 'utf8')).toContain('fer.setVar("userId", 1);');
    });

    await test.step('The original Bruno files are untouched', async () => {
      expect(fs.existsSync(path.join(source, 'outside/bruno.json'))).toBe(true);
      expect(fs.readFileSync(path.join(brunoWorkspace, 'workspace.yml'), 'utf8')).toContain('path: "../outside"');
    });
  });

  test('rejects a folder without a workspace.yml', async ({ page, electronApp, createTmpDir }) => {
    const notAWorkspace = await createTmpDir('plain-folder');
    fs.writeFileSync(path.join(notAWorkspace, 'notes.txt'), 'nothing');

    await electronApp.evaluate(({ dialog }, { dir }) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
    }, { dir: notAWorkspace });

    await page.getByTestId('workspace-menu').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Import workspace' }).click();
    await page.getByTestId('import-bruno-workspace').click();

    await expect(page.getByText('has no workspace.yml')).toBeVisible();
    await expect(page.getByTestId('import-workspace-selected')).toBeHidden();
  });
});
