import { describe, it, expect } from '@jest/globals';
import { sortByNameThenSequence } from './index';

describe('sortByNameThenSequence', () => {
  it('returns an empty array unchanged', () => {
    expect(sortByNameThenSequence([])).toEqual([]);
  });

  it('returns a new array and does not mutate the input', () => {
    const items = [
      { name: 'b', seq: 2 },
      { name: 'a', seq: 1 }
    ];
    const snapshot = JSON.parse(JSON.stringify(items));
    const result = sortByNameThenSequence(items);

    expect(result).not.toBe(items);
    expect(items).toEqual(snapshot);
  });

  it('sorts alphabetically by name when no sequence is set', () => {
    const result = sortByNameThenSequence([{ name: 'c' }, { name: 'a' }, { name: 'b' }]);
    expect(result.map((i) => i.name)).toEqual(['a', 'b', 'c']);
  });

  it('orders items by their 1-based seq', () => {
    const result = sortByNameThenSequence([
      { name: 'c', seq: 3 },
      { name: 'a', seq: 1 },
      { name: 'b', seq: 2 }
    ]);
    expect(result.map((i) => i.name)).toEqual(['a', 'b', 'c']);
  });

  it('groups a duplicate seq in alphabetical order', () => {
    const result = sortByNameThenSequence([
      { name: 'z', seq: 1 },
      { name: 'a', seq: 1 },
      { name: 'm', seq: 2 }
    ]);
    expect(result.map((i) => i.name)).toEqual(['a', 'z', 'm']);
  });

  it('treats a non-positive or non-integer seq as unsequenced, ordering those alphabetically after the sequenced ones', () => {
    const items = [
      { name: 'a', seq: 0 },
      { name: 'b', seq: -1 },
      { name: 'c', seq: 1.5 },
      { name: 'd', seq: NaN },
      { name: 'e', seq: Infinity },
      { name: 'f', seq: undefined },
      { name: 'x', seq: 1 }
    ];
    const result = sortByNameThenSequence(items);
    expect(result.map((i) => i.name)).toEqual(['x', 'a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('inserts sequenced items at their positions among unsequenced ones', () => {
    const result = sortByNameThenSequence([
      { name: 'f' },
      { name: 'a', seq: 1 },
      { name: 'e' },
      { name: 'b', seq: 2 },
      { name: 'd' },
      { name: 'c', seq: 4 }
    ]);
    expect(result.map((i) => i.name)).toEqual(['a', 'b', 'd', 'c', 'e', 'f']);
  });

  it('handles seq values beyond the array length', () => {
    const result = sortByNameThenSequence([
      { name: 'a', seq: 10 },
      { name: 'b' },
      { name: 'c', seq: 20 }
    ]);
    expect(result.map((i) => i.name)).toEqual(['b', 'a', 'c']);
  });
});
