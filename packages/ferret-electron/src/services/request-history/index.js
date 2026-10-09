const { omit } = require('lodash');
const { safeParseJSON, safeStringifyJSON } = require('../../utils/common');
const { isSensitiveName, REDACTED_VALUE } = require('../../utils/sensitive-names');
const { preferencesUtil } = require('../../store/preferences');
const { getStatements, getFiles } = require('../sqlite');

const JSON_CONTENT_TYPE = 'application/json';
const MAX_ENTRIES = 1000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// A stored body is cut at this size; the entry records that it was truncated.
const MAX_STORED_BODY_BYTES = 1024 * 1024;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;
const MAX_SEARCH_LENGTH = 200;
const MAX_PRUNE_BATCHES = 50;

// Recording, cleanup and deletes run one at a time: files.collect() removes file rows that no
// history row references yet, so it must never overlap a record() that has written but not inserted.
let queue = Promise.resolve();
const enqueue = (task) => {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
};

const redactHeaders = (headers) => {
  if (!headers || typeof headers !== 'object') return {};
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name, isSensitiveName(name) ? REDACTED_VALUE : value])
  );
};

// Masks the values of sensitive query parameters (api_key, access_token, …) on the raw URL string,
// leaving everything else, including unresolved {{variables}}, exactly as sent.
const redactUrl = (url) => {
  if (typeof url !== 'string') return '';
  return url.replace(/([?&])([^=&#]+)=([^&#]*)/g, (match, separator, name) => {
    let decodedName = name;
    try {
      decodedName = decodeURIComponent(name);
    } catch {
      // keep the raw name
    }
    return isSensitiveName(decodedName) ? `${separator}${name}=${REDACTED_VALUE}` : match;
  });
};

const toBodyText = (data) => {
  if (data === undefined || data === null || data === '') return null;
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data) || typeof data.pipe === 'function') return '[binary body]';
  return safeStringifyJSON(data);
};

const truncateText = (text, maxBytes) => {
  if (text === null || Buffer.byteLength(text) <= maxBytes) return { text, truncated: false };
  return { text: Buffer.from(text).subarray(0, maxBytes).toString(), truncated: true };
};

const getContentType = (headers) => {
  const found = Object.entries(headers || {}).find(([name]) => String(name).toLowerCase() === 'content-type');
  return found ? String(found[1]) : null;
};

const writeJson = async (value) => {
  const entry = await getFiles().write(safeStringifyJSON(value), { contentType: JSON_CONTENT_TYPE });
  return entry ? entry.id : null;
};

const removeFiles = async (ids) => {
  for (const id of ids.filter(Boolean)) {
    await getFiles().remove(id).catch((err) => console.warn('[history] failed to remove file', id, err));
  }
};

const fileIdsOf = (row) => [row?.request_file_id, row?.response_file_id, row?.body_file_id];

const pruneNow = async () => {
  const keep = MAX_ENTRIES;
  const cutoff = Date.now() - MAX_AGE_MS;
  for (let batch = 0; batch < MAX_PRUNE_BATCHES; batch++) {
    const expired = getStatements().execute('list_history_prune_candidates', { cutoff, keep });
    if (!expired.length) return;
    for (const row of expired) {
      getStatements().execute('delete_history_entry', { id: row.id });
      await removeFiles(fileIdsOf(row));
    }
  }
};

const buildRecord = async ({ item, collection, response }, { saveBodies }) => {
  const sent = response.requestSent || {};
  const itemRequest = item?.request || {};

  const requestBody = saveBodies ? truncateText(toBodyText(sent.data), MAX_STORED_BODY_BYTES) : { text: null, truncated: false };
  const requestFileId = await writeJson({
    method: sent.method || itemRequest.method || '',
    url: redactUrl(sent.url || itemRequest.url),
    headers: redactHeaders(sent.headers),
    body: requestBody.text,
    bodyTruncated: requestBody.truncated
  });

  let responseFileId = null;
  let bodyFileId = null;
  if (response.status !== undefined && response.status !== null) {
    let bodyTruncated = false;
    if (saveBodies && response.dataBuffer) {
      let bytes = Buffer.from(response.dataBuffer, 'base64');
      if (bytes.length > MAX_STORED_BODY_BYTES) {
        bytes = bytes.subarray(0, MAX_STORED_BODY_BYTES);
        bodyTruncated = true;
      }
      const stored = await getFiles().write(bytes, { contentType: getContentType(response.headers) });
      bodyFileId = stored ? stored.id : null;
    }
    responseFileId = await writeJson({
      status: response.status,
      statusText: response.statusText || '',
      headers: redactHeaders(response.headers),
      url: redactUrl(response.url),
      bodyOmitted: !saveBodies,
      bodyTruncated
    });
  }

  return {
    collection_uid: collection.uid,
    collection_name: collection.name || '',
    item_pathname: item?.pathname || null,
    request_name: item?.name || '',
    method: String(sent.method || itemRequest.method || '').toUpperCase(),
    url: redactUrl(sent.url || itemRequest.url),
    status: typeof response.status === 'number' ? response.status : null,
    status_text: response.statusText || null,
    error: response.error ? String(response.error).slice(0, 2000) : null,
    duration_ms: Number.isFinite(response.duration) ? Math.round(response.duration) : null,
    size_bytes: Number.isFinite(response.size) ? response.size : null,
    sent_at: Number.isFinite(sent.timestamp) ? sent.timestamp : Date.now(),
    request_file_id: requestFileId,
    response_file_id: responseFileId,
    body_file_id: bodyFileId
  };
};

/**
 * Stores one sent request and its outcome. Never throws and never blocks the caller: history is a
 * convenience, so a full disk or an unavailable database only means this send is not remembered.
 */
const recordHistory = ({ item, collection, response }) => {
  const preferences = preferencesUtil.getHistoryPreferences();
  if (!preferences.enabled || !response || response.isCancel || !collection?.uid) {
    return Promise.resolve(false);
  }

  return enqueue(async () => {
    try {
      const record = await buildRecord({ item, collection, response }, preferences);
      getStatements().execute('insert_history_entry', record);
      await pruneNow();
      return true;
    } catch (error) {
      console.error('[history] failed to record request', error);
      return false;
    }
  });
};

const clampPageSize = (limit) => {
  const size = Number.isInteger(limit) ? limit : DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
};

const listHistory = ({ beforeSentAt = null, beforeId = null, search = null, limit } = {}) => {
  const term = typeof search === 'string' && search.trim() ? search.trim().slice(0, MAX_SEARCH_LENGTH) : null;
  const hasCursor = Number.isFinite(beforeSentAt) && Number.isInteger(beforeId);
  return getStatements().execute('list_history', {
    before_sent_at: hasCursor ? beforeSentAt : null,
    before_id: hasCursor ? beforeId : null,
    search: term,
    limit: clampPageSize(limit)
  });
};

const readPayload = async (id, data) => {
  if (data) return Buffer.from(data);
  if (!id) return null;
  const payload = await getFiles().read(id);
  return payload ? Buffer.from(payload) : null;
};

const getHistoryEntry = async (id) => {
  if (!Number.isInteger(id)) return null;
  const row = getStatements().execute('get_history_entry', { id });
  if (!row) return null;

  const [requestPayload, responsePayload, bodyPayload] = await Promise.all([
    readPayload(row.request_file_id, row.request_data),
    readPayload(row.response_file_id, row.response_data),
    readPayload(row.body_file_id, row.body_data)
  ]);

  const summary = omit(row, ['request_data', 'response_data', 'body_data', 'request_file_id', 'response_file_id', 'body_file_id']);
  return {
    ...summary,
    request: requestPayload ? safeParseJSON(requestPayload.toString()) : null,
    response: responsePayload ? safeParseJSON(responsePayload.toString()) : null,
    body: bodyPayload ? bodyPayload.toString('utf8') : null
  };
};

const deleteHistoryEntry = (id) =>
  enqueue(async () => {
    if (!Number.isInteger(id)) return false;
    const files = getStatements().execute('get_history_file_ids', { id });
    getStatements().execute('delete_history_entry', { id });
    await removeFiles(fileIdsOf(files));
    return true;
  });

const clearHistory = () =>
  enqueue(async () => {
    const rows = getStatements().execute('list_history_file_ids');
    getStatements().execute('delete_all_history');
    await removeFiles(rows.flatMap(fileIdsOf));
    return true;
  });

module.exports = {
  recordHistory,
  listHistory,
  getHistoryEntry,
  deleteHistoryEntry,
  clearHistory,
  pruneHistory: () => enqueue(pruneNow),
  redactUrl,
  redactHeaders,
  MAX_ENTRIES,
  MAX_STORED_BODY_BYTES
};
