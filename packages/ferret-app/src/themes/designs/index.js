import { transparentize } from 'polished';

// A design is the shape and depth of the interface: corner radius, border weight, shadows. It is separate from
// the color theme, so every color theme works with every design. Classic is the look Ferret started with and
// changes nothing; each other design turns a theme into the theme the app renders with.

export const DEFAULT_DESIGN = 'classic';

export const designRegistry = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Compact and well defined, with clear borders. The look Ferret started with.'
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Calmer and softer: rounder corners, quieter borders, gentler shadows and finer type.'
  }
};

// Never let one unusual color value (a theme may use a named color or a function) take the whole theme down.
const soften = (color, amount) => {
  try {
    return transparentize(amount, color);
  } catch {
    return color;
  }
};

const MODERN_RADIUS = { sm: '6px', base: '8px', md: '10px', lg: '14px', xl: '18px' };

const modern = (theme) => {
  const dark = theme.mode === 'dark';
  // Shadows are tinted with the theme's own darkness, so they look natural on both light and dark themes.
  const ink = dark ? '0, 0, 0' : '15, 23, 42';
  const border = theme.border || {};

  return {
    ...theme,
    border: {
      ...border,
      radius: { ...border.radius, ...MODERN_RADIUS },
      border0: soften(border.border0, 0.3),
      border1: soften(border.border1, 0.3),
      border2: soften(border.border2, 0.25),
      border3: soften(border.border3, 0.2)
    },
    shadow: {
      sm: `0 1px 2px rgba(${ink}, ${dark ? 0.35 : 0.06})`,
      md: `0 4px 14px rgba(${ink}, ${dark ? 0.4 : 0.08})`,
      lg: `0 12px 32px rgba(${ink}, ${dark ? 0.5 : 0.12})`
    }
  };
};

const designs = {
  classic: (theme) => theme,
  modern
};

export const isKnownDesign = (id) => Object.prototype.hasOwnProperty.call(designRegistry, id);

/** The theme to render with: `theme` shaped by the design, falling back to Classic for an unknown id. */
export const applyDesign = (theme, designId) => (designs[isKnownDesign(designId) ? designId : DEFAULT_DESIGN])(theme);
