const path = require('node:path');
const { app, ipcMain, shell } = require('electron');

// The notices file sits next to the application's resources once it is packaged, and at the repository root
// when running from source.
const getThirdPartyNoticesPath = ({ isPackaged, resourcesPath, appRoot }) => (isPackaged
  ? path.join(resourcesPath, 'THIRD_PARTY_NOTICES.md')
  : path.join(appRoot, '..', '..', 'THIRD_PARTY_NOTICES.md'));

const openThirdPartyNotices = async () => {
  const file = getThirdPartyNoticesPath({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    appRoot: app.getAppPath()
  });
  const error = await shell.openPath(file);
  if (error) {
    throw new Error(`Could not open the third-party notices: ${error}`);
  }
  return file;
};

const registerNoticesIpc = () => {
  ipcMain.handle('renderer:open-third-party-notices', openThirdPartyNotices);
};

module.exports = registerNoticesIpc;
module.exports.getThirdPartyNoticesPath = getThirdPartyNoticesPath;
