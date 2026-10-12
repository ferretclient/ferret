import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ThemeProvider } from 'providers/Theme';
import ActivityRail from './index';

const renderRail = (props = {}) => {
  const handlers = { onSelect: jest.fn(), onMove: jest.fn(), onToggleHidden: jest.fn() };
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

const viewButtons = () => screen.getAllByRole('button').filter((button) => button.dataset.testid.startsWith('rail-view-'));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('ferret.theme', JSON.stringify('light'));
});

describe('ActivityRail', () => {
  it('shows one labelled button per view, in the order it is given', () => {
    renderRail();

    expect(viewButtons().map((button) => button.getAttribute('aria-label'))).toEqual(['Collections', 'History', 'API Specs']);
    expect(screen.queryByRole('button', { name: 'Mock Servers' })).not.toBeInTheDocument();
  });

  it('leaves hidden views off the rail', () => {
    renderRail({ hiddenIds: ['history'] });

    expect(viewButtons().map((button) => button.getAttribute('aria-label'))).toEqual(['Collections', 'API Specs']);
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

  it('opens the choice of shown views from the dots button, with a tick on the shown ones', async () => {
    const user = userEvent.setup();
    const { onToggleHidden } = renderRail({ hiddenIds: ['api-specs'] });

    await user.click(screen.getByTestId('rail-choose-views'));
    const apiSpecs = await screen.findByTestId('rail-views-menu-toggle-api-specs');
    expect(screen.getByTestId('rail-views-menu-toggle-history')).toHaveTextContent('✓');
    expect(apiSpecs).not.toHaveTextContent('✓');

    await user.click(apiSpecs);
    expect(onToggleHidden).toHaveBeenCalledWith('api-specs');
  });

  it('cannot hide the last shown view', async () => {
    const user = userEvent.setup();
    renderRail({ hiddenIds: ['history', 'api-specs'] });

    await user.click(screen.getByTestId('rail-choose-views'));

    expect(await screen.findByTestId('rail-views-menu-toggle-collections')).toHaveAttribute('aria-disabled', 'true');
  });

  it('opens no menu on a right click', async () => {
    const user = userEvent.setup();
    renderRail();

    await user.pointer({ keys: '[MouseRight]', target: screen.getByTestId('rail-view-history') });
    await user.pointer({ keys: '[MouseRight]', target: screen.getByTestId('activity-rail') });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
