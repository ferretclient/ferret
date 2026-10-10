// Mocked so we can drive onComplete directly without hitting the network. We
// defer onComplete to a microtask so it fires after the synchronous call site
// returns (same timing as a real network call, and what the race-condition
// test below relies on).
jest.mock('@ferret-app/requests', () => {
  const realCookies = jest.requireActual('@ferret-app/requests').cookies;
  return {
    cookies: realCookies,
    scripting: {
      createSendRequest: jest.fn((_config, options) => {
        return async (requestConfig) => {
          const normalized = typeof requestConfig === 'string' ? { url: requestConfig } : requestConfig;
          await Promise.resolve();
          options?.onComplete?.({
            request: {
              method: (normalized.method || 'GET').toUpperCase(),
              url: normalized.url,
              headers: normalized.headers || {},
              data: normalized.data
            },
            response: {
              statusCode: 200,
              statusText: 'OK',
              headers: { 'content-type': 'text/plain' },
              data: 'ok',
              dataBuffer: Buffer.from('ok').toString('base64'),
              size: 2,
              duration: 4
            },
            error: null,
            startedAt: 1,
            completedAt: 5
          });
          return { status: 200, data: 'ok' };
        };
      })
    }
  };
});

const Fer = require('../src/fer');

const makeFer = () =>
  new Fer({
    runtime: 'quickjs',
    envVariables: {},
    runtimeVariables: {},
    processEnvVars: {},
    collectionPath: '/coll',
    collectionName: 'Test',
    certsAndProxyConfig: { collectionPath: '/coll' }
  });

describe('Fer — scripted request capture', () => {
  test('starts with an empty scriptedRequestEntries array', () => {
    const fer = makeFer();
    expect(fer.scriptedRequestEntries).toEqual([]);
  });

  test('records a sendRequest call with source = "sendRequest"', async () => {
    const fer = makeFer();
    await fer.sendRequest({ method: 'get', url: 'https://example.com/ping' });

    expect(fer.scriptedRequestEntries).toHaveLength(1);
    expect(fer.scriptedRequestEntries[0]).toEqual(
      expect.objectContaining({
        source: 'sendRequest',
        request: expect.objectContaining({ method: 'GET', url: 'https://example.com/ping' }),
        response: expect.objectContaining({ statusCode: 200, statusText: 'OK' })
      })
    );
  });

  test('records null scope when no _currentScope is set', async () => {
    const fer = makeFer();
    await fer.sendRequest('https://example.com');
    expect(fer.scriptedRequestEntries[0].scope).toBeNull();
  });

  test('stamps the current scope onto each entry (snapshot, not reference)', async () => {
    const fer = makeFer();

    fer._currentScope = { type: 'collection', sourceFile: 'collection.fer' };
    await fer.sendRequest('https://example.com/a');

    // Flip scope. The earlier entry must keep its original snapshot.
    fer._currentScope = { type: 'request', sourceFile: 'auth/login.fer' };
    await fer.sendRequest('https://example.com/b');

    expect(fer.scriptedRequestEntries).toHaveLength(2);
    expect(fer.scriptedRequestEntries[0].scope).toEqual({ type: 'collection', sourceFile: 'collection.fer' });
    expect(fer.scriptedRequestEntries[1].scope).toEqual({ type: 'request', sourceFile: 'auth/login.fer' });
  });

  test('uses scope at call time, not completion time, for non-awaited sendRequest', async () => {
    const fer = makeFer();

    // Fire-and-forget call in scope A.
    fer._currentScope = { type: 'collection', sourceFile: 'collection.fer' };
    const inFlight = fer.sendRequest('https://example.com/late');

    // The host moves to the next segment and __ferSetScope flips the scope
    // before the network call settles.
    fer._currentScope = { type: 'request', sourceFile: 'auth/login.fer' };

    await inFlight;

    expect(fer.scriptedRequestEntries).toHaveLength(1);
    expect(fer.scriptedRequestEntries[0].scope).toEqual({ type: 'collection', sourceFile: 'collection.fer' });
  });

  test('_recordScriptedRequest accepts entries from other sources (e.g. runRequest)', () => {
    const fer = makeFer();
    fer._currentScope = { type: 'folder', sourceFile: 'auth/folder.fer' };
    fer._recordScriptedRequest({
      source: 'runRequest',
      request: { method: 'GET', url: 'https://example.com/user' },
      response: { statusCode: 200, statusText: 'OK', headers: {}, data: 'x', dataBuffer: '', size: 0, duration: 1 },
      error: null,
      startedAt: 10,
      completedAt: 11
    });

    expect(fer.scriptedRequestEntries).toHaveLength(1);
    expect(fer.scriptedRequestEntries[0]).toEqual(
      expect.objectContaining({
        source: 'runRequest',
        scope: { type: 'folder', sourceFile: 'auth/folder.fer' }
      })
    );
  });
});
