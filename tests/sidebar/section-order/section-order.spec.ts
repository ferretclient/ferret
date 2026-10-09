import { test, expect } from '../../../playwright';

const SECTION_ORDER_KEY = 'ferret.sidebarSectionOrder';
const DEFAULT_ORDER = ['collections', 'api-specs', 'mock-servers', 'history'];

const sectionIds = async (page) => page.locator('[data-testid^="sidebar-section-header-"]').evaluateAll(
  (headers) => headers.map((header) => header.getAttribute('data-testid')!.replace('sidebar-section-header-', ''))
);

const savedOrder = (page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'), SECTION_ORDER_KEY);

const sectionIcon = (page, id: string) => page.getByTestId(`sidebar-section-header-${id}`).locator('.section-icon-wrapper');

test.describe('Sidebar section order', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
  });

  // The app instance is shared by the specs in a worker, so put the sections back in the default
  // order (with the keyboard, which needs no page reload) and forget the saved order.
  test.afterEach(async ({ page }) => {
    for (const [position, id] of DEFAULT_ORDER.entries()) {
      while ((await sectionIds(page)).indexOf(id) > position) {
        await sectionIcon(page, id).focus();
        await page.keyboard.press('Alt+ArrowUp');
      }
    }
    await expect.poll(() => sectionIds(page)).toEqual(DEFAULT_ORDER);
    await page.evaluate((key) => window.localStorage.removeItem(key), SECTION_ORDER_KEY);
  });

  test('sections can be dragged into a new order that is remembered', async ({ page }) => {
    await test.step('Starts in the default order', async () => {
      expect(await sectionIds(page)).toEqual(DEFAULT_ORDER);
    });

    await test.step('Dragging History onto Collections puts it first', async () => {
      await page.getByTestId('sidebar-section-header-history').dragTo(page.getByTestId('sidebar-section-header-collections'));

      await expect.poll(() => sectionIds(page)).toEqual(['history', 'collections', 'api-specs', 'mock-servers']);
    });

    await test.step('The new order is saved for the next start', async () => {
      expect(await savedOrder(page)).toEqual(['history', 'collections', 'api-specs', 'mock-servers']);
    });

    await test.step('Dragging a section down moves it below the one it is dropped on', async () => {
      await page.getByTestId('sidebar-section-header-history').dragTo(page.getByTestId('sidebar-section-header-api-specs'));

      await expect.poll(() => sectionIds(page)).toEqual(['collections', 'api-specs', 'history', 'mock-servers']);
      expect(await savedOrder(page)).toEqual(['collections', 'api-specs', 'history', 'mock-servers']);
    });
  });

  test('Alt+Arrow on a focused section icon moves it one place', async ({ page }) => {
    await sectionIcon(page, 'history').focus();
    await page.keyboard.press('Alt+ArrowUp');

    await expect.poll(() => sectionIds(page)).toEqual(['collections', 'api-specs', 'history', 'mock-servers']);
  });
});
