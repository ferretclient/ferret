import { IconBox, IconFileCode, IconServer, IconHistory } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

export const RAIL_VIEWS = {
  'collections': { title: 'Collections', icon: IconBox },
  'api-specs': { title: 'API Specs', icon: IconFileCode },
  'mock-servers': { title: 'Mock Servers', icon: IconServer },
  'history': { title: 'History', icon: IconHistory }
};

/**
 * The narrow icon column of the Islands sidebar: one button per view, the active one marked.
 * Choosing the active view again is up to the owner (it closes the pane); this component only reports the click.
 */
const ActivityRail = ({ viewIds, activeId, paneOpen, onSelect }) => (
  <StyledWrapper aria-label="Sidebar views" data-testid="activity-rail">
    {viewIds.filter((id) => RAIL_VIEWS[id]).map((id) => {
      const { title, icon: Icon } = RAIL_VIEWS[id];
      const active = id === activeId;
      return (
        <button
          key={id}
          type="button"
          className={`rail-button${active ? ' active' : ''}${active && paneOpen ? ' pane-open' : ''}`}
          title={title}
          aria-label={title}
          aria-pressed={active && paneOpen}
          data-testid={`rail-view-${id}`}
          onClick={() => onSelect(id)}
        >
          <Icon size={18} stroke={1.5} aria-hidden="true" />
        </button>
      );
    })}
  </StyledWrapper>
);

export default ActivityRail;
