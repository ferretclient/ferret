const chai = require('chai');
const Fer = require('../fer');
const { getUnresolvedVariableCollector } = require('../unresolved-variables');
const FerretRequest = require('../ferret-request');
const FerretResponse = require('../ferret-response');
const { cleanJson } = require('../utils');
const { createFerTestResultMethods } = require('../utils/results');
const { runScriptInNodeVm } = require('../sandbox/node-vm');
const { executeQuickJsVmAsync } = require('../sandbox/quickjs');
const { SANDBOX } = require('../utils/sandbox');
const { bindRunRequest, createScopeSetter } = require('./scripted-entries');

class ScriptRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'quickjs';
  }

  // This approach is getting out of hand
  // Need to refactor this to use a single arg (object) instead of 7
  async runRequestScript(
    script,
    request,
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

    // extend fer with result getter methods
    const { __ferretTestResults, test, waitForPendingTests } = createFerTestResultMethods(fer, assertionResults, chai);

    const context = {
      fer,
      req,
      test,
      expect: chai.expect,
      assert: chai.assert,
      __ferretTestResults: __ferretTestResults,
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
        debug: customLogger('debug'),
        info: customLogger('info'),
        warn: customLogger('warn'),
        error: customLogger('error')
      };
    }

    bindRunRequest(fer, runRequestByItemPathname);

    // Helper to build the result object for pre-request scripts
    // Extracted to avoid duplication across runtime branches
    const buildRequestScriptResult = () => ({
      request,
      envVariables: fer._envDirty ? cleanJson(envVariables) : null,
      runtimeVariables: fer._runtimeVarsDirty ? cleanJson(runtimeVariables) : null,
      collectionVariables: fer._collVarsDirty ? cleanJson(collectionVariables) : null,
      globalEnvironmentVariables: fer._globalEnvDirty ? cleanJson(globalEnvironmentVariables) : null,
      oauth2CredentialsToReset: fer.oauth2CredentialsToReset,
      results: cleanJson(__ferretTestResults.getResults()),
      nextRequestName: fer.nextRequest,
      skipRequest: fer.skipRequest,
      stopExecution: fer.stopExecution,
      scriptedRequestEntries: cleanJson(fer.scriptedRequestEntries || [])
    });

    const attachScriptResultToOnFailHandler = () => {
      if (typeof request.onFailHandler !== 'function') {
        return;
      }

      const onFailHandler = request.onFailHandler;
      request.onFailHandler = async (error) => {
        await onFailHandler(error);
        return buildRequestScriptResult();
      };
    };

    // Track script errors to attach partial results before re-throwing
    // This ensures that any test() calls that passed before the error are preserved
    // Similar pattern to test-runtime.js which already handles this correctly
    let scriptError = null;

    if (this.runtime === SANDBOX.NODEVM) {
      try {
        await runScriptInNodeVm({
          script,
          context,
          collectionPath,
          scriptingConfig,
          scriptPath
        });
      } catch (error) {
        scriptError = error;
      }
      await waitForPendingTests();

      // If script errored, attach partial results so callers can display passed tests
      // before the error occurred (e.g., 2 tests pass, then script throws)
      if (scriptError) {
        scriptError.partialResults = buildRequestScriptResult();
        throw scriptError;
      }

      attachScriptResultToOnFailHandler();
      return buildRequestScriptResult();
    }

    // default runtime is `quickjs`
    try {
      await executeQuickJsVmAsync({
        script: script,
        context: context,
        collectionPath,
        scriptPath
      });
    } catch (error) {
      scriptError = error;
    }

    if (scriptError) {
      scriptError.partialResults = buildRequestScriptResult();
      throw scriptError;
    }

    attachScriptResultToOnFailHandler();
    return buildRequestScriptResult();
  }

  async runResponseScript(
    script,
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
    const assertionResults = request?.assertionResults || {};
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

    const context = {
      fer,
      req,
      res,
      test,
      expect: chai.expect,
      assert: chai.assert,
      __ferretTestResults: __ferretTestResults,
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
        error: customLogger('error'),
        debug: customLogger('debug')
      };
    }

    bindRunRequest(fer, runRequestByItemPathname);

    // Helper to build the result object for post-response scripts
    // Extracted to avoid duplication across runtime branches
    const buildResponseScriptResult = () => ({
      response,
      envVariables: fer._envDirty ? cleanJson(envVariables) : null,
      runtimeVariables: fer._runtimeVarsDirty ? cleanJson(runtimeVariables) : null,
      collectionVariables: fer._collVarsDirty ? cleanJson(collectionVariables) : null,
      globalEnvironmentVariables: fer._globalEnvDirty ? cleanJson(globalEnvironmentVariables) : null,
      oauth2CredentialsToReset: fer.oauth2CredentialsToReset,
      results: cleanJson(__ferretTestResults.getResults()),
      nextRequestName: fer.nextRequest,
      skipRequest: fer.skipRequest,
      stopExecution: fer.stopExecution,
      scriptedRequestEntries: cleanJson(fer.scriptedRequestEntries || [])
    });

    // Track script errors to attach partial results before re-throwing
    // This ensures that any test() calls that passed before the error are preserved
    // Similar pattern to test-runtime.js which already handles this correctly
    let scriptError = null;

    if (this.runtime === SANDBOX.NODEVM) {
      try {
        await runScriptInNodeVm({
          script,
          context,
          collectionPath,
          scriptingConfig,
          scriptPath
        });
      } catch (error) {
        scriptError = error;
      }
      await waitForPendingTests();

      // If script errored, attach partial results so callers can display passed tests
      // before the error occurred (e.g., 2 tests pass, then script throws)
      if (scriptError) {
        scriptError.partialResults = buildResponseScriptResult();
        throw scriptError;
      }

      return buildResponseScriptResult();
    }

    // default runtime is `quickjs`
    try {
      await executeQuickJsVmAsync({
        script: script,
        context: context,
        collectionPath,
        scriptPath
      });
    } catch (error) {
      scriptError = error;
    }

    if (scriptError) {
      scriptError.partialResults = buildResponseScriptResult();
      throw scriptError;
    }

    return buildResponseScriptResult();
  }
}

module.exports = ScriptRuntime;
