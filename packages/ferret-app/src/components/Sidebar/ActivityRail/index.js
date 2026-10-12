import { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { IconBox, IconFileCode, IconServer, IconHistory, IconDots } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { shownRailViews } from 'utils/sidebar/rail-view';
import StyledWrapper from './StyledWrapper';

export const RAIL_VIEWS = {
  'collections': { title: 'Collections', icon: IconBox },
  'api-specs': { title: 'API Specs', icon: IconFileCode },
  'mock-servers': { title: 'Mock Servers', icon: IconServer },
  'history': { title: 'History', icon: IconHistory }
};

const RAIL_VIEW_DRAG_TYPE = 'sidebar-rail-view';

const RailButton = ({ id, active, paneOpen, onSelect, onMove }) => {
  const { title, icon: Icon } = RAIL_VIEWS[id];
  const buttonRef = useRef(null);

  const [{ isDragging }, dragRef] = useDrag({
    type: RAIL_VIEW_DRAG_TYPE,
    item: { id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() })
  }, [id]);
  const [{ isOver }, dropRef] = useDrop({
    accept: RAIL_VIEW_DRAG_TYPE,
    canDrop: (item) => item.id !== id,
    drop: (item) => onMove(item.id, id),
    collect: (monitor) => ({ isOver: monitor.isOver() && monitor.canDrop() })
  }, [id, onMove]);
  dragRef(dropRef(buttonRef));

  const classes = ['rail-button', active && 'active', active && paneOpen && 'pane-open', isDragging && 'dragging', isOver && 'drop-target'];

  return (
    <button
      ref={buttonRef}
      type="button"
      className={classes.filter(Boolean).join(' ')}
      title={title}
      aria-label={title}
      aria-pressed={active && paneOpen}
      data-testid={`rail-view-${id}`}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          onMove(id, null, e.key === 'ArrowUp' ? -1 : 1);
        }
      }}
    >
      <Icon size={18} stroke={1.5} aria-hidden="true" />
    </button>
  );
};

/**
 * The narrow icon column of the Islands sidebar: one button per shown view, the active one marked.
 *
 * `viewIds` is every view on offer in the saved order and `hiddenIds` the ones left off the rail. A button can be
 * dragged onto another one, or moved with Alt+Arrow, to rearrange the rail: `onMove(id, targetId, offset)` moves a
 * view onto `targetId`, or by `offset` places when there is no target. The dots button at the bottom opens the
 * choice of which views are shown. There are no context menus. Choosing the active view again is up to the owner
 * (it closes the pane); this component only reports clicks.
 */
const ActivityRail = ({ viewIds, hiddenIds = [], activeId, paneOpen, onSelect, onMove, onToggleHidden }) => {
  const [choosingViews, setChoosingViews] = useState(false);
  const shownIds = shownRailViews(viewIds, hiddenIds);
  const isKnown = (id) => Boolean(RAIL_VIEWS[id]);

  const viewsMenuItems = viewIds.filter(isKnown).map((id) => {
    const shown = shownIds.includes(id);
    return {
      id: `toggle-${id}`,
      label: RAIL_VIEWS[id].title,
      disabled: shown && shownIds.length <= 1,
      rightSection: shown ? <span className="ml-auto">✓</span> : null,
      onClick: () => onToggleHidden(id)
    };
  });

  return (
    <StyledWrapper aria-label="Sidebar views" data-testid="activity-rail">
      {shownIds.filter(isKnown).map((id) => (
        <RailButton key={id} id={id} active={id === activeId} paneOpen={paneOpen} onSelect={onSelect} onMove={onMove} />
      ))}
      <MenuDropdown
        items={viewsMenuItems}
        showTickMark={false}
        placement="right-end"
        popperOptions={{ strategy: 'fixed' }}
        appendTo={() => document.body}
        opened={choosingViews}
        onChange={setChoosingViews}
        data-testid="rail-views-menu"
      >
        <button
          type="button"
          className="rail-button rail-more"
          title="Choose views"
          aria-label="Choose views"
          data-testid="rail-choose-views"
          onClick={() => setChoosingViews(!choosingViews)}
        >
          <IconDots size={18} stroke={1.5} aria-hidden="true" />
        </button>
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default ActivityRail;
