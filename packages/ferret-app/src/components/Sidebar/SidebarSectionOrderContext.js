import { createContext, useContext } from 'react';
import { useDrag, useDrop } from 'react-dnd';

export const SIDEBAR_SECTION_DRAG_TYPE = 'sidebar-section';

// `{ moveTo(dragId, targetId), moveBy(id, offset) }`, provided by SidebarContent. Outside a provider
// the sections simply cannot be reordered.
const SidebarSectionOrderContext = createContext(null);

export const SidebarSectionOrderProvider = SidebarSectionOrderContext.Provider;

/**
 * Reordering behaviour for one sidebar section: connect `dragRef` to the element the user grabs and
 * `dropRef` to the whole section. Dropping a section on another one gives it that section's place.
 */
export const useSectionReorder = (id) => {
  const order = useContext(SidebarSectionOrderContext);

  const [{ isDragging }, dragRef] = useDrag({
    type: SIDEBAR_SECTION_DRAG_TYPE,
    item: { id },
    canDrag: () => Boolean(order),
    collect: (monitor) => ({ isDragging: monitor.isDragging() })
  }, [id, order]);

  const [{ isOver }, dropRef] = useDrop({
    accept: SIDEBAR_SECTION_DRAG_TYPE,
    canDrop: (item) => Boolean(order) && item.id !== id,
    drop: (item) => order.moveTo(item.id, id),
    collect: (monitor) => ({ isOver: monitor.isOver() && monitor.canDrop() })
  }, [id, order]);

  return {
    dragRef,
    dropRef,
    isDragging,
    isOver,
    moveBy: (offset) => order?.moveBy(id, offset)
  };
};
