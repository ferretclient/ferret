import {
  resolveActiveView,
  parseSidebarView,
  parsePaneOpen,
  orderRailViews
} from './rail-view';

describe('resolveActiveView', () => {
  const ids = ['collections', 'api-specs', 'history'];

  it('keeps the saved view while it is offered', () => {
    expect(resolveActiveView(ids, 'history')).toBe('history');
  });

  it('falls back to the first view when the saved one is gone or unknown', () => {
    expect(resolveActiveView(ids, 'mock-servers')).toBe('collections');
    expect(resolveActiveView(ids, null)).toBe('collections');
  });

  it('returns null when nothing is offered', () => {
    expect(resolveActiveView([], 'history')).toBeNull();
  });
});

describe('stored values', () => {
  it('reads the saved view as text and ignores empty values', () => {
    expect(parseSidebarView('history')).toBe('history');
    expect(parseSidebarView('')).toBeNull();
  });

  it('treats the pane as open unless it was saved as closed', () => {
    expect(parsePaneOpen('false')).toBe(false);
    expect(parsePaneOpen('true')).toBe(true);
    expect(parsePaneOpen('garbage')).toBe(true);
  });
});

describe('orderRailViews', () => {
  it('starts with collections, history, API specs, mock servers', () => {
    expect(orderRailViews(['collections', 'api-specs', 'mock-servers', 'history'], [])).toEqual(['collections', 'history', 'api-specs', 'mock-servers']);
  });

  it('leaves out a view that is not offered, such as mock servers while the feature is off', () => {
    expect(orderRailViews(['collections', 'api-specs', 'history'], [])).toEqual(['collections', 'history', 'api-specs']);
  });

  it('follows the saved order and puts views it does not know about last, in the default order', () => {
    expect(orderRailViews(['collections', 'api-specs', 'mock-servers', 'history'], ['history', 'mock-servers'])).toEqual(['history', 'mock-servers', 'collections', 'api-specs']);
  });
});
