import React from 'react';
import Markdown from 'components/MarkDown';
import readmeContent from './README.md';
import StyledWrapper from './StyledWrapper';

const ReadmeTab = () => {
  return (
    <StyledWrapper>
      <div className="readme-body" data-testid="readme-tab">
        <Markdown content={readmeContent} hideLinkPopover={true} />
      </div>
    </StyledWrapper>
  );
};

export default ReadmeTab;
