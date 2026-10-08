const { bindRunRequest, createScopeSetter } = require('../src/runtime/scripted-entries');

describe('bindRunRequest', () => {
  test('does nothing when no host function is provided', () => {
    const fer = {};
    bindRunRequest(fer, undefined);
    expect(fer.runRequest).toBeUndefined();
  });

  test('exposes fer.runRequest that forwards (pathname, callerFer) to the host', async () => {
    const host = jest.fn().mockResolvedValue('done');
    const fer = {};

    bindRunRequest(fer, host);
    const result = await fer.runRequest('relative/path.fer');

    expect(result).toBe('done');
    expect(host).toHaveBeenCalledTimes(1);
    expect(host).toHaveBeenCalledWith('relative/path.fer', fer);
  });

  test('each fer gets bound with its own callerFer so entries can be attributed', async () => {
    const host = jest.fn().mockResolvedValue(null);
    const ferA = { name: 'A' };
    const ferB = { name: 'B' };

    bindRunRequest(ferA, host);
    bindRunRequest(ferB, host);

    await ferA.runRequest('a.fer');
    await ferB.runRequest('b.fer');

    expect(host).toHaveBeenNthCalledWith(1, 'a.fer', ferA);
    expect(host).toHaveBeenNthCalledWith(2, 'b.fer', ferB);
  });
});

describe('createScopeSetter', () => {
  test('mutates fer._currentScope with the scope object', () => {
    const fer = {};
    const setScope = createScopeSetter(fer);

    setScope({ type: 'collection', sourceFile: 'collection.fer' });
    expect(fer._currentScope).toEqual({ type: 'collection', sourceFile: 'collection.fer' });

    setScope({ type: 'request', sourceFile: 'auth/login.fer' });
    expect(fer._currentScope).toEqual({ type: 'request', sourceFile: 'auth/login.fer' });
  });

  test('clears _currentScope when called with a falsy value', () => {
    const fer = { _currentScope: { type: 'folder', sourceFile: 'auth/folder.fer' } };
    const setScope = createScopeSetter(fer);

    setScope(null);
    expect(fer._currentScope).toBeNull();

    setScope({ type: 'request', sourceFile: 'x.fer' });
    setScope(undefined);
    expect(fer._currentScope).toBeNull();
  });
});
