import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .readme-body {
    flex: 1;
    overflow-y: auto;
    padding: 4rem 1.5rem 3rem;

    .tiptap {
      max-width: 46rem;
      margin: 0 auto;
      overflow: visible;
      font-size: ${(props) => props.theme.font?.size?.base};
      line-height: 1.65;
      color: ${(props) => props.theme.colors?.text?.subtext2};

      h3, h4 {
        margin-top: 2.5rem;
      }

      h2, h3, h4 {
        color: ${(props) => props.theme.primary?.text};
        border-bottom: none;
      }

      hr {
        border-top: 1px solid ${(props) => props.theme.border?.border1};
        background: none;
      }
    }
  }
`;

export default StyledWrapper;
