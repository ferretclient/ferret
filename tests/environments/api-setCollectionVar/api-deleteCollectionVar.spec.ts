import fs from 'fs';
import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { sendRequest, waitForReadyPage } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_FILE_ORIGINAL = `meta {
  name: collection
}

vars:pre-request {
  host: http://localhost:8081
  existingCollVar: original-coll-value
}
`;

const restoreCollectionFixture = (collectionFixturePath: string) => {
  const collectionFer = path.join(collectionFixturePath, 'collection.fer');
  fs.writeFileSync(collectionFer, COLLECTION_FILE_ORIGINAL, 'utf8');
};

test.describe.serial('fer.deleteCollectionVar(name) - removes var from collection.fer', () => {
  test.afterEach(async ({ collectionFixturePath }) => {
    if (collectionFixturePath) {
      restoreCollectionFixture(collectionFixturePath);
    }
  });

  test('collection var deletion via script persists across restart', async ({
    pageWithUserData: page,
    collectionFixturePath,
    restartApp
  }) => {
    const collectionFerPath = path.join(collectionFixturePath!, 'collection.fer');
    const locators = buildCommonLocators(page);

    // Sanity: fixture starts with existingCollVar present.
    expect(fs.readFileSync(collectionFerPath, 'utf8')).toMatch(/existingCollVar:\s*original-coll-value/);

    await locators.sidebar.collection('collection').click();
    await page.getByText('api-deleteCollectionVar', { exact: true }).click();
    await sendRequest(page, 200);

    // Pre-restart: collection.fer no longer contains existingCollVar.
    await expect.poll(() => fs.readFileSync(collectionFerPath, 'utf8'), { timeout: 5000 })
      .not.toMatch(/existingCollVar/);

    // Pre-restart UI: the vars tab no longer lists existingCollVar.
    await locators.sidebar.collection('collection').click();
    await locators.paneTabs.collectionSettingsTab('vars').click();
    await expect(locators.environment.variableRowByName('existingCollVar')).toHaveCount(0);

    // Restart: the deletion survives.
    const newApp = await restartApp();
    const newPage = await waitForReadyPage(newApp);
    const newLocators = buildCommonLocators(newPage);

    await newLocators.sidebar.collection('collection').click();
    await newLocators.paneTabs.collectionSettingsTab('vars').click();
    await expect(newLocators.environment.variableRowByName('existingCollVar')).toHaveCount(0);

    expect(fs.readFileSync(collectionFerPath, 'utf8')).not.toMatch(/existingCollVar/);

    await closeElectronApp(newApp);
  });
});
