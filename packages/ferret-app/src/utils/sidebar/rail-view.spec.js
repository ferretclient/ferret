import { resolveActiveView, parseSidebarView, parsePaneOpen } from './rail-view';

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
