require('dotenv').config({ path: process.env.DOTENV_PATH });
const fs = require('fs');
const path = require('path');
const electron_notarize = require('electron-notarize');

const notarize = async function (params) {
  if (process.platform !== 'darwin') {
    return;
  }

  const appId = params.packager.appInfo.id;

  let appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
  if (!fs.existsSync(appPath)) {
    console.error(`Cannot find application at: ${appPath}`);
    return;
  }

  const teamId = process.env.APPLE_TEAM_ID;
  if (!teamId) {
    console.log('APPLE_TEAM_ID is not set, skipping notarization');
    return;
  }

  console.log(`Notarizing ${appId} found at ${appPath} using Apple ID ${process.env.APPLE_ID}`);
  // A failed notarization must fail the build: shipping the app un-notarized by accident would only
  // show up as a Gatekeeper warning on users' machines.
  await electron_notarize.notarize({
    tool: 'notarytool',
    appBundleId: appId,
    appPath: appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    ascProvider: teamId,
    teamId: teamId
  });

  console.log(`Done notarizing ${appPath}`);
};

module.exports = notarize;
