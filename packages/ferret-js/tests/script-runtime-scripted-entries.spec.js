// Mocked so fer.sendRequest doesn't hit the network.
jest.mock('@ferret-app/requests', () => {
  const realCookies = jest.requireActual('@ferret-app/requests').cookies;
  return {
    cookies: realCookies,
    scripting: {
      createSendRequest: jest.fn((_config, options) => {
        return async (requestConfig) => {
          const normalized = typeof requestConfig === 'string' ? { url: requestConfig } : requestConfig;
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
              headers: {},
              data: 'mocked',
              dataBuffer: Buffer.from('mocked').toString('base64'),
              size: 6,
              duration: 3
            },
            error: null,
            startedAt: 1,
            completedAt: 4
          });
          return { status: 200, data: 'mocked' };
        };
      })
    }
  };
});

const fs = require('fs');
const os = require('os');
const path = require('path');
const ScriptRuntime = require('../src/runtime/script-runtime');
const TestRuntime = require('../src/runtime/test-runtime');
const { makeNpmModule } = require('./utils/helpers');

const baseRequest = { method: 'GET', url: 'http://localhost/', headers: {}, data: undefined };
const baseResponse = { status: 200, statusText: 'OK', data: {} };

describe('ScriptRuntime — scripted entries across the three script phases', () => {
  describe('pre-request (runRequestScript)', () => {
    test('drains fer.sendRequest calls into result.scriptedRequestEntries', async () => {
      const script = `await fer.sendRequest('https://example.com/ping');`;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });
      const result = await runtime.runRequestScript(
        script, { ...baseRequest }, {}, {}, '.', null, process.env
      );

      expect(result.scriptedRequestEntries).toHaveLength(1);
      expect(result.scriptedRequestEntries[0]).toEqual(
        expect.objectContaining({
          source: 'sendRequest',
          request: expect.objectContaining({ url: 'https://example.com/ping' })
        })
      );
    });

    test('returns an empty array when the script makes no scripted requests', async () => {
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });
      const result = await runtime.runRequestScript(
        `fer.setVar('foo', 'bar');`, { ...baseRequest }, {}, {}, '.', null, process.env
      );
      expect(result.scriptedRequestEntries).toEqual([]);
    });

    test('__ferSetScope from inside the script stamps scope onto every later entry', async () => {
      const script = `
        __ferSetScope({ type: 'collection', sourceFile: 'collection.fer' });
        await fer.sendRequest('https://example.com/a');
        __ferSetScope({ type: 'request', sourceFile: 'auth/login.fer' });
        await fer.sendRequest('https://example.com/b');
      `;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });
      const result = await runtime.runRequestScript(
        script, { ...baseRequest }, {}, {}, '.', null, process.env
      );

      expect(result.scriptedRequestEntries).toHaveLength(2);
      expect(result.scriptedRequestEntries[0].scope).toEqual({ type: 'collection', sourceFile: 'collection.fer' });
      expect(result.scriptedRequestEntries[1].scope).toEqual({ type: 'request', sourceFile: 'auth/login.fer' });
    });

    test('fer.runRequest is wired to the host function and records a runRequest entry', async () => {
      // Stands in for the electron-side runRequestByItemPathname bridge.
      const host = jest.fn(async (pathname, callerFer) => {
        callerFer._recordScriptedRequest({
          source: 'runRequest',
          request: { method: 'GET', url: 'inferred/from/' + pathname, headers: {}, data: undefined },
          response: { statusCode: 200, statusText: 'OK', headers: {}, data: '', dataBuffer: '', size: 0, duration: 1 },
          error: null,
          startedAt: 0,
          completedAt: 1
        });
        return { status: 200 };
      });

      const script = `
        __ferSetScope({ type: 'request', sourceFile: 'driver.fer' });
        await fer.runRequest('target.fer');
      `;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });
      const result = await runtime.runRequestScript(
        script, { ...baseRequest }, {}, {}, '.', null, process.env, {}, host
      );

      expect(host).toHaveBeenCalledTimes(1);
      // bindRunRequest must forward the caller's fer as the second arg.
      expect(host.mock.calls[0][0]).toBe('target.fer');
      expect(host.mock.calls[0][1]).toBeDefined();
      expect(result.scriptedRequestEntries).toHaveLength(1);
      expect(result.scriptedRequestEntries[0]).toEqual(
        expect.objectContaining({
          source: 'runRequest',
          scope: { type: 'request', sourceFile: 'driver.fer' }
        })
      );
    });

    test('cached npm modules preserve fer.runRequest attribution', async () => {
      const collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'ferret-script-runtime-'));
      try {
        makeNpmModule(collectionPath, 'run-request-reader', `
          module.exports = {
            run: (pathname) => fer.runRequest(pathname)
          };
        `);

        const host = jest.fn(async (_pathname, callerFer) => {
          callerFer._recordScriptedRequest({
            source: 'runRequest',
            request: { method: 'GET', url: 'https://example.com/cached', headers: {}, data: undefined },
            response: null,
            error: null,
            startedAt: 0,
            completedAt: 1
          });
          return { status: 200 };
        });
        const runtime = new ScriptRuntime({ runtime: 'nodevm' });
        const result = await runtime.runRequestScript(
          `
            __ferSetScope({ type: 'request', sourceFile: 'cached-driver.fer' });
            await require('run-request-reader').run('cached-target.fer');
          `,
          { ...baseRequest },
          {},
          {},
          collectionPath,
          null,
          process.env,
          { cacheModules: true },
          host
        );

        expect(host).toHaveBeenCalledWith('cached-target.fer', expect.anything());
        expect(result.scriptedRequestEntries).toEqual([
          expect.objectContaining({
            source: 'runRequest',
            scope: { type: 'request', sourceFile: 'cached-driver.fer' }
          })
        ]);
      } finally {
        fs.rmSync(collectionPath, { recursive: true, force: true });
      }
    });
  });

  describe('post-response (runResponseScript)', () => {
    test('drains fer.sendRequest calls into result.scriptedRequestEntries', async () => {
      const script = `await fer.sendRequest('https://example.com/after');`;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });
      const result = await runtime.runResponseScript(
        script, { ...baseRequest }, { ...baseResponse }, {}, {}, '.', null, process.env
      );
      expect(result.scriptedRequestEntries).toHaveLength(1);
      expect(result.scriptedRequestEntries[0].source).toBe('sendRequest');
    });

    test('records fer.runRequest calls with the current scope', async () => {
      const host = jest.fn(async (_pathname, callerFer) => {
        callerFer._recordScriptedRequest({
          source: 'runRequest',
          request: { method: 'GET', url: 'x', headers: {}, data: undefined },
          response: null,
          error: null,
          startedAt: 0,
          completedAt: 0
        });
      });
      const script = `
        __ferSetScope({ type: 'folder', sourceFile: 'auth/folder.fer' });
        await fer.runRequest('next.fer');
      `;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });
      const result = await runtime.runResponseScript(
        script, { ...baseRequest }, { ...baseResponse }, {}, {}, '.', null, process.env, {}, host
      );

      expect(result.scriptedRequestEntries).toHaveLength(1);
      expect(result.scriptedRequestEntries[0]).toEqual(
        expect.objectContaining({
          source: 'runRequest',
          scope: { type: 'folder', sourceFile: 'auth/folder.fer' }
        })
      );
    });
  });

  describe('tests (TestRuntime.runTests)', () => {
    test('drains scripted requests issued from inside test scripts', async () => {
      const testsFile = `
        __ferSetScope({ type: 'request', sourceFile: 'spec.fer' });
        test('calls sendRequest', async () => {
          await fer.sendRequest('https://example.com/from-tests');
        });
      `;
      const runtime = new TestRuntime({ runtime: 'nodevm' });
      const result = await runtime.runTests(
        testsFile, { ...baseRequest }, { ...baseResponse }, {}, {}, '.', null, process.env
      );

      expect(result.scriptedRequestEntries).toHaveLength(1);
      expect(result.scriptedRequestEntries[0]).toEqual(
        expect.objectContaining({
          source: 'sendRequest',
          scope: { type: 'request', sourceFile: 'spec.fer' },
          request: expect.objectContaining({ url: 'https://example.com/from-tests' })
        })
      );
    });
  });

  describe('partial results on script error', () => {
    test('pre-request: entries recorded before the throw are preserved on partialResults', async () => {
      const script = `
        await fer.sendRequest('https://example.com/before');
        throw new Error('explode');
      `;
      const runtime = new ScriptRuntime({ runtime: 'nodevm' });

      let captured;
      try {
        await runtime.runRequestScript(script, { ...baseRequest }, {}, {}, '.', null, process.env);
      } catch (err) {
        captured = err;
      }

      expect(captured).toBeDefined();
      expect(captured.partialResults).toBeDefined();
      expect(captured.partialResults.scriptedRequestEntries).toHaveLength(1);
      expect(captured.partialResults.scriptedRequestEntries[0].source).toBe('sendRequest');
    });
  });
});
