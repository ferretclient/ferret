import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection, createRequest, openRequest } from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

// Open tabs have two levels: a tab per collection on top, and under it the tabs of the chosen collection.
test.describe('Collection tabs', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('shows a tab per collection with open tabs, and the request tabs of the chosen one underneath', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);

    await test.step('Open one request in each of two collections', async () => {
      await createCollection(page, 'alpha', await createTmpDir('alpha'));
      await createRequest(page, 'alpha-ping', 'alpha', { url: 'http://localhost:8081/ping' });
      await createCollection(page, 'beta', await createTmpDir('beta'));
      await createRequest(page, 'beta-ping', 'beta', { url: 'http://localhost:8081/ping' });
      await openRequest(page, 'alpha', 'alpha-ping');
      await openRequest(page, 'beta', 'beta-ping');
    });

    await test.step('Both collections have a tab, and the active one shows only its own request tabs', async () => {
      await expect(locators.collectionTabs.select('alpha')).toBeVisible();
      await expect(locators.collectionTabs.select('beta')).toHaveAttribute('aria-selected', 'true');
      await expect(locators.tabs.requestTab('beta-ping')).toBeVisible();
      await expect(locators.tabs.requestTab('alpha-ping')).toHaveCount(0);
    });

    await test.step('Choosing the other collection swaps the request tabs under it', async () => {
      await locators.collectionTabs.select('alpha').click();

      await expect(locators.collectionTabs.select('alpha')).toHaveAttribute('aria-selected', 'true');
      await expect(locators.tabs.requestTab('alpha-ping')).toBeVisible();
      await expect(locators.tabs.requestTab('beta-ping')).toHaveCount(0);
    });

    await test.step('Closing a collection tab closes its request tabs and leaves the other collection open', async () => {
      await locators.collectionTabs.close('beta').click();

      await expect(locators.collectionTabs.select('beta')).toHaveCount(0);
      await expect(locators.collectionTabs.select('alpha')).toHaveAttribute('aria-selected', 'true');
      await expect(locators.tabs.requestTab('alpha-ping')).toBeVisible();
    });
  });
});
