import { describeUpdateResult } from './index';

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
      canOpenReleasePage: false
    });
    expect(describeUpdateResult(undefined).canOpenReleasePage).toBe(false);
  });
});
