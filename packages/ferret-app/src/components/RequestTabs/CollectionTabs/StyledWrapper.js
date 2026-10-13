import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 0;
  overflow-x: auto;
  background: ${(props) => props.theme.requestTabs.bg};
  border-bottom: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};

  &::-webkit-scrollbar {
    display: none;
  }

  scrollbar-width: none;

  .collection-tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    max-width: 220px;
    border-radius: ${(props) => props.theme.border.radius.base} ${(props) => props.theme.border.radius.base} 0 0;
    color: ${(props) => props.theme.sidebar.muted};

    &:hover {
      color: ${(props) => props.theme.requestTabs.color};
      background: ${(props) => props.theme.requestTabs.icon.hoverBg};
    }

    &.active {
      color: ${(props) => props.theme.requestTabs.color};
      background: ${(props) => props.theme.bg};
      box-shadow: inset 0 2px 0 var(--ferret-accent, ${(props) => props.theme.brand});
    }
  }

  .collection-tab-select {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 5px 4px 5px 10px;
    border: none;
    background: transparent;
    color: inherit;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--ferret-accent, ${(props) => props.theme.brand});
      outline-offset: -2px;
    }
  }

  .collection-tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .collection-tab-count {
    font-size: ${(props) => props.theme.font.size.xs};
    opacity: 0.7;
  }

  .collection-tab-unsaved {
    width: 7px;
    height: 7px;
    flex-shrink: 0;
    border-radius: 50%;
    background: ${(props) => props.theme.brand};
  }

  .collection-tab-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-right: 6px;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: transparent;
    color: inherit;
    opacity: 0.6;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      opacity: 1;
      background: ${(props) => props.theme.requestTabs.icon.hoverBg};
    }
  }

  .collection-tab-spacer {
    width: 8px;
    flex-shrink: 0;
  }
`;

export default StyledWrapper;
