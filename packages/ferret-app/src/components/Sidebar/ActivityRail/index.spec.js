import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ThemeProvider } from 'providers/Theme';
import ActivityRail from './index';

const renderRail = (props = {}) => {
  const handlers = { onSelect: jest.fn(), onMove: jest.fn() };
  render(
    <ThemeProvider>
      <DndProvider backend={HTML5Backend}>
        <ActivityRail
          viewIds={['collections', 'history', 'api-specs']}
          activeId="collections"
          paneOpen
          {...handlers}
          {...props}
        />
      </DndProvider>
    </ThemeProvider>
  );
  return handlers;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('ferret.theme', JSON.stringify('light'));
});

describe('ActivityRail', () => {
  it('shows one labelled button per view, in the order it is given', () => {
    renderRail();

    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['Collections', 'History', 'API Specs']);
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
    const { onSelect } = renderRail();

    await user.click(screen.getByTestId('rail-view-history'));
    expect(onSelect).toHaveBeenLastCalledWith('history');

    screen.getByTestId('rail-view-api-specs').focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('api-specs');
  });

  it('moves a view with Alt+Arrow', async () => {
    const user = userEvent.setup();
    const { onMove } = renderRail();

    screen.getByTestId('rail-view-history').focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(onMove).toHaveBeenLastCalledWith('history', null, 1);

    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(onMove).toHaveBeenLastCalledWith('history', null, -1);
  });

  it('opens no menu on a right click', async () => {
    const user = userEvent.setup();
    renderRail();

    await user.pointer({ keys: '[MouseRight]', target: screen.getByTestId('rail-view-history') });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
