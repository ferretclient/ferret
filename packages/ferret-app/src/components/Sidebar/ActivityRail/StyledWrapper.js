import styled from 'styled-components';

export const RAIL_WIDTH = 44;

const StyledWrapper = styled.nav`
  flex: none;
  width: ${RAIL_WIDTH}px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  border-right: 1px solid ${(props) => props.theme.sidebar.collection.item.hoverBg};

  .rail-button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.md};
    background: transparent;
    color: ${(props) => props.theme.sidebar.muted};
    cursor: pointer;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      color: ${(props) => props.theme.sidebar.color};
    }

    &:focus-visible {
      outline: 2px solid var(--ferret-accent, ${(props) => props.theme.brand});
      outline-offset: 1px;
    }

    &.active {
      background: var(--ferret-accent-soft, ${(props) => props.theme.sidebar.collection.item.hoverBg});
      color: ${(props) => props.theme.sidebar.color};
    }

    &.dragging {
      opacity: 0.4;
    }

    &.drop-target {
      outline: 2px dashed var(--ferret-accent, ${(props) => props.theme.brand});
    }

    &.active.pane-open::before {
      content: '';
      position: absolute;
      left: -6px;
      top: 7px;
      bottom: 7px;
      width: 3px;
      border-radius: 2px;
      background: var(--ferret-accent, ${(props) => props.theme.brand});
    }
  }
`;

export default StyledWrapper;
