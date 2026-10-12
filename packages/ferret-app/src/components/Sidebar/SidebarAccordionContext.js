import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const SidebarAccordionContext = createContext();

export const useSidebarAccordion = () => {
  const context = useContext(SidebarAccordionContext);
  if (!context) {
    throw new Error('useSidebarAccordion must be used within SidebarAccordionProvider');
  }
  return context;
};

// `visibleSectionIds` keeps a hidden section that was left expanded from counting towards the layout.
// `alwaysExpanded` is for the activity rail, where the view in the pane is never collapsed by its own header.
export const SidebarAccordionProvider = ({ children, defaultExpanded = ['collections'], visibleSectionIds, alwaysExpanded = false }) => {
  const [expandedSections, setExpandedSections] = useState(new Set(defaultExpanded));
  const dropdownContainerRef = useRef(null);

  const toggleSection = useCallback((sectionId) => {
    if (alwaysExpanded) return;
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, [alwaysExpanded]);

  const setSectionExpanded = useCallback((sectionId, expanded) => {
    if (alwaysExpanded) return;
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(sectionId);
      } else {
        newSet.delete(sectionId);
      }
      return newSet;
    });
  }, [alwaysExpanded]);

  const isExpanded = useCallback((sectionId) => {
    return alwaysExpanded || expandedSections.has(sectionId);
  }, [expandedSections, alwaysExpanded]);

  const getExpandedCount = useCallback(() => {
    if (!visibleSectionIds) {
      return alwaysExpanded ? 1 : expandedSections.size;
    }
    return visibleSectionIds.filter((id) => isExpanded(id)).length;
  }, [expandedSections, visibleSectionIds, alwaysExpanded, isExpanded]);

  return (
    <SidebarAccordionContext.Provider
      value={{
        expandedSections,
        toggleSection,
        setSectionExpanded,
        isExpanded,
        getExpandedCount,
        dropdownContainerRef
      }}
    >
      <div ref={dropdownContainerRef}>
        {children}
      </div>
    </SidebarAccordionContext.Provider>
  );
};
