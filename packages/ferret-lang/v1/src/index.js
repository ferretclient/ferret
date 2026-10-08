const { many, choice, anyChar } = require('arcsecond');
const _ = require('lodash');
const { indentString, outdentString } = require('./utils');

const inlineTag = require('./inline-tag');
const paramsTag = require('./params-tag');
const headersTag = require('./headers-tag');
const {
  bodyJsonTag,
  bodyGraphqlTag,
  bodyGraphqlVarsTag,
  bodyTextTag,
  bodyXmlTag,
  bodyFormUrlEncodedTagDeprecated,
  bodyFormUrlEncodedTag,
  bodyMultipartFormTag
} = require('./body-tag');
const scriptTag = require('./script-tag');
const testsTag = require('./tests-tag');

const ferToJson = (fileContents) => {
  const parser = many(
    choice([
      inlineTag,
      paramsTag,
      headersTag,
      bodyJsonTag,
      bodyGraphqlTag,
      bodyGraphqlVarsTag,
      bodyTextTag,
      bodyXmlTag,
      bodyFormUrlEncodedTagDeprecated,
      bodyFormUrlEncodedTag,
      bodyMultipartFormTag,
      scriptTag,
      testsTag,
      anyChar
    ])
  );

  const parsed = parser.run(fileContents).result.reduce((acc, item) => _.merge(acc, item), {});

  const json = {
    type: parsed.type || '',
    name: parsed.name || '',
    seq: parsed.seq ? Number(parsed.seq) : 1,
    request: {
      method: parsed.method || '',
      url: parsed.url || '',
      params: parsed.params || [],
      headers: parsed.headers || [],
      body: parsed.body || { mode: 'none' },
      script: parsed.script ? outdentString(parsed.script) : '',
      tests: parsed.tests ? outdentString(parsed.tests) : ''
    }
  };

  const body = _.get(json, 'request.body');

  if (body && body.text) {
    body.text = outdentString(body.text);
  }

  if (body && body.json) {
    body.json = outdentString(body.json);
  }

  if (body && body.xml) {
    body.xml = outdentString(body.xml);
  }

  if (body && body.graphql && body.graphql.query) {
    body.graphql.query = outdentString(body.graphql.query);
  }

  if (body && body.graphql && body.graphql.variables) {
    body.graphql.variables = outdentString(body.graphql.variables);
  }

  return json;
};

const jsonToFer = (json) => {
  const {
    type,
    name,
    seq,
    request: { method, url, params, headers, body, script, tests }
  } = json;

  let fer = `name ${name}
method ${method}
url ${url}
type ${type}
body-mode ${body ? body.mode : 'none'}
seq ${seq ? seq : 1}
`;

  if (params && params.length) {
    fer += `
params
${params.map((param) => `  ${param.enabled ? 1 : 0} ${param.name} ${param.value}`).join('\n')}
/params
`;
  }

  if (headers && headers.length) {
    fer += `
headers
${headers.map((header) => `  ${header.enabled ? 1 : 0} ${header.name} ${header.value}`).join('\n')}
/headers
`;
  }

  if (body && body.json && body.json.length) {
    fer += `
body(type=json)
${indentString(body.json)}
/body
`;
  }

  if (body && body.graphql && body.graphql.query) {
    fer += `
body(type=graphql)
${indentString(body.graphql.query)}
/body
`;
  }

  if (body && body.graphql && body.graphql.variables) {
    fer += `
body(type=graphql-vars)
${indentString(body.graphql.variables)}
/body
`;
  }

  if (body && body.text && body.text.length) {
    fer += `
body(type=text)
${indentString(body.text)}
/body
`;
  }

  if (body && body.xml && body.xml.length) {
    fer += `
body(type=xml)
${indentString(body.xml)}
/body
`;
  }

  if (body && body.formUrlEncoded && body.formUrlEncoded.length) {
    fer += `
body(type=form-urlencoded)
${body.formUrlEncoded.map((item) => `  ${item.enabled ? 1 : 0} ${item.name} ${item.value}`).join('\n')}
/body
`;
  }

  if (body && body.multipartForm && body.multipartForm.length) {
    fer += `
body(type=multipart-form)
${body.multipartForm.map((item) => `  ${item.enabled ? 1 : 0} ${item.name} ${item.value}`).join('\n')}
/body
`;
  }

  if (script && script.length) {
    fer += `
script
${indentString(script)}
/script
`;
  }

  if (tests && tests.length) {
    fer += `
tests
${indentString(tests)}
/tests
`;
  }

  return fer;
};

// env
const envVarsTag = require('./env-vars-tag');

const ferToEnvJson = (fileContents) => {
  const parser = many(choice([envVarsTag, anyChar]));

  const parsed = parser.run(fileContents).result.reduce((acc, item) => _.merge(acc, item), {});

  const json = {
    variables: parsed.variables || []
  };

  return json;
};

const envJsonToFer = (json) => {
  const { variables } = json;

  let fer = '';

  if (variables && variables.length) {
    fer += `vars
${variables.map((item) => `  ${item.enabled ? 1 : 0} ${item.name} ${item.value}`).join('\n')}
/vars
`;
  }

  return fer;
};

module.exports = {
  ferToJson,
  jsonToFer,
  ferToEnvJson,
  envJsonToFer
};
