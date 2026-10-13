import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import HistoryEntryModal from './index';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';

jest.mock('components/Portal', () => ({ children }) => <>{children}</>);
jest.mock('components/Modal', () => ({ children, footerLeft }) => <div>{footerLeft}{children}</div>);
jest.mock('utils/common', () => ({ ...jest.requireActual('utils/common'), uuid: () => 'task-1' }));
jest.mock('hooks/useRequestHistory', () => ({
  getHistoryEntry: jest.fn().mockResolvedValue({ request: {}, response: {} }),
  deleteHistoryEntry: jest.fn()
}));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  mountCollection: jest.fn(() => () => Promise.resolve())
}));

const PATHNAME = '/work/api/ping.fer';

const summary = {
  id: 1,
  collection_uid: 'c1',
  collection_name: 'api',
  item_pathname: PATHNAME,
  request_name: 'ping',
  method: 'GET',
  url: 'http://localhost/ping',
  status: 200,
  status_text: 'OK',
  error: null,
  duration_ms: 5,
  size_bytes: 10,
  sent_at: 1700000000000
};

const renderModal = async ({ collection, entry = summary, onClose = jest.fn() }) => {
  const actions = [];
  const store = configureStore({
    reducer: (state = { collections: { collections: collection ? [collection] : [] }, tabs: {}, app: { taskQueue: [] } }, action) => {
      actions.push(action);
      return state;
    }
  });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <HistoryEntryModal summary={entry} onClose={onClose} onDeleted={jest.fn()} />
      </ThemeProvider>
    </Provider>
  );
  await screen.findAllByText('Headers');
  return { actions, onClose };
};

const request = { uid: 'r1', type: 'http-request', pathname: PATHNAME, name: 'ping', request: { method: 'GET' } };
const openButton = () => screen.getByTestId('history-open-request');

beforeEach(() => {
  mountCollection.mockClear();
  localStorage.clear();
  localStorage.setItem('ferret.theme', JSON.stringify('light'));
  window.ipcRenderer = { send: jest.fn() };
});

afterEach(() => {
  delete window.ipcRenderer;
});

describe('HistoryEntryModal open request', () => {
  it('opens the saved request in a tab when its collection is loaded', async () => {
    const { actions, onClose } = await renderModal({ collection: { uid: 'c1', pathname: '/work/api', mountStatus: 'mounted', items: [request] } });

    await userEvent.click(openButton());

    expect(actions.find((action) => action.type === 'tabs/addTab').payload).toMatchObject({ uid: 'r1', collectionUid: 'c1', pathname: PATHNAME });
    expect(mountCollection).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('mounts a collection that has not been opened yet and queues the request to open when it has loaded', async () => {
    const { actions, onClose } = await renderModal({ collection: { uid: 'c1', pathname: '/work/api', mountStatus: 'unmounted', items: [] } });

    expect(openButton()).toBeEnabled();
    await userEvent.click(openButton());

    expect(mountCollection).toHaveBeenCalledWith(expect.objectContaining({ collectionUid: 'c1', collectionPathname: '/work/api' }));
    const queued = actions.find((action) => action.type === 'app/insertTaskIntoQueue').payload;
    expect(queued).toMatchObject({ type: 'OPEN_REQUEST', collectionUid: 'c1', itemPathname: PATHNAME, preview: false });
    expect(actions.some((action) => action.type === 'tabs/addTab')).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('only queues the request when the collection is already mounting', async () => {
    const { actions } = await renderModal({ collection: { uid: 'c1', pathname: '/work/api', mountStatus: 'mounting', items: [] } });

    await userEvent.click(openButton());

    expect(mountCollection).not.toHaveBeenCalled();
    expect(actions.some((action) => action.type === 'app/insertTaskIntoQueue')).toBe(true);
  });

  it('takes the request out of the queue when the collection cannot be mounted', async () => {
    mountCollection.mockImplementationOnce(() => () => Promise.reject());
    const { actions } = await renderModal({ collection: { uid: 'c1', pathname: '/work/api', mountStatus: 'unmounted', items: [] } });

    await userEvent.click(openButton());
    await Promise.resolve();

    const queued = actions.find((action) => action.type === 'app/insertTaskIntoQueue').payload;
    expect(actions.find((action) => action.type === 'app/removeTaskFromQueue').payload).toEqual({ taskUid: 'task-1' });
  });

  it('stays disabled, saying why, when the request is gone from a loaded collection', async () => {
    await renderModal({ collection: { uid: 'c1', pathname: '/work/api', mountStatus: 'mounted', items: [] } });

    expect(openButton()).toBeDisabled();
    expect(openButton()).toHaveAttribute('title', 'The saved request is no longer in its collection');
  });

  it('stays disabled when the collection is not open', async () => {
    await renderModal({ collection: null });
    expect(openButton()).toBeDisabled();
    expect(openButton()).toHaveAttribute('title', 'The collection is not open');
  });

  it('stays disabled for a request that was not saved to a file', async () => {
    await renderModal({ collection: { uid: 'c1', pathname: '/work/api', mountStatus: 'unmounted', items: [] }, entry: { ...summary, item_pathname: null } });

    expect(openButton()).toBeDisabled();
    expect(openButton()).toHaveAttribute('title', 'This request was not saved to a file');
  });
});
