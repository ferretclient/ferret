import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { test, expect } from '../../playwright';
import { closePreferencesTab } from '../shortcuts/helpers';

const INSTALLER_CONTENT = Buffer.from('pretend installer bytes '.repeat(400));
const INSTALLER_NAMES = [
  'ferret_99.0.0_x64_win.exe',
  'ferret_99.0.0_arm64_win.exe',
  'ferret_99.0.0_x64_mac.dmg',
  'ferret_99.0.0_arm64_mac.dmg',
  'ferret_99.0.0_x86_64_linux.AppImage'
];

// A release that publishes installers for every platform plus the checksum file, so the test works on any
// operating system. The final step is recorded instead of run: the installer is not started and Ferret does not quit.
const stubReleaseWithInstaller = (electronApp, { checksumOf = INSTALLER_CONTENT } = {}) => {
  const base = 'https://github.com/ferretclient/ferret/releases/download/v99.0.0';
  const assets = [...INSTALLER_NAMES, 'SHA256SUMS.txt'].map((name) => ({
    name,
    size: INSTALLER_CONTENT.length,
    browser_download_url: `${base}/${name}`
  }));
  const hash = crypto.createHash('sha256').update(checksumOf).digest('hex');
  const checksums = `${INSTALLER_NAMES.map((name) => `${hash}  ${name}`).join('\n')}\n`;

  return electronApp.evaluate(({ net, shell, app }, { assets, checksums, content }) => {
    const state = globalThis as any;
    state.__updateFetchCount = 0;
    state.__installerStarted = [];
    const bytes = Buffer.from(content, 'base64');
    net.fetch = (async (url) => {
      state.__updateFetchCount += 1;
      const address = String(url);
      if (address.startsWith('https://api.github.com/')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{
            tag_name: 'v99.0.0',
            html_url: 'https://github.com/ferretclient/ferret/releases/tag/v99.0.0',
            draft: false,
            prerelease: true,
            assets
          }]
        };
      }
      if (address.endsWith('/SHA256SUMS.txt')) return { ok: true, status: 200, text: async () => checksums };
      return {
        ok: true,
        status: 200,
        headers: { get: () => String(bytes.length) },
        body: {
          getReader: () => {
            let sent = false;
            return {
              read: async () => {
                if (sent) return { done: true };
                sent = true;
                return { done: false, value: new Uint8Array(bytes) };
              },
              cancel: async () => {}
            };
          }
        }
      };
    }) as any;
    shell.openPath = (async (file) => {
      state.__installerStarted.push({ how: 'open', file }); return '';
    }) as any;
    shell.showItemInFolder = ((file) => { state.__installerStarted.push({ how: 'reveal', file }); }) as any;
    app.quit = (() => { state.__installerStarted.push({ how: 'quit' }); }) as any;
  }, { assets, checksums, content: INSTALLER_CONTENT.toString('base64') });
};

const startedInstallers = (electronApp) => electronApp.evaluate(() => (globalThis as any).__installerStarted);

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
        html_url: 'https://github.com/ferretclient/ferret/releases/tag/v99.0.0',
        draft: false,
        prerelease: true
      }]
    };
  }) as any;
});

const fetchCount = (electronApp) => electronApp.evaluate(() => (globalThis as any).__updateFetchCount);

// A feed with an official release and a newer beta, to check which one is offered.
const stubFeedWithBeta = (electronApp) => electronApp.evaluate(({ net }) => {
  net.fetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => [
      { tag_name: 'v99.0.0', html_url: 'https://github.com/ferretclient/ferret/releases/tag/v99.0.0', draft: false, prerelease: true },
      { tag_name: 'v99.1.0-rc.1', html_url: 'https://github.com/ferretclient/ferret/releases/tag/v99.1.0-rc.1', draft: false, prerelease: true }
    ]
  })) as any;
});

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

  test('offers only official versions, and betas too once Allow beta updates is ticked', async ({ page, electronApp }) => {
    await stubFeedWithBeta(electronApp);
    const confirm = page.getByTestId('check-for-updates-confirm-modal');
    const allowBeta = confirm.getByLabel('Allow beta updates');

    await page.getByTestId('support-check-for-updates').click();
    await expect(allowBeta).not.toBeChecked();
    await confirm.getByRole('button', { name: 'Yes, check' }).click();
    await expect(page.getByTestId('check-for-updates-result')).toContainText('Version 99.0.0 is available');
    await expect(page.getByTestId('check-for-updates-result')).not.toContainText('rc.1');
    await page.getByTestId('check-for-updates-result-modal').getByRole('button', { name: 'Close' }).click();

    await page.getByTestId('support-check-for-updates').click();
    await expect(allowBeta).not.toBeChecked();
    await allowBeta.check();
    await confirm.getByRole('button', { name: 'Yes, check' }).click();
    await expect(page.getByTestId('check-for-updates-result-modal')).toContainText('Version 99.1.0-rc.1 is available');
    await expect(page.getByTestId('check-for-updates-result-modal')).toContainText('beta version');
    await page.getByTestId('check-for-updates-result-modal').getByRole('button', { name: 'Close' }).click();

    // The choice is remembered, so it is ticked the next time; clear it so other tests start official-only.
    await page.getByTestId('support-check-for-updates').click();
    await expect(allowBeta).toBeChecked();
    await allowBeta.uncheck();
    await confirm.getByRole('button', { name: 'Cancel' }).click();
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

  test('downloads and verifies the installer only on request, and starts it only after a second choice', async ({ page, electronApp }) => {
    await stubReleaseWithInstaller(electronApp);
    await page.getByTestId('support-check-for-updates').click();
    await page.getByTestId('check-for-updates-confirm-modal').getByRole('button', { name: 'Yes, check' }).click();

    const result = page.getByTestId('check-for-updates-result-modal');
    await expect(page.getByTestId('check-for-updates-result')).toContainText('Version 99.0.0 is available');
    expect(await fetchCount(electronApp)).toBe(1);

    await test.step('The check alone downloads nothing', async () => {
      await expect(result.getByRole('button', { name: /^Download update/ })).toBeVisible();
      expect(await startedInstallers(electronApp)).toEqual([]);
    });

    await test.step('Choosing the download fetches the checksum and the file, then waits', async () => {
      await result.getByRole('button', { name: /^Download update/ }).click();
      await expect(page.getByTestId('check-for-updates-ready')).toContainText('checksum matches');
      expect(await fetchCount(electronApp)).toBe(3);
      expect(await startedInstallers(electronApp)).toEqual([]);
    });

    await test.step('Choosing the install step starts the verified file, and only that file', async () => {
      await page.getByTestId('check-for-updates-ready-modal').getByRole('button', { name: /Install and restart|Open installer|Show file/ }).click();
      await expect(page.getByTestId('check-for-updates-installed')).toBeVisible();

      const started = (await startedInstallers(electronApp)).filter((entry) => entry.how !== 'quit');
      expect(started).toHaveLength(1);
      expect(path.basename(path.dirname(started[0].file))).toBe('ferret-update');
      expect(INSTALLER_NAMES).toContain(path.basename(started[0].file));
      expect(fs.readFileSync(started[0].file).equals(INSTALLER_CONTENT)).toBe(true);
      fs.rmSync(path.dirname(started[0].file), { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    });

    await page.getByTestId('check-for-updates-installed-modal').getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('check-for-updates-installed-modal')).toBeHidden();
  });

  test('discards a download whose checksum does not match and never starts it', async ({ page, electronApp }) => {
    await stubReleaseWithInstaller(electronApp, { checksumOf: Buffer.from('a different file') });
    await page.getByTestId('support-check-for-updates').click();
    await page.getByTestId('check-for-updates-confirm-modal').getByRole('button', { name: 'Yes, check' }).click();
    await expect(page.getByTestId('check-for-updates-result')).toContainText('Version 99.0.0 is available');

    await page.getByTestId('check-for-updates-result-modal').getByRole('button', { name: /^Download update/ }).click();

    await expect(page.getByTestId('check-for-updates-failed')).toBeVisible();
    await expect(page.getByTestId('check-for-updates-failed-modal')).toContainText('does not match its published checksum');
    expect(await startedInstallers(electronApp)).toEqual([]);
    await expect(page.getByTestId('check-for-updates-failed-modal').getByRole('button', { name: 'Open release page' })).toBeVisible();

    await page.getByTestId('check-for-updates-failed-modal').getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('check-for-updates-failed-modal')).toBeHidden();
  });
});
