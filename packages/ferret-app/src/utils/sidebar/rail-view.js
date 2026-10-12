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
