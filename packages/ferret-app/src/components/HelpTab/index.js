import React, { useState } from 'react';
import Markdown from 'components/MarkDown';
import Button from 'ui/Button';
import { HELP_PAGES } from './pages';
import StyledWrapper from './StyledWrapper';

const HelpTab = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const page = HELP_PAGES[pageIndex];
  const previous = HELP_PAGES[pageIndex - 1];
  const next = HELP_PAGES[pageIndex + 1];

  return (
    <StyledWrapper data-testid="help-tab">
      <nav className="help-nav" aria-label="Help pages">
        <div className="help-nav-title">Help</div>
        {HELP_PAGES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`help-nav-item ${index === pageIndex ? 'active' : ''}`}
            aria-current={index === pageIndex ? 'page' : undefined}
            onClick={() => setPageIndex(index)}
            data-testid={`help-page-${item.id}`}
          >
            {item.title}
          </button>
        ))}
      </nav>

      {/* Keyed by page so each page opens scrolled to the top. */}
      <div className="help-body" key={page.id}>
        <article className="help-article" data-testid="help-article">
          <Markdown content={page.content} hideLinkPopover={true} />
        </article>
        <div className="help-pager">
          {previous ? (
            <Button variant="ghost" color="secondary" onClick={() => setPageIndex(pageIndex - 1)} data-testid="help-previous">
              ← {previous.title}
            </Button>
          ) : <span />}
          {next && (
            <Button onClick={() => setPageIndex(pageIndex + 1)} data-testid="help-next">
              {next.title} →
            </Button>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default HelpTab;
