const { installUpdate } = require('./index');

const setup = (openPathResult = '') => ({
  shell: { openPath: jest.fn().mockResolvedValue(openPathResult), showItemInFolder: jest.fn() },
  app: { quit: jest.fn() }
});

describe('installUpdate', () => {
  it('starts the installer and quits Ferret on Windows', async () => {
    const { shell, app } = setup();
    await expect(installUpdate({ filePath: 'C:\\tmp\\ferret.exe', action: 'restart', shell, app })).resolves.toEqual({ action: 'restart' });
    expect(shell.openPath).toHaveBeenCalledWith('C:\\tmp\\ferret.exe');
    expect(app.quit).toHaveBeenCalledTimes(1);
  });

  it('opens the disk image on macOS and keeps Ferret running', async () => {
    const { shell, app } = setup();
    await expect(installUpdate({ filePath: '/tmp/ferret.dmg', action: 'open', shell, app })).resolves.toEqual({ action: 'open' });
    expect(shell.openPath).toHaveBeenCalledWith('/tmp/ferret.dmg');
    expect(app.quit).not.toHaveBeenCalled();
  });

  it('shows the AppImage in its folder on Linux without running it', async () => {
    const { shell, app } = setup();
    await expect(installUpdate({ filePath: '/tmp/ferret.AppImage', action: 'reveal', shell, app })).resolves.toEqual({ action: 'reveal' });
    expect(shell.showItemInFolder).toHaveBeenCalledWith('/tmp/ferret.AppImage');
    expect(shell.openPath).not.toHaveBeenCalled();
    expect(app.quit).not.toHaveBeenCalled();
  });

  it('does not quit when the system could not open the file', async () => {
    const { shell, app } = setup('Failed to open path');
    await expect(installUpdate({ filePath: 'C:\\tmp\\ferret.exe', action: 'restart', shell, app })).rejects.toThrow('Failed to open path');
    expect(app.quit).not.toHaveBeenCalled();
  });
});
