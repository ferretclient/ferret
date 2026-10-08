const _ = require('lodash');
const Fer = require('../fer');
const { getUnresolvedVariableCollector } = require('../unresolved-variables');
const FerretRequest = require('../ferret-request');
const { evaluateJsExpression, createResponseParser } = require('../utils');
const { cleanJson } = require('../utils');

const { executeQuickJsVm } = require('../sandbox/quickjs');

const evaluateJsExpressionBasedOnRuntime = (expr, context, runtime, mode) => {
  if (runtime === 'quickjs') {
    return executeQuickJsVm({
      script: expr,
      context,
      scriptType: 'expression'
    });
  }

  return evaluateJsExpression(expr, context);
};

class VarsRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'quickjs';
    this.mode = props?.mode || 'developer';
  }

  runPostResponseVars(vars, request, response, envVariables, runtimeVariables, collectionPath, processEnvVars) {
    const requestVariables = request?.requestVariables || {};
    const globalEnvironmentVariables = request?.globalEnvironmentVariables || {};
    const oauth2CredentialVariables = request?.oauth2CredentialVariables || {};
    const collectionVariables = request?.collectionVariables || {};
    const folderVariables = request?.folderVariables || {};
    const enabledVars = _.filter(vars, (v) => v.enabled);
    if (!enabledVars.length) {
      return;
    }

    const promptVariables = request?.promptVariables || {};
    const certsAndProxyConfig = request?.certsAndProxyConfig;
    const fer = new Fer({
      runtime: this.runtime,
      envVariables,
      runtimeVariables,
      processEnvVars,
      collectionVariables,
      folderVariables,
      requestVariables,
      globalEnvironmentVariables,
      oauth2CredentialVariables,
      promptVariables,
      certsAndProxyConfig,
      requestUrl: request?.url,
      onUnresolved: getUnresolvedVariableCollector(request)
    });
    const req = new FerretRequest(request);
    const res = createResponseParser(response);

    const ferContext = {
      fer,
      req,
      res
    };

    const context = {
      ...envVariables,
      ...runtimeVariables,
      ...ferContext
    };

    const errors = new Map();
    _.each(enabledVars, (v) => {
      try {
        const value = evaluateJsExpressionBasedOnRuntime(v.value, context, this.runtime);
        if (v.name) {
          fer.setVar(v.name, value);
        }
      } catch (error) {
        errors.set(v.name, error);
      }
    });

    let error = null;
    if (errors.size > 0) {
      // Format all errors as a single string to be displayed in a toast
      const errorMessage = [...errors.entries()].map(([name, err]) => `${name}: ${err.message ?? err}`).join('\n');
      error = `${errors.size} error${errors.size === 1 ? '' : 's'} in post response variables: \n${errorMessage}`;
    }

    return {
      envVariables: fer._envDirty ? cleanJson(envVariables) : null,
      runtimeVariables: fer._runtimeVarsDirty ? cleanJson(runtimeVariables) : null,
      collectionVariables: fer._collVarsDirty ? cleanJson(collectionVariables) : null,
      globalEnvironmentVariables: fer._globalEnvDirty ? cleanJson(globalEnvironmentVariables) : null,
      error
    };
  }
}

module.exports = VarsRuntime;
