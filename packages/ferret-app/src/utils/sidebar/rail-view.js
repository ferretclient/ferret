import { applySectionOrder } from './section-order';

// The order the activity rail starts with; the user can rearrange it.
export const DEFAULT_RAIL_ORDER = ['collections', 'history', 'api-specs', 'mock-servers'];

// The view an activity rail should show: the saved one if it is still offered, otherwise the first one.
export const resolveActiveView = (viewIds, savedId) => {
  if (viewIds.includes(savedId)) {
    return savedId;
  }
  return viewIds[0] || null;
};

export const parseSidebarView = (stored) => (typeof stored === 'string' && stored ? stored : null);

export const parsePaneOpen = (stored) => stored !== 'false';

/** All the rail's views in the saved order, falling back to the default order for the rest. */
export const orderRailViews = (availableIds, savedOrder) => {
  const inDefaultOrder = applySectionOrder(availableIds.map((id) => ({ id })), DEFAULT_RAIL_ORDER);
  return applySectionOrder(inDefaultOrder, savedOrder).map((view) => view.id);
};

/** The views the rail shows: everything that is not hidden. The rail is never left empty. */
export const shownRailViews = (orderedIds, hiddenIds) => {
  const shown = orderedIds.filter((id) => !hiddenIds.includes(id));
  return shown.length > 0 ? shown : orderedIds;
};

/**
 * The full order after the shown views were rearranged. Hidden views keep their own slots, so they come
 * back where they were when they are shown again.
 */
export const placeShownRailViews = (orderedIds, shownIds, rearrangedShownIds) => {
  const rearranged = [...rearrangedShownIds];
  return orderedIds.map((id) => (shownIds.includes(id) ? rearranged.shift() : id));
};

/** The hidden views after showing or hiding `id`. The last shown view cannot be hidden. */
export const toggleRailViewHidden = (orderedIds, hiddenIds, id) => {
  if (hiddenIds.includes(id)) {
    return hiddenIds.filter((hiddenId) => hiddenId !== id);
  }
  return shownRailViews(orderedIds, hiddenIds).length > 1 ? [...hiddenIds, id] : hiddenIds;
};
