import { groupHistoryByDay, getHistoryStatusTone, getHistoryStatusLabel, formatHistoryBody } from './index';

const NOW = new Date(2026, 9, 9, 15, 0, 0).getTime();
const at = (daysAgo, hour = 10) => new Date(2026, 9, 9 - daysAgo, hour, 0, 0).getTime();

describe('groupHistoryByDay', () => {
  it('groups consecutive entries under Today, Yesterday and dated headings', () => {
    const entries = [
      { id: 4, sent_at: at(0, 14) },
      { id: 3, sent_at: at(0, 9) },
      { id: 2, sent_at: at(1) },
      { id: 1, sent_at: at(5) }
    ];

    const groups = groupHistoryByDay(entries, NOW);

    expect(groups.map((group) => group.label).slice(0, 2)).toEqual(['Today', 'Yesterday']);
    expect(groups).toHaveLength(3);
    expect(groups[0].entries.map((entry) => entry.id)).toEqual([4, 3]);
  });

  it('returns nothing for an empty list', () => {
    expect(groupHistoryByDay([], NOW)).toEqual([]);
  });
});

describe('status helpers', () => {
  it.each([
    [200, 'success'],
    [204, 'success'],
    [301, 'warning'],
    [404, 'danger'],
    [503, 'danger'],
    [100, 'info'],
    [null, 'danger']
  ])('maps status %s to the %s tone', (status, tone) => {
    expect(getHistoryStatusTone({ status })).toBe(tone);
  });

  it('labels a request that never got a response as Failed', () => {
    expect(getHistoryStatusLabel({ status: null })).toBe('Failed');
    expect(getHistoryStatusLabel({ status: 201 })).toBe('201');
  });
});

describe('formatHistoryBody', () => {
  it('pretty-prints JSON and leaves other text alone', () => {
    expect(formatHistoryBody('{"a":1}').text).toBe('{\n  "a": 1\n}');
    expect(formatHistoryBody('plain text').text).toBe('plain text');
    expect(formatHistoryBody(null)).toEqual({ text: '', clipped: false });
  });

  it('clips very large bodies', () => {
    const result = formatHistoryBody('x'.repeat(50), 10);
    expect(result).toEqual({ text: 'x'.repeat(10), clipped: true });
  });
});
