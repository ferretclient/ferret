jest.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: jest.fn() },
  ipcMain: { handle: jest.fn() },
  shell: { openPath: jest.fn() }
}));

const path = require('node:path');
const { getThirdPartyNoticesPath } = require('./notices');

describe('getThirdPartyNoticesPath', () => {
  it('uses the resources folder of a packaged app', () => {
    expect(getThirdPartyNoticesPath({ isPackaged: true, resourcesPath: path.join('C:', 'Ferret', 'resources'), appRoot: 'ignored' }))
      .toBe(path.join('C:', 'Ferret', 'resources', 'THIRD_PARTY_NOTICES.md'));
  });

  it('uses the repository root when running from source', () => {
    const appRoot = path.join('repo', 'packages', 'ferret-electron');

    expect(getThirdPartyNoticesPath({ isPackaged: false, resourcesPath: 'ignored', appRoot }))
      .toBe(path.join('repo', 'THIRD_PARTY_NOTICES.md'));
  });
});
