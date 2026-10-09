import { useState, useEffect, useRef } from 'react';
import { IconChevronRight, IconChevronDown } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useSidebarAccordion } from '../SidebarAccordionContext';
import { useSectionReorder } from '../SidebarSectionOrderContext';
import ActionIcon from 'ui/ActionIcon/index';

const SidebarSection = ({
  id,
  title,
  icon: Icon,
  actions,
  children,
  className = ''
}) => {
  const { isExpanded, setSectionExpanded, getExpandedCount } = useSidebarAccordion();
  const [localExpanded, setLocalExpanded] = useState(() => isExpanded(id));
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const { dragRef, dropRef, isDragging, isOver, moveBy } = useSectionReorder(id);
  dragRef(headerRef);
  dropRef(sectionRef);

  // Sync with context
  useEffect(() => {
    const expanded = isExpanded(id);
    setLocalExpanded(expanded);
  }, [id, isExpanded]);

  const handleToggle = () => {
    const newExpanded = !localExpanded;
    setLocalExpanded(newExpanded);
    setSectionExpanded(id, newExpanded);
  };

  const expandedCount = getExpandedCount();
  // Check if this is the only expanded section
  const isOnlyExpanded = expandedCount === 1 && localExpanded;

  return (
    <StyledWrapper className={className}>
      <div
        ref={sectionRef}
        className={`sidebar-section ${localExpanded ? 'expanded' : ''} ${isOnlyExpanded ? 'single-expanded' : ''} ${expandedCount > 1 && localExpanded ? 'multi-expanded' : ''} ${isOver ? 'reorder-drop-target' : ''} ${isDragging ? 'reorder-dragging' : ''}`}
        data-testid={`sidebar-section-${id}`}
      >
        <div
          ref={headerRef}
          className="section-header"
          onClick={handleToggle}
          title="Drag to reorder"
          data-testid={`sidebar-section-header-${id}`}
        >
          <div className="section-header-left">
            <div
              className="section-icon-wrapper"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault(); handleToggle();
                } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                  e.preventDefault();
                  moveBy(e.key === 'ArrowUp' ? -1 : 1);
                }
              }}
            >
              <ActionIcon size="sm" className="section-toggle">
                {localExpanded ? (
                  <IconChevronDown size={12} stroke={1.5} />
                ) : (
                  <IconChevronRight size={12} stroke={1.5} />
                )}
              </ActionIcon>
              {Icon && <Icon size={14} stroke={1.5} className="section-icon" />}
            </div>
            <span className="section-title">{title}</span>
          </div>
          {actions && (
            <div
              className="section-actions"
              onClick={(e) => {
                e.stopPropagation();
                if (!localExpanded) {
                  setSectionExpanded(id, true);
                }
              }}
            >
              {actions}
            </div>
          )}
        </div>
        {localExpanded && (
          <div className="section-content">
            {children}
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default SidebarSection;
