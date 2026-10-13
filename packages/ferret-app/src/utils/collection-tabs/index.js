import { normalizePath } from 'utils/common/path';

/**
 * The entries of the collection tab row: the workspace first (its own tabs, such as the overview, belong to its
 * scratch collection), then every collection of the workspace that has open tabs, in the order their first tab
 * was opened. Each entry lists its tab uids so the row can focus or close them.
 */
export const getCollectionTabEntries = ({ tabs = [], collections = [], workspace = null }) => {
  const tabUidsByCollection = new Map();
  tabs.forEach((tab) => {
    if (!tabUidsByCollection.has(tab.collectionUid)) {
      tabUidsByCollection.set(tab.collectionUid, []);
    }
    tabUidsByCollection.get(tab.collectionUid).push(tab.uid);
  });

  const entries = [];
  const scratchUid = workspace?.scratchCollectionUid;
  if (scratchUid && tabUidsByCollection.has(scratchUid)) {
    entries.push({
      uid: scratchUid,
      name: workspace.name || 'Untitled Workspace',
      isWorkspace: true,
      tabUids: tabUidsByCollection.get(scratchUid)
    });
  }

  const workspacePaths = (workspace?.collections || []).map((c) => normalizePath(c.path));
  const collectionsByUid = new Map(collections.map((c) => [c.uid, c]));
  tabUidsByCollection.forEach((tabUids, uid) => {
    const collection = collectionsByUid.get(uid);
    if (!collection || uid === scratchUid || !workspacePaths.includes(normalizePath(collection.pathname))) return;
    entries.push({
      uid,
      name: collection.name || 'Untitled Collection',
      isWorkspace: false,
      tabUids
    });
  });

  return entries;
};

/**
 * The tab to show when a collection tab is chosen: the one last used in that collection if it is still open,
 * otherwise the collection's newest tab.
 */
export const pickTabToFocus = (tabUids, lastUsedTabUid) => {
  if (lastUsedTabUid && tabUids.includes(lastUsedTabUid)) {
    return lastUsedTabUid;
  }
  return tabUids[tabUids.length - 1] || null;
};
