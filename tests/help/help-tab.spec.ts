import { test, expect } from '../../playwright';

const openHelp = async (page) => {
  await page.locator('[data-app-state="loaded"]').waitFor();
  await page.locator('.titlebar-left button').first().click();
  await page.locator('.dropdown-item').filter({ hasText: 'Help' }).first().hover();
  await page.locator('.dropdown-item').filter({ hasText: 'Documentation' }).first().click();
  await expect(page.getByTestId('help-tab')).toBeVisible();
};

test.describe('Help tab', () => {
  test.afterEach(async ({ page }) => {
    const helpTab = page.locator('.request-tab').filter({ has: page.getByText('Help', { exact: true }) });
    if (await helpTab.isVisible().catch(() => false)) {
      await helpTab.hover();
      await helpTab.getByTestId('request-tab-close-icon').click({ force: true });
      await expect(helpTab).toBeHidden();
    }
  });

  test('opens from the Help menu and walks through the pages', async ({ page }) => {
    await openHelp(page);

    await test.step('Starts on the welcome page', async () => {
      await expect(page.getByTestId('help-article')).toContainText('Welcome to Ferret');
      await expect(page.getByTestId('help-previous')).toHaveCount(0);
    });

    await test.step('The first-request guide is one click away', async () => {
      await page.getByTestId('help-page-first-request').click();

      await expect(page.getByTestId('help-article')).toContainText('Your first request');
      await expect(page.getByTestId('help-article')).toContainText('Create a collection');
    });

    await test.step('Next and Previous move through the pages in order', async () => {
      await page.getByTestId('help-next').click();
      await expect(page.getByTestId('help-article')).toContainText('Variables and environments');

      await page.getByTestId('help-previous').click();
      await expect(page.getByTestId('help-article')).toContainText('Your first request');
    });

    await test.step('The last page has no Next button', async () => {
      await page.getByTestId('help-page-troubleshooting').click();

      await expect(page.getByTestId('help-article')).toContainText('Troubleshooting');
      await expect(page.getByTestId('help-next')).toHaveCount(0);
    });
  });
});
