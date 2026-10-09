import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page/actions';
import { buildCommonLocators } from '../../utils/page/locators';

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

const writeBrunoCollection = (dir: string, name: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'bruno.json'), JSON.stringify({ version: '1', name, type: 'collection' }));
  fs.writeFileSync(path.join(dir, 'Get user.bru'), BRUNO_REQUEST);
};

test.describe('Import a Bruno folder', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('converts and imports every Bruno collection found in the chosen folder', async ({ page, electronApp, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const brunoFolder = await createTmpDir('all-bruno');
    const targetLocation = await createTmpDir('ferret-collections');
    writeBrunoCollection(path.join(brunoFolder, 'Billing'), 'Billing');
    writeBrunoCollection(path.join(brunoFolder, 'Team', 'Orders'), 'Orders');

    await electronApp.evaluate(({ dialog }, { dir }) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
    }, { dir: brunoFolder });

    await test.step('Choosing the folder lists the collections it contains', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      await page.getByTestId('import-bruno-folder').click();

      const locationModal = locators.import.locationModal();
      await expect(locationModal).toBeVisible();
      await expect(locationModal.getByTestId('import-bruno-collection-list')).toContainText('Billing');
      await expect(locationModal.getByTestId('import-bruno-collection-list')).toContainText('Orders');
    });

    await test.step('Importing converts both into Ferret collections and opens them', async () => {
      await page.locator('#collection-location').fill(targetLocation);
      await locators.import.importButton().click();

      await expect(locators.sidebar.collection('Billing')).toBeVisible({ timeout: 30000 });
      await expect(locators.sidebar.collection('Orders')).toBeVisible({ timeout: 30000 });

      for (const name of ['Billing', 'Orders']) {
        const imported = path.join(targetLocation, name);
        expect(fs.existsSync(path.join(imported, 'ferret.json'))).toBe(true);
        expect(fs.existsSync(path.join(imported, 'bruno.json'))).toBe(false);
        expect(fs.readFileSync(path.join(imported, 'Get user.fer'), 'utf8')).toContain('fer.setVar("userId", 1);');
      }
    });

    await test.step('The original Bruno folder is left as it was', async () => {
      expect(fs.existsSync(path.join(brunoFolder, 'Billing', 'bruno.json'))).toBe(true);
      expect(fs.readFileSync(path.join(brunoFolder, 'Billing', 'Get user.bru'), 'utf8')).toBe(BRUNO_REQUEST);
    });
  });

  test('explains when the chosen folder holds no Bruno collection', async ({ page, electronApp, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const emptyFolder = await createTmpDir('no-bruno-here');
    fs.writeFileSync(path.join(emptyFolder, 'notes.txt'), 'nothing to import');

    await electronApp.evaluate(({ dialog }, { dir }) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
    }, { dir: emptyFolder });

    await locators.plusMenu.button().click();
    await locators.plusMenu.importCollection().click();
    await page.getByTestId('import-bruno-folder').click();

    await expect(page.getByText('No Bruno collections found in this folder')).toBeVisible();
    await expect(locators.import.locationModal()).toBeHidden();
  });
});
