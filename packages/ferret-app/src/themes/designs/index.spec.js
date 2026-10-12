import themes from 'themes/index';
import { applyDesign, designRegistry, isKnownDesign, DEFAULT_DESIGN } from './index';

const themeIds = Object.keys(themes);
const withoutShape = ({ border, shadow, ...rest }) => rest;

describe('designs', () => {
  it('has Classic as the default and offers a Classic and a Modern design', () => {
    expect(DEFAULT_DESIGN).toBe('classic');
    expect(Object.keys(designRegistry)).toEqual(['classic', 'modern']);
    expect(isKnownDesign('modern')).toBe(true);
    expect(isKnownDesign('futuristic')).toBe(false);
    expect(isKnownDesign('toString')).toBe(false);
  });

  it.each(themeIds)('Classic leaves the %s theme exactly as it is', (id) => {
    expect(applyDesign(themes[id], 'classic')).toBe(themes[id]);
  });

  it.each(themeIds)('Modern changes only the shape and depth of the %s theme, never its palette', (id) => {
    const modern = applyDesign(themes[id], 'modern');

    expect(withoutShape(modern)).toEqual(withoutShape(themes[id]));
    expect(modern.mode).toBe(themes[id].mode);
    expect(modern.brand).toBe(themes[id].brand);
    expect(modern.border.radius).toEqual({ sm: '6px', base: '8px', md: '10px', lg: '14px', xl: '18px' });
    expect(modern.shadow.md).not.toBe(themes[id].shadow.md);
  });

  it.each(themeIds)('Modern keeps every border token of the %s theme and softens the colors', (id) => {
    const original = themes[id].border;
    const modern = applyDesign(themes[id], 'modern').border;

    expect(Object.keys(modern).sort()).toEqual(Object.keys(original).sort());
    ['border0', 'border1', 'border2', 'border3'].forEach((token) => {
      expect(typeof modern[token]).toBe('string');
      expect(modern[token]).not.toBe(original[token]);
    });
  });

  it('does not change the theme it is given', () => {
    const before = JSON.stringify(themes.dark);
    applyDesign(themes.dark, 'modern');
    expect(JSON.stringify(themes.dark)).toBe(before);
  });

  it('casts darker shadows on dark themes than on light ones', () => {
    const light = applyDesign(themes.light, 'modern').shadow.lg;
    const dark = applyDesign(themes.dark, 'modern').shadow.lg;
    const strength = (shadow) => Number(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/.exec(shadow)[1]);

    expect(strength(dark)).toBeGreaterThan(strength(light));
  });

  it('falls back to Classic for an unknown or missing design', () => {
    expect(applyDesign(themes.light, 'futuristic')).toBe(themes.light);
    expect(applyDesign(themes.light, undefined)).toBe(themes.light);
    expect(applyDesign(themes.light, 'toString')).toBe(themes.light);
  });

  it('survives a color it cannot soften by keeping the original value', () => {
    const odd = { ...themes.light, border: { ...themes.light.border, border1: 'not-a-color' } };
    expect(applyDesign(odd, 'modern').border.border1).toBe('not-a-color');
  });
});
