import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import HelpTab from './index';
import { HELP_PAGES } from './pages';

// The rich-text renderer is covered elsewhere; show the Markdown source so the tests can see which page is open.
jest.mock('components/MarkDown', () => ({ content }) => <pre data-testid="page-content">{content}</pre>);

const theme = {
  text: '#343434',
  font: { size: { base: '0.8125rem', md: '0.875rem' } },
  border: { radius: { md: '4px' }, border1: '#eee' },
  colors: { text: { subtext2: '#555' } },
  primary: { text: '#0a7', solid: '#0a7' },
  dropdown: { hoverBg: '#eee' },
  button2: { color: { primary: { bg: '#0a7', text: '#fff', border: '#0a7' }, secondary: { bg: '#eee', text: '#333', border: '#ccc' } } }
};

const renderHelp = () => render(<ThemeProvider theme={theme}><HelpTab /></ThemeProvider>);

describe('HelpTab', () => {
  it('opens on the welcome page and lists every page', () => {
    renderHelp();

    expect(screen.getByTestId('page-content')).toHaveTextContent('Welcome to Ferret');
    for (const page of HELP_PAGES) {
      expect(screen.getByTestId(`help-page-${page.id}`)).toHaveTextContent(page.title);
    }
    expect(screen.getByTestId('help-page-welcome')).toHaveAttribute('aria-current', 'page');
  });

  it('opens a page from the list', async () => {
    const user = userEvent.setup();
    renderHelp();

    await user.click(screen.getByTestId('help-page-first-request'));

    expect(screen.getByTestId('page-content')).toHaveTextContent('Your first request');
    expect(screen.getByTestId('help-page-first-request')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('help-page-welcome')).not.toHaveAttribute('aria-current');
  });

  it('steps through the pages with Next and Previous', async () => {
    const user = userEvent.setup();
    renderHelp();

    expect(screen.queryByTestId('help-previous')).not.toBeInTheDocument();
    expect(screen.getByTestId('help-next')).toHaveTextContent(HELP_PAGES[1].title);

    await user.click(screen.getByTestId('help-next'));
    expect(screen.getByTestId('page-content')).toHaveTextContent('Your first request');
    expect(screen.getByTestId('help-previous')).toHaveTextContent(HELP_PAGES[0].title);

    await user.click(screen.getByTestId('help-previous'));
    expect(screen.getByTestId('page-content')).toHaveTextContent('Welcome to Ferret');
  });

  it('has no Next button on the last page', async () => {
    const user = userEvent.setup();
    renderHelp();

    await user.click(screen.getByTestId(`help-page-${HELP_PAGES[HELP_PAGES.length - 1].id}`));

    expect(screen.queryByTestId('help-next')).not.toBeInTheDocument();
    expect(screen.getByTestId('help-previous')).toBeInTheDocument();
  });
});

describe('help pages', () => {
  it('have unique ids and titles', () => {
    expect(new Set(HELP_PAGES.map((page) => page.id)).size).toBe(HELP_PAGES.length);
    expect(new Set(HELP_PAGES.map((page) => page.title)).size).toBe(HELP_PAGES.length);
  });

  it.each(HELP_PAGES.map((page) => [page.id, page]))('%s has content that starts with a heading', (id, page) => {
    expect(page.content.length).toBeGreaterThan(200);
    expect(page.content.startsWith('## ')).toBe(true);
  });

  it('mention no placeholder text', () => {
    for (const page of HELP_PAGES) {
      expect(page.content).not.toMatch(/TODO|lorem ipsum|ferret\.io/i);
    }
  });
});
