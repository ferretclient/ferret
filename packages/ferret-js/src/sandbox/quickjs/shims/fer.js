const { cleanJson, cleanCircularJson } = require('../../../utils');
const { marshallToVm } = require('../utils');
const { createPropertyListBridge } = require('../utils/property-list-bridge');

const addFerShimToContext = (vm, fer) => {
  const ferObject = vm.newObject();
  const ferRunnerObject = vm.newObject();

  let cwd = vm.newFunction('cwd', function () {
    return marshallToVm(fer.cwd(), vm);
  });
  vm.setProp(ferObject, 'cwd', cwd);
  cwd.dispose();

  let getEnvName = vm.newFunction('getEnvName', function () {
    return marshallToVm(fer.getEnvName(), vm);
  });
  vm.setProp(ferObject, 'getEnvName', getEnvName);
  getEnvName.dispose();

  let getCollectionName = vm.newFunction('getCollectionName', function () {
    return marshallToVm(fer.getCollectionName(), vm);
  });
  vm.setProp(ferObject, 'getCollectionName', getCollectionName);
  getCollectionName.dispose();

  let isSafeMode = vm.newFunction('isSafeMode', function () {
    return marshallToVm(fer.isSafeMode(), vm);
  });
  vm.setProp(ferObject, 'isSafeMode', isSafeMode);
  isSafeMode.dispose();

  let getProcessEnv = vm.newFunction('getProcessEnv', function (key) {
    return marshallToVm(fer.getProcessEnv(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'getProcessEnv', getProcessEnv);
  getProcessEnv.dispose();

  let interpolate = vm.newFunction('interpolate', function (str) {
    return marshallToVm(fer.interpolate(vm.dump(str)), vm);
  });
  vm.setProp(ferObject, 'interpolate', interpolate);
  interpolate.dispose();

  let hasEnvVar = vm.newFunction('hasEnvVar', function (key) {
    return marshallToVm(fer.hasEnvVar(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'hasEnvVar', hasEnvVar);
  hasEnvVar.dispose();

  let getEnvVar = vm.newFunction('getEnvVar', function (key) {
    return marshallToVm(fer.getEnvVar(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'getEnvVar', getEnvVar);
  getEnvVar.dispose();

  let setEnvVar = vm.newFunction('setEnvVar', function (key, value) {
    fer.setEnvVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(ferObject, 'setEnvVar', setEnvVar);
  setEnvVar.dispose();

  let deleteEnvVar = vm.newFunction('deleteEnvVar', function (key) {
    fer.deleteEnvVar(vm.dump(key));
  });
  vm.setProp(ferObject, 'deleteEnvVar', deleteEnvVar);
  deleteEnvVar.dispose();

  let getAllEnvVars = vm.newFunction('getAllEnvVars', function () {
    return marshallToVm(fer.getAllEnvVars(), vm);
  });
  vm.setProp(ferObject, 'getAllEnvVars', getAllEnvVars);
  getAllEnvVars.dispose();

  let deleteAllEnvVars = vm.newFunction('deleteAllEnvVars', function () {
    fer.deleteAllEnvVars();
  });
  vm.setProp(ferObject, 'deleteAllEnvVars', deleteAllEnvVars);
  deleteAllEnvVars.dispose();

  let getGlobalEnvVar = vm.newFunction('getGlobalEnvVar', function (key) {
    return marshallToVm(fer.getGlobalEnvVar(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'getGlobalEnvVar', getGlobalEnvVar);
  getGlobalEnvVar.dispose();

  let getOauth2CredentialVar = vm.newFunction('getOauth2CredentialVar', function (key) {
    return marshallToVm(fer.getOauth2CredentialVar(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'getOauth2CredentialVar', getOauth2CredentialVar);
  getOauth2CredentialVar.dispose();

  let resetOauth2Credential = vm.newFunction('resetOauth2Credential', function (credentialId) {
    fer.resetOauth2Credential(vm.dump(credentialId));
  });
  vm.setProp(ferObject, 'resetOauth2Credential', resetOauth2Credential);
  resetOauth2Credential.dispose();

  let setGlobalEnvVar = vm.newFunction('setGlobalEnvVar', function (key, value) {
    fer.setGlobalEnvVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(ferObject, 'setGlobalEnvVar', setGlobalEnvVar);
  setGlobalEnvVar.dispose();

  let deleteGlobalEnvVar = vm.newFunction('deleteGlobalEnvVar', function (key) {
    fer.deleteGlobalEnvVar(vm.dump(key));
  });
  vm.setProp(ferObject, 'deleteGlobalEnvVar', deleteGlobalEnvVar);
  deleteGlobalEnvVar.dispose();

  let getAllGlobalEnvVars = vm.newFunction('getAllGlobalEnvVars', function () {
    return marshallToVm(fer.getAllGlobalEnvVars(), vm);
  });
  vm.setProp(ferObject, 'getAllGlobalEnvVars', getAllGlobalEnvVars);
  getAllGlobalEnvVars.dispose();

  let hasGlobalEnvVar = vm.newFunction('hasGlobalEnvVar', function (key) {
    return marshallToVm(fer.hasGlobalEnvVar(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'hasGlobalEnvVar', hasGlobalEnvVar);
  hasGlobalEnvVar.dispose();

  let deleteAllGlobalEnvVars = vm.newFunction('deleteAllGlobalEnvVars', function () {
    fer.deleteAllGlobalEnvVars();
  });
  vm.setProp(ferObject, 'deleteAllGlobalEnvVars', deleteAllGlobalEnvVars);
  deleteAllGlobalEnvVars.dispose();

  let hasVar = vm.newFunction('hasVar', function (key) {
    return marshallToVm(fer.hasVar(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'hasVar', hasVar);
  hasVar.dispose();

  let getVar = vm.newFunction('getVar', function (key) {
    return marshallToVm(fer.getVar(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'getVar', getVar);
  getVar.dispose();

  let setVar = vm.newFunction('setVar', function (key, value) {
    fer.setVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(ferObject, 'setVar', setVar);
  setVar.dispose();

  let deleteVar = vm.newFunction('deleteVar', function (key) {
    fer.deleteVar(vm.dump(key));
  });
  vm.setProp(ferObject, 'deleteVar', deleteVar);
  deleteVar.dispose();

  let deleteAllVars = vm.newFunction('deleteAllVars', function () {
    fer.deleteAllVars();
  });
  vm.setProp(ferObject, 'deleteAllVars', deleteAllVars);
  deleteAllVars.dispose();

  let getAllVars = vm.newFunction('getAllVars', function () {
    return marshallToVm(fer.getAllVars(), vm);
  });
  vm.setProp(ferObject, 'getAllVars', getAllVars);
  getAllVars.dispose();

  let setNextRequest = vm.newFunction('setNextRequest', function (nextRequest) {
    fer.setNextRequest(vm.dump(nextRequest));
  });
  vm.setProp(ferObject, 'setNextRequest', setNextRequest);
  setNextRequest.dispose();

  let runnerSkipRequest = vm.newFunction('skipRequest', function () {
    fer?.runner?.skipRequest();
  });
  vm.setProp(ferRunnerObject, 'skipRequest', runnerSkipRequest);
  runnerSkipRequest.dispose();

  let runnerStopExecution = vm.newFunction('stopExecution', function () {
    fer?.runner?.stopExecution();
  });
  vm.setProp(ferRunnerObject, 'stopExecution', runnerStopExecution);
  runnerStopExecution.dispose();

  let runnerSetNextRequest = vm.newFunction('setNextRequest', function (nextRequest) {
    fer?.runner?.setNextRequest(vm.dump(nextRequest));
  });
  vm.setProp(ferRunnerObject, 'setNextRequest', runnerSetNextRequest);
  runnerSetNextRequest.dispose();

  let visualize = vm.newFunction('visualize', function (htmlString) {
    fer.visualize(vm.dump(htmlString));
  });
  vm.setProp(ferObject, 'visualize', visualize);
  visualize.dispose();

  let getSecretVar = vm.newFunction('getSecretVar', function (key) {
    return marshallToVm(fer.getSecretVar(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'getSecretVar', getSecretVar);
  getSecretVar.dispose();

  let getRequestVar = vm.newFunction('getRequestVar', function (key) {
    return marshallToVm(fer.getRequestVar(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'getRequestVar', getRequestVar);
  getRequestVar.dispose();

  let getFolderVar = vm.newFunction('getFolderVar', function (key) {
    return marshallToVm(fer.getFolderVar(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'getFolderVar', getFolderVar);
  getFolderVar.dispose();

  let getCollectionVar = vm.newFunction('getCollectionVar', function (key) {
    return marshallToVm(fer.getCollectionVar(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'getCollectionVar', getCollectionVar);
  getCollectionVar.dispose();

  let setCollectionVar = vm.newFunction('setCollectionVar', function (key, value) {
    fer.setCollectionVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(ferObject, 'setCollectionVar', setCollectionVar);
  setCollectionVar.dispose();

  let hasCollectionVar = vm.newFunction('hasCollectionVar', function (key) {
    return marshallToVm(fer.hasCollectionVar(vm.dump(key)), vm);
  });
  vm.setProp(ferObject, 'hasCollectionVar', hasCollectionVar);
  hasCollectionVar.dispose();

  let deleteCollectionVar = vm.newFunction('deleteCollectionVar', function (key) {
    fer.deleteCollectionVar(vm.dump(key));
  });
  vm.setProp(ferObject, 'deleteCollectionVar', deleteCollectionVar);
  deleteCollectionVar.dispose();

  let deleteAllCollectionVars = vm.newFunction('deleteAllCollectionVars', function () {
    fer.deleteAllCollectionVars();
  });
  vm.setProp(ferObject, 'deleteAllCollectionVars', deleteAllCollectionVars);
  deleteAllCollectionVars.dispose();

  let getAllCollectionVars = vm.newFunction('getAllCollectionVars', function () {
    return marshallToVm(fer.getAllCollectionVars(), vm);
  });
  vm.setProp(ferObject, 'getAllCollectionVars', getAllCollectionVars);
  getAllCollectionVars.dispose();

  let getTestResults = vm.newFunction('getTestResults', () => {
    const promise = vm.newPromise();
    fer
      .getTestResults()
      .then((results) => {
        promise.resolve(marshallToVm(cleanJson(results), vm));
      })
      .catch((err) => {
        promise.resolve(
          marshallToVm(
            cleanJson({
              message: err.message
            }),
            vm
          )
        );
      });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  getTestResults.consume((handle) => vm.setProp(ferObject, 'getTestResults', handle));

  let getAssertionResults = vm.newFunction('getAssertionResults', () => {
    const promise = vm.newPromise();
    fer
      .getAssertionResults()
      .then((results) => {
        promise.resolve(marshallToVm(cleanJson(results), vm));
      })
      .catch((err) => {
        promise.resolve(
          marshallToVm(
            cleanJson({
              message: err.message
            }),
            vm
          )
        );
      });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  getAssertionResults.consume((handle) => vm.setProp(ferObject, 'getAssertionResults', handle));

  let runRequestHandle = vm.newFunction('runRequest', (args) => {
    const promise = vm.newPromise();
    fer
      .runRequest(vm.dump(args))
      .then((response) => {
        promise.resolve(marshallToVm(cleanCircularJson(response), vm));
      })
      .catch((err) => {
        promise.resolve(
          marshallToVm(
            cleanJson({
              message: err.message
            }),
            vm
          )
        );
      });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  runRequestHandle.consume((handle) => vm.setProp(ferObject, 'runRequest', handle));

  let sendRequestHandle = vm.newFunction('_sendRequest', (args) => {
    const promise = vm.newPromise();
    fer
      .sendRequest(vm.dump(args))
      .then((response) => {
        promise.resolve(marshallToVm(cleanCircularJson(response), vm));
      })
      .catch((err) => {
        promise.reject(
          marshallToVm(
            cleanJson(err),
            vm
          )
        );
      });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  sendRequestHandle.consume((handle) => vm.setProp(ferObject, '_sendRequest', handle));

  // On vm.global, not fer, to stay off user-facing autocomplete.
  let setScopeHandle = vm.newFunction('__ferSetScope', (scopeArg) => {
    fer._currentScope = vm.dump(scopeArg) || null;
  });
  setScopeHandle.consume((handle) => vm.setProp(vm.global, '__ferSetScope', handle));

  const sleep = vm.newFunction('sleep', (timer) => {
    const t = vm.getString(timer);
    const promise = vm.newPromise();
    setTimeout(() => {
      // The VM may have been disposed while this native timer was pending
      // (e.g. a setTimeout/sleep whose promise the script never awaited).
      // Touching the VM after teardown throws QuickJSUseAfterFree, so bail out.
      if (!vm.alive) return;
      promise.resolve(vm.newString('slept'));
    }, t);
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  sleep.consume((handle) => vm.setProp(ferObject, 'sleep', handle));

  let ferCookiesObject = vm.newObject();
  const { evalCode: cookiesEvalCode } = createPropertyListBridge(vm, fer.cookies, ferCookiesObject, {
    globalPath: 'globalThis.fer.cookies',
    syncReadMethods: ['get', 'has', 'count', 'indexOf', 'toObject', 'toString'],
    syncReadObjectMethods: ['one', 'all', 'idx', 'toJSON'],
    asyncWriteMethods: ['add', 'upsert', 'remove', 'clear', 'delete'],
    withIterators: true
  });

  const _jarFn = vm.newFunction('_jar', () => {
    const nativeJar = fer.cookies.jar();
    const jarObj = vm.newObject();

    const _getCookieFn = vm.newFunction('_getCookie', (url, cookieName) => {
      const promise = vm.newPromise();
      nativeJar.getCookie(vm.dump(url), vm.dump(cookieName), (err, cookie) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(marshallToVm(cleanCircularJson(cookie), vm));
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _getCookieFn.consume((handle) => vm.setProp(jarObj, '_getCookie', handle));

    const _getCookiesFn = vm.newFunction('_getCookies', (url) => {
      const promise = vm.newPromise();
      nativeJar.getCookies(vm.dump(url), (err, cookies) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(marshallToVm(cleanCircularJson(cookies), vm));
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _getCookiesFn.consume((handle) => vm.setProp(jarObj, '_getCookies', handle));

    const _setCookieFn = vm.newFunction('_setCookie', (url, nameOrCookieObj, value) => {
      const promise = vm.newPromise();
      const dumpedUrl = vm.dump(url);
      const dumpedNameOrObj = vm.dump(nameOrCookieObj);

      // Check if the second argument is an object (cookie object case)
      if (typeof dumpedNameOrObj === 'object' && dumpedNameOrObj !== null) {
        // Cookie object case: setCookie(url, cookieObject, callback)
        nativeJar.setCookie(dumpedUrl, dumpedNameOrObj, (err) => {
          if (err) {
            promise.reject(marshallToVm(cleanJson(err), vm));
          } else {
            promise.resolve(vm.undefined);
          }
        });
      } else {
        // Name/value case: setCookie(url, name, value, callback)
        const dumpedValue = value ? vm.dump(value) : '';
        nativeJar.setCookie(dumpedUrl, dumpedNameOrObj, dumpedValue, (err) => {
          if (err) {
            promise.reject(marshallToVm(cleanJson(err), vm));
          } else {
            promise.resolve(vm.undefined);
          }
        });
      }

      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _setCookieFn.consume((handle) => vm.setProp(jarObj, '_setCookie', handle));

    const _setCookiesFn = vm.newFunction('_setCookies', (url, cookiesArray) => {
      const promise = vm.newPromise();

      nativeJar.setCookies(vm.dump(url), vm.dump(cookiesArray), (err) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(vm.undefined);
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _setCookiesFn.consume((handle) => vm.setProp(jarObj, '_setCookies', handle));

    const _clearFn = vm.newFunction('_clear', () => {
      const promise = vm.newPromise();
      nativeJar.clear((err) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(vm.undefined);
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _clearFn.consume((handle) => vm.setProp(jarObj, '_clear', handle));

    const _deleteCookiesFn = vm.newFunction('_deleteCookies', (url) => {
      const promise = vm.newPromise();
      nativeJar.deleteCookies(vm.dump(url), (err) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(vm.undefined);
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _deleteCookiesFn.consume((handle) => vm.setProp(jarObj, '_deleteCookies', handle));

    const _deleteCookieFn = vm.newFunction('_deleteCookie', (url, cookieName) => {
      const promise = vm.newPromise();
      nativeJar.deleteCookie(vm.dump(url), vm.dump(cookieName), (err) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(vm.undefined);
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _deleteCookieFn.consume((handle) => vm.setProp(jarObj, '_deleteCookie', handle));

    const _hasCookieFn = vm.newFunction('_hasCookie', (url, cookieName) => {
      const promise = vm.newPromise();
      nativeJar.hasCookie(vm.dump(url), vm.dump(cookieName), (err, exists) => {
        if (err) {
          promise.reject(marshallToVm(cleanJson(err), vm));
        } else {
          promise.resolve(marshallToVm(exists, vm));
        }
      });
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    _hasCookieFn.consume((handle) => vm.setProp(jarObj, '_hasCookie', handle));

    return jarObj;
  });
  _jarFn.consume((handle) => vm.setProp(ferCookiesObject, '_jar', handle));

  vm.setProp(ferObject, 'cookies', ferCookiesObject);
  ferCookiesObject.dispose();

  vm.setProp(ferObject, 'runner', ferRunnerObject);
  vm.setProp(vm.global, 'fer', ferObject);
  ferObject.dispose();

  vm.evalCode(`
    // sendRequest with callback: normalize error.status (axios uses error.response.status) so
    // tests like expect(error.status).to.eql(404) pass in safe sandbox; return response after
    // success callback for consistent promise resolution.
    globalThis.fer.sendRequest = async (requestConfig, callback) => {
      if (!callback) return await globalThis.fer._sendRequest(requestConfig);
      try {
        const response = await globalThis.fer._sendRequest(requestConfig);
        try {
          await callback(null, response);
          return response;
        }
        catch(error) {
          return Promise.reject(error);
        }
      }
      catch(error) {
        const errObj = JSON.parse(JSON.stringify(error));
        if (errObj && errObj.response && typeof errObj.response.status === 'number') errObj.status = errObj.response.status;
        try {
          await callback(errObj, null);
        }
        catch(err) {
          return Promise.reject(err);
        }
      }
    };

    {
      ${cookiesEvalCode}
    }

    globalThis.fer.cookies.jar = () => {
      const _jar = globalThis.fer.cookies._jar();

      const callWithCallback = async (promiseFn, callback) => {
        if (!callback) return await promiseFn();
        try {
          const result = await promiseFn();
          try { await callback(null, result); } catch(cbErr) { return Promise.reject(cbErr); }
        } catch(err) {
          try { await callback(err, null); } catch(cbErr) { return Promise.reject(cbErr); }
        }
      };

      return {
        getCookie: (url, name, cb) => callWithCallback(() => _jar._getCookie(url, name), cb),
        getCookies: (url, cb) => callWithCallback(() => _jar._getCookies(url), cb),
        setCookie: (url, nameOrCookieObj, valueOrCallback, maybeCallback) => {
          if (typeof nameOrCookieObj === 'object' && nameOrCookieObj !== null) {
            const callback = typeof valueOrCallback === 'function' ? valueOrCallback : undefined;
            return callWithCallback(() => _jar._setCookie(url, nameOrCookieObj), callback);
          } else {
            const value = typeof valueOrCallback === 'string' ? valueOrCallback : '';
            const callback = typeof maybeCallback === 'function' ? maybeCallback : 
                           (typeof valueOrCallback === 'function' ? valueOrCallback : undefined);
            return callWithCallback(() => _jar._setCookie(url, nameOrCookieObj, value), callback);
          }
        },
        setCookies: (url, cookiesArray, cb) => callWithCallback(() => _jar._setCookies(url, cookiesArray), cb),
        clear: (cb) => callWithCallback(() => _jar._clear(), cb),
        deleteCookies: (url, cb) => callWithCallback(() => _jar._deleteCookies(url), cb),
        deleteCookie: (url, name, cb) => callWithCallback(() => _jar._deleteCookie(url, name), cb),
        hasCookie: (url, name, cb) => callWithCallback(() => _jar._hasCookie(url, name), cb)
      };
    };
  `);
};

module.exports = addFerShimToContext;
