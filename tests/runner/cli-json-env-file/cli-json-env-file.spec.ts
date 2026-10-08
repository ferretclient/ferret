import { test, expect } from '../../../playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import constants from '../../../packages/ferret-cli/src/constants.js';

test.describe('CLI JSON Environment File Support', () => {
  const collectionPath = path.resolve(__dirname, 'collection');
  const FER = 'node ../../../../packages/ferret-cli/bin/fer.js';

  // Helper: emulate `fer run` from a given working directory and
  // return the process exit code (0 on success). We use execSync so
  // these tests behave like invoking the CLI directly in a shell.
  const runFrom = (cwd: string, args: string): number => {
    try {
      execSync(`cd "${cwd}" && ${FER} ${args}`, { stdio: 'pipe' });
      return 0;
    } catch (error: any) {
      return error?.status ?? 1;
    }
  };

  test('CLI: Run with invalid JSON environment file should fail', async () => {
    // Create a temporary invalid JSON file
    const tempDir = '/tmp/ferret-cli-test';
    const invalidEnvPath = path.join(tempDir, 'invalid-env.json');

    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(invalidEnvPath,
      JSON.stringify({
        name: 'Invalid Env'
        // missing variables array - invalid JSON
      }));

    const status = runFrom(collectionPath, `run --env-file "${invalidEnvPath}"`);
    expect(status).toBe(constants.EXIT_STATUS.ERROR_INVALID_FILE);
    try {
      // Cleanup
      fs.unlinkSync(invalidEnvPath);
      fs.rmdirSync(tempDir);
    } catch (e) {}
  });

  test('CLI: Run with valid JSON env and interpolates variables', async () => {
    const envPath = path.join(collectionPath, 'env.json');
    const outputPath = path.join(collectionPath, 'out.json');

    // Even if exit is non-zero (network warnings), reporter should be written
    runFrom(collectionPath, `run request.fer --env-file "${envPath}" --reporter-json "${outputPath}"`);

    expect(fs.existsSync(outputPath)).toBe(true);
    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const result = report.results[0];
    expect(result.request.url).toBe('https://echo.ferret.io');
    expect(result.response.status).toEqual(200);

    try {
      fs.unlinkSync(outputPath);
    } catch (_) {}
  });
});
