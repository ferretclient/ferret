const { parseFerCollection, stringifyFerCollection } = require('../index');

describe('parseFerCollection — folder tags', () => {
  it('parses tags from a folder.fer meta block, de-duplicating and trimming', () => {
    const fer = `meta {
  name: auth
  seq: 2
  tags: [
    smoke
     regression 
    smoke
  ]
}
`;

    const { meta } = parseFerCollection(fer);

    expect(meta).toEqual({ name: 'auth', seq: 2, tags: ['smoke', 'regression'] });
  });

  it('leaves tags absent when the meta block has none', () => {
    const { meta } = parseFerCollection(`meta {\n  name: auth\n}\n`);

    expect(meta).toEqual({ name: 'auth' });
    expect(meta.tags).toBeUndefined();
  });

  it('drops an inline empty list, which the lang layer surfaces as the string "[]"', () => {
    const { meta } = parseFerCollection(`meta {\n  name: auth\n  tags: []\n}\n`);

    expect(meta).toEqual({ name: 'auth' });
    expect(meta.tags).toBeUndefined();
  });

  it('drops non-string, empty and whitespace-only entries from pre-parsed json', () => {
    const { meta } = parseFerCollection(
      { meta: { name: 'auth', tags: ['  smoke  ', '', '   ', 42, null, { a: 1 }, ['nested'], 'regression'] } },
      true
    );

    expect(meta.tags).toEqual(['smoke', 'regression']);
  });

  it('omits tags when every entry normalizes away', () => {
    const { meta } = parseFerCollection({ meta: { name: 'auth', tags: ['', '   ', 7] } }, true);

    expect(meta).toEqual({ name: 'auth' });
    expect(meta.tags).toBeUndefined();
  });

  it('omits tags when the value is not an array', () => {
    expect(parseFerCollection({ meta: { name: 'auth', tags: 'smoke' } }, true).meta.tags).toBeUndefined();
    expect(parseFerCollection({ meta: { name: 'auth', tags: null } }, true).meta.tags).toBeUndefined();
    expect(parseFerCollection({ meta: { name: 'auth', tags: { smoke: true } } }, true).meta.tags).toBeUndefined();
  });

  it('does not invent a meta block for a collection.fer file that has none', () => {
    const parsed = parseFerCollection(`auth {\n  mode: none\n}\n`);

    expect(parsed.meta).toBeUndefined();
  });
});

describe('stringifyFerCollection — folder tags', () => {
  it('writes normalized tags for a folder and round-trips them', () => {
    const fer = stringifyFerCollection({ meta: { name: 'auth', seq: 2, tags: ['  smoke  ', 'smoke', 'regression'] } }, true);

    expect(fer).toContain('tags: [\n    smoke\n    regression\n  ]');

    const { meta } = parseFerCollection(fer);
    expect(meta).toEqual({ name: 'auth', seq: 2, tags: ['smoke', 'regression'] });
  });

  it('omits tags for a folder that has none, or whose tags all normalize away', () => {
    expect(stringifyFerCollection({ meta: { name: 'auth' } }, true)).not.toContain('tags');
    expect(stringifyFerCollection({ meta: { name: 'auth', tags: [] } }, true)).not.toContain('tags');
    expect(stringifyFerCollection({ meta: { name: 'auth', tags: ['', '  '] } }, true)).not.toContain('tags');
    expect(stringifyFerCollection({ meta: { name: 'auth', tags: 'smoke' } }, true)).not.toContain('tags');
  });

  it('never writes tags for a collection.fer file — tags are folder-only', () => {
    const json = { meta: { name: 'my-collection', tags: ['smoke'] } };

    expect(stringifyFerCollection(json, false)).not.toContain('tags');
    expect(stringifyFerCollection(json)).not.toContain('tags');
  });

  it('leaves the rest of the folder meta block intact when tags are present', () => {
    const fer = stringifyFerCollection(
      { meta: { name: 'auth', seq: 3, tags: ['smoke'] }, request: { headers: [{ name: 'x-api-key', value: 'abc', enabled: true }] } },
      true
    );

    const parsed = parseFerCollection(fer);
    expect(parsed.meta).toEqual({ name: 'auth', seq: 3, tags: ['smoke'] });
    expect(parsed.request.headers).toEqual([{ name: 'x-api-key', value: 'abc', enabled: true }]);
  });
});
