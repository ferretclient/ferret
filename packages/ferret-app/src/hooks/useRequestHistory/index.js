import { useCallback, useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 250;

const invoke = (channel, params) => window.ipcRenderer.invoke(`datastore:request_history:${channel}`, params);

const fetchPage = ({ search, before }) =>
  invoke('list_history', {
    before_sent_at: before ? before.sent_at : null,
    before_id: before ? before.id : null,
    search: search || null,
    limit: PAGE_SIZE
  });

export const getHistoryEntry = (id) => invoke('get_history_entry', { id });
export const deleteHistoryEntry = (id) => invoke('delete_history_entry', { id });
export const clearRequestHistory = () => invoke('delete_all_history');

/**
 * Newest-first request history, filtered by `search`, loaded a page at a time. Reloads when the
 * main process records a new send, so an open list stays current.
 */
const useRequestHistory = (search = '') => {
  const [entries, setEntries] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Bumped by every reload so a slow response from an older search cannot overwrite a newer one.
  const requestId = useRef(0);

  const reload = useCallback(
    async (term) => {
      const current = ++requestId.current;
      try {
        const page = await fetchPage({ search: term });
        if (current !== requestId.current) return;
        setEntries(page);
        setHasMore(page.length === PAGE_SIZE);
        setError(null);
      } catch (err) {
        if (current !== requestId.current) return;
        setError(err?.message || 'Could not load history');
      } finally {
        if (current === requestId.current) setIsLoading(false);
      }
    },
    []
  );

  const loadMore = useCallback(async () => {
    const last = entries[entries.length - 1];
    if (!last) return;
    const current = requestId.current;
    try {
      const page = await fetchPage({ search, before: last });
      if (current !== requestId.current) return;
      setEntries((existing) => [...existing, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } catch (err) {
      setError(err?.message || 'Could not load more history');
    }
  }, [entries, search]);

  useEffect(() => {
    const timer = setTimeout(() => reload(search.trim()), search ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [search, reload]);

  useEffect(() => {
    const { ipcRenderer } = window;
    if (!ipcRenderer?.on) return undefined;
    return ipcRenderer.on('main:history-updated', () => reload(search.trim()));
  }, [search, reload]);

  return { entries, hasMore, isLoading, error, loadMore, reload: () => reload(search.trim()) };
};

export default useRequestHistory;
