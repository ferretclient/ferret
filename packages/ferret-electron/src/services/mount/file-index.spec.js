const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

jest.mock('electron', () => ({
  app: { getVersion: () => '0.0.0-test' }
}));

jest.mock('../sqlite', () => ({
  getStatements: jest.fn(),
  transaction: jest.fn()
}));

const { createDatabase } = require('@ferret-app/sqlite');
const { getStatements, transaction } = require('../sqlite');
const { FileIndex } = require('./file-index');

describe('FileIndex denylist', () => {
  let collectionPath;
  let index;
  let db;

  beforeEach(() => {
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'ferret-file-index-'));
    const opened = createDatabase(':memory:');
    db = opened.db;
    getStatements.mockReturnValue(opened.statements);
    transaction.mockImplementation((callback) => opened.db._transaction(callback));
    index = new FileIndex();

    fs.mkdirSync(path.join(collectionPath, 'hidden'));
    fs.writeFileSync(path.join(collectionPath, 'hidden', 'request.fer'), 'hidden');
    fs.writeFileSync(path.join(collectionPath, 'visible.fer'), 'visible');
    index.stageParsed(collectionPath, path.join(collectionPath, 'hidden', 'request.fer'), { name: 'Hidden' });
    index.stageParsed(collectionPath, path.join(collectionPath, 'visible.fer'), { name: 'Visible' });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(collectionPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  test('does not return denied rows from the cache', () => {
    const entries = index.entries(collectionPath, { denylist: ['hidden'] });

    expect([...entries.keys()]).toEqual(['visible.fer']);
  });

  test('does not return rows denied by a folder entry with a trailing separator', () => {
    const entries = index.entries(collectionPath, { denylist: ['hidden/'] });

    expect([...entries.keys()]).toEqual(['visible.fer']);
  });

  test('does not return a row whose path matches a glob', () => {
    const entries = index.entries(collectionPath, { denylist: ['hidden/**'] });

    expect([...entries.keys()]).toEqual(['visible.fer']);
  });

  test('returns a cached file when only an ancestor directory matches the glob', () => {
    const nestedHidden = path.join(collectionPath, 'nested', 'hidden');
    fs.mkdirSync(nestedHidden, { recursive: true });
    fs.writeFileSync(path.join(nestedHidden, 'request.fer'), 'nested-hidden');
    index.stageParsed(collectionPath, path.join(nestedHidden, 'request.fer'), { name: 'Nested Hidden' });

    const entries = index.entries(collectionPath, { denylist: ['**/hidden'] });

    expect([...entries.keys()].sort()).toEqual([
      'visible.fer',
      path.join('hidden', 'request.fer'),
      path.join('nested', 'hidden', 'request.fer')
    ].sort());
  });

  test('does not remove cached rows for a trailing-slash glob', async () => {
    const { removed } = await index.status(collectionPath, { denylist: ['**/'] });
    const removedPaths = removed.map(({ relativePath }) => relativePath);

    expect(removedPaths).not.toContain('visible.fer');
    expect(removedPaths).not.toContain(path.join('hidden', 'request.fer'));
  });

  test('marks previously cached denied rows for removal', async () => {
    const { removed } = await index.status(collectionPath, { denylist: ['hidden'] });

    expect(removed.map(({ relativePath }) => relativePath)).toContain(path.join('hidden', 'request.fer'));
  });

  test('returns denied rows when no denylist is passed', () => {
    const entries = index.entries(collectionPath);

    expect([...entries.keys()].sort()).toEqual([
      path.join('hidden', 'request.fer'),
      'visible.fer'
    ].sort());
  });
});
