const mockPrefs = { enabled: true, saveBodies: true };
let mockDatabase;

jest.mock('electron', () => ({ app: { getPath: jest.fn(() => require('node:os').tmpdir()) } }));
jest.mock('../../store/preferences', () => ({
  preferencesUtil: { getHistoryPreferences: () => ({ ...mockPrefs }) }
}));
jest.mock('../sqlite', () => ({
  getStatements: () => mockDatabase.statements,
  getFiles: () => mockDatabase.files
}));

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDatabase } = require('@ferret-app/sqlite');
const {
  recordHistory,
  listHistory,
  getHistoryEntry,
  deleteHistoryEntry,
  clearHistory,
  redactUrl,
  MAX_STORED_BODY_BYTES
} = require('./index');

const collection = { uid: 'col1', name: 'Business Central' };
const item = { uid: 'item1', name: 'List companies', pathname: '/work/bc/companies.fer', request: { method: 'GET', url: '{{host}}/companies' } };

const makeResponse = (overrides = {}) => ({
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json', 'set-cookie': 'session=abc' },
  dataBuffer: Buffer.from('{"value":[{"id":"12345"}]}').toString('base64'),
  size: 26,
  duration: 41.6,
  requestSent: {
    url: 'https://api.example.com/companies?api_key=SECRET&$top=5',
    method: 'GET',
    headers: { Authorization: 'Bearer SECRET', Accept: 'application/json' },
    data: '',
    timestamp: Date.now()
  },
  ...overrides
});

describe('request history service', () => {
  let directory;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ferret-history-spec-'));
    mockDatabase = createDatabase(path.join(directory, 'ferret.db'), { filesDir: path.join(directory, 'files') });
    Object.assign(mockPrefs, { enabled: true, saveBodies: true });
  });

  afterEach(() => {
    mockDatabase.db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('records a send and reads it back with request, response and body', async () => {
    await expect(recordHistory({ item, collection, response: makeResponse() })).resolves.toBe(true);

    const [summary] = listHistory();
    expect(summary).toMatchObject({
      collection_name: 'Business Central',
      request_name: 'List companies',
      method: 'GET',
      status: 200,
      duration_ms: 42,
      item_pathname: '/work/bc/companies.fer'
    });

    const entry = await getHistoryEntry(summary.id);
    expect(entry.request.method).toBe('GET');
    expect(entry.response).toMatchObject({ status: 200, statusText: 'OK' });
    expect(entry.body).toBe('{"value":[{"id":"12345"}]}');
  });

  it('redacts credentials in headers and query strings before storing them', async () => {
    await recordHistory({ item, collection, response: makeResponse() });

    const [summary] = listHistory();
    const entry = await getHistoryEntry(summary.id);

    expect(summary.url).toBe('https://api.example.com/companies?api_key=<redacted>&$top=5');
    expect(entry.request.headers).toEqual({ Authorization: '<redacted>', Accept: 'application/json' });
    expect(entry.response.headers['set-cookie']).toBe('<redacted>');
    expect(JSON.stringify(entry)).not.toContain('SECRET');
  });

  it('keeps no bodies when saveBodies is off', async () => {
    mockPrefs.saveBodies = false;
    await recordHistory({
      item,
      collection,
      response: makeResponse({ requestSent: { ...makeResponse().requestSent, data: '{"a":1}' } })
    });

    const entry = await getHistoryEntry(listHistory()[0].id);
    expect(entry.body).toBeNull();
    expect(entry.request.body).toBeNull();
    expect(entry.response.bodyOmitted).toBe(true);
  });

  it('truncates an oversized body and says so', async () => {
    const big = Buffer.alloc(MAX_STORED_BODY_BYTES + 10, 'a').toString('base64');
    await recordHistory({ item, collection, response: makeResponse({ dataBuffer: big }) });

    const entry = await getHistoryEntry(listHistory()[0].id);
    expect(Buffer.byteLength(entry.body)).toBe(MAX_STORED_BODY_BYTES);
    expect(entry.response.bodyTruncated).toBe(true);
  });

  it('records failures that never reached a server', async () => {
    await recordHistory({ item, collection, response: { error: 'connect ECONNREFUSED 127.0.0.1:1', requestSent: undefined } });

    const [summary] = listHistory();
    expect(summary).toMatchObject({ status: null, error: 'connect ECONNREFUSED 127.0.0.1:1', url: '{{host}}/companies' });
  });

  it('does not record when history is off or the request was cancelled', async () => {
    mockPrefs.enabled = false;
    await expect(recordHistory({ item, collection, response: makeResponse() })).resolves.toBe(false);

    mockPrefs.enabled = true;
    await expect(recordHistory({ item, collection, response: { isCancel: true, error: 'REQUEST_CANCELLED' } })).resolves.toBe(false);

    expect(listHistory()).toHaveLength(0);
  });

  it('prunes entries older than the retention window as they are recorded', async () => {
    const old = makeResponse();
    old.requestSent.timestamp = Date.now() - 31 * 24 * 60 * 60 * 1000;

    await recordHistory({ item, collection, response: old });
    expect(listHistory()).toHaveLength(0);
    expect(fs.existsSync(path.join(directory, 'files')) ? fs.readdirSync(path.join(directory, 'files')) : []).toHaveLength(0);
  });

  it('deletes one entry and its payloads, or clears everything', async () => {
    await recordHistory({ item, collection, response: makeResponse() });
    await recordHistory({ item, collection, response: makeResponse() });
    const [first] = listHistory();

    await deleteHistoryEntry(first.id);
    expect(listHistory()).toHaveLength(1);
    await expect(getHistoryEntry(first.id)).resolves.toBeNull();

    await clearHistory();
    expect(listHistory()).toHaveLength(0);
    expect(mockDatabase.statements.execute('list_history_file_ids')).toHaveLength(0);
  });

  it('serializes concurrent records without losing entries', async () => {
    await Promise.all(Array.from({ length: 10 }, () => recordHistory({ item, collection, response: makeResponse() })));

    expect(listHistory({ limit: 100 })).toHaveLength(10);
  });

  it('clamps the page size and treats a half cursor as no cursor', async () => {
    await recordHistory({ item, collection, response: makeResponse() });

    expect(listHistory({ limit: 100000 })).toHaveLength(1);
    expect(listHistory({ beforeSentAt: 5, beforeId: null })).toHaveLength(1);
  });
});

describe('redactUrl', () => {
  it('masks sensitive query values only', () => {
    expect(redactUrl('https://x.test/a?token=1&page=2&client_secret=3')).toBe(
      'https://x.test/a?token=<redacted>&page=2&client_secret=<redacted>'
    );
    expect(redactUrl('{{host}}/a?x={{y}}')).toBe('{{host}}/a?x={{y}}');
    expect(redactUrl(undefined)).toBe('');
  });
});
