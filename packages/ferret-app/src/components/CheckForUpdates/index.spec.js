import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'providers/Theme';
import CheckForUpdates from './index';

// The real Modal needs the full theme; the buttons it exposes are all these tests rely on.
jest.mock('components/Portal', () => ({ children }) => <>{children}</>);
jest.mock('components/Modal', () => ({ title, children, confirmText, cancelText, hideCancel, confirmDisabled, handleConfirm, handleCancel, dataTestId }) => (
  <div data-testid={dataTestId}>
    <div>{title}</div>
    {children}
    {!hideCancel && <button onClick={handleCancel}>{cancelText || 'Cancel'}</button>}
    <button disabled={confirmDisabled} onClick={handleConfirm}>{confirmText}</button>
  </div>
));

const invoke = jest.fn();
const openExternal = jest.fn();
const unsubscribe = jest.fn();
const on = jest.fn(() => unsubscribe);

beforeEach(() => {
  localStorage.clear();
  invoke.mockReset();
  openExternal.mockReset();
  unsubscribe.mockReset();
  on.mockClear();
  window.ipcRenderer = { invoke, openExternal, on, send: jest.fn() };
});

afterEach(() => {
  delete window.ipcRenderer;
});

const openConfirmDialog = async (user) => {
  render(<ThemeProvider><CheckForUpdates /></ThemeProvider>);
  await user.click(screen.getByTestId('support-check-for-updates'));
};

describe('CheckForUpdates', () => {
  it('asks for permission first and contacts nothing until the user confirms', async () => {
    const user = userEvent.setup();
    await openConfirmDialog(user);

    expect(screen.getByTestId('check-for-updates-confirm-modal')).toHaveTextContent('api.github.com');
    expect(screen.getByTestId('check-for-updates-confirm-modal')).toHaveTextContent('Nothing is downloaded or installed');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('offers official versions only, until the beta option is ticked', async () => {
    const user = userEvent.setup();
    await openConfirmDialog(user);

    const allowBeta = screen.getByLabelText('Allow beta updates');
    expect(allowBeta).not.toBeChecked();
    expect(invoke).not.toHaveBeenCalled();

    await user.click(allowBeta);
    expect(allowBeta).toBeChecked();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('asks for betas too when the option is ticked, and remembers the choice', async () => {
    invoke.mockResolvedValue({ status: 'up-to-date', currentVersion: '0.2.0', latestVersion: '0.2.0' });
    const user = userEvent.setup();
    await openConfirmDialog(user);

    await user.click(screen.getByLabelText('Allow beta updates'));
    await user.click(screen.getByRole('button', { name: 'Yes, check' }));

    expect(invoke).toHaveBeenCalledWith('renderer:check-for-updates', { allowBeta: true });
    expect(JSON.parse(localStorage.getItem('ferret.allowBetaUpdates'))).toBe(true);
  });

  it('makes no request when the user cancels', async () => {
    const user = userEvent.setup();
    await openConfirmDialog(user);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(invoke).not.toHaveBeenCalled();
    expect(screen.queryByTestId('check-for-updates-confirm-modal')).not.toBeInTheDocument();
  });

  it('checks once after confirmation and offers the release page when a newer version exists', async () => {
    invoke.mockResolvedValue({
      status: 'update-available',
      currentVersion: '0.2.0',
      latestVersion: '0.3.0',
      prerelease: false,
      url: 'https://github.com/ferretclient/ferret/releases/tag/v0.3.0'
    });
    const user = userEvent.setup();
    await openConfirmDialog(user);

    await user.click(screen.getByRole('button', { name: 'Yes, check' }));

    expect(await screen.findByTestId('check-for-updates-result')).toHaveTextContent('Version 0.3.0 is available');
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('renderer:check-for-updates', { allowBeta: false });
    expect(openExternal).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Open release page' }));
    expect(openExternal).toHaveBeenCalledWith('https://github.com/ferretclient/ferret/releases/tag/v0.3.0');
  });

  it('reports being up to date without offering a download', async () => {
    invoke.mockResolvedValue({ status: 'up-to-date', currentVersion: '0.2.0', latestVersion: '0.2.0' });
    const user = userEvent.setup();
    await openConfirmDialog(user);

    await user.click(screen.getByRole('button', { name: 'Yes, check' }));

    expect(await screen.findByTestId('check-for-updates-result')).toHaveTextContent('latest version');
    expect(screen.queryByRole('button', { name: 'Open release page' })).not.toBeInTheDocument();
  });

  it('shows a failed check as a message', async () => {
    invoke.mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();
    await openConfirmDialog(user);

    await user.click(screen.getByRole('button', { name: 'Yes, check' }));

    expect(await screen.findByTestId('check-for-updates-result')).toHaveTextContent('could not check');
    expect(screen.getByText('network down')).toBeInTheDocument();
  });

  it('ignores a result that arrives after the user cancelled', async () => {
    let resolveCheck;
    invoke.mockReturnValue(new Promise((resolve) => { resolveCheck = resolve; }));
    const user = userEvent.setup();
    await openConfirmDialog(user);

    await user.click(screen.getByRole('button', { name: 'Yes, check' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    resolveCheck({ status: 'up-to-date', currentVersion: '0.2.0' });

    await waitFor(() => expect(screen.queryByTestId('check-for-updates-result-modal')).not.toBeInTheDocument());
  });
});

describe('CheckForUpdates when the release has an installer for this computer', () => {
  const available = {
    status: 'update-available',
    currentVersion: '0.2.0',
    latestVersion: '0.3.0',
    prerelease: false,
    url: 'https://github.com/ferretclient/ferret/releases/tag/v0.3.0',
    installer: { name: 'ferret_0.3.0_x64_win.exe', action: 'restart', size: 120 * 1024 * 1024 }
  };

  // Plays the main process: the check answers first, then each later call is whatever the test queues.
  const reachResult = async (user) => {
    invoke.mockResolvedValueOnce(available);
    await openConfirmDialog(user);
    await user.click(screen.getByRole('button', { name: 'Yes, check' }));
    await screen.findByTestId('check-for-updates-result');
  };

  it('offers the download with its size, and downloads nothing until it is chosen', async () => {
    const user = userEvent.setup();
    await reachResult(user);

    expect(screen.getByRole('button', { name: 'Download update (120 MB)' })).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).not.toHaveBeenCalledWith('renderer:download-update');
  });

  it('still lets the user read the release page instead', async () => {
    const user = userEvent.setup();
    await reachResult(user);

    await user.click(screen.getByTestId('check-for-updates-open-release-page'));

    expect(openExternal).toHaveBeenCalledWith(available.url);
  });

  it('downloads on request, shows progress, then installs only after a second choice', async () => {
    const user = userEvent.setup();
    await reachResult(user);
    let finishDownload;
    invoke.mockImplementation((channel) => {
      if (channel === 'renderer:download-update') return new Promise((resolve) => { finishDownload = resolve; });
      return Promise.resolve({ action: 'restart' });
    });

    await user.click(screen.getByRole('button', { name: /Download update/ }));

    expect(await screen.findByTestId('check-for-updates-downloading-modal')).toBeInTheDocument();
    expect(on).toHaveBeenCalledWith('main:update-download-progress', expect.any(Function));
    act(() => on.mock.calls[0][1]({ received: 50, total: 100 }));
    expect(screen.getByRole('button', { name: 'Downloading… 50%' })).toBeDisabled();

    finishDownload({ name: available.installer.name });
    expect(await screen.findByTestId('check-for-updates-ready')).toHaveTextContent('checksum matches');
    expect(unsubscribe).toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalledWith('renderer:install-update');

    await user.click(screen.getByRole('button', { name: 'Install and restart' }));

    expect(invoke).toHaveBeenCalledWith('renderer:install-update');
    expect(await screen.findByTestId('check-for-updates-installed')).toBeInTheDocument();
  });

  it('cancels a running download and stops listening', async () => {
    const user = userEvent.setup();
    await reachResult(user);
    invoke.mockImplementation((channel) => (channel === 'renderer:download-update' ? new Promise(() => {}) : Promise.resolve()));

    await user.click(screen.getByRole('button', { name: /Download update/ }));
    await user.click(await screen.findByRole('button', { name: 'Cancel download' }));

    expect(invoke).toHaveBeenCalledWith('renderer:cancel-update-download');
    expect(screen.queryByTestId('check-for-updates-downloading-modal')).not.toBeInTheDocument();
  });

  it('explains a failed download and offers the release page', async () => {
    const user = userEvent.setup();
    await reachResult(user);
    invoke.mockRejectedValueOnce(new Error('The downloaded file does not match its published checksum, so it was discarded.'));

    await user.click(screen.getByRole('button', { name: /Download update/ }));

    expect(await screen.findByTestId('check-for-updates-failed')).toBeInTheDocument();
    expect(screen.getByText(/does not match its published checksum/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open release page' }));
    expect(openExternal).toHaveBeenCalledWith(available.url);
  });

  it('reports an installer that could not be started', async () => {
    const user = userEvent.setup();
    await reachResult(user);
    invoke.mockResolvedValueOnce({ name: available.installer.name });
    await user.click(screen.getByRole('button', { name: /Download update/ }));
    await screen.findByTestId('check-for-updates-ready');
    invoke.mockRejectedValueOnce(new Error('Failed to open path'));

    await user.click(screen.getByRole('button', { name: 'Install and restart' }));

    expect(await screen.findByTestId('check-for-updates-failed')).toBeInTheDocument();
    expect(screen.getByText('Failed to open path')).toBeInTheDocument();
  });

  it.each([
    ['open', 'Open installer'],
    ['reveal', 'Show file']
  ])('words the install step for the %s action', async (action, label) => {
    const user = userEvent.setup();
    invoke.mockResolvedValueOnce({ ...available, installer: { ...available.installer, action } });
    await openConfirmDialog(user);
    await user.click(screen.getByRole('button', { name: 'Yes, check' }));
    await screen.findByTestId('check-for-updates-result');
    invoke.mockResolvedValueOnce({ name: available.installer.name });

    await user.click(screen.getByRole('button', { name: /Download update/ }));

    expect(await screen.findByRole('button', { name: label })).toBeInTheDocument();
  });
});
