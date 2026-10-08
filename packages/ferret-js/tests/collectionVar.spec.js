const Fer = require('../src/fer');

describe('Collection Variable APIs', () => {
  const makeFer = (collectionVariables = {}) =>
    new Fer({
      runtime: 'quickjs',
      envVariables: {},
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test',
      collectionVariables
    });

  describe('fer.setCollectionVar', () => {
    test('sets a new collection variable', () => {
      const fer = makeFer();
      fer.setCollectionVar('baseUrl', 'https://api.example.com');
      expect(fer.collectionVariables.baseUrl).toBe('https://api.example.com');
    });

    test('overwrites an existing collection variable', () => {
      const fer = makeFer({ baseUrl: 'https://old.com' });
      fer.setCollectionVar('baseUrl', 'https://new.com');
      expect(fer.collectionVariables.baseUrl).toBe('https://new.com');
    });

    test('allows non-string values', () => {
      const fer = makeFer();
      fer.setCollectionVar('count', 42);
      expect(fer.collectionVariables.count).toBe(42);

      fer.setCollectionVar('active', true);
      expect(fer.collectionVariables.active).toBe(true);

      fer.setCollectionVar('config', { port: 3000 });
      expect(fer.collectionVariables.config).toEqual({ port: 3000 });
    });

    test('throws when key is empty', () => {
      const fer = makeFer();
      expect(() => fer.setCollectionVar('', 'v')).toThrow(/without specifying a name/);
    });

    test('throws when key has invalid characters', () => {
      const fer = makeFer();
      expect(() => fer.setCollectionVar('invalid key', 'v')).toThrow(/contains invalid characters/);
    });

    test('re-run: setting same key twice does not throw', () => {
      const fer = makeFer();
      fer.setCollectionVar('key', 'first');
      fer.setCollectionVar('key', 'second');
      expect(fer.collectionVariables.key).toBe('second');
    });
  });

  describe('fer.setCollectionVar — dirty flag for typed values', () => {
    test('setting a number trips the collection-vars dirty flag', () => {
      const fer = makeFer();
      expect(fer._collVarsDirty).toBe(false);
      fer.setCollectionVar('count', 42);
      expect(fer._collVarsDirty).toBe(true);
    });

    test('setting a boolean trips the collection-vars dirty flag', () => {
      const fer = makeFer();
      fer.setCollectionVar('active', true);
      expect(fer._collVarsDirty).toBe(true);
    });

    test('setting an object trips the collection-vars dirty flag', () => {
      const fer = makeFer();
      fer.setCollectionVar('config', { port: 3000 });
      expect(fer._collVarsDirty).toBe(true);
    });
  });

  describe('fer.setCollectionVar — dirty flag for reference-mutation idiom', () => {
    test('the getCollectionVar → mutate → setCollectionVar idiom trips the dirty flag', () => {
      const fer = makeFer({ config: { port: 3000 } });
      expect(fer._collVarsDirty).toBe(false);
      // Real-script idiom: getCollectionVar deep-copies through interpolate's JSON roundtrip,
      // so mutating the result leaves the store untouched and the deep-equal guard fires.
      const config = fer.getCollectionVar('config');
      config.port = 4000;
      fer.setCollectionVar('config', config);
      expect(fer._collVarsDirty).toBe(true);
      expect(fer.collectionVariables.config).toEqual({ port: 4000 });
    });

    test('re-setting a structurally-equal object value does NOT trip the dirty flag', () => {
      const fer = makeFer({ config: { port: 3000 } });
      fer.setCollectionVar('config', { port: 3000 });
      expect(fer._collVarsDirty).toBe(false);
    });

    test('re-setting a structurally-equal primitive value does NOT trip the dirty flag', () => {
      const fer = makeFer({ token: 'abc' });
      fer.setCollectionVar('token', 'abc');
      expect(fer._collVarsDirty).toBe(false);
    });
  });

  describe('fer.deleteCollectionVar — dirty flag contract', () => {
    test('deleting an existing key trips the collection-vars dirty flag', () => {
      const fer = makeFer({ token: 'abc' });
      fer.deleteCollectionVar('token');
      expect(fer._collVarsDirty).toBe(true);
    });

    test('deleting a non-existent key leaves the dirty flag clean', () => {
      const fer = makeFer();
      fer.deleteCollectionVar('missing');
      expect(fer._collVarsDirty).toBe(false);
    });
  });

  describe('fer.deleteAllCollectionVars — dirty flag contract', () => {
    test('deleting populated scope trips the dirty flag', () => {
      const fer = makeFer({ a: '1', b: '2' });
      fer.deleteAllCollectionVars();
      expect(fer._collVarsDirty).toBe(true);
    });

    test('calling on empty scope leaves the dirty flag clean', () => {
      const fer = makeFer();
      fer.deleteAllCollectionVars();
      expect(fer._collVarsDirty).toBe(false);
    });
  });

  describe('fer.getCollectionVar', () => {
    test('returns the value of an existing variable', () => {
      const fer = makeFer({ token: 'abc123' });
      expect(fer.getCollectionVar('token')).toBe('abc123');
    });

    test('returns undefined for a non-existent variable', () => {
      const fer = makeFer();
      expect(fer.getCollectionVar('missing')).toBeUndefined();
    });
  });

  describe('fer.hasCollectionVar', () => {
    test('returns true for an existing variable', () => {
      const fer = makeFer({ token: 'abc' });
      expect(fer.hasCollectionVar('token')).toBe(true);
    });

    test('returns false for a non-existent variable', () => {
      const fer = makeFer();
      expect(fer.hasCollectionVar('missing')).toBe(false);
    });
  });

  describe('fer.deleteCollectionVar', () => {
    test('removes an existing variable', () => {
      const fer = makeFer({ token: 'abc' });
      fer.deleteCollectionVar('token');
      expect(fer.collectionVariables.token).toBeUndefined();
      expect(fer.hasCollectionVar('token')).toBe(false);
    });

    test('re-run: deleting a non-existent key is a silent no-op', () => {
      const fer = makeFer();
      expect(() => fer.deleteCollectionVar('missing')).not.toThrow();
    });

    test('re-run: deleting an already-deleted key is a silent no-op', () => {
      const fer = makeFer({ token: 'abc' });
      fer.deleteCollectionVar('token');
      expect(() => fer.deleteCollectionVar('token')).not.toThrow();
    });
  });

  describe('fer.deleteAllCollectionVars', () => {
    test('removes all collection variables', () => {
      const fer = makeFer({ a: '1', b: '2', c: '3' });
      fer.deleteAllCollectionVars();
      expect(fer.collectionVariables).toEqual({});
    });

    test('re-run: calling on empty scope is a silent no-op', () => {
      const fer = makeFer();
      expect(() => fer.deleteAllCollectionVars()).not.toThrow();
      expect(fer.collectionVariables).toEqual({});
    });

    test('re-run: calling twice is a silent no-op', () => {
      const fer = makeFer({ a: '1' });
      fer.deleteAllCollectionVars();
      expect(() => fer.deleteAllCollectionVars()).not.toThrow();
      expect(fer.collectionVariables).toEqual({});
    });
  });

  describe('fer.getAllCollectionVars', () => {
    test('returns a copy of all collection variables', () => {
      const fer = makeFer({ a: '1', b: '2' });
      const all = fer.getAllCollectionVars();
      expect(all).toEqual({ a: '1', b: '2' });
    });

    test('returned object is a copy, not a reference', () => {
      const fer = makeFer({ a: '1' });
      const all = fer.getAllCollectionVars();
      all.a = 'mutated';
      expect(fer.collectionVariables.a).toBe('1');
    });

    test('returns empty object when no variables exist', () => {
      const fer = makeFer();
      expect(fer.getAllCollectionVars()).toEqual({});
    });
  });
});
