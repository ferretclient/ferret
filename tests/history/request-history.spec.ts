import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection, createRequest, openRequest, sendRequest } from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

const TESTBENCH_URL = 'http://localhost:8081';

test.describe('Request history', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('records sent requests, lets you inspect, search and delete them, and clear all', async ({ page, createTmpDir }) => {
    const collectionName = 'history-collection';

    await test.step('Create a collection with two requests and send both', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'ping', collectionName, { url: `${TESTBENCH_URL}/ping` });
      await createRequest(page, 'headers', collectionName, { url: `${TESTBENCH_URL}/headers?api_key=SUPERSECRET&page=2` });

      await openRequest(page, collectionName, 'ping');
      await sendRequest(page, 200);
      await openRequest(page, collectionName, 'headers');
      await sendRequest(page, 200);
    });

    await test.step('The History section lists both sends, newest first', async () => {
      await page.locator('.section-header').filter({ hasText: 'History' }).click();

      const rows = page.getByTestId('history-row');
      await expect(rows).toHaveCount(2);
      await expect(rows.first()).toContainText('headers');
      await expect(rows.nth(1)).toContainText('ping');
      await expect(page.locator('.history-group-label').first()).toHaveText('Today');
    });

    await test.step('Credentials in the query string are masked in the list', async () => {
      const first = page.getByTestId('history-row').first();
      await expect(first).toContainText('api_key=<redacted>');
      await expect(first).not.toContainText('SUPERSECRET');
    });

    await test.step('Opening an entry shows the request and the response', async () => {
      await page.getByTestId('history-row').first().click();
      const modal = page.getByTestId('history-entry-modal');
      await expect(modal).toBeVisible();
      await expect(modal).toContainText('200');
      await expect(modal).toContainText('/headers');

      await modal.getByTestId('history-tab-request').click();
      await expect(modal).toContainText('Credentials in headers and query strings are masked');
      await expect(modal).not.toContainText('SUPERSECRET');
    });

    await test.step('Open request jumps to the saved request', async () => {
      await page.getByTestId('history-open-request').click();
      await expect(page.getByTestId('history-entry-modal')).toBeHidden();
      await expect(buildCommonLocators(page).tabs.activeRequestTab()).toContainText('headers');
    });

    await test.step('Search narrows the list', async () => {
      await page.getByTestId('history-search').fill('ping');
      await expect(page.getByTestId('history-row')).toHaveCount(1);
      await expect(page.getByTestId('history-row').first()).toContainText('ping');

      await page.getByTestId('history-search').fill('no-such-request');
      await expect(page.getByTestId('history-empty')).toBeVisible();

      await page.getByTestId('history-search').fill('');
      await expect(page.getByTestId('history-row')).toHaveCount(2);
    });

    await test.step('Deleting one entry removes just that entry', async () => {
      await page.getByTestId('history-row').first().click();
      await page.getByTestId('history-delete-entry').click();
      await expect(page.getByTestId('history-entry-modal')).toBeHidden();
      await expect(page.getByTestId('history-row')).toHaveCount(1);
    });

    await test.step('Clearing history asks first, then removes everything', async () => {
      await page.getByTestId('history-clear-btn').click();
      const confirm = page.getByTestId('history-clear-modal');
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: 'Clear' }).click();

      await expect(page.getByTestId('history-empty')).toBeVisible();
      await expect(page.getByTestId('history-row')).toHaveCount(0);
    });
  });
});
