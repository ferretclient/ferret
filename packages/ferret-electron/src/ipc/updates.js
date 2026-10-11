const path = require('path');
const { app, ipcMain, net, shell } = require('electron');
const { checkForUpdates } = require('../services/update-check');
const { downloadInstaller } = require('../services/update-download');
const { installUpdate } = require('../services/update-install');

// Everything here runs only when the renderer invokes it after the user clicked: Ferret never schedules or
// repeats a check, a download or an install. `net.fetch` honours the system proxy settings.

// The installer picked by the last check. The window can only ask to download or install this one; it never
// supplies a URL or a file path itself.
let pendingInstaller = null;
let downloadedFile = null;
let activeDownload = null;

const describeInstaller = ({ name, action, size }) => ({ name, action, size });

const checkForUpdatesOnRequest = async () => {
  const result = await checkForUpdates({
    currentVersion: app.getVersion(),
    fetchImpl: net.fetch
  });
  pendingInstaller = result.installer || null;
  downloadedFile = null;
  return result.installer ? { ...result, installer: describeInstaller(result.installer) } : result;
};

const downloadUpdateOnRequest = async (event) => {
  if (!pendingInstaller) throw new Error('Check for updates before downloading.');
  if (activeDownload) throw new Error('A download is already running.');
  const controller = new AbortController();
  activeDownload = controller;
  downloadedFile = null;
  try {
    downloadedFile = await downloadInstaller({
      installer: pendingInstaller,
      directory: path.join(app.getPath('temp'), 'ferret-update'),
      fetchImpl: net.fetch,
      signal: controller.signal,
      onProgress: (progress) => event.sender.send('main:update-download-progress', progress)
    });
    return { name: pendingInstaller.name };
  } finally {
    activeDownload = null;
  }
};

const cancelUpdateDownload = () => {
  activeDownload?.abort();
};

const installUpdateOnRequest = () => {
  if (!downloadedFile || !pendingInstaller) throw new Error('Download the update before installing it.');
  return installUpdate({ filePath: downloadedFile, action: pendingInstaller.action, shell, app });
};

const registerUpdatesIpc = () => {
  ipcMain.handle('renderer:check-for-updates', checkForUpdatesOnRequest);
  ipcMain.handle('renderer:download-update', downloadUpdateOnRequest);
  ipcMain.handle('renderer:cancel-update-download', cancelUpdateDownload);
  ipcMain.handle('renderer:install-update', installUpdateOnRequest);
};

module.exports = registerUpdatesIpc;
module.exports.checkForUpdatesOnRequest = checkForUpdatesOnRequest;
module.exports.downloadUpdateOnRequest = downloadUpdateOnRequest;
module.exports.cancelUpdateDownload = cancelUpdateDownload;
module.exports.installUpdateOnRequest = installUpdateOnRequest;
