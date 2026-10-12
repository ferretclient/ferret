import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'providers/Theme';
import DesignPicker from './index';

const renderPicker = () => render(<ThemeProvider><DesignPicker /></ThemeProvider>);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('ferret.theme', JSON.stringify('light'));
  localStorage.setItem('ferret.themeVariantLight', JSON.stringify('light'));
  document.documentElement.removeAttribute('data-design');
});

describe('DesignPicker', () => {
  it('offers Classic and Modern as one choice, with Classic selected to begin with', () => {
    renderPicker();

    expect(screen.getByRole('radiogroup', { name: 'Design' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByTestId('design-option-classic')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('design-option-modern')).toHaveAttribute('aria-checked', 'false');
  });

  it('describes each design in plain words', () => {
    renderPicker();

    expect(screen.getByTestId('design-option-classic')).toHaveTextContent('Compact and well defined');
    expect(screen.getByTestId('design-option-modern')).toHaveTextContent('Calmer and softer');
  });

  it('switches design with the mouse and applies it to the whole app', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByTestId('design-option-modern'));

    expect(screen.getByTestId('design-option-modern')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('design-option-classic')).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.dataset.design).toBe('modern');
  });

  it('switches design from the keyboard with Enter and Space', async () => {
    const user = userEvent.setup();
    renderPicker();

    screen.getByTestId('design-option-modern').focus();
    await user.keyboard('{Enter}');
    expect(document.documentElement.dataset.design).toBe('modern');

    screen.getByTestId('design-option-classic').focus();
    await user.keyboard(' ');
    expect(document.documentElement.dataset.design).toBe('classic');
  });

  it('shows each design with the current color theme, so the previews differ in shape only', () => {
    renderPicker();

    const classic = screen.getByTestId('design-option-classic').querySelector('.design-preview');
    const modern = screen.getByTestId('design-option-modern').querySelector('.design-preview');

    expect(classic.style.borderRadius).not.toBe(modern.style.borderRadius);
    expect(classic.style.background).toBe(modern.style.background);
  });

  it('keeps the previews on the Classic and Modern shapes after the app switches to Modern', async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(screen.getByTestId('design-option-modern'));

    const classic = screen.getByTestId('design-option-classic').querySelector('.design-preview');
    const modern = screen.getByTestId('design-option-modern').querySelector('.design-preview');

    expect(classic.style.borderRadius).toBe('10px');
    expect(modern.style.borderRadius).toBe('14px');
  });
});
