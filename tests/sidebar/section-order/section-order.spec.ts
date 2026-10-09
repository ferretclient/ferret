import { test, expect } from '../../../playwright';

const SECTION_ORDER_KEY = 'ferret.sidebarSectionOrder';

const sectionIds = async (page) => page.locator('[data-testid^="sidebar-section-header-"]').evaluateAll(
  (headers) => headers.map((header) => header.getAttribute('data-testid')!.replace('sidebar-section-header-', ''))
);

test.describe('Sidebar section order', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
  });

  // The app instance is shared by the specs in a worker, so leave the default order behind.
  test.afterEach(async ({ page }) => {
    await page.evaluate((key) => window.localStorage.removeItem(key), SECTION_ORDER_KEY);
    await page.reload();
    await page.locator('[data-app-state="loaded"]').waitFor();
  });

  test('sections can be dragged into a new order that is remembered', async ({ page }) => {
    await test.step('Starts in the default order', async () => {
      expect(await sectionIds(page)).toEqual(['collections', 'api-specs', 'mock-servers', 'history']);
    });

    await test.step('Dragging History onto Collections puts it first', async () => {
      await page.getByTestId('sidebar-section-header-history').dragTo(page.getByTestId('sidebar-section-header-collections'));

      await expect.poll(() => sectionIds(page)).toEqual(['history', 'collections', 'api-specs', 'mock-servers']);
    });

    await test.step('The order survives a reload', async () => {
      await page.reload();
      await page.locator('[data-app-state="loaded"]').waitFor();

      expect(await sectionIds(page)).toEqual(['history', 'collections', 'api-specs', 'mock-servers']);
    });

    await test.step('Dragging a section down moves it below the one it is dropped on', async () => {
      await page.getByTestId('sidebar-section-header-history').dragTo(page.getByTestId('sidebar-section-header-api-specs'));

      await expect.poll(() => sectionIds(page)).toEqual(['collections', 'api-specs', 'history', 'mock-servers']);
    });
  });

  test('Alt+Arrow on a focused section icon moves it one place', async ({ page }) => {
    const historyIcon = page.getByTestId('sidebar-section-header-history').locator('.section-icon-wrapper');

    await historyIcon.focus();
    await page.keyboard.press('Alt+ArrowUp');

    await expect.poll(() => sectionIds(page)).toEqual(['collections', 'api-specs', 'history', 'mock-servers']);
  });

  test('ignores a damaged saved order', async ({ page }) => {
    await page.evaluate((key) => window.localStorage.setItem(key, '{"not":"a list"}'), SECTION_ORDER_KEY);
    await page.reload();
    await page.locator('[data-app-state="loaded"]').waitFor();

    expect(await sectionIds(page)).toEqual(['collections', 'api-specs', 'mock-servers', 'history']);
  });
});
