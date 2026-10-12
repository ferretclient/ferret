import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'providers/Theme';
import LayoutPicker from './index';

const renderPicker = () => render(<ThemeProvider><LayoutPicker /></ThemeProvider>);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('ferret.theme', JSON.stringify('light'));
  localStorage.setItem('ferret.themeVariantLight', JSON.stringify('light'));
  document.documentElement.removeAttribute('data-layout');
});

describe('LayoutPicker', () => {
  it('offers Classic panes and Islands as one choice, with Classic selected to begin with', () => {
    renderPicker();

    expect(screen.getByRole('radiogroup', { name: 'Layout' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByTestId('layout-option-classic')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('layout-option-islands')).toHaveAttribute('aria-checked', 'false');
  });

  it('describes each layout in plain words', () => {
    renderPicker();

    expect(screen.getByTestId('layout-option-classic')).toHaveTextContent('fill the window edge to edge');
    expect(screen.getByTestId('layout-option-islands')).toHaveTextContent('separate rounded islands');
  });

  it('switches layout with the mouse, applies it to the whole app, and remembers it', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByTestId('layout-option-islands'));

    expect(screen.getByTestId('layout-option-islands')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('layout-option-classic')).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.dataset.layout).toBe('islands');
    expect(JSON.parse(localStorage.getItem('ferret.layout'))).toBe('islands');
  });

  it('switches layout from the keyboard with Enter and Space', async () => {
    const user = userEvent.setup();
    renderPicker();

    screen.getByTestId('layout-option-islands').focus();
    await user.keyboard('{Enter}');
    expect(document.documentElement.dataset.layout).toBe('islands');

    screen.getByTestId('layout-option-classic').focus();
    await user.keyboard(' ');
    expect(document.documentElement.dataset.layout).toBe('classic');
  });

  it('draws the islands preview with space between separate surfaces', () => {
    renderPicker();

    expect(screen.getByTestId('layout-option-islands').querySelector('.layout-preview-islands')).toBeInTheDocument();
    expect(screen.getByTestId('layout-option-classic').querySelector('.layout-preview-islands')).not.toBeInTheDocument();
  });
});
