import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { sendRequest } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_FILE_ORIGINAL = `meta {
  name: collection
}

vars:pre-request {
  host: http://localhost:8081
  existingCollVar: original-coll-value
}
`;

test.describe.serial('fer.setCollectionVar multiple persistent variables', () => {
  test.afterEach(async ({ collectionFixturePath }) => {
    if (collectionFixturePath) {
      const collectionFer = path.join(collectionFixturePath, 'collection.fer');
      fs.writeFileSync(collectionFer, COLLECTION_FILE_ORIGINAL, 'utf8');
    }
  });

  test('a single script can persist multiple collection vars', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const locators = buildCommonLocators(page);

    await locators.sidebar.collection('collection').click();
    await page.getByText('api-multi-persist-coll-vars', { exact: true }).click();
    await sendRequest(page, 200);

    await test.step('Both vars appear in the collection vars tab', async () => {
      await locators.sidebar.collection('collection').click();
      await locators.paneTabs.collectionSettingsTab('vars').click();

      await expect(locators.environment.variableRowByName('multiple-persist-coll-vars-key1')).toBeVisible();
      await expect(locators.environment.variableValue('multiple-persist-coll-vars-key1')).toContainText('value1');
      await expect(locators.environment.variableRowByName('multiple-persist-coll-vars-key2')).toBeVisible();
      await expect(locators.environment.variableValue('multiple-persist-coll-vars-key2')).toContainText('value2');
    });

    await test.step('Both vars are persisted to collection.fer', async () => {
      const collectionFerPath = path.join(collectionFixturePath!, 'collection.fer');
      await expect.poll(() => fs.readFileSync(collectionFerPath, 'utf8'), { timeout: 10000 })
        .toMatch(/multiple-persist-coll-vars-key1:\s*value1[\s\S]*multiple-persist-coll-vars-key2:\s*value2/);
    });
  });
});
