/**
 * Starts the downloaded installer the way the operating system expects, and says what happened so the
 * window can tell the user what to do next.
 *
 *  - restart: Windows. The installer is started and Ferret quits so the installer can replace it.
 *  - open:    macOS. The disk image is opened; the user drags Ferret into Applications.
 *  - reveal:  Linux. The AppImage is shown in its folder; the user makes it executable and runs it.
 */
const installUpdate = async ({ filePath, action, shell, app }) => {
  if (action === 'reveal') {
    shell.showItemInFolder(filePath);
    return { action };
  }
  const failure = await shell.openPath(filePath);
  if (failure) throw new Error(failure);
  if (action === 'restart') app.quit();
  return { action };
};

module.exports = { installUpdate };
