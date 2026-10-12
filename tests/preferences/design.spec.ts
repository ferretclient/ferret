import { test, expect } from '../../playwright';
import { closePreferencesTab } from '../shortcuts/helpers';

// The design is a setting on top of the color theme: Classic is today's look, Modern is the softer one. The
// global stylesheet for Modern is scoped to html[data-design='modern'], so Classic must be left untouched.
const bodyKerning = (page) => page.evaluate(() => getComputedStyle(document.body).fontKerning);
const savedDesign = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ferret.design') || '"classic"'));

test.describe('Interface design', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    await page.getByLabel('Open Preferences').click();
    await page.getByRole('tab', { name: 'Themes' }).click();
    await expect(page.getByTestId('design-picker')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    await page.getByTestId('design-option-classic').click();
    await closePreferencesTab(page);
  });

  test('starts on Classic, with the original look', async ({ page }) => {
    await expect(page.getByTestId('design-option-classic')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('design-option-modern')).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('html')).toHaveAttribute('data-design', 'classic');
    expect(await bodyKerning(page)).toBe('none');
  });

  test('switching to Modern restyles the whole app at once and is remembered', async ({ page }) => {
    await page.getByTestId('design-option-modern').click();

    await expect(page.getByTestId('design-option-modern')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-design', 'modern');
    expect(await bodyKerning(page)).toBe('normal');
    expect(await savedDesign(page)).toBe('modern');
  });

  test('switching back to Classic restores the original look exactly', async ({ page }) => {
    await page.getByTestId('design-option-modern').click();
    await expect(page.locator('html')).toHaveAttribute('data-design', 'modern');

    await page.getByTestId('design-option-classic').click();

    await expect(page.locator('html')).toHaveAttribute('data-design', 'classic');
    expect(await bodyKerning(page)).toBe('none');
    expect(await savedDesign(page)).toBe('classic');
  });

  test('can be chosen from the keyboard', async ({ page }) => {
    await page.getByTestId('design-option-modern').focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('html')).toHaveAttribute('data-design', 'modern');
  });
});
