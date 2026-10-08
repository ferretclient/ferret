const chai = require('chai');
const Fer = require('../fer');
const { getUnresolvedVariableCollector } = require('../unresolved-variables');
const FerretRequest = require('../ferret-request');
const FerretResponse = require('../ferret-response');
const { cleanJson } = require('../utils');
const { createFerTestResultMethods } = require('../utils/results');
const { runScriptInNodeVm } = require('../sandbox/node-vm');
const jsonwebtoken = require('jsonwebtoken');
const { executeQuickJsVmAsync } = require('../sandbox/quickjs');
const { SANDBOX } = require('../utils/sandbox');
const { bindRunRequest, createScopeSetter } = require('./scripted-entries');

class TestRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'quickjs';
  }

  async runTests(
    testsFile,
    request,
    response,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    runRequestByItemPathname,
    collectionName
  ) {
    const globalEnvironmentVariables = request?.globalEnvironmentVariables || {};
    const oauth2CredentialVariables = request?.oauth2CredentialVariables || {};
    const collectionVariables = request?.collectionVariables || {};
    const folderVariables = request?.folderVariables || {};
    const requestVariables = request?.requestVariables || {};
    const promptVariables = request?.promptVariables || {};
    const assertionResults = request?.assertionResults || [];
    const certsAndProxyConfig = request?.certsAndProxyConfig;
    const scriptPath = request?.pathname;
    const fer = new Fer({
      runtime: this.runtime,
      envVariables,
      runtimeVariables,
      processEnvVars,
      collectionPath,
      collectionVariables,
      folderVariables,
      requestVariables,
      globalEnvironmentVariables,
      oauth2CredentialVariables,
      collectionName,
      promptVariables,
      certsAndProxyConfig,
      requestUrl: request?.url,
      onUnresolved: getUnresolvedVariableCollector(request)
    });
    const req = new FerretRequest(request);
    const res = new FerretResponse(response);

    // extend fer with result getter methods
    const { __ferretTestResults, test, waitForPendingTests } = createFerTestResultMethods(fer, assertionResults, chai);

    if (!testsFile || !testsFile.length) {
      return {
        request,
        envVariables: null,
        runtimeVariables: null,
        collectionVariables: null,
        globalEnvironmentVariables: null,
        results: __ferretTestResults.getResults(),
        nextRequestName: fer.nextRequest,
        stopExecution: fer.stopExecution
      };
    }

    const context = {
      test,
      fer,
      req,
      res,
      expect: chai.expect,
      assert: chai.assert,
      __ferretTestResults: __ferretTestResults,
      jwt: jsonwebtoken,
      __ferSetScope: createScopeSetter(fer)
    };

    if (onConsoleLog && typeof onConsoleLog === 'function') {
      const customLogger = (type) => {
        return (...args) => {
          onConsoleLog(type, cleanJson(args));
        };
      };
      context.console = {
        log: customLogger('log'),
        info: customLogger('info'),
        warn: customLogger('warn'),
        debug: customLogger('debug'),
        error: customLogger('error')
      };
    }

    bindRunRequest(fer, runRequestByItemPathname);

    let scriptError = null;

    if (this.runtime === SANDBOX.NODEVM) {
      try {
        await runScriptInNodeVm({
          script: testsFile,
          context,
          collectionPath,
          scriptingConfig,
          scriptPath
        });
      } catch (error) {
        scriptError = error;
      }
      await waitForPendingTests();
    } else {
      // default runtime is `quickjs`
      try {
        await executeQuickJsVmAsync({
          script: testsFile,
          context: context,
          collectionPath,
          scriptPath
        });
      } catch (error) {
        scriptError = error;
      }
    }

    const result = {
      request,
      envVariables: fer._envDirty ? cleanJson(envVariables) : null,
      runtimeVariables: fer._runtimeVarsDirty ? cleanJson(runtimeVariables) : null,
      collectionVariables: fer._collVarsDirty ? cleanJson(collectionVariables) : null,
      globalEnvironmentVariables: fer._globalEnvDirty ? cleanJson(globalEnvironmentVariables) : null,
      oauth2CredentialsToReset: fer.oauth2CredentialsToReset,
      results: cleanJson(__ferretTestResults.getResults()),
      nextRequestName: fer.nextRequest,
      stopExecution: fer.stopExecution,
      scriptedRequestEntries: cleanJson(fer.scriptedRequestEntries || [])
    };

    if (scriptError) {
      scriptError.partialResults = result;
      throw scriptError;
    }

    return result;
  }
}

module.exports = TestRuntime;
