import React, { useMemo, useState } from 'react';
import { IconSearch } from '@tabler/icons';
import MethodBadge from 'ui/MethodBadge';
import StatusBadge from 'ui/StatusBadge';
import { formatDuration } from 'utils/common';
import { getHistoryStatusLabel, getHistoryStatusTone, groupHistoryByDay } from 'utils/history';
import useRequestHistory from 'hooks/useRequestHistory';
import HistoryEntryModal from '../HistoryEntryModal';
import StyledWrapper from './StyledWrapper';

const HistoryRow = React.memo(({ entry, onSelect }) => (
  <button type="button" className="history-row" onClick={() => onSelect(entry)} data-testid="history-row" title={entry.url}>
    <MethodBadge method={entry.method} size="sm" />
    <span className="history-row-text">
      <span className="history-row-name">{entry.request_name || entry.url}</span>
      <span className="history-row-url">{entry.url}</span>
    </span>
    <span className="history-row-meta">
      <StatusBadge status={getHistoryStatusTone(entry)} size="xs">{getHistoryStatusLabel(entry)}</StatusBadge>
      {entry.duration_ms !== null ? <span className="history-row-duration">{formatDuration(entry.duration_ms)}</span> : null}
    </span>
  </button>
));

const HistoryList = () => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { entries, hasMore, isLoading, error, loadMore } = useRequestHistory(search);
  const groups = useMemo(() => groupHistoryByDay(entries), [entries]);

  return (
    <StyledWrapper data-testid="history-list">
      <div className="history-search">
        <IconSearch size={14} strokeWidth={1.5} aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search history"
          aria-label="Search history"
          data-testid="history-search"
          spellCheck="false"
        />
      </div>

      {error ? <div className="history-message error">{error}</div> : null}
      {!error && !isLoading && !entries.length ? (
        <div className="history-message" data-testid="history-empty">
          {search ? 'No matching requests.' : 'Requests you send will show up here.'}
        </div>
      ) : null}

      {groups.map((group) => (
        <div key={group.label} className="history-group">
          <div className="history-group-label">{group.label}</div>
          {group.entries.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} onSelect={setSelected} />
          ))}
        </div>
      ))}

      {hasMore ? (
        <button type="button" className="history-load-more" onClick={loadMore} data-testid="history-load-more">
          Load more
        </button>
      ) : null}

      {selected ? (
        <HistoryEntryModal
          summary={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => setSelected(null)}
        />
      ) : null}
    </StyledWrapper>
  );
};

export default HistoryList;
