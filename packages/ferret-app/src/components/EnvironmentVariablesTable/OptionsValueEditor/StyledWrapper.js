import styled from 'styled-components';

const StyledWrapper = styled.div`
  min-width: 0;

  .options-select {
    flex: 1 1 auto;
    min-width: 0;
  }

  .no-options {
    flex: 1 1 auto;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .edit-options {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.25rem;
    white-space: nowrap;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.textLink};
  }
`;

export default StyledWrapper;
