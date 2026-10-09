import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { closePreferencesTab } from '../../shortcuts/helpers';

const sectionHeader = (page, id: string) => page.getByTestId(`sidebar-section-header-${id}`);
const toggle = (page, id: string) => page.getByTestId(`sidebar-section-visibility-${id}`);

const openDisplaySettings = async (page) => {
  await page.getByLabel('Open Preferences').click();
  await page.getByRole('tab', { name: 'Display' }).click();
  await expect(page.getByTestId('sidebar-sections-settings')).toBeVisible();
};

test.describe('Sidebar section visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
  });

  // The app instance is shared by the specs in a worker, so turn every section back on.
  test.afterEach(async ({ page }) => {
    await openDisplaySettings(page);
    for (const id of ['api-specs', 'mock-servers', 'history']) {
      if (!(await toggle(page, id).locator('input').isChecked())) {
        await toggle(page, id).locator('label').click();
      }
    }
    await closePreferencesTab(page);
  });

  test('hides and shows a section without touching the others', async ({ page }) => {
    await test.step('Every section is shown by default', async () => {
      for (const id of ['collections', 'api-specs', 'mock-servers', 'history']) {
        await expect(sectionHeader(page, id)).toBeVisible();
      }
    });

    await test.step('Turning off Show Mock Servers removes it from the sidebar only', async () => {
      await openDisplaySettings(page);
      await expect(toggle(page, 'mock-servers').locator('input')).toBeChecked();
      await toggle(page, 'mock-servers').locator('label').click();

      await expect(sectionHeader(page, 'mock-servers')).toBeHidden();
      for (const id of ['collections', 'api-specs', 'history']) {
        await expect(sectionHeader(page, id)).toBeVisible();
      }
    });

    await test.step('Turning it back on shows it again', async () => {
      await toggle(page, 'mock-servers').locator('label').click();

      await expect(sectionHeader(page, 'mock-servers')).toBeVisible();
    });
  });

  test('the choice is saved in the preferences file', async ({ page, electronApp }) => {
    const userDataPath = await electronApp.evaluate(({ app }) => app.getPath('userData'));
    const savedHistoryVisibility = () => {
      const file = path.join(userDataPath, 'preferences.json');
      return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).preferences?.display?.sidebarSections?.history : undefined;
    };

    await openDisplaySettings(page);
    await toggle(page, 'history').locator('label').click();
    await expect(sectionHeader(page, 'history')).toBeHidden();

    await expect.poll(savedHistoryVisibility).toBe(false);
    await expect(sectionHeader(page, 'collections')).toBeVisible();
  });
});
