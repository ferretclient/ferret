import { createTestDatabase } from '../utils';
import type { TestDatabase } from '../utils';

const entry = (overrides: Record<string, unknown> = {}) => ({
  collection_uid: 'c1',
  collection_name: 'Business Central',
  item_pathname: '/work/bc/companies.fer',
  request_name: 'List companies',
  method: 'GET',
  url: 'https://api.example.com/companies',
  status: 200,
  status_text: 'OK',
  error: null,
  duration_ms: 42,
  size_bytes: 1234,
  sent_at: 1_000,
  request_file_id: null,
  response_file_id: null,
  body_file_id: null,
  ...overrides
});

const list = (statements: any, overrides: Record<string, unknown> = {}) =>
  statements.execute('list_history', { before_sent_at: null, before_id: null, search: null, limit: 50, ...overrides });

describe('request_history statements', () => {
  let database: TestDatabase;
  let statements: any;

  beforeEach(() => {
    database = createTestDatabase();
    statements = database.statements;
  });

  afterEach(() => database.cleanup());

  it('lists entries newest first', () => {
    statements.execute('insert_history_entry', entry({ request_name: 'old', sent_at: 1_000 }));
    statements.execute('insert_history_entry', entry({ request_name: 'new', sent_at: 3_000 }));
    statements.execute('insert_history_entry', entry({ request_name: 'mid', sent_at: 2_000 }));

    expect(list(statements).map((row: any) => row.request_name)).toEqual(['new', 'mid', 'old']);
  });

  it('pages with a keyset cursor, including entries sent in the same millisecond', () => {
    for (let i = 1; i <= 5; i++) {
      statements.execute('insert_history_entry', entry({ request_name: `r${i}`, sent_at: i <= 3 ? 5_000 : 1_000 + i }));
    }

    const first = list(statements, { limit: 2 });
    const last = first[first.length - 1];
    const second = list(statements, { limit: 2, before_sent_at: last.sent_at, before_id: last.id });
    const third = list(statements, { limit: 2, before_sent_at: second[1].sent_at, before_id: second[1].id });

    const names = [...first, ...second, ...third].map((row: any) => row.request_name);
    expect(names).toHaveLength(5);
    expect(new Set(names).size).toBe(5);
  });

  it('searches URL, name, method, collection and status case-insensitively', () => {
    statements.execute('insert_history_entry', entry({ url: 'https://api.example.com/Companies(12345)', request_name: 'Get company' }));
    statements.execute('insert_history_entry', entry({ method: 'POST', status: 404, url: 'https://other.test/x', request_name: 'Create', collection_name: 'Shop' }));

    expect(list(statements, { search: 'companies(12345)' })).toHaveLength(1);
    expect(list(statements, { search: 'post' })).toHaveLength(1);
    expect(list(statements, { search: '404' })).toHaveLength(1);
    expect(list(statements, { search: 'SHOP' })).toHaveLength(1);
    expect(list(statements, { search: '100%_' })).toHaveLength(0);
  });

  it('reads an entry back with its stored payloads', async () => {
    const { files } = database;
    const request = await files!.write('{"url":"x"}', { contentType: 'application/json' });
    const body = await files!.write('hello', { contentType: 'text/plain' });
    statements.execute('insert_history_entry', entry({ request_file_id: request!.id, body_file_id: body!.id }));

    const [{ id }] = list(statements);
    const row = statements.execute('get_history_entry', { id });

    expect(Buffer.from(row.request_data).toString()).toBe('{"url":"x"}');
    expect(Buffer.from(row.body_data).toString()).toBe('hello');
    expect(row.response_data).toBeNull();
  });

  it('keeps payload files referenced until the entry is deleted', async () => {
    const { files } = database;
    const body = await files!.write('hello');
    statements.execute('insert_history_entry', entry({ body_file_id: body!.id }));

    await files!.collect();
    expect(files!.stat(body!.id)).not.toBeNull();

    const [{ id }] = list(statements);
    statements.execute('delete_history_entry', { id });
    await files!.collect();
    expect(files!.stat(body!.id)).toBeNull();
  });

  it('finds rows past the age and count limits for pruning', () => {
    for (let i = 1; i <= 6; i++) {
      statements.execute('insert_history_entry', entry({ request_name: `r${i}`, sent_at: i * 1_000 }));
    }

    const byAge = statements.execute('list_history_prune_candidates', { cutoff: 2_500, keep: 100 });
    const byCount = statements.execute('list_history_prune_candidates', { cutoff: 0, keep: 4 });

    expect(byAge).toHaveLength(2);
    expect(byCount).toHaveLength(2);
    expect(statements.execute('list_history_prune_candidates', { cutoff: 0, keep: 100 })).toHaveLength(0);
  });

  it('clears everything', () => {
    statements.execute('insert_history_entry', entry());
    statements.execute('delete_all_history');

    expect(list(statements)).toHaveLength(0);
  });
});
