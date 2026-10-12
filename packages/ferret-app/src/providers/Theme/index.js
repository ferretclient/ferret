import React from 'react';
import { Validator } from 'jsonschema';
import toast from 'react-hot-toast';
import { parseToRgb, transparentize } from 'polished';
import themes from 'themes/index';
import themeSchema from 'themes/schema';
import { applyDesign, isKnownDesign, DEFAULT_DESIGN } from 'themes/designs/index';
import { isKnownLayout, DEFAULT_LAYOUT } from 'themes/layouts/index';
import useLocalStorage from 'hooks/useLocalStorage/index';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeProvider as SCThemeProvider } from 'styled-components';

const validator = new Validator();

// Helper: Get effective theme ('light' or 'dark') based on storedTheme
const getEffectiveTheme = (storedTheme) => {
  if (storedTheme === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return storedTheme;
};

// Helper: Apply theme class to root element
const applyThemeToRoot = (theme) => {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
};

export const ThemeContext = createContext();
export const ThemeProvider = (props) => {
  const [storedTheme, setStoredTheme] = useLocalStorage('ferret.theme', 'system');
  const [displayedTheme, setDisplayedTheme] = useState(() => getEffectiveTheme(storedTheme));
  const [themeVariantLight, setThemeVariantLight] = useLocalStorage('ferret.themeVariantLight', 'light');
  const [themeVariantDark, setThemeVariantDark] = useLocalStorage('ferret.themeVariantDark', 'dark');
  // The design (Classic or Modern) shapes the interface; the theme above colors it.
  const [storedDesign, setDesign] = useLocalStorage('ferret.design', DEFAULT_DESIGN);
  const design = isKnownDesign(storedDesign) ? storedDesign : DEFAULT_DESIGN;
  // The layout arranges the main screen (classic panes or islands) and is chosen separately from the design.
  const [storedLayout, setLayout] = useLocalStorage('ferret.layout', DEFAULT_LAYOUT);
  const layout = isKnownLayout(storedLayout) ? storedLayout : DEFAULT_LAYOUT;

  // Listen for system theme changes (only affects 'system' mode)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e) => {
      if (storedTheme !== 'system') return;
      const newTheme = e.matches ? 'light' : 'dark';
      setDisplayedTheme(newTheme);
      applyThemeToRoot(newTheme);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [storedTheme]);

  // Apply theme when storedTheme changes
  useEffect(() => {
    const effectiveTheme = getEffectiveTheme(storedTheme);
    setDisplayedTheme(effectiveTheme);
    applyThemeToRoot(effectiveTheme);

    if (window.ipcRenderer) {
      const isLight = effectiveTheme === 'light';
      const variantName = isLight ? themeVariantLight : themeVariantDark;
      const rawBg = themes[variantName]?.bg || (isLight ? '#ffffff' : '#1e1e1e');
      // Convert to hex — Electron's backgroundColor only accepts hex colors
      const { red, green, blue } = parseToRgb(rawBg);
      const themeBg = `#${[red, green, blue].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
      window.ipcRenderer.send('renderer:theme-change', storedTheme, themeBg);
    }
  }, [storedTheme, themeVariantLight, themeVariantDark]);

  // storedTheme can have 3 values: 'light', 'dark', 'system'
  // displayedTheme can have 2 values: 'light', 'dark'

  // Compute theme object directly from storedTheme to avoid race conditions
  const baseTheme = useMemo(() => {
    const isLightMode = getEffectiveTheme(storedTheme) === 'light';
    const variantName = isLightMode ? themeVariantLight : themeVariantDark;
    const fallbackTheme = isLightMode ? themes.light : themes.dark;
    const fallbackName = isLightMode ? 'light' : 'dark';

    // Check if the variant exists in themes
    const selectedTheme = themes[variantName];
    if (!selectedTheme) {
      // Only show toast if using a non-default variant that doesn't exist
      if (variantName !== fallbackName) {
        toast.error(`Theme "${variantName}" not found. Using default ${fallbackName} theme.`, {
          duration: 4000,
          id: `theme-not-found-${variantName}` // Prevent duplicate toasts
        });
      }
      return fallbackTheme;
    }

    // Validate the theme against the schema
    const validationResult = validator.validate(selectedTheme, themeSchema);
    if (!validationResult.valid) {
      const errors = validationResult.errors?.map((e) => e.stack).join(', ') || 'Unknown validation error';
      console.error(`Theme "${variantName}" validation failed:`, errors);
      toast.error(`Invalid theme "${variantName}". Using default ${fallbackName} theme.`, {
        duration: 4000,
        id: `theme-invalid-${variantName}` // Prevent duplicate toasts
      });
      return fallbackTheme;
    }

    return selectedTheme;
  }, [storedTheme, themeVariantLight, themeVariantDark]);

  const theme = useMemo(() => applyDesign(baseTheme, design), [baseTheme, design]);

  // Styles that are not written with styled-components read the design from the root element, and the
  // theme's accent through CSS variables, so they follow both choices.
  useEffect(() => {
    const root = window.document.documentElement;
    root.dataset.design = design;
    root.dataset.layout = layout;
    // What the islands layout paints with: the canvas between the islands, and how each island looks.
    root.style.setProperty('--ferret-canvas', theme.background.crust || theme.sidebar.bg);
    root.style.setProperty('--ferret-island-bg', theme.background.base);
    root.style.setProperty('--ferret-island-radius', theme.border.radius.xl);
    root.style.setProperty('--ferret-island-border', theme.border.border1);
    root.style.setProperty('--ferret-island-gap', '4px');
    try {
      root.style.setProperty('--ferret-accent', theme.brand);
      root.style.setProperty('--ferret-accent-soft', transparentize(0.88, theme.brand));
      root.style.setProperty('--ferret-focus-ring', transparentize(0.45, theme.brand));
      root.style.setProperty('--ferret-selection', transparentize(0.75, theme.brand));
    } catch {
      ['--ferret-accent', '--ferret-accent-soft', '--ferret-focus-ring', '--ferret-selection'].forEach((name) => root.style.removeProperty(name));
    }
    root.style.setProperty('--ferret-shadow-sm', theme.shadow.sm);
    root.style.setProperty('--ferret-shadow-md', theme.shadow.md);
  }, [design, layout, theme]);

  const value = {
    theme,
    baseTheme,
    storedTheme,
    displayedTheme,
    setStoredTheme,
    themeVariantLight,
    setThemeVariantLight,
    themeVariantDark,
    setThemeVariantDark,
    design,
    setDesign,
    layout,
    setLayout
  };

  return (
    <ThemeContext.Provider value={value}>
      <SCThemeProvider theme={theme} {...props} />
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error(`useTheme must be used within a ThemeProvider`);
  }

  return context;
};

export default ThemeProvider;
