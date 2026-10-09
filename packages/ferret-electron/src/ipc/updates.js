const { app, ipcMain, net } = require('electron');
const { checkForUpdates } = require('../services/update-check');

// Runs only when the renderer invokes it, which the UI does after the user confirms the dialog.
// Ferret never schedules or repeats this check. `net.fetch` honours the system proxy settings.
const checkForUpdatesOnRequest = () => checkForUpdates({
  currentVersion: app.getVersion(),
  fetchImpl: net.fetch
});

const registerUpdatesIpc = () => {
  ipcMain.handle('renderer:check-for-updates', checkForUpdatesOnRequest);
};

module.exports = registerUpdatesIpc;
module.exports.checkForUpdatesOnRequest = checkForUpdatesOnRequest;
