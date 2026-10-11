const { pickInstaller, isTrustedDownloadUrl, checkForUpdates } = require('./index');

const BASE = 'https://github.com/ferretclient/ferret/releases/download/v0.3.0';
const asset = (name, size = 1000) => ({ name, size, browser_download_url: `${BASE}/${name}` });

const release = {
  assets: [
    asset('ferret_0.3.0_x64_win.exe', 2000),
    asset('ferret_0.3.0_arm64_win.exe'),
    asset('ferret_0.3.0_x64_mac.dmg'),
    asset('ferret_0.3.0_arm64_mac.dmg'),
    asset('ferret_0.3.0_x86_64_linux.AppImage'),
    asset('ferret_0.3.0_amd64_linux.deb'),
    asset('SHA256SUMS.txt', 300)
  ]
};

const pick = (platform, arch, source = release) => pickInstaller(source, { version: '0.3.0', platform, arch });

describe('pickInstaller', () => {
  it.each([
    ['win32', 'x64', 'ferret_0.3.0_x64_win.exe', 'restart'],
    ['win32', 'arm64', 'ferret_0.3.0_arm64_win.exe', 'restart'],
    ['darwin', 'x64', 'ferret_0.3.0_x64_mac.dmg', 'open'],
    ['darwin', 'arm64', 'ferret_0.3.0_arm64_mac.dmg', 'open'],
    ['linux', 'x64', 'ferret_0.3.0_x86_64_linux.AppImage', 'reveal']
  ])('offers the right file for %s on %s', (platform, arch, name, action) => {
    expect(pick(platform, arch)).toMatchObject({
      name,
      action,
      url: `${BASE}/${name}`,
      checksumsUrl: `${BASE}/SHA256SUMS.txt`
    });
  });

  it('reports the size of the installer', () => {
    expect(pick('win32', 'x64').size).toBe(2000);
  });

  it('offers nothing where no installer is built, so the user gets the release page instead', () => {
    expect(pick('linux', 'arm64')).toBeNull();
    expect(pick('freebsd', 'x64')).toBeNull();
    expect(pick('win32', 'ia32')).toBeNull();
  });

  it('never offers an installer without a checksum file to verify it', () => {
    expect(pick('win32', 'x64', { assets: release.assets.filter((a) => a.name !== 'SHA256SUMS.txt') })).toBeNull();
  });

  it('never offers a file that is not hosted on this repository releases', () => {
    const foreign = { assets: release.assets.map((a) => ({ ...a, browser_download_url: `https://example.com/${a.name}` })) };
    expect(pick('win32', 'x64', foreign)).toBeNull();
    expect(isTrustedDownloadUrl(`${BASE}/x.exe`)).toBe(true);
    expect(isTrustedDownloadUrl('https://github.com/someone-else/ferret/releases/download/v1/x.exe')).toBe(false);
    expect(isTrustedDownloadUrl(undefined)).toBe(false);
  });

  it('copes with a release that lists no assets', () => {
    expect(pick('win32', 'x64', {})).toBeNull();
  });
});

describe('checkForUpdates with an installer', () => {
  const published = {
    tag_name: 'v0.3.0',
    html_url: 'https://github.com/ferretclient/ferret/releases/tag/v0.3.0',
    draft: false,
    prerelease: false,
    assets: [asset('ferret_0.3.0_x64_win.exe', 5), asset('SHA256SUMS.txt', 1)]
  };
  const respond = () => jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [published] });

  it('names the installer for this computer when a newer release has one', async () => {
    const result = await checkForUpdates({ currentVersion: '0.2.0', fetchImpl: respond(), platform: 'win32', arch: 'x64' });
    expect(result.status).toBe('update-available');
    expect(result.installer).toMatchObject({ name: 'ferret_0.3.0_x64_win.exe', action: 'restart' });
  });

  it('leaves the installer out when this computer has none', async () => {
    const result = await checkForUpdates({ currentVersion: '0.2.0', fetchImpl: respond(), platform: 'linux', arch: 'arm64' });
    expect(result.status).toBe('update-available');
    expect(result).not.toHaveProperty('installer');
  });

  it('offers no installer when already up to date', async () => {
    const result = await checkForUpdates({ currentVersion: '0.3.0', fetchImpl: respond(), platform: 'win32', arch: 'x64' });
    expect(result.status).toBe('up-to-date');
    expect(result).not.toHaveProperty('installer');
  });
});
