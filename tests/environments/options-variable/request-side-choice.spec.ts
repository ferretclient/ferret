import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest, sendRequest } from '../../utils/page/actions';
import { buildCommonLocators } from '../../utils/page/locators';

// The request shows a dropdown for every options variable of the environment that it mentions as
// {{name}}, right under the URL bar, so the choice sits where the variable is used.

const TESTBENCH = 'http://localhost:8081';

test.describe('Choosing an environment option on the request', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('a request using {{nimi}} offers the options once the environment is saved', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    await page.locator('[data-app-state="loaded"]').waitFor();
    await createCollection(page, 'Test1', await createTmpDir('test1'));
    await createRequest(page, 'Untitled', 'Test1', { url: `${TESTBENCH}/ping?name={{nimi}}` });

    await test.step('Create an environment with an options variable, without saving it yet', async () => {
      await locators.environment.selector().click();
      await page.locator('.tippy-box').getByRole('button', { name: 'Create' }).click();
      await page.keyboard.type('test1');
      await page.keyboard.press('Enter');
      await page.locator('input[name$=".name"]').last().fill('nimi');

      const row = page.locator('tbody tr').filter({ has: page.locator('input[value="nimi"]') }).first();
      await row.hover();
      await row.getByTestId('datatype-selector-trigger').click();
      await locators.dataTypeSelector.menuItem('options').click();
      await page.getByTestId('env-var-options-edit').click();
      const modal = page.getByTestId('env-var-options-modal');
      await modal.getByTestId('env-var-option-add').click();
      await modal.getByTestId('env-var-option-key-0').fill('Jape');
      await modal.getByTestId('env-var-option-value-0').fill('Jape1');
      await modal.getByTestId('env-var-option-add').click();
      await modal.getByTestId('env-var-option-key-1').fill('Lauri');
      await modal.getByTestId('env-var-option-value-1').fill('Lauri2');
      await modal.getByRole('button', { name: 'Save' }).click();
      await expect(modal).toBeHidden();
      // The editor copies its edits into the environment draft after a short debounce; leaving the tab
      // before that would drop them.
      await expect(page.getByTestId('env-var-options-edit')).toContainText('Edit (2)');
      await page.waitForTimeout(700);
    });

    await test.step('The request explains that the environment has to be saved first', async () => {
      await page.getByText('Untitled', { exact: true }).first().click();

      await expect(page.getByTestId('request-environment-options-unsaved')).toContainText('{{nimi}}');
      await expect(page.getByTestId('request-environment-option-nimi')).toHaveCount(0);
    });

    await test.step('After saving the environment the dropdown is right under the URL bar', async () => {
      await page.getByText('Environments', { exact: true }).first().click();
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await page.getByText('Untitled', { exact: true }).first().click();

      const picker = page.getByTestId('request-environment-options-bar').getByTestId('request-var-options-picker');
      await expect(picker).toContainText('Jape');
      await expect(page.getByTestId('request-environment-options-unsaved')).toHaveCount(0);

      await picker.click();
      await page.getByRole('option', { name: 'Lauri' }).click();
      await expect(picker).toContainText('Lauri');
    });

    await test.step('Sending uses the option chosen on the request', async () => {
      await sendRequest(page, 200);
      await page.locator('.section-header').filter({ hasText: 'History' }).click();
      await expect(page.getByTestId('history-row').first()).toContainText('name=Lauri2');
    });
  });

  test('a request that does not use the variable shows no options row', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    await page.locator('[data-app-state="loaded"]').waitFor();
    await createCollection(page, 'Test2', await createTmpDir('test2'));
    await createRequest(page, 'Plain', 'Test2', { url: `${TESTBENCH}/ping` });

    await locators.environment.selector().click();
    await page.locator('.tippy-box').getByRole('button', { name: 'Create' }).click();
    await page.keyboard.type('env2');
    await page.keyboard.press('Enter');
    await page.locator('input[name$=".name"]').last().fill('nimi');
    const row = page.locator('tbody tr').filter({ has: page.locator('input[value="nimi"]') }).first();
    await row.hover();
    await row.getByTestId('datatype-selector-trigger').click();
    await locators.dataTypeSelector.menuItem('options').click();
    await page.getByTestId('env-var-options-edit').click();
    const modal = page.getByTestId('env-var-options-modal');
    await modal.getByTestId('env-var-option-add').click();
    await modal.getByTestId('env-var-option-key-0').fill('A');
    await modal.getByTestId('env-var-option-value-0').fill('1');
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('env-var-options-edit')).toContainText('Edit (1)');
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await page.getByText('Plain', { exact: true }).first().click();

    await expect(page.getByTestId('request-environment-options-bar')).toHaveCount(0);
  });
});
