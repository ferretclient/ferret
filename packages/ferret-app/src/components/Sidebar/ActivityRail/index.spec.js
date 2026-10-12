import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'providers/Theme';
import ActivityRail from './index';

const renderRail = (props = {}) => {
  const onSelect = jest.fn();
  render(
    <ThemeProvider>
      <ActivityRail viewIds={['collections', 'api-specs', 'history']} activeId="collections" paneOpen onSelect={onSelect} {...props} />
    </ThemeProvider>
  );
  return onSelect;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('ferret.theme', JSON.stringify('light'));
});

describe('ActivityRail', () => {
  it('shows one labelled button per view it is given', () => {
    renderRail();

    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Collections' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'API Specs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mock Servers' })).not.toBeInTheDocument();
  });

  it('marks the active view as pressed while the pane is open', () => {
    renderRail();

    expect(screen.getByTestId('rail-view-collections')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('rail-view-history')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows no view as pressed while the pane is closed', () => {
    renderRail({ paneOpen: false });

    expect(screen.getByTestId('rail-view-collections')).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the chosen view with the mouse and the keyboard', async () => {
    const user = userEvent.setup();
    const onSelect = renderRail();

    await user.click(screen.getByTestId('rail-view-history'));
    expect(onSelect).toHaveBeenLastCalledWith('history');

    screen.getByTestId('rail-view-api-specs').focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('api-specs');
  });
});
