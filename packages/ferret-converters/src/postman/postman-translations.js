import translateCode from '../utils/postman-to-ferret-translator';

const replacements = {
  'pm\\.environment\\.get\\(': 'fer.getEnvVar(',
  'pm\\.environment\\.set\\(': 'fer.setEnvVar(',
  'pm\\.variables\\.get\\(': 'fer.getVar(',
  'pm\\.variables\\.set\\(': 'fer.setVar(',
  'pm\\.variables\\.replaceIn\\(': 'fer.interpolate(',
  'pm\\.collectionVariables\\.get\\(': 'fer.getCollectionVar(',
  'pm\\.collectionVariables\\.set\\(': 'fer.setCollectionVar(',
  'pm\\.collectionVariables\\.has\\(': 'fer.hasCollectionVar(',
  'pm\\.collectionVariables\\.unset\\(': 'fer.deleteCollectionVar(',
  'pm\\.collectionVariables\\.clear\\(': 'fer.deleteAllCollectionVars(',
  'pm\\.collectionVariables\\.toObject\\(': 'fer.getAllCollectionVars(',
  // Only the actual null literal stops the runner; the string 'null' is a valid
  // request name and falls through to setNextRequest.
  'pm\\.setNextRequest\\(null\\)': 'fer.runner.stopExecution()',
  'pm\\.setNextRequest\\(': 'fer.runner.setNextRequest(',
  'pm\\.test\\(': 'test(',
  'pm.response.to.have\\.status\\(': 'expect(res.getStatus()).to.equal(',
  'pm\\.response\\.to\\.have\\.status\\(': 'expect(res.getStatus()).to.equal(',
  'pm\\.response\\.json\\(': 'res.getBody(',
  'pm\\.expect\\(': 'expect(',
  'pm\\.environment\\.has\\(([^)]+)\\)': 'fer.getEnvVar($1) !== undefined && fer.getEnvVar($1) !== null',
  'pm\\.response\\.code': 'res.getStatus()',
  'pm\\.response\\.text\\(\\)': 'JSON.stringify(res.getBody())',
  'pm\\.expect\\.fail\\(': 'expect.fail(',
  'pm\\.response\\.responseTime': 'res.getResponseTime()',
  'pm\\.globals\\.set\\(': 'fer.setGlobalEnvVar(',
  'pm\\.globals\\.get\\(': 'fer.getGlobalEnvVar(',
  'pm\\.globals\\.has\\(': 'fer.hasGlobalEnvVar(',
  'pm\\.globals\\.unset\\(': 'fer.deleteGlobalEnvVar(',
  'pm\\.globals\\.toObject\\(': 'fer.getAllGlobalEnvVars(',
  'pm\\.globals\\.clear\\(': 'fer.deleteAllGlobalEnvVars(',
  'pm\\.environment\\.toObject\\(': 'fer.getAllEnvVars(',
  'pm\\.environment\\.clear\\(': 'fer.deleteAllEnvVars(',
  'pm\\.variables\\.toObject\\(': 'fer.getAllVars(',
  // Request header PropertyList methods
  'pm\\.request\\.headers\\.remove\\(': 'req.deleteHeader(',
  'pm\\.request\\.headers\\.get\\(': 'req.headerList.get(',
  'pm\\.request\\.headers\\.has\\(': 'req.headerList.has(',
  'pm\\.request\\.headers\\.one\\(': 'req.headerList.one(',
  'pm\\.request\\.headers\\.all\\(': 'req.headerList.all(',
  'pm\\.request\\.headers\\.count\\(': 'req.headerList.count(',
  'pm\\.request\\.headers\\.indexOf\\(': 'req.headerList.indexOf(',
  'pm\\.request\\.headers\\.find\\(': 'req.headerList.find(',
  'pm\\.request\\.headers\\.filter\\(': 'req.headerList.filter(',
  'pm\\.request\\.headers\\.each\\(': 'req.headerList.each(',
  'pm\\.request\\.headers\\.map\\(': 'req.headerList.map(',
  'pm\\.request\\.headers\\.reduce\\(': 'req.headerList.reduce(',
  'pm\\.request\\.headers\\.toObject\\(': 'req.headerList.toObject(',
  'pm\\.request\\.headers\\.clear\\(': 'req.headerList.clear(',
  'pm\\.request\\.headers\\.add\\(': 'req.headerList.add(',
  'pm\\.request\\.headers\\.upsert\\(': 'req.headerList.upsert(',
  'pm\\.request\\.headers\\.toString\\(': 'req.headerList.toString(',
  'pm\\.request\\.headers\\.toJSON\\(': 'req.headerList.toJSON(',
  'pm\\.request\\.headers\\.populate\\(': 'req.headerList.populate(',
  'pm\\.request\\.headers\\.repopulate\\(': 'req.headerList.repopulate(',
  'pm\\.request\\.headers\\.assimilate\\(': 'req.headerList.assimilate(',
  // Lossy: positional inserts map to add (position irrelevant for headers)
  // Note: regex can't drop the second arg, so it passes through as-is
  'pm\\.request\\.headers\\.prepend\\(': 'req.headerList.add(',
  'pm\\.request\\.headers\\.insert\\(': 'req.headerList.add(',
  'pm\\.request\\.headers\\.insertAfter\\(': 'req.headerList.add(',
  // Response header PropertyList methods
  'pm\\.response\\.headers\\.get\\(': 'res.getHeader(',
  'pm\\.response\\.headers\\.has\\(': 'res.headerList.has(',
  'pm\\.response\\.headers\\.one\\(': 'res.headerList.one(',
  'pm\\.response\\.headers\\.all\\(': 'res.headerList.all(',
  'pm\\.response\\.headers\\.count\\(': 'res.headerList.count(',
  'pm\\.response\\.headers\\.indexOf\\(': 'res.headerList.indexOf(',
  'pm\\.response\\.headers\\.find\\(': 'res.headerList.find(',
  'pm\\.response\\.headers\\.filter\\(': 'res.headerList.filter(',
  'pm\\.response\\.headers\\.each\\(': 'res.headerList.each(',
  'pm\\.response\\.headers\\.map\\(': 'res.headerList.map(',
  'pm\\.response\\.headers\\.reduce\\(': 'res.headerList.reduce(',
  'pm\\.response\\.headers\\.toObject\\(': 'res.headerList.toObject(',
  'pm\\.response\\.headers\\.toString\\(': 'res.headerList.toString(',
  'pm\\.response\\.headers\\.toJSON\\(': 'res.headerList.toJSON(',
  'pm\\.response\\.to\\.have\\.jsonSchema\\(': 'expect(res.getBody()).to.have.jsonSchema(',
  'pm\\.response\\.to\\.not\\.have\\.jsonSchema\\(': 'expect(res.getBody()).to.not.have.jsonSchema(',
  'pm\\.response\\.not\\.to\\.have\\.jsonSchema\\(': 'expect(res.getBody()).not.to.have.jsonSchema(',
  'pm\\.response\\.to\\.have\\.not\\.jsonSchema\\(': 'expect(res.getBody()).to.have.not.jsonSchema(',
  'pm\\.response\\.to\\.have\\.jsonBody\\(': 'expect(res.getBody()).to.have.jsonBody(',
  'pm\\.response\\.to\\.not\\.have\\.jsonBody\\(': 'expect(res.getBody()).to.not.have.jsonBody(',
  'pm\\.response\\.not\\.to\\.have\\.jsonBody\\(': 'expect(res.getBody()).not.to.have.jsonBody(',
  'pm\\.response\\.to\\.have\\.not\\.jsonBody\\(': 'expect(res.getBody()).to.have.not.jsonBody(',
  'pm\\.response\\.to\\.have\\.body\\(': 'expect(res.getBody()).to.equal(',
  'pm\\.response\\.to\\.have\\.header\\(': 'expect(res.getHeaders()).to.have.property(',
  'pm\\.response\\.size\\(\\)': 'res.getSize()',
  'pm\\.response\\.size\\(\\)\\.body': 'res.getSize().body',
  'pm\\.response\\.responseSize': 'res.getSize().body',
  'pm\\.response\\.size\\(\\)\\.header': 'res.getSize().header',
  'pm\\.response\\.size\\(\\)\\.total': 'res.getSize().total',
  'pm\\.environment\\.name': 'fer.getEnvName()',
  'pm\\.response\\.status': 'res.statusText',
  'pm\\.response\\.headers': 'res.getHeaders()',
  'tests\\[\'([^\']+)\'\\]\\s*=\\s*([^;]+);': 'test("$1", function() { expect(Boolean($2)).to.be.true; });',

  // Supported Postman request translations:
  // - pm.request.url / request.url     -> req.getUrl()
  // - pm.request.url.getHost() -> req.getHost()
  // - pm.request.url.getPath() -> req.getPath()
  // - pm.request.url.getQueryString() -> req.getQueryString()
  // - pm.request.url.variables -> req.getPathParams()
  // - pm.request.method / request.method -> req.getMethod()
  // - pm.request.headers / request.headers -> req.getHeaders()
  // - pm.request.body / request.body   -> req.getBody()
  // - pm.info.requestName / request.name -> req.getName()
  'pm\\.request\\.url\\.getHost\\(\\)': 'req.getHost()',
  'pm\\.request\\.url\\.getPath\\(\\)': 'req.getPath()',
  'pm\\.request\\.url\\.getQueryString\\(\\)': 'req.getQueryString()',
  'pm\\.request\\.url\\.variables': 'req.getPathParams()',
  'pm\\.request\\.url': 'req.getUrl()',
  'pm\\.request\\.method': 'req.getMethod()',
  'pm\\.request\\.headers': 'req.getHeaders()',
  'pm\\.request\\.body': 'req.getBody()',
  'pm\\.info\\.requestName': 'req.getName()',
  'request\\.url': 'req.getUrl()',
  'request\\.method': 'req.getMethod()',
  'request\\.headers': 'req.getHeaders()',
  'request\\.body': 'req.getBody()',
  'request\\.name': 'req.getName()',
  // deprecated translations
  'postman\\.setEnvironmentVariable\\(': 'fer.setEnvVar(',
  'postman\\.getEnvironmentVariable\\(': 'fer.getEnvVar(',
  'postman\\.clearEnvironmentVariable\\(': 'fer.deleteEnvVar(',
  'pm\\.execution\\.skipRequest\\(\\)': 'fer.runner.skipRequest()',
  'pm\\.execution\\.skipRequest': 'fer.runner.skipRequest',
  // Only the actual null literal stops the runner; the string 'null' falls through to setNextRequest.
  'pm\\.execution\\.setNextRequest\\(null\\)': 'fer.runner.stopExecution()',
  'pm\\.execution\\.setNextRequest\\(': 'fer.runner.setNextRequest(',
  // Cookie jar translations — order matters:
  // 1. Specific jar method patterns must come before the general jar() pattern,
  //    otherwise jar() consumes the prefix and the method patterns never match.
  // 2. All jar patterns must precede the simpler pm.cookies.* patterns below,
  //    since replacements are applied in insertion order.
  'pm\\.cookies\\.jar\\(\\)\\.get\\(': 'fer.cookies.jar().getCookie(',
  'pm\\.cookies\\.jar\\(\\)\\.set\\(': 'fer.cookies.jar().setCookie(',
  'pm\\.cookies\\.jar\\(\\)\\.unset\\(': 'fer.cookies.jar().deleteCookie(',
  'pm\\.cookies\\.jar\\(\\)\\.clear\\(': 'fer.cookies.jar().deleteCookies(',
  'pm\\.cookies\\.jar\\(\\)\\.getAll\\(': 'fer.cookies.jar().getCookies(',
  'pm\\.cookies\\.jar\\(\\)': 'fer.cookies.jar()',
  // Direct cookie access
  'pm\\.cookies\\.get\\(': 'fer.cookies.get(',
  'pm\\.cookies\\.has\\(': 'fer.cookies.has(',
  'pm\\.cookies\\.toObject\\(': 'fer.cookies.toObject(',
  'pm\\.cookies\\.toString\\(': 'fer.cookies.toString(',
  'pm\\.cookies\\.clear\\(': 'fer.cookies.clear(',
  'pm\\.cookies\\.remove\\(': 'fer.cookies.delete(',
  // PropertyList cookie methods
  'pm\\.cookies\\.one\\(': 'fer.cookies.one(',
  'pm\\.cookies\\.all\\(': 'fer.cookies.all(',
  'pm\\.cookies\\.idx\\(': 'fer.cookies.idx(',
  'pm\\.cookies\\.count\\(': 'fer.cookies.count(',
  'pm\\.cookies\\.indexOf\\(': 'fer.cookies.indexOf(',
  'pm\\.cookies\\.find\\(': 'fer.cookies.find(',
  'pm\\.cookies\\.filter\\(': 'fer.cookies.filter(',
  'pm\\.cookies\\.each\\(': 'fer.cookies.each(',
  'pm\\.cookies\\.map\\(': 'fer.cookies.map(',
  'pm\\.cookies\\.reduce\\(': 'fer.cookies.reduce(',
  'pm\\.cookies\\.add\\(': 'fer.cookies.add(',
  'pm\\.cookies\\.upsert\\(': 'fer.cookies.upsert(',
  // Lossy: position-aware inserts map to add (position irrelevant for cookies)
  'pm\\.cookies\\.prepend\\(': 'fer.cookies.add(',
  'pm\\.cookies\\.insert\\(': 'fer.cookies.add(',
  'pm\\.cookies\\.insertAfter\\(': 'fer.cookies.add('
};

const extendedReplacements = Object.keys(replacements).reduce((acc, key) => {
  const newKey = key.replace(/^pm\\\./, 'postman\\.');
  acc[key] = replacements[key];
  acc[newKey] = replacements[key];
  return acc;
}, {});

const compiledReplacements = Object.entries(extendedReplacements).map(([pattern, replacement]) => ({
  regex: new RegExp(pattern, 'g'),
  replacement
}));

const processRegexReplacement = (code) => {
  for (const { regex, replacement } of compiledReplacements) {
    code = code.replace(regex, replacement);
  }
  return code;
};

const postmanTranslation = (script) => {
  let modifiedScript = Array.isArray(script) ? script.join('\n') : script;
  let translatedScript;

  try {
    translatedScript = translateCode(modifiedScript);
  } catch (e) {
    console.warn('Error in postman translation:', e);

    try {
      translatedScript = processRegexReplacement(modifiedScript);
    } catch (e) {
      console.warn('Error in postman translation:', e);
      translatedScript = modifiedScript;
    }
  }

  return translatedScript;
};

export default postmanTranslation;
