import { getCollectionTabEntries, pickTabToFocus } from './index';

const workspace = {
  uid: 'w1',
  name: 'My workspace',
  scratchCollectionUid: 'scratch',
  collections: [{ path: '/work/api' }, { path: '/work/billing' }, { path: '/work/idle' }]
};
const collections = [
  { uid: 'c-api', name: 'api', pathname: '/work/api' },
  { uid: 'c-billing', name: 'billing', pathname: '/work/billing' },
  { uid: 'c-idle', name: 'idle', pathname: '/work/idle' },
  { uid: 'c-other', name: 'other workspace', pathname: '/elsewhere/other' },
  { uid: 'scratch', name: 'scratch', pathname: '/data/scratch' }
];
const tab = (uid, collectionUid) => ({ uid, collectionUid });

describe('getCollectionTabEntries', () => {
  it('lists the workspace first, then collections with open tabs in the order they were first opened', () => {
    const tabs = [tab('t1', 'c-billing'), tab('t2', 'scratch'), tab('t3', 'c-api'), tab('t4', 'c-billing')];

    const entries = getCollectionTabEntries({ tabs, collections, workspace });

    expect(entries.map((e) => [e.name, e.isWorkspace])).toEqual([['My workspace', true], ['billing', false], ['api', false]]);
    expect(entries.find((e) => e.uid === 'c-billing').tabUids).toEqual(['t1', 't4']);
  });

  it('leaves out collections without open tabs and collections that are not in the workspace', () => {
    const tabs = [tab('t1', 'c-api'), tab('t2', 'c-other')];

    const entries = getCollectionTabEntries({ tabs, collections, workspace });

    expect(entries.map((e) => e.uid)).toEqual(['c-api']);
  });

  it('matches workspace paths regardless of slash style', () => {
    const windowsWorkspace = { ...workspace, collections: [{ path: 'D:\\work\\api' }] };
    const windowsCollections = [{ uid: 'c-api', name: 'api', pathname: 'D:/work/api' }];

    const entries = getCollectionTabEntries({ tabs: [tab('t1', 'c-api')], collections: windowsCollections, workspace: windowsWorkspace });

    expect(entries.map((e) => e.uid)).toEqual(['c-api']);
  });

  it('shows no workspace entry while the workspace has no open tabs, and names a nameless collection', () => {
    const entries = getCollectionTabEntries({
      tabs: [tab('t1', 'c-x')],
      collections: [{ uid: 'c-x', pathname: '/work/api' }],
      workspace
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Untitled Collection');
  });

  it('copes with nothing open', () => {
    expect(getCollectionTabEntries({})).toEqual([]);
  });
});

describe('pickTabToFocus', () => {
  it('returns the tab last used in the collection while it is still open', () => {
    expect(pickTabToFocus(['a', 'b', 'c'], 'b')).toBe('b');
  });

  it('falls back to the newest tab when the last used one was closed or never recorded', () => {
    expect(pickTabToFocus(['a', 'b', 'c'], 'gone')).toBe('c');
    expect(pickTabToFocus(['a', 'b', 'c'], undefined)).toBe('c');
  });

  it('returns null when there are no tabs', () => {
    expect(pickTabToFocus([], 'a')).toBeNull();
  });
});
