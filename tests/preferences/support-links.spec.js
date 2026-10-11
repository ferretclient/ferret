import { test, expect } from '../../playwright';

test('Should verify all support links with correct URL in preference > Support tab', async ({ page }) => {
  // Open Preferences
  await page.getByLabel('Open Preferences').click();

  // Go to Support tab
  await page.getByRole('tab', { name: 'Support' }).click();

  // Verify all support links with correct URL
  const locator_github = page.getByRole('link', { name: 'GitHub', exact: true });
  expect(await locator_github.getAttribute('href')).toEqual('https://github.com/ferretclient/ferret');

  const locator_reportissues = page.getByRole('link', { name: 'Report Issues', exact: true });
  expect(await locator_reportissues.getAttribute('href')).toEqual('https://github.com/ferretclient/ferret/issues');

  const locator_documentation = page.getByRole('link', { name: 'Documentation', exact: true });
  expect(await locator_documentation.getAttribute('href')).toEqual('https://github.com/ferretclient/ferret/tree/main/docs');
});
