const { describe, it, expect, afterEach } = require('@jest/globals');
const { newQuickJSWASMModule } = require('quickjs-emscripten');
const { createManagedQuickJsContext } = require('../src/sandbox/quickjs/utils');
const {
  makeFer,
  loadSandbox,
  captureAllocations,
  TEST_COLLECTION_PATH,
  runInSandbox,
  collectUnhandledRejections,
  expectAllDead,
  expectCleanTeardown,
  expectEventuallyClean
} = require('./quickjs-sandbox.helpers');

const largePayload = () => 'x'.repeat(150 * 1024);

describe('QuickJS context teardown leaves no live handles or deferreds', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('disposal mechanics: work created while dispose is running', () => {
    // Run host work inside dispose's pending-job drain.
    const queueHostCallAsPendingJob = (vm, hostFn) => {
      const fnHandle = vm.newFunction('__lateWork', hostFn);
      fnHandle.consume((handle) => vm.setProp(vm.global, '__lateWork', handle));
      vm.evalCode('Promise.resolve().then(() => __lateWork())');
      expect(vm.runtime.hasPendingJob()).toBe(true);
    };

    const lateWorkKinds = [
      [
        'allocates handles',
        (vm, captured) => () => {
          captured.handles.push(vm.newObject());
          return vm.undefined;
        }
      ],
      [
        'starts a host promise',
        (vm, captured) => () => {
          // Never settled: the deferred is still alive at dispose, so only
          // the flush can free it.
          const deferred = vm.newPromise();
          captured.deferreds.push(deferred);
          return deferred.handle;
        }
      ]
    ];

    it('waitForPendingDeferreds resolves even when a settle promise rejects', async () => {
      const wasmModule = await newQuickJSWASMModule();
      const originalNewContext = wasmModule.newContext.bind(wasmModule);
      wasmModule.newContext = (...args) => {
        const vm = originalNewContext(...args);
        const originalNewPromise = vm.newPromise.bind(vm);
        vm.newPromise = (...promiseArgs) => {
          const deferred = originalNewPromise(...promiseArgs);
          Object.defineProperty(deferred, 'settled', {
            value: Promise.reject(new Error('settle handling failed'))
          });
          return deferred;
        };
        return vm;
      };
      const managed = createManagedQuickJsContext(wasmModule);
      const { vm } = managed;

      const unhandledRejections = await collectUnhandledRejections(async () => {
        const deferred = vm.newPromise();

        await expect(managed.waitForPendingDeferreds()).resolves.toBeUndefined();
        expect(deferred.alive).toBe(true);
        expect(() => managed.dispose()).not.toThrow();
        expect(deferred.alive).toBe(false);
        expect(vm.alive).toBe(false);
      });
      expect(unhandledRejections).toEqual([]);
    });

    it.each(lateWorkKinds)('stays clean when a job that %s runs during dispose', async (kind, makeHostFn) => {
      const wasmModule = await newQuickJSWASMModule();
      const managed = createManagedQuickJsContext(wasmModule);
      const { vm } = managed;
      const captured = { handles: [], deferreds: [] };

      queueHostCallAsPendingJob(vm, makeHostFn(vm, captured));

      await managed.waitForPendingDeferreds();
      expect(() => managed.dispose()).not.toThrow();

      expectAllDead(captured);
      expect(vm.alive).toBe(false);
    });
  });

  describe('run lifecycle', () => {
    it('stays clean after a plain script', async () => {
      const fer = makeFer();
      const outcome = await runInSandbox({
        script: 'fer.setVar("x", 1);',
        context: { fer }
      });

      expectCleanTeardown(outcome);
      expect(outcome.error).toBeNull();
      expect(fer.getVar('x')).toBe(1);
    });

    it('stays clean after a script that throws', async () => {
      const outcome = await runInSandbox({
        script: 'throw new Error("boom");',
        context: { fer: makeFer() }
      });

      expectCleanTeardown(outcome);
      expect(outcome.error?.message).toBe('boom');
    });

    it('stays clean after a sync interpolation expression that starts async work', async () => {
      const outcome = await runInSandbox({
        script: 'fer.sleep(1)',
        scriptType: 'expression',
        context: { fer: makeFer() }
      });

      expectCleanTeardown(outcome);
    });

    // The context stays parked in the background waiting for the answer (its
    // deferred is deliberately still alive here); the run itself must not block.
    it('keeps waiting while a fire-and-forget host promise never settles', async () => {
      const fer = makeFer();
      fer.sendRequest = () => new Promise(() => {});

      const outcome = await runInSandbox({
        script: 'fer.sendRequest({ url: "https://never-responds" }, async () => {});',
        context: { fer },
        hangLimitMs: 300
      });

      expect(outcome.status).toBe('hung');
      expect(outcome.deferreds.some((d) => d.alive)).toBe(true);
    });

    it('completes un-awaited work before the run returns, then disposes', async () => {
      const fer = makeFer();
      fer.sendRequest = () =>
        new Promise((resolve) => setTimeout(() => resolve({ status: 200, data: largePayload() }), 50));

      const unhandledRejections = await collectUnhandledRejections(async () => {
        const outcome = await runInSandbox({
          script: `
            fer.sendRequest({ url: 'https://responds-during-wait' }, async (err, res) => {
              fer.setVar('lateResult', res.data);
            });
          `,
          context: { fer }
        });

        expectCleanTeardown(outcome);
        expect(fer.getVar('lateResult')).toBe(largePayload());
      });
      expect(unhandledRejections).toEqual([]);
    });

    it('stays clean after awaited sendRequest with an async callback chaining more requests', async () => {
      const fer = makeFer();
      // The delay keeps the last fire-and-forget request in flight when the
      // run returns, so the parked path is genuinely exercised.
      fer.sendRequest = () =>
        new Promise((resolve) => setTimeout(() => resolve({ status: 200, data: largePayload() }), 30));

      const outcome = await runInSandbox({
        script: `
          await fer.sendRequest({ url: 'https://a' }, async (err, res) => {
            fer.setVar('payload', res.data);
            await fer.sendRequest({ url: 'https://b' }, async () => {});
          });
          fer.sendRequest({ url: 'https://c' }, async (err, res) => {
            fer.setVar('late', res.data);
          });
        `,
        context: { fer }
      });

      expectCleanTeardown(outcome);
      expect(outcome.error).toBeNull();
      expect(fer.getVar('payload')).toBe(largePayload());
      expect(fer.getVar('late')).toBe(largePayload());
    }, 10000);

    it('awaits async test callbacks before the run returns', async () => {
      const results = [];
      const __ferretTestResults = {
        addResult: (result) => results.push(result),
        getResults: () => results
      };

      const outcome = await runInSandbox({
        script: `
          test('async test with awaited host work', async () => {
            const val = await new Promise((resolve) => {
              setTimeout(() => {
                resolve('expected');
              }, 30);
            });
            expect(val).to.equal('expected');
          });
        `,
        context: {
          fer: makeFer(),
          test: true,
          __ferretTestResults,
          console: { log: () => {}, info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
        }
      });

      expectCleanTeardown(outcome);
      expect(results).toEqual([{ description: 'async test with awaited host work', status: 'pass' }]);
    });

    it('surfaces a dispose failure after waited-for work as the run error', async () => {
      const fer = makeFer();
      fer.sendRequest = () =>
        new Promise((resolve) => setTimeout(() => resolve({ status: 200, data: 'ok' }), 50));

      const unhandledRejections = await collectUnhandledRejections(async () => {
        const captured = { handles: [], deferreds: [] };
        const { sandbox } = await loadSandbox((vm) => {
          captureAllocations(vm, captured);
          const originalDispose = vm.dispose.bind(vm);
          vm.dispose = () => {
            originalDispose();
            throw new Error('dispose failed after the wait');
          };
        });

        await expect(
          sandbox.executeQuickJsVmAsync({
            script: `
              fer.sendRequest({ url: 'https://responds-during-wait' }, async () => {});
            `,
            context: { fer },
            collectionPath: TEST_COLLECTION_PATH
          })
        ).rejects.toThrow('dispose failed after the wait');

        await expectEventuallyClean(captured);
      });
      expect(unhandledRejections).toEqual([]);
    });
  });
});
