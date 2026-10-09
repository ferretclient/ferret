import { SidebarAccordionProvider } from './SidebarAccordionContext';
import SidebarContent from './SidebarContent';
import StyledWrapper from './StyledWrapper';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateLeftSidebarWidth, updateIsDragging, toggleSidebarSearch } from 'providers/ReduxStore/slices/app';
import { getLocalStorageValue, setLocalStorageValue, SIDEBAR_WIDTH_KEY, SIDEBAR_SECTION_ORDER_KEY } from 'utils/common/localStorage';
import { applySectionOrder, moveSectionTo, moveSectionBy, parseSectionOrder } from 'utils/sidebar/section-order';
import CollectionsSection from './Sections/CollectionsSection/index';
import ApiSpecsSection from './Sections/ApiSpecsSection/index';
import MockServersSection from './Sections/MockServersSection/index';
import HistorySection from './Sections/HistorySection/index';
import useKeybinding from 'hooks/useKeybinding';
import useClearSidebarSelectionOnEscape from 'hooks/useClearSidebarSelectionOnEscape';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';
import { isSidebarSectionVisible } from 'utils/sidebar/section-visibility';

const MIN_LEFT_SIDEBAR_WIDTH = 220;
const MAX_LEFT_SIDEBAR_WIDTH = 600;

const Sidebar = () => {
  const isMockServerEnabled = useBetaFeature(BETA_FEATURES.MOCK_SERVER);
  const [savedSectionOrder, setSavedSectionOrder] = useState(() => getLocalStorageValue(SIDEBAR_SECTION_ORDER_KEY, [], parseSectionOrder));
  const defaultSections = useMemo(() => {
    const sections = [
      {
        id: 'collections',
        component: CollectionsSection
      },
      {
        id: 'api-specs',
        component: ApiSpecsSection
      }
    ];

    if (isMockServerEnabled) {
      sections.push({
        id: 'mock-servers',
        component: MockServersSection
      });
    }

    sections.push({
      id: 'history',
      component: HistorySection
    });

    return sections;
  }, [isMockServerEnabled]);
  const preferences = useSelector((state) => state.app.preferences);
  const sidebarSections = useMemo(
    () => applySectionOrder(defaultSections, savedSectionOrder).filter((section) => isSidebarSectionVisible(preferences, section.id)),
    [defaultSections, savedSectionOrder, preferences]
  );
  const visibleSectionIds = useMemo(() => sidebarSections.map((section) => section.id), [sidebarSections]);

  const saveSectionOrder = useCallback((ids) => {
    setSavedSectionOrder(ids);
    setLocalStorageValue(SIDEBAR_SECTION_ORDER_KEY, JSON.stringify(ids));
  }, []);
  const handleMoveSection = useCallback((dragId, targetId) => {
    saveSectionOrder(moveSectionTo(sidebarSections.map((section) => section.id), dragId, targetId));
  }, [sidebarSections, saveSectionOrder]);
  const handleMoveSectionBy = useCallback((id, offset) => {
    saveSectionOrder(moveSectionBy(sidebarSections.map((section) => section.id), id, offset));
  }, [sidebarSections, saveSectionOrder]);
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const [asideWidth, setAsideWidth] = useState(leftSidebarWidth);
  const lastWidthRef = useRef(leftSidebarWidth);

  const dispatch = useDispatch();
  const [dragging, setDragging] = useState(false);

  // Sidebar search
  useKeybinding('sidebarSearch', (e) => {
    const target = e?.target || document.activeElement;
    if (target?.closest?.('.CodeMirror')) return; // let editor's native `Find` handle it
    dispatch(toggleSidebarSearch());
    return false;
  });

  useClearSidebarSelectionOnEscape();

  const displayWidth = dragging ? asideWidth : leftSidebarWidth;
  const currentWidth = sidebarCollapsed ? 0 : displayWidth;

  // Clamp helper keeps width in allowed range
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const handleMouseMove = (e) => {
    if (!dragging || sidebarCollapsed) return;
    e.preventDefault();
    const nextWidth = clamp(e.clientX + 2, MIN_LEFT_SIDEBAR_WIDTH, MAX_LEFT_SIDEBAR_WIDTH);
    if (Math.abs(nextWidth - lastWidthRef.current) < 3) return;
    lastWidthRef.current = nextWidth;
    setAsideWidth(nextWidth);
  };

  const handleMouseUp = (e) => {
    if (dragging) {
      e.preventDefault();
      setDragging(false);
      dispatch(
        updateLeftSidebarWidth({
          leftSidebarWidth: asideWidth
        })
      );
      setLocalStorageValue(SIDEBAR_WIDTH_KEY, asideWidth);
      dispatch(
        updateIsDragging({
          isDragging: false
        })
      );
    }
  };
  const handleDragbarMouseDown = (e) => {
    e.preventDefault();
    if (sidebarCollapsed) {
      return;
    }
    setAsideWidth(leftSidebarWidth);
    lastWidthRef.current = leftSidebarWidth;
    setDragging(true);
    dispatch(
      updateIsDragging({
        isDragging: true
      })
    );
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [dragging, asideWidth]);

  if (leftSidebarWidth === null || sidebarCollapsed === null) {
    return null;
  }

  return (
    <SidebarAccordionProvider defaultExpanded={['collections']} visibleSectionIds={visibleSectionIds}>
      <StyledWrapper className="flex relative h-full">
        <aside className="sidebar" data-testid="sidebar" style={{ width: currentWidth, transition: dragging ? 'none' : 'width 0.2s ease-in-out' }}>
          <div className="flex flex-row h-full w-full">
            <div className="flex flex-col w-full" style={{ width: displayWidth }}>
              <div className="flex flex-col flex-grow sidebar-sections-container" style={{ minHeight: 0, overflow: 'hidden' }}>
                <div className="sidebar-sections flex flex-col flex-1">
                  <SidebarContent
                    sections={sidebarSections}
                    onMoveSection={handleMoveSection}
                    onMoveSectionBy={handleMoveSectionBy}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {!sidebarCollapsed && (
          <div className="absolute sidebar-drag-handle h-full" data-testid="sidebar-drag-handle" onMouseDown={handleDragbarMouseDown}>
            <div className="drag-request-border" />
          </div>
        )}
      </StyledWrapper>
    </SidebarAccordionProvider>
  );
};

export default Sidebar;
