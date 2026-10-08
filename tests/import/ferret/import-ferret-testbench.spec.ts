import { test } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';

test.describe('Import Ferret Testbench Collection', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Ferret Testbench collection successfully', async ({ page, createTmpDir }) => {
    const ferretFile = path.resolve(__dirname, 'fixtures', 'ferret-testbench.json');

    await importCollection(page, ferretFile, await createTmpDir('ferret-testbench-test'), {
      expectedCollectionName: 'ferret-testbench'
    });
  });
});
