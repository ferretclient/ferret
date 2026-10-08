import { test, expect } from '../../../playwright';
import * as path from 'path';
import { importCollection, closeAllCollections, buildCommonLocators } from '../../utils/page';

test.describe('Import Ferret Collection - request with missing URL', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  const cases = [
    { fixture: 'ferret-http-request-missing-url.json', collectionName: 'HTTP Collection', type: 'HTTP', requestName: 'http request without url' },
    { fixture: 'ferret-grpc-request-missing-url.json', collectionName: 'GRPC Collection', type: 'gRPC', requestName: 'grpc request without url' },
    { fixture: 'ferret-http-example-request-missing-url.json', collectionName: 'HTTP Example Collection', type: 'HTTP example', requestName: 'http example request without url', exampleName: 'Http request example response' }
  ];

  for (const { fixture, collectionName, type, requestName, exampleName } of cases) {
    test(`imports a ${type} request without a URL`, async ({ page, createTmpDir }) => {
      const ferretFile = path.resolve(__dirname, 'fixtures', fixture);
      const location = await createTmpDir(collectionName);

      await test.step('Import the collection', async () => {
        await importCollection(page, ferretFile, location, {
          expectedCollectionName: collectionName
        });
      });

      await test.step(`Verify the collection, request${exampleName ? ' and example' : ''} appear in the sidebar`, async () => {
        const locators = buildCommonLocators(page);

        await expect(locators.sidebar.collection(collectionName)).toBeVisible();
        await expect(locators.sidebar.itemRow(requestName)).toBeVisible();

        if (exampleName) {
          await locators.sidebar.requestExamplesToggle(requestName).click();
          await expect(locators.sidebar.example(exampleName)).toBeVisible();
        }
      });
    });
  }
});
