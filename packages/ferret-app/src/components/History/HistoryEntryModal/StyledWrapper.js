import styled from 'styled-components';

const StyledWrapper = styled.div`
  .summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .summary-url {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
  }

  .summary-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .error {
    margin-top: 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.danger};
    word-break: break-word;
  }

  .tabs {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .tab {
    padding: 0.375rem 0;
    border-bottom: 2px solid transparent;
    color: ${(props) => props.theme.colors.text.muted};

    &.active {
      border-bottom-color: ${(props) => props.theme.primary.solid};
      color: ${(props) => props.theme.text};
    }
  }

  .section-title {
    margin: 0.75rem 0 0.25rem;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .headers-table {
    width: 100%;
    font-size: ${(props) => props.theme.font.size.sm};

    td {
      padding: 0.125rem 0.5rem 0.125rem 0;
      vertical-align: top;
      word-break: break-word;
    }

    .header-name {
      width: 30%;
      font-weight: 500;
    }

    .header-value {
      font-family: monospace;
    }
  }

  .body-view {
    max-height: 20rem;
    overflow: auto;
    padding: 0.5rem;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
    font-size: ${(props) => props.theme.font.size.sm};
    white-space: pre-wrap;
    word-break: break-word;
  }

  .note,
  .empty {
    margin-top: 0.25rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
