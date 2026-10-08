import { test } from '../../../../playwright';
import { setSandboxMode, runFolder, selectEnvironment, validateRunnerResults } from '../../../utils/page';

test.describe.serial('fer.cookies PropertyList API', () => {
  test('all cookie tests pass in developer mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'ferret-testbench', 'developer');
    await selectEnvironment(page, 'Local');
    await runFolder(page, 'ferret-testbench', ['scripting', 'api', 'fer', 'cookies']);
    await validateRunnerResults(page, {
      totalRequests: 16,
      passed: 16,
      failed: 0
    });
  });

  test('all cookie tests pass in safe mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'ferret-testbench', 'safe');
    await selectEnvironment(page, 'Local');
    await runFolder(page, 'ferret-testbench', ['scripting', 'api', 'fer', 'cookies']);
    await validateRunnerResults(page, {
      totalRequests: 16,
      passed: 16,
      failed: 0
    });
  });
});
