import fs from 'fs';
import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { sendRequest, waitForReadyPage } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_FILE_ORIGINAL = `meta {
  name: collection
}

vars:pre-request {
  host: https://testbench-sanity.ferret.io
  existingCollVar: original-coll-value
}
`;

const restoreCollectionFixture = (collectionFixturePath: string) => {
  const collectionFer = path.join(collectionFixturePath, 'collection.fer');
  fs.writeFileSync(collectionFer, COLLECTION_FILE_ORIGINAL, 'utf8');
};

test.describe.serial('fer.setCollectionVar(name, value) — typed value persistence', () => {
  test.afterEach(async ({ collectionFixturePath }) => {
    if (collectionFixturePath) {
      restoreCollectionFixture(collectionFixturePath);
    }
  });

  test('persists number/boolean/object/string values with the correct dataType annotation', async ({
    pageWithUserData: page,
    collectionFixturePath,
    restartApp
  }) => {
    const collectionFerPath = path.join(collectionFixturePath!, 'collection.fer');
    const locators = buildCommonLocators(page);

    await test.step('Run the typed-persist request', async () => {
      await locators.sidebar.collection('collection').click();
      await page.getByText('api-setCollectionVar-typed', { exact: true }).click();
      await sendRequest(page, 200);
    });

    await test.step('collection.fer on disk carries the right dataType annotations', async () => {
      await expect.poll(() => fs.readFileSync(collectionFerPath, 'utf8'), { timeout: 5000 })
        .toMatch(/@number\s+coll_num:\s*42/);
      const content = fs.readFileSync(collectionFerPath, 'utf8');

      expect(content).toMatch(/@boolean\s+coll_bool:\s*true/);
      // @object values are pretty-printed in a '''…''' block.
      expect(content).toMatch(/@object\s+coll_obj:\s*'''[\s\S]*"k":\s*1[\s\S]*'''/);
      // 'string' is the implicit default — not materialized.
      expect(content).not.toMatch(/@string\s+coll_str:/);
      expect(content).toMatch(/coll_str:\s*hello/);
    });

    await test.step('Restart and verify the collection vars tab reflects the persisted datatypes', async () => {
      const newApp = await restartApp();
      const newPage = await waitForReadyPage(newApp);
      const newLocators = buildCommonLocators(newPage);

      await newLocators.sidebar.collection('collection').click();
      await newLocators.paneTabs.collectionSettingsTab('vars').click();

      const numRow = newLocators.environment.variableRowByName('coll_num');
      const boolRow = newLocators.environment.variableRowByName('coll_bool');
      const objRow = newLocators.environment.variableRowByName('coll_obj');
      const strRow = newLocators.environment.variableRowByName('coll_str');

      await expect(numRow).toBeVisible();
      await expect(newLocators.dataTypeSelector.typeLabel(numRow)).toHaveAttribute('data-selected-type', 'number', { timeout: 5000 });
      await expect(newLocators.dataTypeSelector.typeLabel(boolRow)).toHaveAttribute('data-selected-type', 'boolean');
      await expect(newLocators.dataTypeSelector.typeLabel(objRow)).toHaveAttribute('data-selected-type', 'object');
      await expect(newLocators.dataTypeSelector.typeLabel(strRow)).toHaveAttribute('data-selected-type', 'string');

      await closeElectronApp(newApp);
    });
  });
});
