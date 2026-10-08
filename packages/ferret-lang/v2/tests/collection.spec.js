const fs = require('fs');
const path = require('path');
const collectionFerToJson = require('../src/collectionFerToJson');
const jsonToCollectionFer = require('../src/jsonToCollectionFer');

describe('collectionFerToJson', () => {
  it('should parse the collection fer file', () => {
    const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'collection.fer'), 'utf8');
    const expected = require('./fixtures/collection.json');
    const output = collectionFerToJson(input);

    expect(output).toEqual(expected);
  });
});

describe('jsonToCollectionFer', () => {
  it('should convert the collection json to fer', () => {
    const input = require('./fixtures/collection.json');
    const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'collection.fer'), 'utf8');
    const output = jsonToCollectionFer(input);

    expect(output).toEqual(expected);
  });
});

describe('description round-trip in collection.fer', () => {
  it('should round-trip a multiline description on a header', () => {
    const json = {
      headers: [{ name: 'Authorization', value: 'Bearer token', enabled: true, description: 'Line 1\nLine 2' }]
    };
    const fer = jsonToCollectionFer(json);
    const parsed = collectionFerToJson(fer);
    expect(parsed.headers[0].description).toBe('Line 1\nLine 2');
    expect(parsed.headers[0].value).toBe('Bearer token');
  });

  it('should round-trip a description on a var with a multiline value', () => {
    const json = {
      vars: {
        req: [{ name: 'myVar', value: 'line1\nline2', enabled: true, description: 'my desc' }]
      }
    };
    const fer = jsonToCollectionFer(json);
    const parsed = collectionFerToJson(fer);
    expect(parsed.vars.req[0].description).toBe('my desc');
    expect(parsed.vars.req[0].value).toBe('line1\nline2');
  });

  it('should round-trip a description containing triple-quotes', () => {
    const json = {
      headers: [{ name: 'X-Token', value: 'abc', enabled: true, description: 'has \'\'\' quotes' }]
    };
    const fer = jsonToCollectionFer(json);
    const parsed = collectionFerToJson(fer);
    expect(parsed.headers[0].description).toBe('has \'\'\' quotes');
  });
});

describe('jsonToCollectionFer - meta tags', () => {
  it('should serialize tags as a list block', () => {
    const fer = jsonToCollectionFer({ meta: { name: 'folder', seq: 1, tags: ['tag_1', 'tag_2'] } });

    expect(fer).toEqual(`meta {
  name: folder
  seq: 1
  tags: [
    tag_1
    tag_2
  ]
}
`);
  });

  it('should not write a tags key when tags is an empty array', () => {
    const fer = jsonToCollectionFer({ meta: { name: 'folder', tags: [] } });

    expect(fer).toEqual(`meta {
  name: folder
}
`);
  });

  it('should not write a tags key when tags is absent', () => {
    const fer = jsonToCollectionFer({ meta: { name: 'folder' } });

    expect(fer).toEqual(`meta {
  name: folder
}
`);
  });

  it('should serialize tags alongside other blocks', () => {
    const fer = jsonToCollectionFer({
      meta: { name: 'folder', tags: ['tag_1'] },
      headers: [{ name: 'content-type', value: 'application/json', enabled: true }],
      docs: 'some docs'
    });

    expect(fer).toEqual(`meta {
  name: folder
  tags: [
    tag_1
  ]
}

headers {
  content-type: application/json
}

docs {
  some docs
}
`);
  });
});

describe('tags round-trip in collection.fer', () => {
  it('should round-trip folder meta tags', () => {
    const json = { meta: { name: 'folder', seq: 1, tags: ['tag_1', 'tag-2', 'Tag_3'] } };
    const parsed = collectionFerToJson(jsonToCollectionFer(json));

    expect(parsed.meta.tags).toEqual(['tag_1', 'tag-2', 'Tag_3']);
    expect(parsed.meta.name).toEqual('folder');
    expect(parsed.meta.seq).toEqual('1');
  });

  it('should round-trip a collection.fer that has tags and other blocks', () => {
    const json = {
      meta: { name: 'folder', tags: ['smoke'] },
      headers: [{ name: 'Authorization', value: 'Bearer 123', enabled: true }],
      docs: 'This folder needs auth token to be set in the headers.'
    };
    const parsed = collectionFerToJson(jsonToCollectionFer(json));

    expect(parsed.meta.tags).toEqual(['smoke']);
    expect(parsed.headers).toEqual([{ name: 'Authorization', value: 'Bearer 123', enabled: true }]);
    expect(parsed.docs).toEqual('This folder needs auth token to be set in the headers.');
  });

  it('should round-trip a meta block with no tags', () => {
    const parsed = collectionFerToJson(jsonToCollectionFer({ meta: { name: 'folder', tags: [] } }));

    expect(parsed.meta.tags).toBeUndefined();
    expect(parsed.meta.name).toEqual('folder');
  });
});
