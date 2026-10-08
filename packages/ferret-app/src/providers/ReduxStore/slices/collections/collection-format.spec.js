import reducer, { ferretConfigUpdateEvent, collectionLoadedFromTree } from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';

const makeState = (format) => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      format,
      items: [],
      environments: [],
      ferretConfig: format === 'yml' ? { opencollection: '1.0.0', name: 'demo' } : { version: '1', name: 'demo' }
    }
  ]
});

describe('collection format derivation from disk config', () => {
  it('ferretConfigUpdateEvent flips format to yml when opencollection appears', () => {
    const state = reducer(
      makeState('fer'),
      ferretConfigUpdateEvent({ collectionUid: COLLECTION_UID, ferretConfig: { opencollection: '1.0.0', name: 'demo' } })
    );

    expect(state.collections[0].format).toBe('yml');
  });

  it('ferretConfigUpdateEvent drops a stale yml format when the disk config is fer again', () => {
    // migrate-to-yml followed by a git revert: ferret.json is back, format must follow
    const state = reducer(
      makeState('yml'),
      ferretConfigUpdateEvent({ collectionUid: COLLECTION_UID, ferretConfig: { version: '1', name: 'demo' } })
    );

    expect(state.collections[0].format).toBe('fer');
  });

  it('collectionLoadedFromTree derives format from the tree ferretConfig', () => {
    const state = reducer(
      makeState('fer'),
      collectionLoadedFromTree({
        collectionUid: COLLECTION_UID,
        tree: { items: [], ferretConfig: { opencollection: '1.0.0', name: 'demo' } }
      })
    );

    expect(state.collections[0].format).toBe('yml');
  });
});
