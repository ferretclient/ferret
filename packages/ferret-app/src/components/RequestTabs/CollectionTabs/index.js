import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import find from 'lodash/find';
import toast from 'react-hot-toast';
import { IconBox, IconCategory, IconX } from '@tabler/icons';
import { focusTab } from 'providers/ReduxStore/slices/tabs';
import { closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { getCollectionDrafts } from 'utils/collections';
import { getCollectionTabEntries, pickTabToFocus } from 'utils/collection-tabs';
import StyledWrapper from './StyledWrapper';

const countDrafts = (collection) => {
  if (!collection) return 0;
  const { requestDrafts, transientDrafts, folderDrafts, collectionDrafts } = getCollectionDrafts([collection]);
  return requestDrafts.length + transientDrafts.length + folderDrafts.length + collectionDrafts.length;
};

/**
 * The top level of the open tabs: one tab per collection (and the workspace) that has tabs open. The row below
 * shows the tabs of the collection chosen here, so which collection a request tab belongs to is always visible.
 */
const CollectionTabs = () => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const collections = useSelector((state) => state.collections.collections);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const lastUsedTabByCollection = useRef({});

  const activeTab = find(tabs, (tab) => tab.uid === activeTabUid);
  // Written while rendering so a tab chosen from anywhere (the sidebar, History, a shortcut) is remembered; the
  // row renders on every change of the active tab, and writing the same value twice is harmless.
  if (activeTab) {
    lastUsedTabByCollection.current[activeTab.collectionUid] = activeTab.uid;
  }

  const workspace = find(workspaces, (w) => w.uid === activeWorkspaceUid);
  const entries = getCollectionTabEntries({ tabs, collections, workspace });
  if (!entries.length) {
    return null;
  }

  const handleSelect = (entry) => {
    const uid = pickTabToFocus(entry.tabUids, lastUsedTabByCollection.current[entry.uid]);
    if (uid) dispatch(focusTab({ uid }));
  };

  const handleClose = (entry) => {
    const collection = find(collections, (c) => c.uid === entry.uid);
    if (countDrafts(collection) > 0) {
      handleSelect(entry);
      toast.error(`Save or discard the unsaved changes in "${entry.name}" before closing it.`);
      return;
    }
    dispatch(closeTabs({ tabUids: entry.tabUids }));
  };

  return (
    <StyledWrapper role="tablist" aria-label="Open collections" data-testid="collection-tabs">
      {entries.map((entry) => {
        const active = entry.uid === activeTab?.collectionUid;
        const Icon = entry.isWorkspace ? IconCategory : IconBox;
        const hasDrafts = countDrafts(find(collections, (c) => c.uid === entry.uid)) > 0;
        return (
          <div key={entry.uid} className={active ? 'collection-tab active' : 'collection-tab'} data-testid="collection-tab" data-collection-name={entry.name}>
            <button
              type="button"
              role="tab"
              aria-selected={active}
              className="collection-tab-select"
              title={entry.name}
              onClick={() => handleSelect(entry)}
              data-testid="collection-tab-select"
            >
              <Icon size={15} strokeWidth={1.5} aria-hidden="true" />
              <span className="collection-tab-name">{entry.name}</span>
              <span className="collection-tab-count" aria-label={`${entry.tabUids.length} open`}>{entry.tabUids.length}</span>
              {hasDrafts && <span className="collection-tab-unsaved" role="img" aria-label="Unsaved changes" data-testid="collection-tab-unsaved" />}
            </button>
            {entry.isWorkspace ? <span className="collection-tab-spacer" /> : (
              <button
                type="button"
                className="collection-tab-close"
                aria-label={`Close ${entry.name}`}
                title="Close this collection's tabs"
                onClick={() => handleClose(entry)}
                data-testid="collection-tab-close"
              >
                <IconX size={13} strokeWidth={1.5} aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
    </StyledWrapper>
  );
};

export default CollectionTabs;
