const Fer = require('../src/fer');

const makeFer = () =>
  new Fer({
    runtime: 'quickjs',
    envVariables: {},
    runtimeVariables: {},
    processEnvVars: {},
    collectionPath: '/',
    collectionName: 'Test'
  });

describe('fer.setEnvVar', () => {
  test('sets envVariables[key] to value', () => {
    const fer = makeFer();
    fer.setEnvVar('token', 'abc123');
    expect(fer.envVariables.token).toBe('abc123');
  });

  test('allows non-string values', () => {
    const fer = makeFer();
    fer.setEnvVar('count', 42);
    expect(fer.envVariables.count).toBe(42);

    fer.setEnvVar('active', true);
    expect(fer.envVariables.active).toBe(true);

    fer.setEnvVar('config', { port: 3000 });
    expect(fer.envVariables.config).toEqual({ port: 3000 });
  });

  test('overwrites existing value', () => {
    const fer = makeFer();
    fer.setEnvVar('key', 'old');
    fer.setEnvVar('key', 'new');
    expect(fer.envVariables.key).toBe('new');
  });

  test('throws when key is empty', () => {
    const fer = makeFer();
    expect(() => fer.setEnvVar('', 'v')).toThrow(/without specifying a name/);
  });

  test('rejects key with invalid characters', () => {
    const fer = makeFer();
    expect(() => fer.setEnvVar('invalid key', 'v')).toThrow(/contains invalid characters/);
  });
});

describe('fer.setEnvVar — dirty flag for typed values', () => {
  test('setting a number trips the env dirty flag', () => {
    const fer = makeFer();
    expect(fer._envDirty).toBe(false);
    fer.setEnvVar('count', 42);
    expect(fer._envDirty).toBe(true);
  });

  test('setting a boolean trips the env dirty flag', () => {
    const fer = makeFer();
    fer.setEnvVar('active', true);
    expect(fer._envDirty).toBe(true);
  });

  test('setting an object trips the env dirty flag', () => {
    const fer = makeFer();
    fer.setEnvVar('config', { port: 3000 });
    expect(fer._envDirty).toBe(true);
  });
});

describe('fer.deleteEnvVar', () => {
  test('removes an existing variable', () => {
    const fer = makeFer();
    fer.setEnvVar('token', 'abc');
    fer.deleteEnvVar('token');
    expect(fer.envVariables.token).toBeUndefined();
  });

  test('deleting a non-existent key is a silent no-op', () => {
    const fer = makeFer();
    expect(() => fer.deleteEnvVar('missing')).not.toThrow();
  });

  test('does not delete the internal __name__ marker', () => {
    const fer = new Fer({
      runtime: 'quickjs',
      envVariables: { __name__: 'dev', token: 'abc' },
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });
    fer.deleteEnvVar('__name__');
    expect(fer.envVariables.__name__).toBe('dev');
    expect(fer._envDirty).toBe(false);
  });
});

describe('fer.setEnvVar — dirty flag for reference-mutation idiom', () => {
  test('the getEnvVar → mutate → setEnvVar idiom trips the dirty flag', () => {
    const fer = new Fer({
      runtime: 'quickjs',
      envVariables: { config: { port: 3000 } },
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });
    expect(fer._envDirty).toBe(false);
    // Real-script idiom: `const c = fer.getEnvVar('config'); c.port = 4000; fer.setEnvVar('config', c);`
    // `getEnvVar` deep-copies through interpolate's JSON roundtrip, so mutating the result
    // leaves envVariables.config untouched; the deep-equal guard then sees a real change.
    // Pre-fix the strict-`!==` guard missed cases where the script structurally rebuilt the value.
    const config = fer.getEnvVar('config');
    config.port = 4000;
    fer.setEnvVar('config', config);
    expect(fer._envDirty).toBe(true);
    expect(fer.envVariables.config).toEqual({ port: 4000 });
  });

  test('re-setting a structurally-equal object value does NOT trip the dirty flag', () => {
    const fer = new Fer({
      runtime: 'quickjs',
      envVariables: { config: { port: 3000 } },
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });
    fer.setEnvVar('config', { port: 3000 });
    expect(fer._envDirty).toBe(false);
  });

  test('re-setting a structurally-equal primitive value does NOT trip the dirty flag', () => {
    const fer = new Fer({
      runtime: 'quickjs',
      envVariables: { token: 'abc' },
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });
    fer.setEnvVar('token', 'abc');
    expect(fer._envDirty).toBe(false);
  });
});

describe('fer.deleteEnvVar — dirty flag contract', () => {
  test('deleting an existing key trips the env dirty flag', () => {
    const fer = makeFer();
    fer.setEnvVar('token', 'abc');
    fer._envDirty = false; // reset post-set
    fer.deleteEnvVar('token');
    expect(fer._envDirty).toBe(true);
  });

  test('deleting a non-existent key leaves the dirty flag clean', () => {
    const fer = makeFer();
    fer.deleteEnvVar('missing');
    expect(fer._envDirty).toBe(false);
  });
});

describe('fer.deleteAllEnvVars — dirty flag contract', () => {
  test('deleting populated env trips the dirty flag', () => {
    const fer = new Fer({
      runtime: 'quickjs',
      envVariables: { a: '1', b: '2' },
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });
    fer.deleteAllEnvVars();
    expect(fer._envDirty).toBe(true);
  });

  test('calling on empty env leaves the dirty flag clean', () => {
    const fer = makeFer();
    fer.deleteAllEnvVars();
    expect(fer._envDirty).toBe(false);
  });
});

describe('fer.deleteAll* methods — resilient to user-shadowed Object.prototype methods', () => {
  // Use Object.hasOwn (not the property accessor) to check deletion, since after
  // delete the prototype's hasOwnProperty becomes visible again on a plain object.
  test('deleteAllEnvVars works when a var named "hasOwnProperty" was set', () => {
    const fer = makeFer();
    fer.setEnvVar('hasOwnProperty', 'shadow');
    fer.setEnvVar('other', 'value');
    expect(() => fer.deleteAllEnvVars()).not.toThrow();
    expect(Object.hasOwn(fer.envVariables, 'hasOwnProperty')).toBe(false);
    expect(Object.hasOwn(fer.envVariables, 'other')).toBe(false);
  });

  test('deleteAllGlobalEnvVars works when a var named "hasOwnProperty" was set', () => {
    const fer = makeFer();
    fer.setGlobalEnvVar('hasOwnProperty', 'shadow');
    fer.setGlobalEnvVar('other', 'value');
    expect(() => fer.deleteAllGlobalEnvVars()).not.toThrow();
    expect(Object.hasOwn(fer.globalEnvironmentVariables, 'hasOwnProperty')).toBe(false);
  });

  test('deleteAllCollectionVars works when a var named "hasOwnProperty" was set', () => {
    const fer = makeFer();
    fer.setCollectionVar('hasOwnProperty', 'shadow');
    fer.setCollectionVar('other', 'value');
    expect(() => fer.deleteAllCollectionVars()).not.toThrow();
    expect(Object.hasOwn(fer.collectionVariables, 'hasOwnProperty')).toBe(false);
  });

  test('deleteAllVars works when a runtime var named "hasOwnProperty" was set', () => {
    const fer = makeFer();
    fer.setVar('hasOwnProperty', 'shadow');
    fer.setVar('other', 'value');
    expect(() => fer.deleteAllVars()).not.toThrow();
    expect(Object.hasOwn(fer.runtimeVariables, 'hasOwnProperty')).toBe(false);
  });
});
