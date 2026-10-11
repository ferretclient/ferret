import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

beforeEach(() => {
  invoke.mockReset();
  openExternal.mockReset();
  window.ipcRenderer = { invoke, openExternal };
});

afterEach(() => {
  delete window.ipcRenderer;
});

const openConfirmDialog = async (user) => {
  render(<CheckForUpdates />);
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
    expect(invoke).toHaveBeenCalledWith('renderer:check-for-updates');
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
