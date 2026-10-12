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

const railLabels = (page) => page.getByTestId('activity-rail').locator('button[data-testid^="rail-view-"]').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));

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
    expect(main.x - (sidebar.x + sidebar.width)).toBeGreaterThanOrEqual(3);

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

  test('Islands shows an activity rail that switches the sidebar between its views', async ({ page }) => {
    await choose(page, 'islands');
    const rail = page.getByTestId('activity-rail');
    await expect(rail).toBeVisible();
    await expect(page.getByTestId('sidebar-section-collections')).toBeVisible();
    await expect(page.getByTestId('sidebar-section-history')).toBeHidden();

    await page.getByTestId('rail-view-history').click();
    await expect(page.getByTestId('sidebar-section-history')).toBeVisible();
    await expect(page.getByTestId('sidebar-section-collections')).toBeHidden();

    // Choosing the active view again closes the pane and leaves just the rail; choosing any view reopens it.
    await page.getByTestId('rail-view-history').click();
    await expect(page.getByTestId('sidebar-section-history')).toBeHidden();
    await expect(rail).toBeVisible();

    await page.getByTestId('rail-view-collections').click();
    await expect(page.getByTestId('sidebar-section-collections')).toBeVisible();
  });

  test('the rail starts in the order Collections, History, API Specs, Mock Servers', async ({ page }) => {
    await choose(page, 'islands');

    await expect(railLabels(page)).resolves.toEqual(['Collections', 'History', 'API Specs', 'Mock Servers']);
  });

  test('the rail has no context menu', async ({ page }) => {
    await choose(page, 'islands');

    await page.getByTestId('rail-view-history').click({ button: 'right' });
    await page.getByTestId('activity-rail').click({ button: 'right', position: { x: 20, y: 200 } });
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('a view can be dragged to a new place on the rail', async ({ page }) => {
    await choose(page, 'islands');

    await page.getByTestId('rail-view-api-specs').dragTo(page.getByTestId('rail-view-collections'));
    await expect.poll(() => railLabels(page)).toEqual(['API Specs', 'Collections', 'History', 'Mock Servers']);

    await page.getByTestId('rail-view-api-specs').dragTo(page.getByTestId('rail-view-history'));
    await expect.poll(() => railLabels(page)).toEqual(['Collections', 'History', 'API Specs', 'Mock Servers']);
  });

  test('classic panes have no activity rail', async ({ page }) => {
    await expect(page.getByTestId('activity-rail')).toHaveCount(0);
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
