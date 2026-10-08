const Fer = require('../src/fer');

describe('Global Environment Variable APIs', () => {
  const makeFer = (globalEnvironmentVariables = {}) =>
    new Fer({
      runtime: 'quickjs',
      envVariables: {},
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test',
      globalEnvironmentVariables
    });

  describe('fer.setGlobalEnvVar', () => {
    test('sets a new global env variable', () => {
      const fer = makeFer();
      fer.setGlobalEnvVar('apiKey', 'abc123');
      expect(fer.globalEnvironmentVariables.apiKey).toBe('abc123');
    });

    test('overwrites an existing variable', () => {
      const fer = makeFer({ apiKey: 'old' });
      fer.setGlobalEnvVar('apiKey', 'new');
      expect(fer.globalEnvironmentVariables.apiKey).toBe('new');
    });

    test('allows non-string values', () => {
      const fer = makeFer();
      fer.setGlobalEnvVar('count', 42);
      expect(fer.globalEnvironmentVariables.count).toBe(42);

      fer.setGlobalEnvVar('config', { port: 3000 });
      expect(fer.globalEnvironmentVariables.config).toEqual({ port: 3000 });
    });

    test('throws when key is empty', () => {
      const fer = makeFer();
      expect(() => fer.setGlobalEnvVar('', 'v')).toThrow(/without specifying a name/);
    });

    test('rejects key with invalid characters', () => {
      const fer = makeFer();
      expect(() => fer.setGlobalEnvVar('invalid key', 'v')).toThrow(/contains invalid characters/);
      expect(fer.globalEnvironmentVariables).not.toHaveProperty('invalid key');
    });

    test('re-run: setting same key twice does not throw', () => {
      const fer = makeFer();
      fer.setGlobalEnvVar('key', 'first');
      fer.setGlobalEnvVar('key', 'second');
      expect(fer.globalEnvironmentVariables.key).toBe('second');
    });
  });

  describe('fer.setGlobalEnvVar — dirty flag for typed values', () => {
    test('setting a number trips the global-env dirty flag', () => {
      const fer = makeFer();
      expect(fer._globalEnvDirty).toBe(false);
      fer.setGlobalEnvVar('count', 42);
      expect(fer._globalEnvDirty).toBe(true);
    });

    test('setting a boolean trips the global-env dirty flag', () => {
      const fer = makeFer();
      fer.setGlobalEnvVar('active', true);
      expect(fer._globalEnvDirty).toBe(true);
    });

    test('setting an object trips the global-env dirty flag', () => {
      const fer = makeFer();
      fer.setGlobalEnvVar('config', { port: 3000 });
      expect(fer._globalEnvDirty).toBe(true);
    });
  });

  describe('fer.setGlobalEnvVar — dirty flag for reference-mutation idiom', () => {
    test('the getGlobalEnvVar → mutate → setGlobalEnvVar idiom trips the dirty flag', () => {
      const fer = makeFer({ config: { port: 3000 } });
      expect(fer._globalEnvDirty).toBe(false);
      // Real-script idiom: getGlobalEnvVar deep-copies through interpolate's JSON roundtrip,
      // so mutating the result leaves the store untouched and the deep-equal guard fires.
      const config = fer.getGlobalEnvVar('config');
      config.port = 4000;
      fer.setGlobalEnvVar('config', config);
      expect(fer._globalEnvDirty).toBe(true);
      expect(fer.globalEnvironmentVariables.config).toEqual({ port: 4000 });
    });

    test('re-setting a structurally-equal object value does NOT trip the dirty flag', () => {
      const fer = makeFer({ config: { port: 3000 } });
      fer.setGlobalEnvVar('config', { port: 3000 });
      expect(fer._globalEnvDirty).toBe(false);
    });

    test('re-setting a structurally-equal primitive value does NOT trip the dirty flag', () => {
      const fer = makeFer({ token: 'abc' });
      fer.setGlobalEnvVar('token', 'abc');
      expect(fer._globalEnvDirty).toBe(false);
    });
  });

  describe('fer.deleteGlobalEnvVar — dirty flag contract', () => {
    test('deleting an existing key trips the global-env dirty flag', () => {
      const fer = makeFer({ token: 'abc' });
      fer.deleteGlobalEnvVar('token');
      expect(fer._globalEnvDirty).toBe(true);
    });

    test('deleting a non-existent key leaves the dirty flag clean', () => {
      const fer = makeFer();
      fer.deleteGlobalEnvVar('missing');
      expect(fer._globalEnvDirty).toBe(false);
    });
  });

  describe('fer.deleteAllGlobalEnvVars — dirty flag contract', () => {
    test('deleting populated scope trips the dirty flag', () => {
      const fer = makeFer({ a: '1', b: '2' });
      fer.deleteAllGlobalEnvVars();
      expect(fer._globalEnvDirty).toBe(true);
    });

    test('calling on empty scope leaves the dirty flag clean', () => {
      const fer = makeFer();
      fer.deleteAllGlobalEnvVars();
      expect(fer._globalEnvDirty).toBe(false);
    });
  });

  describe('fer.getGlobalEnvVar', () => {
    test('returns value of an existing variable', () => {
      const fer = makeFer({ token: 'abc' });
      expect(fer.getGlobalEnvVar('token')).toBe('abc');
    });

    test('returns undefined for non-existent variable', () => {
      const fer = makeFer();
      expect(fer.getGlobalEnvVar('missing')).toBeUndefined();
    });
  });

  describe('fer.hasGlobalEnvVar', () => {
    test('returns true for existing variable', () => {
      const fer = makeFer({ token: 'abc' });
      expect(fer.hasGlobalEnvVar('token')).toBe(true);
    });

    test('returns false for non-existent variable', () => {
      const fer = makeFer();
      expect(fer.hasGlobalEnvVar('missing')).toBe(false);
    });
  });

  describe('fer.deleteGlobalEnvVar', () => {
    test('removes an existing variable', () => {
      const fer = makeFer({ token: 'abc' });
      fer.deleteGlobalEnvVar('token');
      expect(fer.globalEnvironmentVariables.token).toBeUndefined();
      expect(fer.hasGlobalEnvVar('token')).toBe(false);
    });

    test('re-run: deleting a non-existent key is a silent no-op', () => {
      const fer = makeFer();
      expect(() => fer.deleteGlobalEnvVar('missing')).not.toThrow();
    });

    test('re-run: deleting an already-deleted key is a silent no-op', () => {
      const fer = makeFer({ token: 'abc' });
      fer.deleteGlobalEnvVar('token');
      expect(() => fer.deleteGlobalEnvVar('token')).not.toThrow();
    });
  });

  describe('fer.deleteAllGlobalEnvVars', () => {
    test('removes all global env variables', () => {
      const fer = makeFer({ a: '1', b: '2', c: '3' });
      fer.deleteAllGlobalEnvVars();
      expect(fer.globalEnvironmentVariables).toEqual({});
    });

    test('re-run: calling on empty scope is a silent no-op', () => {
      const fer = makeFer();
      expect(() => fer.deleteAllGlobalEnvVars()).not.toThrow();
      expect(fer.globalEnvironmentVariables).toEqual({});
    });

    test('re-run: calling twice is a silent no-op', () => {
      const fer = makeFer({ a: '1' });
      fer.deleteAllGlobalEnvVars();
      expect(() => fer.deleteAllGlobalEnvVars()).not.toThrow();
    });
  });

  describe('fer.getAllGlobalEnvVars', () => {
    test('returns a copy of all global env variables', () => {
      const fer = makeFer({ a: '1', b: '2' });
      expect(fer.getAllGlobalEnvVars()).toEqual({ a: '1', b: '2' });
    });

    test('returned object is a copy, not a reference', () => {
      const fer = makeFer({ a: '1' });
      const all = fer.getAllGlobalEnvVars();
      all.a = 'mutated';
      expect(fer.globalEnvironmentVariables.a).toBe('1');
    });

    test('returns empty object when no variables exist', () => {
      const fer = makeFer();
      expect(fer.getAllGlobalEnvVars()).toEqual({});
    });
  });
});
