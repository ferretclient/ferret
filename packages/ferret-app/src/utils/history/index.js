const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (timestamp) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const dayLabel = (timestamp, now) => {
  const daysAgo = Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY_MS);
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return new Date(timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

/** Groups newest-first entries under "Today" / "Yesterday" / date headings, keeping their order. */
export const groupHistoryByDay = (entries, now = Date.now()) => {
  const groups = [];
  for (const entry of entries) {
    const label = dayLabel(entry.sent_at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.entries.push(entry);
    } else {
      groups.push({ label, entries: [entry] });
    }
  }
  return groups;
};

/** StatusBadge tone for an entry: a failure without a response is danger, otherwise by status class. */
export const getHistoryStatusTone = (entry) => {
  if (entry.status === null || entry.status === undefined) return 'danger';
  if (entry.status >= 400) return 'danger';
  if (entry.status >= 300) return 'warning';
  if (entry.status >= 200) return 'success';
  return 'info';
};

export const getHistoryStatusLabel = (entry) => {
  if (entry.status === null || entry.status === undefined) return 'Failed';
  return String(entry.status);
};

/** Pretty-prints a JSON body for display; any other text is returned unchanged. */
export const formatHistoryBody = (body, maxChars = 200_000) => {
  if (body === null || body === undefined || body === '') return { text: '', clipped: false };
  let text = body;
  try {
    text = JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    // not JSON — show as received
  }
  return text.length > maxChars ? { text: text.slice(0, maxChars), clipped: true } : { text, clipped: false };
};
