jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('@useferret/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

import { configureStore } from '@reduxjs/toolkit';
import collectionsReducer, { setRequestVars, setFolderVars, setCollectionVars } from 'providers/ReduxStore/slices/collections';

// An options variable on a request, folder or collection keeps its list of choices when it is stored.

const COLLECTION_UID = 'col-1';

const company = (overrides = {}) => ({
  uid: 'v1',
  name: 'company',
  value: 'Company2',
  enabled: true,
  dataType: 'options',
  options: [
    { key: 'Company1', value: '12345' },
    { key: 'Company2', value: '43214' }
  ],
  ...overrides
});

const emptyRoot = () => ({ request: { vars: { req: [], res: [] } } });

const createStore = () => configureStore({
  reducer: { collections: collectionsReducer },
  preloadedState: {
    collections: {
      collections: [
        {
          uid: COLLECTION_UID,
          pathname: '/coll',
          root: emptyRoot(),
          draft: null,
          ferretConfig: { version: '1', name: 'test', type: 'collection' },
          environments: [],
          items: [
            { uid: 'req-1', type: 'http-request', name: 'r', request: { vars: { req: [], res: [] } } },
            { uid: 'folder-1', type: 'folder', name: 'f', root: emptyRoot(), items: [] }
          ]
        }
      ],
      collectionSortOrder: 'default',
      activeWorkspaceUid: null
    }
  }
});

const getCollection = (store) => store.getState().collections.collections[0];

describe('storing options variables', () => {
  it('keeps the options list on a request variable', () => {
    const store = createStore();

    store.dispatch(setRequestVars({ collectionUid: COLLECTION_UID, itemUid: 'req-1', vars: [company()], type: 'request' }));

    const [stored] = getCollection(store).items[0].draft.request.vars.req;
    expect(stored).toMatchObject({ name: 'company', value: 'Company2', dataType: 'options', options: company().options });
  });

  it('keeps the options list on a folder variable', () => {
    const store = createStore();

    store.dispatch(setFolderVars({ collectionUid: COLLECTION_UID, folderUid: 'folder-1', vars: [company()], type: 'request' }));

    const [stored] = getCollection(store).items[1].draft.request.vars.req;
    expect(stored).toMatchObject({ dataType: 'options', options: company().options });
  });

  it('keeps the options list on a collection variable', () => {
    const store = createStore();

    store.dispatch(setCollectionVars({ collectionUid: COLLECTION_UID, vars: [company()], type: 'request' }));

    const [stored] = getCollection(store).draft.root.request.vars.req;
    expect(stored).toMatchObject({ dataType: 'options', options: company().options });
  });

  it('keeps an options variable whose list is still empty', () => {
    const store = createStore();

    store.dispatch(setRequestVars({
      collectionUid: COLLECTION_UID,
      itemUid: 'req-1',
      vars: [company({ value: '', options: [] })],
      type: 'request'
    }));

    expect(getCollection(store).items[0].draft.request.vars.req[0]).toMatchObject({ dataType: 'options', options: [] });
  });

  it('adds no options field to other variables', () => {
    const store = createStore();

    store.dispatch(setRequestVars({
      collectionUid: COLLECTION_UID,
      itemUid: 'req-1',
      vars: [{ uid: 'v2', name: 'host', value: 'example.com' }, { uid: 'v3', name: 'port', value: 80, dataType: 'number' }],
      type: 'request'
    }));

    const stored = getCollection(store).items[0].draft.request.vars.req;
    expect(stored[0]).not.toHaveProperty('options');
    expect(stored[1]).not.toHaveProperty('options');
  });
});
