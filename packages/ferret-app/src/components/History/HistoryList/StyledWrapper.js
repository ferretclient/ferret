import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow-y: auto;

  .history-search {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0.25rem 0.5rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.colors.text.muted};

    input {
      flex: 1;
      min-width: 0;
      background: transparent;
      outline: none;
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.text};
    }
  }

  .history-group-label {
    padding: 0.5rem 0.75rem 0.25rem;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    text-transform: uppercase;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .history-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.25rem 0.75rem;
    text-align: left;

    &:hover {
      background: ${(props) => props.theme.background.surface0};
    }
  }

  .history-row-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .history-row-name,
  .history-row-url {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .history-row-name {
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .history-row-url {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .history-row-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.125rem;
    flex-shrink: 0;
  }

  .history-row-duration {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .history-message {
    padding: 0.75rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};

    &.error {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .history-load-more {
    margin: 0.5rem 0.75rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.textLink};
  }
`;

export default StyledWrapper;
