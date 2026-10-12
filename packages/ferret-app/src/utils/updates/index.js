// Turns the main process's update-check result into the text the dialog shows.
// `canOpenReleasePage` is true only when there is a newer release worth opening in the browser, and
// `canDownload` when the release has an installer for this computer that Ferret can fetch and verify itself.
export const describeUpdateResult = (result) => {
  switch (result?.status) {
    case 'update-available':
      return {
        message: `Version ${result.latestVersion} is available. You are running ${result.currentVersion}.`,
        note: result.prerelease ? 'This is a beta version (release candidate), not an official release.' : null,
        canOpenReleasePage: true,
        canDownload: Boolean(result.installer)
      };
    case 'up-to-date':
      return {
        message: `You are on the latest version (${result.currentVersion}).`,
        note: null,
        canOpenReleasePage: false,
        canDownload: false
      };
    case 'unavailable':
      return {
        message: 'No published releases could be read.',
        note: 'The repository may be private, or it has no releases yet.',
        canOpenReleasePage: false,
        canDownload: false
      };
    default:
      return {
        message: 'Ferret could not check for updates.',
        note: result?.message || 'The request failed.',
        canOpenReleasePage: false,
        canDownload: false
      };
  }
};

// What "install" means depends on the operating system, so the main process names the action and this says it.
const INSTALL_ACTIONS = {
  restart: {
    label: 'Install and restart',
    note: 'Ferret will close and start the installer. Your collections and settings are not changed.'
  },
  open: {
    label: 'Open installer',
    note: 'Drag Ferret into your Applications folder to replace this version. Your collections and settings are not changed.'
  },
  reveal: {
    label: 'Show file',
    note: 'The file is shown in its folder. Make it executable and run it to replace this version. Your collections and settings are not changed.'
  }
};

export const describeInstallAction = (installer) => INSTALL_ACTIONS[installer?.action] || INSTALL_ACTIONS.reveal;

export const formatDownloadSize = (bytes) => {
  if (!bytes || bytes < 0) return '';
  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 10 ? `${Math.round(megabytes)} MB` : `${megabytes.toFixed(1)} MB`;
};

// Whole percent of a download, or null while the total size is unknown.
export const downloadPercent = ({ received, total } = {}) => {
  if (!total || total <= 0) return null;
  return Math.min(100, Math.floor((received / total) * 100));
};
