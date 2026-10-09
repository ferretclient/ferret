import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { openRequest, selectEnvironment, selectRequestPaneTab, sendRequest } from '../../utils/page';

// An `options` environment variable holds named choices (Company1 → 12345, Company2 → 43214). The
// environment's default option is what requests receive; a request variable of the same name
// overrides it for that request, picked from the same list.

const FORMATS = [
  { format: 'fer', collectionName: 'Options Env FER' },
  { format: 'yml', collectionName: 'Options Env YML' }
];

const expandHistory = async (page: Page) => {
  // The app instance is shared between tests in a file, so the section may already be open.
  const list = page.getByTestId('history-list');
  if (!(await list.isVisible())) {
    await page.locator('.section-header').filter({ hasText: 'History' }).click();
  }
  await expect(list).toBeVisible();
};

for (const { format, collectionName } of FORMATS) {
  test.describe(`Options environment variable (${format})`, () => {
    test(`(${format}) shows the options in the environment editor and lets you edit them`, async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);

      await locators.sidebar.collection(collectionName).click();
      await locators.environment.selector().click();
      await locators.environment.collectionTab().click();
      await locators.environment.configureButton().click();
      await expect(locators.tabs.activeRequestTab()).toContainText('Environments');

      const row = locators.environment.varRow('company');
      await expect(locators.dataTypeSelector.typeLabel(row)).toHaveAttribute('data-selected-type', 'options');
      await expect(row.getByTestId('env-var-options-default')).toContainText('Company2');
      await expect(row.getByTestId('env-var-options-edit')).toContainText('Edit (2)');

      await row.getByTestId('env-var-options-edit').click();
      const modal = page.getByTestId('env-var-options-modal');
      await expect(modal).toBeVisible();
      await expect(modal.getByTestId('env-var-option-key-0')).toHaveValue('Company1');
      await expect(modal.getByTestId('env-var-option-value-0')).toHaveValue('12345');
      await expect(modal.getByTestId('env-var-option-key-1')).toHaveValue('Company2');
      await expect(modal.getByTestId('env-var-option-value-1')).toHaveValue('43214');

      await test.step('Duplicate option names are rejected', async () => {
        await modal.getByTestId('env-var-option-add').click();
        await modal.getByTestId('env-var-option-key-2').fill('Company1');
        await modal.getByTestId('env-var-option-value-2').fill('99999');
        await modal.getByRole('button', { name: 'Save' }).click();
        await expect(modal.getByRole('alert')).toContainText('used more than once');
      });

      await test.step('A valid third option is added to the variable', async () => {
        await modal.getByTestId('env-var-option-key-2').fill('Company3');
        await modal.getByRole('button', { name: 'Save' }).click();
        await expect(modal).toBeHidden();
        await expect(row.getByTestId('env-var-options-edit')).toContainText('Edit (3)');
      });
    });

    test(`(${format}) requests use the environment default; a request variable overrides it`, async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);

      await locators.sidebar.collection(collectionName).click();
      await selectEnvironment(page, 'BC');
      await expandHistory(page);

      await test.step('The default option (Company2) sends 43214', async () => {
        await openRequest(page, collectionName, 'companies');
        await sendRequest(page, 200);
        await expect(page.getByTestId('history-row').first()).toContainText('company=43214');
      });

      await test.step('A request variable named company sends the option it holds (Company1 → 12345)', async () => {
        await openRequest(page, collectionName, 'override');
        await sendRequest(page, 200);
        await expect(page.getByTestId('history-row').first()).toContainText('company=12345');
      });

      await test.step('The Vars tab offers the options as a picker showing the chosen name', async () => {
        await selectRequestPaneTab(page, 'Vars');
        const picker = page.getByTestId('request-vars-req').getByTestId('request-var-options-picker');
        await expect(picker).toBeVisible();
        await expect(picker).toContainText('Company1');
      });
    });

    // These dropdowns sit inside scrolling tables, which clip a menu attached to the cell: the options
    // existed in the page but could not be seen or clicked.
    test(`(${format}) the default option can be picked from the dropdown in the environment editor`, async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);

      await locators.sidebar.collection(collectionName).click();
      await locators.environment.selector().click();
      await locators.environment.collectionTab().click();
      await locators.environment.configureButton().click();

      const picker = locators.environment.varRow('company').getByTestId('env-var-options-default');
      await expect(picker).toContainText('Company2');

      await picker.click();
      await page.getByRole('option').filter({ hasText: 'Company1' }).click();

      await expect(picker).toContainText('Company1');
    });

    test(`(${format}) the option of a same-named request variable can be changed in the Vars table`, async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);

      await locators.sidebar.collection(collectionName).click();
      await selectEnvironment(page, 'BC');
      await openRequest(page, collectionName, 'override');
      await selectRequestPaneTab(page, 'Vars');

      const picker = page.getByTestId('request-vars-req').getByTestId('request-var-options-picker');
      await expect(picker).toContainText('Company1');

      await picker.click();
      await page.getByRole('option', { name: 'Company2' }).click();

      await expect(picker).toContainText('Company2');
    });

    test(`(${format}) a request chooses an option from its Vars tab without typing a variable`, async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);

      await locators.sidebar.collection(collectionName).click();
      await selectEnvironment(page, 'BC');
      await expandHistory(page);
      await openRequest(page, collectionName, 'companies');
      await selectRequestPaneTab(page, 'Vars');

      const section = page.getByTestId('request-environment-option-company');
      const picker = section.getByTestId('request-var-options-picker');

      await test.step('The picker lists the environment option and shows the environment default', async () => {
        await expect(picker).toContainText('Company2');
      });

      await test.step('Choosing Company1 makes this request send its value', async () => {
        await picker.click();
        await page.getByRole('option', { name: 'Company1' }).click();
        await expect(picker).toContainText('Company1');
        await sendRequest(page, 200);
        await expect(page.getByTestId('history-row').first()).toContainText('company=12345');
      });

      await test.step('Choosing the environment default again removes the override', async () => {
        await picker.click();
        await page.getByRole('option', { name: 'Company2' }).click();
        await expect(picker).toContainText('Company2');
        await expect(page.getByTestId('request-vars-req').getByText('company', { exact: true })).toHaveCount(0);
        await sendRequest(page, 200);
        await expect(page.getByTestId('history-row').first()).toContainText('company=43214');
      });
    });
  });
}
