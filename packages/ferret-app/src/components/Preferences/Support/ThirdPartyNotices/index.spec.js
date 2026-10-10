import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThirdPartyNotices from './index';
import { toastError } from 'utils/common/error';

jest.mock('utils/common/error', () => ({ toastError: jest.fn() }));

const invoke = jest.fn();

beforeEach(() => {
  invoke.mockReset();
  window.ipcRenderer = { invoke };
});

afterEach(() => {
  delete window.ipcRenderer;
});

describe('ThirdPartyNotices', () => {
  it('asks the main process to open the notices file', async () => {
    invoke.mockResolvedValue('/app/resources/THIRD_PARTY_NOTICES.md');
    render(<ThirdPartyNotices />);

    await userEvent.click(screen.getByTestId('support-third-party-notices'));

    expect(invoke).toHaveBeenCalledWith('renderer:open-third-party-notices');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('shows an error when the file cannot be opened', async () => {
    const error = new Error('Could not open the third-party notices: not found');
    invoke.mockRejectedValue(error);
    render(<ThirdPartyNotices />);

    await userEvent.click(screen.getByTestId('support-third-party-notices'));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(error, 'Could not open the third-party notices'));
  });
});
