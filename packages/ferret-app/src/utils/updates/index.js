// Turns the main process's update-check result into the text the dialog shows.
// `canOpenReleasePage` is true only when there is a newer release worth opening in the browser.
export const describeUpdateResult = (result) => {
  switch (result?.status) {
    case 'update-available':
      return {
        message: `Version ${result.latestVersion} is available. You are running ${result.currentVersion}.`,
        note: result.prerelease ? 'This is a pre-release.' : null,
        canOpenReleasePage: true
      };
    case 'up-to-date':
      return {
        message: `You are on the latest version (${result.currentVersion}).`,
        note: null,
        canOpenReleasePage: false
      };
    case 'unavailable':
      return {
        message: 'No published releases could be read.',
        note: 'The repository may be private, or it has no releases yet.',
        canOpenReleasePage: false
      };
    default:
      return {
        message: 'Ferret could not check for updates.',
        note: result?.message || 'The request failed.',
        canOpenReleasePage: false
      };
  }
};
