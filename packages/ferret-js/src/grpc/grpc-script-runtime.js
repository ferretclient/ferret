const chai = require('chai');
const Fer = require('../fer');
const FerretGrpcRequest = require('./ferret-grpc-request');
const FerretGrpcResponse = require('./ferret-grpc-response');
const { cleanJson } = require('../utils');
const { createFerTestResultMethods } = require('../utils/results');
const { runScriptInNodeVm } = require('../sandbox/node-vm');
const { executeQuickJsVmAsync } = require('../sandbox/quickjs');
const { SANDBOX } = require('../utils/sandbox');
const { createScopeSetter } = require('../runtime/scripted-entries');

/**
 * Runs the gRPC lifecycle hooks
 *
 * All four hooks share one body (`#runHook`) and differ only in what they put on `fer.grpc` and
 * what their result object carries — `buildGrpc` and `baseResult` below.
 *
 * The shared body mirrors `ScriptRuntime`'s `runRequestScript` / `runResponseScript` step for step,
 * substituting the gRPC request/response models. Two intentional differences, not oversights:
 * - `fer.runRequest` rejects instead of running anything.
 * - The models live under `fer.grpc` rather than as the `req` / `res` globals HTTP scripts get.
 */
class GrpcScriptRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'quickjs';
  }

  /**
   * @param {object} params
   * @param {string} params.script - The hook body, already decommented by the caller
   * @param {object} params.request - The prepared gRPC request
   * @param {Function} params.buildGrpc - Returns the `fer.grpc` object for this hook
   * @param {object} [params.baseResult] - Hook-specific fields the shared result is built on top of
   */
  async #runHook({
    script,
    request,
    buildGrpc,
    baseResult = {},
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    collectionName
  }) {
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
      requestUrl: request?.url
    });

    fer.grpc = buildGrpc();

    // extend fer with result getter methods
    const { __ferretTestResults, test } = createFerTestResultMethods(fer, assertionResults, chai);

    const context = {
      fer,
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

    // A gRPC request can't run another request yet, so there is no `runRequestByItemPathname` to bind.
    fer.runRequest = () => Promise.reject(new Error('fer.runRequest is not supported in gRPC scripts'));

    const buildScriptResult = () => ({
      ...baseResult,
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

    // Track script errors to attach partial results before re-throwing, so the variables the hook
    // set before it threw still reach the caller
    let scriptError = null;

    try {
      if (this.runtime === SANDBOX.NODEVM) {
        await runScriptInNodeVm({
          script,
          context,
          collectionPath,
          scriptingConfig,
          scriptPath
        });
      } else {
        // default runtime is `quickjs`
        await executeQuickJsVmAsync({
          script,
          context,
          collectionPath,
          scriptPath
        });
      }
    } catch (error) {
      scriptError = error;
    }

    if (scriptError) {
      scriptError.partialResults = buildScriptResult();
      throw scriptError;
    }

    return buildScriptResult();
  }

  async runGrpcRequestScript({
    script,
    request,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    collectionName
  }) {
    return this.#runHook({
      script,
      request,
      // Initial scope - `request.messages` reports what the call sent, so it is still empty here.
      buildGrpc: () => ({ request: new FerretGrpcRequest(request, { metadataWritable: true }) }),
      baseResult: { request },
      envVariables,
      runtimeVariables,
      collectionPath,
      onConsoleLog,
      processEnvVars,
      scriptingConfig,
      collectionName
    });
  }

  async runGrpcResponseScript({
    script,
    request,
    response,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    collectionName,
    sentMessages = []
  }) {
    return this.#runHook({
      script,
      request,
      // Passing sentMessages so only messages sent by client is accessible
      buildGrpc: () => ({
        request: new FerretGrpcRequest(request, { sentMessages, metadataWritable: false }),
        response: new FerretGrpcResponse(response)
      }),
      baseResult: { response },
      envVariables,
      runtimeVariables,
      collectionPath,
      onConsoleLog,
      processEnvVars,
      scriptingConfig,
      collectionName
    });
  }

  /**
   * `before-message-send`. `message` is the message about to be transmitted; it joins
   * `request.messages` only once the send succeeds, so the two never overlap.
   *
   * `fer.grpc.response` is deliberately absent, matching `beforeCallStart` — even on a bidi stream
   * where messages have already been received.
   */
  async runGrpcBeforeMessageSendScript({
    script,
    request,
    message,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    collectionName,
    sentMessages = []
  }) {
    return this.#runHook({
      script,
      request,
      buildGrpc: () => ({
        request: new FerretGrpcRequest(request, { metadataWritable: false, sentMessages, message })
      }),
      // `message` is carried on the result for the planned `message.set`; discarded by callers today.
      baseResult: { request, message },
      envVariables,
      runtimeVariables,
      collectionPath,
      onConsoleLog,
      processEnvVars,
      scriptingConfig,
      collectionName
    });
  }

  /**
   * `after-message-receive`. `message` is the message just received, and is also the last entry of
   * `response.messages` — the call folds it in before the hook runs.
   *
   * The `response` here is *partial*: the call is still open, so `statusCode`, `statusText`,
   * `duration` and `trailers` are not yet known and read as `undefined` / empty. `metadata` is
   * usually populated, since headers precede the first message.
   */
  async runGrpcAfterMessageReceiveScript({
    script,
    request,
    response,
    message,
    envVariables,
    runtimeVariables,
    collectionPath,
    onConsoleLog,
    processEnvVars,
    scriptingConfig,
    collectionName,
    sentMessages = []
  }) {
    return this.#runHook({
      script,
      request,
      buildGrpc: () => ({
        request: new FerretGrpcRequest(request, { metadataWritable: false, sentMessages }),
        response: new FerretGrpcResponse(response, { message })
      }),
      baseResult: { response, message },
      envVariables,
      runtimeVariables,
      collectionPath,
      onConsoleLog,
      processEnvVars,
      scriptingConfig,
      collectionName
    });
  }
}

module.exports = GrpcScriptRuntime;
