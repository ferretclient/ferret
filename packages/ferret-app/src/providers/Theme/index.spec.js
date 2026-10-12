import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import themes from 'themes/index';
import { ThemeProvider, useTheme } from './index';

const Probe = () => {
  const { design, setDesign, theme } = useTheme();
  return (
    <div>
      <span data-testid="design">{design}</span>
      <span data-testid="radius">{theme.border.radius.base}</span>
      <span data-testid="brand">{theme.brand}</span>
      <button onClick={() => setDesign('modern')}>modern</button>
      <button onClick={() => setDesign('classic')}>classic</button>
    </div>
  );
};

const LayoutProbe = () => {
  const { layout, setLayout, setDesign } = useTheme();
  return (
    <div>
      <span data-testid="layout">{layout}</span>
      <button onClick={() => setLayout('islands')}>islands</button>
      <button onClick={() => setDesign('modern')}>modern</button>
      <button onClick={() => setDesign('classic')}>classic</button>
    </div>
  );
};

const renderProbe = () => render(<ThemeProvider><Probe /></ThemeProvider>);
const renderLayoutProbe = () => render(<ThemeProvider><LayoutProbe /></ThemeProvider>);

beforeEach(() => {
  localStorage.clear();
  // A fixed color theme keeps the expected values independent of the system setting.
  localStorage.setItem('ferret.theme', JSON.stringify('light'));
  localStorage.setItem('ferret.themeVariantLight', JSON.stringify('light'));
  document.documentElement.removeAttribute('data-design');
  document.documentElement.removeAttribute('data-layout');
});

describe('ThemeProvider design', () => {
  it('starts with the Classic design and the theme unchanged', () => {
    renderProbe();

    expect(screen.getByTestId('design')).toHaveTextContent('classic');
    expect(screen.getByTestId('radius')).toHaveTextContent(themes.light.border.radius.base);
    expect(document.documentElement.dataset.design).toBe('classic');
  });

  it('switches to Modern: rounder corners, the same palette, the root attribute, and it is remembered', async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole('button', { name: 'modern' }));

    expect(screen.getByTestId('design')).toHaveTextContent('modern');
    expect(screen.getByTestId('radius')).toHaveTextContent('8px');
    expect(screen.getByTestId('brand')).toHaveTextContent(themes.light.brand);
    expect(document.documentElement.dataset.design).toBe('modern');
    expect(JSON.parse(localStorage.getItem('ferret.design'))).toBe('modern');
  });

  it('switches back to Classic', async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole('button', { name: 'modern' }));

    await user.click(screen.getByRole('button', { name: 'classic' }));

    expect(screen.getByTestId('radius')).toHaveTextContent(themes.light.border.radius.base);
    expect(document.documentElement.dataset.design).toBe('classic');
  });

  it('uses the design saved earlier', () => {
    localStorage.setItem('ferret.design', JSON.stringify('modern'));
    renderProbe();

    expect(screen.getByTestId('design')).toHaveTextContent('modern');
    expect(document.documentElement.dataset.design).toBe('modern');
  });

  it('falls back to Classic when the saved design is not one Ferret knows', () => {
    localStorage.setItem('ferret.design', JSON.stringify('retro-1999'));
    renderProbe();

    expect(screen.getByTestId('design')).toHaveTextContent('classic');
    expect(document.documentElement.dataset.design).toBe('classic');
  });

  it('publishes the accent as CSS variables for the styles that are not written with styled-components', () => {
    renderProbe();

    expect(document.documentElement.style.getPropertyValue('--ferret-focus-ring')).not.toBe('');
    expect(document.documentElement.style.getPropertyValue('--ferret-selection')).not.toBe('');
  });

  it('shares the accent and the shadows with the stylesheet, and the shadows follow the design', async () => {
    const user = userEvent.setup();
    renderProbe();
    const root = document.documentElement;
    const variable = (name) => root.style.getPropertyValue(name);

    ['--ferret-accent', '--ferret-accent-soft', '--ferret-shadow-sm', '--ferret-shadow-md'].forEach((name) => {
      expect(variable(name)).not.toBe('');
    });
    expect(variable('--ferret-accent')).toBe(themes.light.brand);
    const classicShadow = variable('--ferret-shadow-sm');

    await user.click(screen.getByRole('button', { name: 'modern' }));

    expect(variable('--ferret-shadow-sm')).not.toBe(classicShadow);
    expect(variable('--ferret-accent')).toBe(themes.light.brand);
  });

  it('starts with the Classic layout and remembers a different one', async () => {
    const user = userEvent.setup();
    renderLayoutProbe();

    expect(screen.getByTestId('layout')).toHaveTextContent('classic');
    expect(document.documentElement.dataset.layout).toBe('classic');

    await user.click(screen.getByRole('button', { name: 'islands' }));

    expect(screen.getByTestId('layout')).toHaveTextContent('islands');
    expect(document.documentElement.dataset.layout).toBe('islands');
    expect(JSON.parse(localStorage.getItem('ferret.layout'))).toBe('islands');
  });

  it('falls back to the Classic layout when the saved one is not known', () => {
    localStorage.setItem('ferret.layout', JSON.stringify('floating-windows'));
    renderLayoutProbe();

    expect(screen.getByTestId('layout')).toHaveTextContent('classic');
    expect(document.documentElement.dataset.layout).toBe('classic');
  });

  it('keeps the layout and the design independent of each other', async () => {
    const user = userEvent.setup();
    renderLayoutProbe();

    await user.click(screen.getByRole('button', { name: 'islands' }));
    await user.click(screen.getByRole('button', { name: 'modern' }));

    expect(document.documentElement.dataset.layout).toBe('islands');
    expect(document.documentElement.dataset.design).toBe('modern');

    await user.click(screen.getByRole('button', { name: 'classic' }));
    expect(document.documentElement.dataset.layout).toBe('islands');
    expect(document.documentElement.dataset.design).toBe('classic');
  });

  it('publishes what the islands are painted with, taken from the theme', () => {
    renderLayoutProbe();
    const variable = (name) => document.documentElement.style.getPropertyValue(name);

    expect(variable('--ferret-island-bg')).toBe(themes.light.background.base);
    expect(variable('--ferret-island-border')).toBe(themes.light.border.border1);
    expect(variable('--ferret-island-radius')).toBe(themes.light.border.radius.xl);
    expect(variable('--ferret-canvas')).not.toBe('');
    expect(variable('--ferret-island-gap')).toBe('8px');
  });
});
