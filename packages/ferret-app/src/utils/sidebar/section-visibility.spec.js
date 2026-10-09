import { isSidebarSectionVisible } from './section-visibility';

const withSections = (sidebarSections) => ({ display: { sidebarSections } });

describe('isSidebarSectionVisible', () => {
  it('shows every section by default, including when preferences have not loaded', () => {
    for (const id of ['collections', 'api-specs', 'mock-servers', 'history']) {
      expect(isSidebarSectionVisible({}, id)).toBe(true);
      expect(isSidebarSectionVisible(undefined, id)).toBe(true);
      expect(isSidebarSectionVisible({ display: { zoomPercentage: 100 } }, id)).toBe(true);
    }
  });

  it('hides a section only when its preference is false', () => {
    const preferences = withSections({ apiSpecs: true, mockServers: false, history: true });

    expect(isSidebarSectionVisible(preferences, 'mock-servers')).toBe(false);
    expect(isSidebarSectionVisible(preferences, 'api-specs')).toBe(true);
    expect(isSidebarSectionVisible(preferences, 'history')).toBe(true);
  });

  it('never hides Collections', () => {
    expect(isSidebarSectionVisible(withSections({ collections: false }), 'collections')).toBe(true);
  });
});
