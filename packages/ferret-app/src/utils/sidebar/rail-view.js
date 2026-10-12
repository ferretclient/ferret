// The view an activity rail should show: the saved one if it is still offered, otherwise the first one.
export const resolveActiveView = (viewIds, savedId) => {
  if (viewIds.includes(savedId)) {
    return savedId;
  }
  return viewIds[0] || null;
};

export const parseSidebarView = (stored) => (typeof stored === 'string' && stored ? stored : null);

export const parsePaneOpen = (stored) => stored !== 'false';
