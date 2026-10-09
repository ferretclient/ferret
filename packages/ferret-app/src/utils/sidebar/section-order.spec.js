import { applySectionOrder, moveSectionTo, moveSectionBy, parseSectionOrder } from './section-order';

const sections = ['collections', 'api-specs', 'mock-servers', 'history'].map((id) => ({ id }));
const idsOf = (list) => list.map((section) => section.id);

describe('applySectionOrder', () => {
  it('keeps the default order when nothing is saved', () => {
    expect(idsOf(applySectionOrder(sections, []))).toEqual(['collections', 'api-specs', 'mock-servers', 'history']);
    expect(idsOf(applySectionOrder(sections, undefined))).toEqual(['collections', 'api-specs', 'mock-servers', 'history']);
  });

  it('uses the saved order', () => {
    expect(idsOf(applySectionOrder(sections, ['history', 'collections', 'mock-servers', 'api-specs']))).toEqual([
      'history', 'collections', 'mock-servers', 'api-specs'
    ]);
  });

  it('ignores saved ids that no longer exist and appends sections the saved list lacks', () => {
    expect(idsOf(applySectionOrder(sections, ['gone', 'history', 'collections']))).toEqual([
      'history', 'collections', 'api-specs', 'mock-servers'
    ]);
  });

  it('ignores duplicate saved ids', () => {
    expect(idsOf(applySectionOrder(sections, ['history', 'history', 'collections']))).toHaveLength(4);
  });
});

describe('moveSectionTo', () => {
  const ids = ['a', 'b', 'c', 'd'];

  it('moves a section down onto a later one, taking its place', () => {
    expect(moveSectionTo(ids, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves a section up onto an earlier one, taking its place', () => {
    expect(moveSectionTo(ids, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('changes nothing when dropped on itself or on an unknown id', () => {
    expect(moveSectionTo(ids, 'b', 'b')).toBe(ids);
    expect(moveSectionTo(ids, 'b', 'zzz')).toBe(ids);
  });
});

describe('moveSectionBy', () => {
  const ids = ['a', 'b', 'c'];

  it('moves one place at a time', () => {
    expect(moveSectionBy(ids, 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveSectionBy(ids, 'b', 1)).toEqual(['a', 'c', 'b']);
  });

  it('stops at the ends', () => {
    expect(moveSectionBy(ids, 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(moveSectionBy(ids, 'c', 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('parseSectionOrder', () => {
  it('reads a saved list and rejects anything else', () => {
    expect(parseSectionOrder('["history","collections"]')).toEqual(['history', 'collections']);
    expect(parseSectionOrder('["history",3,null]')).toEqual(['history']);
    expect(parseSectionOrder('{"a":1}')).toEqual([]);
    expect(parseSectionOrder('not json')).toEqual([]);
  });
});
