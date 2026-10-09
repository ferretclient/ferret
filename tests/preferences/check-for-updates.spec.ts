import { test, expect } from '../../playwright';
import { closePreferencesTab } from '../shortcuts/helpers';

// The update check is the only place Ferret contacts a server on its own behalf, so the tests stub the
// main process's fetch and count calls: nothing may be sent before the user answers "Yes, check".
const stubReleaseFeed = (electronApp) => electronApp.evaluate(({ net }) => {
  const state = globalThis as any;
  state.__updateFetchCount = 0;
  net.fetch = (async () => {
    state.__updateFetchCount += 1;
    return {
      ok: true,
      status: 200,
      json: async () => [{
        tag_name: 'v99.0.0',
        html_url: 'https://github.com/jakahann/ferret-app/releases/tag/v99.0.0',
        draft: false,
        prerelease: true
      }]
    };
  }) as any;
});

const fetchCount = (electronApp) => electronApp.evaluate(() => (globalThis as any).__updateFetchCount);

test.describe('Check for updates', () => {
  test.beforeEach(async ({ page, electronApp }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    await stubReleaseFeed(electronApp);
    await page.getByLabel('Open Preferences').click();
    await page.getByRole('tab', { name: 'Support' }).click();
  });

  test.afterEach(async ({ page }) => {
    await closePreferencesTab(page);
  });

  test('asks for permission and sends nothing when cancelled', async ({ page, electronApp }) => {
    await page.getByTestId('support-check-for-updates').click();

    const dialog = page.getByTestId('check-for-updates-confirm-modal');
    await expect(dialog).toContainText('api.github.com');
    await expect(dialog).toContainText('Nothing is downloaded or installed');
    expect(await fetchCount(electronApp)).toBe(0);

    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    expect(await fetchCount(electronApp)).toBe(0);
  });

  test('contacts the release feed once after the user confirms and reports the result', async ({ page, electronApp }) => {
    await page.getByTestId('support-check-for-updates').click();
    await page.getByTestId('check-for-updates-confirm-modal').getByRole('button', { name: 'Yes, check' }).click();

    await expect(page.getByTestId('check-for-updates-result')).toContainText('Version 99.0.0 is available');
    await expect(page.getByTestId('check-for-updates-result-modal').getByRole('button', { name: 'Open release page' })).toBeVisible();
    expect(await fetchCount(electronApp)).toBe(1);

    await page.getByTestId('check-for-updates-result-modal').getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('check-for-updates-result-modal')).toBeHidden();
  });
});
