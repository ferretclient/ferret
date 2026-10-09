import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import StatusBadge from 'ui/StatusBadge';
import MethodBadge from 'ui/MethodBadge';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { findItemInCollectionByPathname, getDefaultRequestPaneTab } from 'utils/collections';
import { formatSize, formatDuration } from 'utils/common';
import { formatHistoryBody, getHistoryStatusLabel, getHistoryStatusTone } from 'utils/history';
import { getHistoryEntry, deleteHistoryEntry } from 'hooks/useRequestHistory';
import StyledWrapper from './StyledWrapper';

const TABS = [
  { id: 'response', label: 'Response' },
  { id: 'request', label: 'Request' }
];

const HeadersTable = ({ headers }) => {
  const rows = Object.entries(headers || {});
  if (!rows.length) return <div className="empty">No headers</div>;
  return (
    <table className="headers-table">
      <tbody>
        {rows.map(([name, value]) => (
          <tr key={name}>
            <td className="header-name">{name}</td>
            <td className="header-value">{String(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const BodyView = ({ body, notes }) => {
  const { text, clipped } = formatHistoryBody(body);
  return (
    <>
      {notes.map((note) => (
        <div key={note} className="note">{note}</div>
      ))}
      {text ? <pre className="body-view" data-testid="history-body">{text}</pre> : <div className="empty">No body</div>}
      {clipped ? <div className="note">Showing the first part of a large body.</div> : null}
    </>
  );
};

const HistoryEntryModal = ({ summary, onClose, onDeleted }) => {
  const dispatch = useDispatch();
  const collection = useSelector((state) => state.collections.collections.find((c) => c.uid === summary.collection_uid));
  const [entry, setEntry] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState('response');

  useEffect(() => {
    let cancelled = false;
    getHistoryEntry(summary.id)
      .then((loaded) => {
        if (cancelled) return;
        if (loaded) setEntry(loaded);
        else setLoadError('This entry is no longer available.');
      })
      .catch((err) => !cancelled && setLoadError(err?.message || 'Could not load this entry.'));
    return () => {
      cancelled = true;
    };
  }, [summary.id]);

  // The saved request this send came from, when its collection is open and the file still exists.
  const savedItem = collection && summary.item_pathname ? findItemInCollectionByPathname(collection, summary.item_pathname) : null;

  const handleOpenRequest = () => {
    dispatch(addTab({
      uid: savedItem.uid,
      collectionUid: collection.uid,
      requestPaneTab: getDefaultRequestPaneTab(savedItem),
      type: savedItem.type,
      pathname: savedItem.pathname
    }));
    onClose();
  };

  const handleDelete = async () => {
    await deleteHistoryEntry(summary.id);
    onDeleted();
  };

  const responseNotes = [
    entry?.response?.bodyOmitted ? 'The body was not saved (history is set to skip bodies).' : null,
    entry?.response?.bodyTruncated ? 'The saved body was cut at 1 MB.' : null
  ].filter(Boolean);
  const requestNotes = [entry?.request?.bodyTruncated ? 'The saved body was cut at 1 MB.' : null].filter(Boolean);

  return (
    <Portal>
      <Modal
        size="lg"
        title="Request history"
        confirmText="Close"
        handleConfirm={onClose}
        handleCancel={onClose}
        hideCancel
        dataTestId="history-entry-modal"
        footerLeft={(
          <div className="flex items-center gap-4">
            <button type="button" className="text-link" onClick={handleOpenRequest} disabled={!savedItem} data-testid="history-open-request" title={savedItem ? 'Open the saved request' : 'The saved request is not available'}>
              Open request
            </button>
            <button type="button" className="text-link" onClick={handleDelete} data-testid="history-delete-entry">
              Delete entry
            </button>
          </div>
        )}
      >
        <StyledWrapper>
          <div className="summary">
            <MethodBadge method={summary.method} />
            <span className="summary-url" title={summary.url}>{summary.url}</span>
          </div>
          <div className="summary-meta">
            <StatusBadge status={getHistoryStatusTone(summary)}>{getHistoryStatusLabel(summary)}{summary.status_text ? ` ${summary.status_text}` : ''}</StatusBadge>
            {summary.duration_ms !== null ? <span>{formatDuration(summary.duration_ms)}</span> : null}
            {summary.size_bytes !== null ? <span>{formatSize(summary.size_bytes)}</span> : null}
            <span>{new Date(summary.sent_at).toLocaleString()}</span>
            <span>{[summary.collection_name, summary.request_name].filter(Boolean).join(' › ')}</span>
          </div>
          {summary.error ? <div className="error" role="alert">{summary.error}</div> : null}

          <div className="tabs" role="tablist">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? 'tab active' : 'tab'}
                onClick={() => setTab(id)}
                data-testid={`history-tab-${id}`}
              >
                {label}
              </button>
            ))}
          </div>

          {loadError ? <div className="error" role="alert">{loadError}</div> : null}
          {!entry && !loadError ? <div className="empty">Loading…</div> : null}
          {entry && tab === 'response' ? (
            <>
              <div className="section-title">Headers</div>
              <HeadersTable headers={entry.response?.headers} />
              <div className="section-title">Body</div>
              <BodyView body={entry.body} notes={responseNotes} />
            </>
          ) : null}
          {entry && tab === 'request' ? (
            <>
              <div className="section-title">Headers</div>
              <HeadersTable headers={entry.request?.headers} />
              <div className="section-title">Body</div>
              <BodyView body={entry.request?.body} notes={requestNotes} />
              <div className="note">Credentials in headers and query strings are masked before history is saved.</div>
            </>
          ) : null}
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default HistoryEntryModal;
