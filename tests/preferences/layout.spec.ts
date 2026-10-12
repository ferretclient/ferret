import { test, expect } from '../../playwright';
import { closePreferencesTab } from '../shortcuts/helpers';

// The layout is a setting on top of the design and the color theme. Classic panes are today's arrangement;
// Islands puts the sidebar, the editor and the console on separate rounded surfaces. Switching must leave
// the app fully working, and switching back must restore the classic arrangement.
const choose = async (page, layout: 'classic' | 'islands') => {
  await page.getByLabel('Open Preferences').click();
  await page.getByRole('tab', { name: 'Themes' }).click();
  await expect(page.getByTestId('layout-picker')).toBeVisible();
  await page.getByTestId(`layout-option-${layout}`).click();
  await expect(page.locator('html')).toHaveAttribute('data-layout', layout);
  await closePreferencesTab(page);
};

test.describe('Interface layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
  });

  test.afterEach(async ({ page }) => {
    await choose(page, 'classic');
  });

  test('starts with the classic panes and no islands', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('data-layout', 'classic');
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('islands-layout')).toHaveCount(0);
  });

  test('switching to Islands puts the sidebar and the editor on separate islands and keeps the app loaded', async ({ page }) => {
    await choose(page, 'islands');

    await expect(page.getByTestId('islands-layout')).toBeVisible();
    await expect(page.getByTestId('island-sidebar').getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('island-main')).toBeVisible();
    // The sidebar must not be inside the editor island, and the app still reports itself as loaded.
    await expect(page.getByTestId('island-main').getByTestId('sidebar')).toHaveCount(0);
    await expect(page.locator('[data-app-state="loaded"]')).toHaveCount(1);
  });

  test('the islands are separated by space, with rounded corners', async ({ page }) => {
    await choose(page, 'islands');

    const sidebar = await page.getByTestId('island-sidebar').boundingBox();
    const main = await page.getByTestId('island-main').boundingBox();
    expect(main.x - (sidebar.x + sidebar.width)).toBeGreaterThanOrEqual(6);

    const radius = await page.getByTestId('island-main').evaluate((element) => parseFloat(getComputedStyle(element).borderTopLeftRadius));
    expect(radius).toBeGreaterThanOrEqual(8);
  });

  test('the sidebar island can be hidden and shown again', async ({ page }) => {
    await choose(page, 'islands');

    await page.getByTestId('toggle-sidebar-button').click();
    await expect(page.getByTestId('island-sidebar')).toBeHidden();

    await page.getByTestId('toggle-sidebar-button').click();
    await expect(page.getByTestId('island-sidebar')).toBeVisible();
  });

  test('the console is its own island, present only while it is open', async ({ page }) => {
    await choose(page, 'islands');
    await expect(page.getByTestId('island-console')).toHaveCount(0);

    await page.getByTestId('toggle-devtools-button').click();
    await expect(page.getByTestId('island-console')).toBeVisible();

    await page.getByTestId('toggle-devtools-button').click();
    await expect(page.getByTestId('island-console')).toHaveCount(0);
  });

  test('switching back to classic panes removes the islands and keeps the app loaded', async ({ page }) => {
    await choose(page, 'islands');
    await expect(page.getByTestId('islands-layout')).toBeVisible();

    await choose(page, 'classic');

    await expect(page.getByTestId('islands-layout')).toHaveCount(0);
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.locator('[data-app-state="loaded"]')).toHaveCount(1);
  });
});
