import {
  getMemberExpressionString,
  buildMemberExpressionFromString
} from './ast-utils';
import ferretSendRequestTransformer from './ferret-send-request-transformer';
const j = require('jscodeshift');

// =============================================================================
// SIMPLE TRANSLATIONS
// =============================================================================

/**
 * Simple 1:1 translations from Ferret helpers to Postman helpers.
 * These are direct member expression replacements.
 */
const simpleTranslations = {
  // Global variables
  'fer.getGlobalEnvVar': 'pm.globals.get',
  'fer.setGlobalEnvVar': 'pm.globals.set',
  'fer.hasGlobalEnvVar': 'pm.globals.has',
  'fer.deleteGlobalEnvVar': 'pm.globals.unset',
  'fer.getAllGlobalEnvVars': 'pm.globals.toObject',
  'fer.deleteAllGlobalEnvVars': 'pm.globals.clear',

  // Environment variables
  'fer.getEnvVar': 'pm.environment.get',
  'fer.setEnvVar': 'pm.environment.set',
  'fer.hasEnvVar': 'pm.environment.has',
  'fer.deleteEnvVar': 'pm.environment.unset',
  'fer.getAllEnvVars': 'pm.environment.toObject',
  'fer.deleteAllEnvVars': 'pm.environment.clear',
  // Note: fer.getEnvName() is handled in complexTransformations because it's a function -> property conversion

  // Runtime variables
  'fer.getVar': 'pm.variables.get',
  'fer.setVar': 'pm.variables.set',
  'fer.hasVar': 'pm.variables.has',
  'fer.deleteVar': 'pm.variables.unset',
  'fer.getAllVars': 'pm.variables.toObject',
  // 'fer.deleteAllVars':  Postman does not have a way to delete all variables

  // Collection variables
  'fer.getCollectionVar': 'pm.collectionVariables.get',
  'fer.setCollectionVar': 'pm.collectionVariables.set',
  'fer.hasCollectionVar': 'pm.collectionVariables.has',
  'fer.deleteCollectionVar': 'pm.collectionVariables.unset',
  'fer.getAllCollectionVars': 'pm.collectionVariables.toObject',
  'fer.deleteAllCollectionVars': 'pm.collectionVariables.clear',

  // Folder variables
  'fer.getFolderVar': 'pm.variables.get',
  /* Ferret does not have a way to set, has or delete folder variables */

  // Request variables (map to pm.variables.*)
  'fer.getRequestVar': 'pm.variables.get',
  /* Ferret does not have a way to set, has or delete request variables */

  // Interpolation
  'fer.interpolate': 'pm.variables.replaceIn',

  // Execution control
  'fer.setNextRequest': 'pm.execution.setNextRequest',
  'fer.runner.skipRequest': 'pm.execution.skipRequest',
  'fer.runner.setNextRequest': 'pm.execution.setNextRequest',

  // Request helpers
  // Note: req.getUrl(), req.getMethod(), req.getHeaders(), req.getBody(), req.getName() are handled
  // in complexTransformations because they're function -> property conversions
  'req.url': 'pm.request.url',
  'req.method': 'pm.request.method',
  'req.headers': 'pm.request.headers',
  'req.body': 'pm.request.body',
  'req.getHeader': 'pm.request.headers.get',
  // Note: req.setHeader is handled in complexTransformations because it needs arg restructuring (two args -> object)
  'req.deleteHeader': 'pm.request.headers.remove',

  // Request headerList PropertyList methods
  'req.headerList': 'pm.request.headers',
  'req.headerList.get': 'pm.request.headers.get',
  'req.headerList.has': 'pm.request.headers.has',
  'req.headerList.one': 'pm.request.headers.one',
  'req.headerList.all': 'pm.request.headers.all',
  'req.headerList.count': 'pm.request.headers.count',
  'req.headerList.indexOf': 'pm.request.headers.indexOf',
  'req.headerList.find': 'pm.request.headers.find',
  'req.headerList.filter': 'pm.request.headers.filter',
  'req.headerList.each': 'pm.request.headers.each',
  'req.headerList.map': 'pm.request.headers.map',
  'req.headerList.reduce': 'pm.request.headers.reduce',
  'req.headerList.toObject': 'pm.request.headers.toObject',
  'req.headerList.toString': 'pm.request.headers.toString',
  'req.headerList.toJSON': 'pm.request.headers.toJSON',
  'req.headerList.add': 'pm.request.headers.add',
  'req.headerList.upsert': 'pm.request.headers.upsert',
  'req.headerList.remove': 'pm.request.headers.remove',
  'req.headerList.clear': 'pm.request.headers.clear',
  'req.headerList.populate': 'pm.request.headers.populate',
  'req.headerList.repopulate': 'pm.request.headers.repopulate',
  'req.headerList.assimilate': 'pm.request.headers.assimilate',

  // URL helper methods
  'req.getHost': 'pm.request.url.getHost',
  'req.getPath': 'pm.request.url.getPath',
  'req.getQueryString': 'pm.request.url.getQueryString',

  // Response helpers
  // Note: res.getStatus(), res.getResponseTime(), res.getHeaders(), res.getUrl() are handled
  // in complexTransformations because they're function -> property conversions
  'res.status': 'pm.response.code',
  'res.statusText': 'pm.response.status',
  'res.body': 'pm.response.body',
  'res.url': 'pm.response.url',
  'res.responseTime': 'pm.response.responseTime',
  'res.headers': 'pm.response.headers',
  'res.getBody': 'pm.response.json',
  'res.getHeader': 'pm.response.headers.get',
  'res.getSize': 'pm.response.size',

  // Response headerList PropertyList methods (read-only)
  'res.headerList': 'pm.response.headers',
  'res.headerList.get': 'pm.response.headers.get',
  'res.headerList.has': 'pm.response.headers.has',
  'res.headerList.one': 'pm.response.headers.one',
  'res.headerList.all': 'pm.response.headers.all',
  'res.headerList.count': 'pm.response.headers.count',
  'res.headerList.indexOf': 'pm.response.headers.indexOf',
  'res.headerList.find': 'pm.response.headers.find',
  'res.headerList.filter': 'pm.response.headers.filter',
  'res.headerList.each': 'pm.response.headers.each',
  'res.headerList.map': 'pm.response.headers.map',
  'res.headerList.reduce': 'pm.response.headers.reduce',
  'res.headerList.toObject': 'pm.response.headers.toObject',
  'res.headerList.toString': 'pm.response.headers.toString',
  'res.headerList.toJSON': 'pm.response.headers.toJSON',

  // Cookies jar
  'fer.cookies.jar': 'pm.cookies.jar',

  // Direct cookie access
  'fer.cookies.get': 'pm.cookies.get',
  'fer.cookies.has': 'pm.cookies.has',
  'fer.cookies.toObject': 'pm.cookies.toObject',
  'fer.cookies.toString': 'pm.cookies.toString',
  'fer.cookies.clear': 'pm.cookies.clear',
  'fer.cookies.delete': 'pm.cookies.remove',

  // PropertyList cookie methods (1:1 mappings)
  'fer.cookies.one': 'pm.cookies.one',
  'fer.cookies.all': 'pm.cookies.all',
  'fer.cookies.idx': 'pm.cookies.idx',
  'fer.cookies.count': 'pm.cookies.count',
  'fer.cookies.indexOf': 'pm.cookies.indexOf',
  'fer.cookies.find': 'pm.cookies.find',
  'fer.cookies.filter': 'pm.cookies.filter',
  'fer.cookies.each': 'pm.cookies.each',
  'fer.cookies.map': 'pm.cookies.map',
  'fer.cookies.reduce': 'pm.cookies.reduce',
  'fer.cookies.add': 'pm.cookies.add',
  'fer.cookies.upsert': 'pm.cookies.upsert',
  'fer.cookies.remove': 'pm.cookies.remove',

  // Testing
  'expect.fail': 'pm.expect.fail'
};

// =============================================================================
// UNSUPPORTED FERRET APIs (No Postman Equivalent)
// =============================================================================

/**
 * UNSUPPORTED FERRET APIs (No Postman Equivalent)
 *
 * These Ferret APIs have no direct Postman equivalent and will be left unchanged
 * in the translated code. Users should be aware that these calls will not work
 * in Postman:
 *
 * Request APIs:
 * - req.getTags() - Postman doesn't have tags
 * - req.setMaxRedirects() - Postman doesn't expose redirect settings
 * - req.getTimeout() / req.setTimeout() - Postman doesn't expose timeout settings
 * - req.getExecutionMode() - Ferret-specific
 * - req.onFail() - Postman doesn't support error handlers
 * - req.disableParsingResponseJson() - Ferret-specific
 *
 * Response APIs:
 * - res.setBody() - Postman response is read-only
 *
 * Fer APIs:
 * - fer.runRequest() - Postman doesn't support nested request execution
 * - fer.sleep() - Postman doesn't have sleep (use setTimeout workaround)
 * - fer.getProcessEnv() - Postman doesn't expose process env vars
 * - fer.getOauth2CredentialVar() - Ferret-specific
 * - fer.getCollectionName() - pm.info doesn't expose collection name
 * - fer.cwd() - Ferret-specific
 * - fer.getAssertionResults() / fer.getTestResults() - Ferret-specific
 */

// =============================================================================
// COMPLEX TRANSFORMATIONS
// =============================================================================

/**
 * Complex transformations that require custom handling beyond simple replacements.
 * Each transformation has a pattern to match and a transform function.
 *
 * Note: These are processed in order, so more specific patterns should come first.
 */
const complexTransformations = [
  // fer.sendRequest transformation
  {
    pattern: 'fer.sendRequest',
    transform: ferretSendRequestTransformer
  },

  // fer.runner.stopExecution() -> pm.execution.setNextRequest(null)
  {
    pattern: 'fer.runner.stopExecution',
    transform: (path) => {
      return j.callExpression(
        buildMemberExpressionFromString('pm.execution.setNextRequest'),
        [j.literal(null)]
      );
    }
  },

  // JSON.stringify(res.getBody()) -> pm.response.text()
  {
    pattern: 'JSON.stringify',
    condition: (path) => {
      const args = path.value.arguments;
      if (args.length !== 1) return false;

      const arg = args[0];
      if (arg.type !== 'CallExpression' || arg.callee.type !== 'MemberExpression') return false;

      return getMemberExpressionString(arg.callee) === 'res.getBody';
    },
    transform: () => {
      return j.callExpression(
        buildMemberExpressionFromString('pm.response.text'),
        []
      );
    }
  },

  // fer.getEnvName() -> pm.environment.name (function to property)
  {
    pattern: 'fer.getEnvName',
    transform: () => {
      // Replace the entire call expression with just the member expression (property access)
      return buildMemberExpressionFromString('pm.environment.name');
    }
  },

  // Request helpers: function -> property conversions
  // req.getUrl() -> pm.request.url
  {
    pattern: 'req.getUrl',
    transform: () => buildMemberExpressionFromString('pm.request.url')
  },
  // req.getMethod() -> pm.request.method
  {
    pattern: 'req.getMethod',
    transform: () => buildMemberExpressionFromString('pm.request.method')
  },
  // req.getHeaders() -> pm.request.headers
  {
    pattern: 'req.getHeaders',
    transform: () => buildMemberExpressionFromString('pm.request.headers')
  },
  // req.getBody() -> pm.request.body
  {
    pattern: 'req.getBody',
    transform: () => buildMemberExpressionFromString('pm.request.body')
  },
  // req.getName() -> pm.info.requestName
  {
    pattern: 'req.getName',
    transform: () => buildMemberExpressionFromString('pm.info.requestName')
  },
  // req.getAuthMode() -> pm.request.auth.type
  {
    pattern: 'req.getAuthMode',
    transform: () => buildMemberExpressionFromString('pm.request.auth.type')
  },
  // req.getPathParams() -> pm.request.url.variables
  {
    pattern: 'req.getPathParams',
    transform: () => buildMemberExpressionFromString('pm.request.url.variables')
  },

  // Response helpers: function -> property conversions
  // res.getStatus() -> pm.response.code
  {
    pattern: 'res.getStatus',
    transform: () => buildMemberExpressionFromString('pm.response.code')
  },
  // res.getStatusText() -> pm.response.status
  {
    pattern: 'res.getStatusText',
    transform: () => buildMemberExpressionFromString('pm.response.status')
  },
  // res.getResponseTime() -> pm.response.responseTime
  {
    pattern: 'res.getResponseTime',
    transform: () => buildMemberExpressionFromString('pm.response.responseTime')
  },
  // res.getHeaders() -> pm.response.headers
  {
    pattern: 'res.getHeaders',
    transform: () => buildMemberExpressionFromString('pm.response.headers')
  },
  // res.getUrl() -> pm.response.url
  {
    pattern: 'res.getUrl',
    transform: () => buildMemberExpressionFromString('pm.response.url')
  },

  // Request modifiers: function calls -> assignments
  // req.setUrl(url) -> pm.request.url = url
  {
    pattern: 'req.setUrl',
    transform: (path) => {
      const callExpr = path.value;
      const args = callExpr.arguments;
      if (!args || args.length === 0) {
        // No arguments, return the property access
        return buildMemberExpressionFromString('pm.request.url');
      }
      // Transform req.setUrl(url) to pm.request.url = url
      return j.assignmentExpression(
        '=',
        buildMemberExpressionFromString('pm.request.url'),
        args[0]
      );
    }
  },
  // req.setMethod(method) -> pm.request.method = method
  {
    pattern: 'req.setMethod',
    transform: (path) => {
      const callExpr = path.value;
      const args = callExpr.arguments;
      if (!args || args.length === 0) {
        // No arguments, return the property access
        return buildMemberExpressionFromString('pm.request.method');
      }
      // Transform req.setMethod(method) to pm.request.method = method
      return j.assignmentExpression(
        '=',
        buildMemberExpressionFromString('pm.request.method'),
        args[0]
      );
    }
  },
  // req.setBody(data) -> pm.request.body.update({mode: "raw", raw: JSON.stringify(data)})
  {
    pattern: 'req.setBody',
    transform: (path) => {
      const callExpr = path.value;
      const args = callExpr.arguments;
      if (!args || args.length === 0) {
        // No arguments, return the property access
        return buildMemberExpressionFromString('pm.request.body');
      }
      // Transform req.setBody(data) to pm.request.body.update({mode: "raw", raw: JSON.stringify(data)})
      const bodyArg = args[0];
      const updateCall = j.callExpression(
        j.memberExpression(
          buildMemberExpressionFromString('pm.request.body'),
          j.identifier('update')
        ),
        [
          j.objectExpression([
            j.property('init', j.identifier('mode'), j.literal('raw')),
            j.property('init', j.identifier('raw'), j.callExpression(
              j.identifier('JSON.stringify'),
              [bodyArg]
            ))
          ])
        ]
      );
      return updateCall;
    }
  },
  // req.setHeader(key, value) -> pm.request.headers.upsert({key: key, value: value})
  {
    pattern: 'req.setHeader',
    transform: (path) => {
      const args = path.value.arguments;
      if (!args || args.length < 2) {
        return j.callExpression(
          buildMemberExpressionFromString('pm.request.headers.upsert'),
          args || []
        );
      }
      return j.callExpression(
        buildMemberExpressionFromString('pm.request.headers.upsert'),
        [
          j.objectExpression([
            j.property('init', j.identifier('key'), args[0]),
            j.property('init', j.identifier('value'), args[1])
          ])
        ]
      );
    }
  },
  // req.setHeaders(headers) -> loop calling pm.request.headers.upsert() for each header
  {
    pattern: 'req.setHeaders',
    transform: (path) => {
      const callExpr = path.value;
      const args = callExpr.arguments;
      if (!args || args.length === 0) {
        // No arguments, return the property access
        return buildMemberExpressionFromString('pm.request.headers');
      }
      const headersArg = args[0];

      // Transform req.setHeaders(obj) to a for...in loop that calls upsert for each property
      // Generate: for (const key in headersObj) { pm.request.headers.upsert({key: key, value: headersObj[key]}); }
      const headersVar = j.identifier('_headers');
      const keyVar = j.identifier('key');

      // Create: for (const key in _headers) { pm.request.headers.upsert({key: key, value: _headers[key]}); }
      const forLoop = j.forInStatement(
        j.variableDeclaration('const', [j.variableDeclarator(keyVar)]),
        headersVar,
        j.blockStatement([
          j.expressionStatement(
            j.callExpression(
              j.memberExpression(
                buildMemberExpressionFromString('pm.request.headers'),
                j.identifier('upsert')
              ),
              [
                j.objectExpression([
                  j.property('init', j.identifier('key'), keyVar),
                  j.property('init', j.identifier('value'), j.memberExpression(headersVar, keyVar, true))
                ])
              ]
            )
          )
        ])
      );

      // We need to replace the call expression with a block that includes the variable declaration and loop
      // But the current architecture only replaces the call expression itself
      // So we'll create an IIFE (Immediately Invoked Function Expression) that contains both
      const iife = j.callExpression(
        j.functionExpression(
          null,
          [],
          j.blockStatement([
            j.variableDeclaration('const', [
              j.variableDeclarator(headersVar, headersArg)
            ]),
            forLoop
          ])
        ),
        []
      );

      return iife;
    }
  }
];

// Create a map for O(1) lookups of complex transformations
const complexTransformationsMap = new Map();
complexTransformations.forEach((t) => {
  complexTransformationsMap.set(t.pattern, t);
});

// Cookie jar method mappings (Ferret -> PM)
// Note: Ferret's setCookie with cookie object form is not supported (Postman only accepts url, name, value, callback?)
// Note: getCookies(url, callback?) -> getAll(url, options?, callback?)
//       PM docs treat callback as 2nd arg, likely handled internally to detect function vs options object
const cookieMethodMapping = {
  getCookie: 'get', // (url, name, callback?) -> (url, name, callback?)
  getCookies: 'getAll', // (url, callback?) -> (url, callback?) - PM handles internally
  setCookie: 'set', // (url, name, value, callback?) -> (url, name, value?, callback?)
  deleteCookie: 'unset', // (url, name, callback?) -> (url, name, callback?)
  deleteCookies: 'clear' // (url, callback?) -> (url, callback?)
};

// =============================================================================
// TRANSFORMATION FUNCTIONS
// =============================================================================

/**
 * Process simple member expression translations (fer.* -> pm.*)
 * and complex transformations in a single pass.
 *
 * @param {Object} ast - jscodeshift AST
 */
function processAllTransformations(ast) {
  // First handle CallExpressions for complex transformations
  ast.find(j.CallExpression).forEach((path) => {
    const { callee } = path.value;
    if (callee.type !== 'MemberExpression') return;

    const memberExprStr = getMemberExpressionString(callee);
    const transform = complexTransformationsMap.get(memberExprStr);

    if (transform) {
      // Check condition if present
      if (transform.condition && !transform.condition(path)) return;

      const replacement = transform.transform(path);
      if (replacement !== null) {
        j(path).replaceWith(replacement);
      }
    }
  });

  // Then handle simple member expression translations
  ast.find(j.MemberExpression).forEach((path) => {
    const memberExprStr = getMemberExpressionString(path.value);

    if (!Object.prototype.hasOwnProperty.call(simpleTranslations, memberExprStr)) return;

    const replacement = simpleTranslations[memberExprStr];
    j(path).replaceWith(buildMemberExpressionFromString(replacement));
  });
}

/**
 * Transform cookie jar method calls.
 * Handles both direct calls and variables assigned to cookie jars.
 *
 * @param {Object} ast - jscodeshift AST
 */
function transformCookieJarMethods(ast) {
  // Track variables assigned to cookie jar instances
  const cookieJarVars = new Set();

  // Find variables assigned to cookie jar
  ast.find(j.VariableDeclarator).forEach((path) => {
    if (path.value.init?.type === 'CallExpression' && path.value.init.callee.type === 'MemberExpression') {
      const calleeStr = getMemberExpressionString(path.value.init.callee);
      if (calleeStr === 'fer.cookies.jar' || calleeStr === 'pm.cookies.jar') {
        if (path.value.id.type === 'Identifier') {
          cookieJarVars.add(path.value.id.name);
        }
      }
    }
  });

  // Transform method calls on cookie jars
  ast.find(j.CallExpression).forEach((path) => {
    const { callee } = path.value;
    if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') return;

    const methodName = callee.property.name;
    if (!cookieMethodMapping[methodName]) return;

    // Check if object is a direct jar() call or a jar variable
    const isDirectJarCall = callee.object.type === 'CallExpression'
      && callee.object.callee.type === 'MemberExpression'
      && ['fer.cookies.jar', 'pm.cookies.jar'].includes(getMemberExpressionString(callee.object.callee));

    const isJarVariable = callee.object.type === 'Identifier' && cookieJarVars.has(callee.object.name);

    if (isDirectJarCall || isJarVariable) {
      path.value.callee.property.name = cookieMethodMapping[methodName];
    }
  });
}

/**
 * Transform test() -> pm.test() and expect() -> pm.expect()
 *
 * @param {Object} ast - jscodeshift AST
 */
function transformTestsAndExpect(ast) {
  // Transform test(...) -> pm.test(...)
  ast.find(j.CallExpression, { callee: { type: 'Identifier', name: 'test' } })
    .forEach((path) => {
      j(path.get('callee')).replaceWith(
        j.memberExpression(j.identifier('pm'), j.identifier('test'))
      );
    });

  // Transform expect(...) -> pm.expect(...)
  ast.find(j.CallExpression, { callee: { type: 'Identifier', name: 'expect' } })
    .forEach((path) => {
      j(path.get('callee')).replaceWith(
        j.memberExpression(j.identifier('pm'), j.identifier('expect'))
      );
    });
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Translate Ferret scripts back to Postman-compatible scripts.
 *
 * This function transforms Ferret API calls (fer.*, req.*, res.*, test(), expect())
 * back to their Postman equivalents (pm.*, pm.request.*, pm.response.*, pm.test(), pm.expect()).
 *
 * @param {string} code - Ferret script string
 * @returns {string} - Postman-compatible script string
 *
 * @example
 * translateFerToPostman('fer.getEnvVar("test");')
 * // Returns: 'pm.environment.get("test");'
 *
 * @example
 * translateFerToPostman('const data = res.getBody();')
 * // Returns: 'const data = pm.response.json();'
 */
function translateFerToPostman(code) {
  if (!code || typeof code !== 'string') {
    return '';
  }

  try {
    const ast = j(code);

    processAllTransformations(ast);
    transformCookieJarMethods(ast);
    transformTestsAndExpect(ast);

    return ast.toSource();
  } catch (e) {
    console.warn('Error in Ferret to Postman translation:', e);
    return code;
  }
}

export default translateFerToPostman;
