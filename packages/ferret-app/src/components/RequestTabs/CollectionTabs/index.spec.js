import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { ThemeProvider } from 'providers/Theme';
import { closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import CollectionTabs from './index';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  closeTabs: jest.fn(() => () => Promise.resolve())
}));

const workspace = {
  uid: 'w1',
  name: 'My workspace',
  scratchCollectionUid: 'scratch',
  collections: [{ path: '/work/api' }, { path: '/work/billing' }]
};

const request = (uid, extra = {}) => ({ uid, type: 'http-request', name: uid, request: { method: 'GET', url: 'http://x' }, ...extra });
const api = { uid: 'c-api', name: 'api', pathname: '/work/api', items: [request('r1'), request('r2')] };
const billing = { uid: 'c-billing', name: 'billing', pathname: '/work/billing', items: [request('r3')] };
const scratch = { uid: 'scratch', name: 'scratch', pathname: '/data/scratch', items: [] };

const renderRow = ({ collections = [api, billing, scratch], tabs, activeTabUid }) => {
  const actions = [];
  const initial = {
    tabs: { tabs, activeTabUid },
    collections: { collections },
    workspaces: { workspaces: [workspace], activeWorkspaceUid: 'w1' }
  };
  const store = configureStore({
    reducer: (state = initial, action) => {
      actions.push(action);
      if (action.type === 'tabs/focusTab') {
        return { ...state, tabs: { ...state.tabs, activeTabUid: action.payload.uid } };
      }
      return state;
    }
  });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <CollectionTabs />
      </ThemeProvider>
    </Provider>
  );
  return { actions, store };
};

const tabs = [
  { uid: 'overview', collectionUid: 'scratch', type: 'workspaceOverview' },
  { uid: 'r1', collectionUid: 'c-api', type: 'http-request' },
  { uid: 'r2', collectionUid: 'c-api', type: 'http-request' },
  { uid: 'r3', collectionUid: 'c-billing', type: 'http-request' }
];

beforeEach(() => {
  closeTabs.mockClear();
  toast.error.mockClear();
  localStorage.clear();
  localStorage.setItem('ferret.theme', JSON.stringify('light'));
  window.ipcRenderer = { send: jest.fn() };
});

afterEach(() => {
  delete window.ipcRenderer;
});

const tabFor = (name) => screen.getAllByTestId('collection-tab').find((el) => el.dataset.collectionName === name);

describe('CollectionTabs', () => {
  it('shows the workspace and each collection with open tabs, with how many tabs they have', () => {
    renderRow({ tabs, activeTabUid: 'r1' });

    expect(screen.getAllByTestId('collection-tab').map((el) => el.dataset.collectionName)).toEqual(['My workspace', 'api', 'billing']);
    expect(within(tabFor('api')).getByLabelText('2 open')).toBeInTheDocument();
  });

  it('marks the collection of the active tab as selected', () => {
    renderRow({ tabs, activeTabUid: 'r3' });

    expect(within(tabFor('billing')).getByRole('tab')).toHaveAttribute('aria-selected', 'true');
    expect(within(tabFor('api')).getByRole('tab')).toHaveAttribute('aria-selected', 'false');
  });

  it('shows nothing when no tab is open', () => {
    renderRow({ tabs: [], activeTabUid: null });

    expect(screen.queryByTestId('collection-tabs')).not.toBeInTheDocument();
  });

  it('switches to a collection by focusing its tab, and goes back to the tab last used there', async () => {
    const user = userEvent.setup();
    const { actions } = renderRow({ tabs, activeTabUid: 'r1' });

    await user.click(within(tabFor('billing')).getByRole('tab'));
    expect(actions.filter((a) => a.type === 'tabs/focusTab').pop().payload).toEqual({ uid: 'r3' });

    await user.click(within(tabFor('api')).getByRole('tab'));
    expect(actions.filter((a) => a.type === 'tabs/focusTab').pop().payload).toEqual({ uid: 'r1' });
  });

  it('closes all the tabs of a collection from its close button', async () => {
    const user = userEvent.setup();
    renderRow({ tabs, activeTabUid: 'r1' });

    await user.click(within(tabFor('api')).getByTestId('collection-tab-close'));

    expect(closeTabs).toHaveBeenCalledWith({ tabUids: ['r1', 'r2'] });
  });

  it('refuses to close a collection that has unsaved changes, and shows where they are', async () => {
    const user = userEvent.setup();
    const edited = { ...api, items: [request('r1', { draft: { request: { method: 'POST', url: 'http://x' } } }), request('r2')] };
    const { actions } = renderRow({ collections: [edited, billing, scratch], tabs, activeTabUid: 'r3' });

    expect(within(tabFor('api')).getByTestId('collection-tab-unsaved')).toBeInTheDocument();
    expect(within(tabFor('billing')).queryByTestId('collection-tab-unsaved')).not.toBeInTheDocument();

    await user.click(within(tabFor('api')).getByTestId('collection-tab-close'));

    expect(closeTabs).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('unsaved changes in "api"'));
    expect(actions.filter((a) => a.type === 'tabs/focusTab').pop().payload).toEqual({ uid: 'r2' });
  });

  it('has no close button on the workspace tab', () => {
    renderRow({ tabs, activeTabUid: 'r1' });

    expect(within(tabFor('My workspace')).queryByTestId('collection-tab-close')).not.toBeInTheDocument();
  });
});
