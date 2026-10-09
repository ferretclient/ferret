import styled from 'styled-components';

const StyledWrapper = styled.div`
  .options-help {
    margin-bottom: 0.75rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .options-table {
    width: 100%;
    border-collapse: collapse;

    th {
      padding: 0 0.5rem 0.375rem 0;
      text-align: left;
      font-weight: 500;
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.muted};
    }

    td {
      padding: 0 0.5rem 0.5rem 0;
    }

    .remove-cell {
      width: 1%;
      padding-right: 0;
    }
  }

  .remove-option {
    display: flex;
    align-items: center;
    padding: 0.25rem;
    color: ${(props) => props.theme.colors.text.muted};

    &:hover {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .add-option {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.textLink};
  }

  .options-error {
    margin-top: 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.danger};
  }
`;

export default StyledWrapper;
