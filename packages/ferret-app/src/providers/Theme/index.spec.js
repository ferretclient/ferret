import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import themes from 'themes/index';
import { ThemeProvider, useTheme } from './index';

const Probe = () => {
  const { layout, setLayout } = useTheme();
  return (
    <div>
      <span data-testid="layout">{layout}</span>
      <button onClick={() => setLayout('islands')}>islands</button>
      <button onClick={() => setLayout('classic')}>classic</button>
    </div>
  );
};

const renderProbe = () => render(<ThemeProvider><Probe /></ThemeProvider>);

beforeEach(() => {
  localStorage.clear();
  // A fixed color theme keeps the expected values independent of the system setting.
  localStorage.setItem('ferret.theme', JSON.stringify('light'));
  localStorage.setItem('ferret.themeVariantLight', JSON.stringify('light'));
  document.documentElement.removeAttribute('data-layout');
});

describe('ThemeProvider', () => {
  it('publishes the accent as CSS variables for the styles that are not written with styled-components', () => {
    renderProbe();
    const variable = (name) => document.documentElement.style.getPropertyValue(name);

    ['--ferret-accent', '--ferret-accent-soft', '--ferret-focus-ring', '--ferret-selection', '--ferret-shadow-sm', '--ferret-shadow-md'].forEach((name) => {
      expect(variable(name)).not.toBe('');
    });
    expect(variable('--ferret-accent')).toBe(themes.light.brand);
  });

  it('starts with the Classic layout and remembers a different one', async () => {
    const user = userEvent.setup();
    renderProbe();

    expect(screen.getByTestId('layout')).toHaveTextContent('classic');
    expect(document.documentElement.dataset.layout).toBe('classic');

    await user.click(screen.getByRole('button', { name: 'islands' }));

    expect(screen.getByTestId('layout')).toHaveTextContent('islands');
    expect(document.documentElement.dataset.layout).toBe('islands');
    expect(JSON.parse(localStorage.getItem('ferret.layout'))).toBe('islands');
  });

  it('falls back to the Classic layout when the saved one is not known', () => {
    localStorage.setItem('ferret.layout', JSON.stringify('floating-windows'));
    renderProbe();

    expect(screen.getByTestId('layout')).toHaveTextContent('classic');
    expect(document.documentElement.dataset.layout).toBe('classic');
  });

  it('publishes what the islands are painted with, taken from the theme', () => {
    renderProbe();
    const variable = (name) => document.documentElement.style.getPropertyValue(name);

    expect(variable('--ferret-island-bg')).toBe(themes.light.background.base);
    expect(variable('--ferret-island-border')).toBe(themes.light.border.border1);
    expect(variable('--ferret-island-radius')).toBe(themes.light.border.radius.xl);
    expect(variable('--ferret-canvas')).not.toBe('');
    expect(variable('--ferret-island-gap')).toBe('4px');
  });
});
