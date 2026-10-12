import { DEFAULT_LAYOUT, layoutRegistry, isKnownLayout } from './index';

describe('layouts', () => {
  it('has Classic as the default and offers Classic and Islands', () => {
    expect(DEFAULT_LAYOUT).toBe('classic');
    expect(Object.keys(layoutRegistry)).toEqual(['classic', 'islands']);
  });

  it('gives every layout an id that matches its key, a name and a description', () => {
    Object.entries(layoutRegistry).forEach(([key, layout]) => {
      expect(layout.id).toBe(key);
      expect(layout.name).not.toBe('');
      expect(layout.description).not.toBe('');
    });
  });

  it('recognises only layouts it offers', () => {
    expect(isKnownLayout('islands')).toBe(true);
    expect(isKnownLayout('classic')).toBe(true);
    expect(isKnownLayout('floating')).toBe(false);
    expect(isKnownLayout('toString')).toBe(false);
    expect(isKnownLayout(undefined)).toBe(false);
  });
});
