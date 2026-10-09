/**
 * Sections in the order the user saved. Sections the saved list does not know about (a section that
 * was hidden when the order was saved, or a new one) follow, in their default order.
 */
export const applySectionOrder = (sections, savedIds) => {
  const ids = Array.isArray(savedIds) ? savedIds : [];
  const byId = new Map(sections.map((section) => [section.id, section]));

  const saved = [...new Set(ids)].filter((id) => byId.has(id)).map((id) => byId.get(id));
  const savedSet = new Set(saved);
  return [...saved, ...sections.filter((section) => !savedSet.has(section))];
};

/** Ids after dragging `dragId` onto `targetId`: it takes the target's position and the others shift. */
export const moveSectionTo = (ids, dragId, targetId) => {
  const from = ids.indexOf(dragId);
  const to = ids.indexOf(targetId);
  if (from === -1 || to === -1 || from === to) {
    return ids;
  }

  const next = ids.filter((id) => id !== dragId);
  next.splice(to, 0, dragId);
  return next;
};

/** Ids after moving `id` up (negative) or down (positive) by `offset` places, stopping at the ends. */
export const moveSectionBy = (ids, id, offset) => {
  const from = ids.indexOf(id);
  if (from === -1) {
    return ids;
  }
  const target = ids[Math.min(ids.length - 1, Math.max(0, from + offset))];
  return moveSectionTo(ids, id, target);
};

/** Reads a saved order, ignoring anything that is not a list of strings. */
export const parseSectionOrder = (stored) => {
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
};
