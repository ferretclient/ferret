import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;

  .help-nav {
    flex: 0 0 15rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 1.25rem 0.75rem;
    overflow-y: auto;
    border-right: 1px solid ${(props) => props.theme.border?.border1};
  }

  .help-nav-title {
    padding: 0 0.5rem 0.75rem;
    font-size: ${(props) => props.theme.font?.size?.md};
    font-weight: 600;
    color: ${(props) => props.theme.text};
  }

  .help-nav-item {
    padding: 0.4rem 0.6rem;
    text-align: left;
    border: 0;
    border-radius: ${(props) => props.theme.border?.radius?.md};
    background: transparent;
    color: ${(props) => props.theme.colors?.text?.subtext2};
    font-size: ${(props) => props.theme.font?.size?.base};
    cursor: pointer;

    &:hover {
      background: ${(props) => props.theme.dropdown?.hoverBg};
      color: ${(props) => props.theme.text};
    }

    &.active {
      background: ${(props) => props.theme.dropdown?.hoverBg};
      color: ${(props) => props.theme.primary?.text};
      font-weight: 600;
    }
  }

  .help-body {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    padding: 2.5rem 1.5rem 3rem;
  }

  .help-article,
  .help-pager {
    max-width: 46rem;
    margin: 0 auto;
  }

  .help-article {
    .tiptap {
      overflow: visible;
      font-size: ${(props) => props.theme.font?.size?.base};
      line-height: 1.65;
      color: ${(props) => props.theme.colors?.text?.subtext2};

      h2, h3, h4 {
        color: ${(props) => props.theme.primary?.text};
        border-bottom: none;
      }

      h3, h4 {
        margin-top: 2rem;
      }

      hr {
        border-top: 1px solid ${(props) => props.theme.border?.border1};
        background: none;
      }
    }
  }

  .help-pager {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 2.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid ${(props) => props.theme.border?.border1};
  }
`;

export default StyledWrapper;
