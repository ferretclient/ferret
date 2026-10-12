import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { IconBox, IconFileCode, IconServer, IconHistory } from '@tabler/icons';
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
 * The narrow icon column of the Islands sidebar: one button per view, the active one marked.
 *
 * `viewIds` is every view on offer in the saved order. A button can be dragged onto another one, or moved with
 * Alt+Arrow, to rearrange the rail: `onMove(id, targetId, offset)` moves a view onto `targetId`, or by `offset`
 * places when there is no target. Choosing the active view again is up to the owner (it closes the pane);
 * this component only reports clicks.
 */
const ActivityRail = ({ viewIds, activeId, paneOpen, onSelect, onMove }) => (
  <StyledWrapper aria-label="Sidebar views" data-testid="activity-rail">
    {viewIds.filter((id) => RAIL_VIEWS[id]).map((id) => (
      <RailButton key={id} id={id} active={id === activeId} paneOpen={paneOpen} onSelect={onSelect} onMove={onMove} />
    ))}
  </StyledWrapper>
);

export default ActivityRail;
