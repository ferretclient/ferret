jest.mock('electron', () => ({
  app: { getVersion: () => '0.2.0', getPath: () => '/tmp', quit: jest.fn() },
  ipcMain: { handle: jest.fn() },
  net: { fetch: jest.fn() },
  shell: { openPath: jest.fn() }
}));
jest.mock('../services/update-check', () => ({ checkForUpdates: jest.fn() }));
jest.mock('../services/update-download', () => ({ downloadInstaller: jest.fn() }));
jest.mock('../services/update-install', () => ({ installUpdate: jest.fn() }));

const { ipcMain } = require('electron');
const { checkForUpdates } = require('../services/update-check');
const { downloadInstaller } = require('../services/update-download');
const { installUpdate } = require('../services/update-install');
const registerUpdatesIpc = require('./updates');

const installer = {
  name: 'ferret_0.3.0_x64_win.exe',
  action: 'restart',
  size: 2000,
  url: 'https://github.com/ferretclient/ferret/releases/download/v0.3.0/ferret_0.3.0_x64_win.exe',
  checksumsUrl: 'https://github.com/ferretclient/ferret/releases/download/v0.3.0/SHA256SUMS.txt'
};
const available = { status: 'update-available', currentVersion: '0.2.0', latestVersion: '0.3.0', url: 'https://github.com/ferretclient/ferret/releases/tag/v0.3.0', installer };
const event = () => ({ sender: { send: jest.fn() } });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('update IPC', () => {
  it('registers one handler per step', () => {
    registerUpdatesIpc();
    expect(ipcMain.handle.mock.calls.map(([channel]) => channel).sort()).toEqual([
      'renderer:cancel-update-download',
      'renderer:check-for-updates',
      'renderer:download-update',
      'renderer:install-update'
    ]);
  });

  it('tells the window which installer fits, without handing it the download addresses', async () => {
    checkForUpdates.mockResolvedValue(available);
    const result = await registerUpdatesIpc.checkForUpdatesOnRequest();

    expect(result.installer).toEqual({ name: installer.name, action: 'restart', size: 2000 });
    expect(JSON.stringify(result)).not.toContain('SHA256SUMS');
    expect(JSON.stringify(result.installer)).not.toContain('https://');
  });

  it('refuses to download before a check found an installer', async () => {
    checkForUpdates.mockResolvedValue({ status: 'up-to-date', currentVersion: '0.2.0' });
    await registerUpdatesIpc.checkForUpdatesOnRequest();
    await expect(registerUpdatesIpc.downloadUpdateOnRequest(event())).rejects.toThrow(/Check for updates/);
    expect(downloadInstaller).not.toHaveBeenCalled();
  });

  it('downloads the installer the check chose, and reports progress to the window that asked', async () => {
    checkForUpdates.mockResolvedValue(available);
    await registerUpdatesIpc.checkForUpdatesOnRequest();
    downloadInstaller.mockImplementation(async ({ onProgress }) => {
      onProgress({ received: 10, total: 100 });
      return '/tmp/ferret-update/ferret_0.3.0_x64_win.exe';
    });

    const asker = event();
    await expect(registerUpdatesIpc.downloadUpdateOnRequest(asker)).resolves.toEqual({ name: installer.name });

    expect(downloadInstaller).toHaveBeenCalledWith(expect.objectContaining({ installer }));
    expect(asker.sender.send).toHaveBeenCalledWith('main:update-download-progress', { received: 10, total: 100 });
  });

  it('refuses to install before a download has finished', async () => {
    checkForUpdates.mockResolvedValue(available);
    await registerUpdatesIpc.checkForUpdatesOnRequest();
    expect(() => registerUpdatesIpc.installUpdateOnRequest()).toThrow(/Download the update/);
    expect(installUpdate).not.toHaveBeenCalled();
  });

  it('installs the file it downloaded, the way this platform expects', async () => {
    checkForUpdates.mockResolvedValue(available);
    await registerUpdatesIpc.checkForUpdatesOnRequest();
    downloadInstaller.mockResolvedValue('/tmp/ferret-update/ferret_0.3.0_x64_win.exe');
    await registerUpdatesIpc.downloadUpdateOnRequest(event());
    installUpdate.mockResolvedValue({ action: 'restart' });

    await registerUpdatesIpc.installUpdateOnRequest();

    expect(installUpdate).toHaveBeenCalledWith(expect.objectContaining({
      filePath: '/tmp/ferret-update/ferret_0.3.0_x64_win.exe',
      action: 'restart'
    }));
  });

  it('forgets an earlier download when a new check is made', async () => {
    checkForUpdates.mockResolvedValue(available);
    await registerUpdatesIpc.checkForUpdatesOnRequest();
    downloadInstaller.mockResolvedValue('/tmp/ferret-update/x.exe');
    await registerUpdatesIpc.downloadUpdateOnRequest(event());

    await registerUpdatesIpc.checkForUpdatesOnRequest();
    expect(() => registerUpdatesIpc.installUpdateOnRequest()).toThrow(/Download the update/);
  });

  it('cancels a running download and allows the next one', async () => {
    checkForUpdates.mockResolvedValue(available);
    await registerUpdatesIpc.checkForUpdatesOnRequest();
    downloadInstaller.mockImplementation(({ signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('The download was cancelled.')));
    }));

    const running = registerUpdatesIpc.downloadUpdateOnRequest(event());
    await expect(registerUpdatesIpc.downloadUpdateOnRequest(event())).rejects.toThrow(/already running/);
    registerUpdatesIpc.cancelUpdateDownload();
    await expect(running).rejects.toThrow(/cancelled/);

    downloadInstaller.mockResolvedValue('/tmp/ferret-update/x.exe');
    await expect(registerUpdatesIpc.downloadUpdateOnRequest(event())).resolves.toEqual({ name: installer.name });
  });
});
