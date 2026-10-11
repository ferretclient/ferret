import { describeUpdateResult, describeInstallAction, formatDownloadSize, downloadPercent } from './index';

describe('describeUpdateResult', () => {
  it('offers the release page only when a newer version exists', () => {
    const update = describeUpdateResult({ status: 'update-available', currentVersion: '0.2.0', latestVersion: '0.3.0', prerelease: true });
    expect(update.message).toBe('Version 0.3.0 is available. You are running 0.2.0.');
    expect(update.note).toBe('This is a pre-release.');
    expect(update.canOpenReleasePage).toBe(true);

    expect(describeUpdateResult({ status: 'up-to-date', currentVersion: '0.2.0' }).canOpenReleasePage).toBe(false);
    expect(describeUpdateResult({ status: 'unavailable', currentVersion: '0.2.0' }).canOpenReleasePage).toBe(false);
  });

  it('shows no pre-release note for a stable release', () => {
    const update = describeUpdateResult({ status: 'update-available', currentVersion: '1.0.0', latestVersion: '1.1.0', prerelease: false });
    expect(update.note).toBeNull();
  });

  it('reports the error text and treats unknown results as a failure', () => {
    expect(describeUpdateResult({ status: 'error', message: 'getaddrinfo ENOTFOUND' })).toEqual({
      message: 'Ferret could not check for updates.',
      note: 'getaddrinfo ENOTFOUND',
      canOpenReleasePage: false,
      canDownload: false
    });
    expect(describeUpdateResult(undefined).canOpenReleasePage).toBe(false);
  });

  it('offers a download only when the release has an installer for this computer', () => {
    const withInstaller = { status: 'update-available', currentVersion: '0.2.0', latestVersion: '0.3.0', installer: { name: 'ferret.exe', action: 'restart', size: 1 } };
    expect(describeUpdateResult(withInstaller).canDownload).toBe(true);
    expect(describeUpdateResult({ ...withInstaller, installer: undefined }).canDownload).toBe(false);
    expect(describeUpdateResult({ status: 'up-to-date', currentVersion: '0.2.0' }).canDownload).toBe(false);
  });
});

describe('describeInstallAction', () => {
  it('words the install step for each platform', () => {
    expect(describeInstallAction({ action: 'restart' }).label).toBe('Install and restart');
    expect(describeInstallAction({ action: 'open' }).label).toBe('Open installer');
    expect(describeInstallAction({ action: 'reveal' }).label).toBe('Show file');
  });

  it('says that collections and settings are not changed', () => {
    ['restart', 'open', 'reveal'].forEach((action) => {
      expect(describeInstallAction({ action }).note).toContain('collections and settings are not changed');
    });
  });

  it('falls back to showing the file for an action it does not know', () => {
    expect(describeInstallAction({ action: 'something-new' }).label).toBe('Show file');
    expect(describeInstallAction(undefined).label).toBe('Show file');
  });
});

describe('formatDownloadSize', () => {
  it('shows megabytes, with one decimal only for small files', () => {
    expect(formatDownloadSize(120 * 1024 * 1024)).toBe('120 MB');
    expect(formatDownloadSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('shows nothing when the size is unknown', () => {
    expect(formatDownloadSize(0)).toBe('');
    expect(formatDownloadSize(undefined)).toBe('');
    expect(formatDownloadSize(-5)).toBe('');
  });
});

describe('downloadPercent', () => {
  it('rounds down to a whole percent and never passes 100', () => {
    expect(downloadPercent({ received: 1, total: 3 })).toBe(33);
    expect(downloadPercent({ received: 150, total: 100 })).toBe(100);
  });

  it('is null while the total is unknown', () => {
    expect(downloadPercent({ received: 10, total: 0 })).toBeNull();
    expect(downloadPercent(undefined)).toBeNull();
  });
});
