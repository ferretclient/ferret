// Sidebar sections the user can hide, keyed by section id. Collections is always shown.
// Hiding only removes the section from the sidebar; the feature behind it keeps working.
export const HIDEABLE_SIDEBAR_SECTIONS = Object.freeze({
  'api-specs': 'apiSpecs',
  'mock-servers': 'mockServers',
  'history': 'history'
});

export const isSidebarSectionVisible = (preferences, sectionId) => {
  const preferenceKey = HIDEABLE_SIDEBAR_SECTIONS[sectionId];
  if (!preferenceKey) {
    return true;
  }
  return preferences?.display?.sidebarSections?.[preferenceKey] !== false;
};
