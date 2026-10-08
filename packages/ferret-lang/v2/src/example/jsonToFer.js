const { indentString, getValueString } = require('../utils');

// remove the last line if two new lines are found
const stripLastLine = (text) => {
  if (!text || !text.length) return text;

  return text.replace(/(\r?\n)$/, '');
};

const quoteKey = (key) => {
  const quotableChars = [':', '"', '{', '}', ' '];
  return quotableChars.some((char) => key.includes(char)) ? ('"' + key.replaceAll('"', '\\"') + '"') : key;
};

// Custom indentation function for proper spacing
const indentStringCustom = (str, spaces = 4) => {
  if (!str || !str.length) {
    return str || '';
  }

  const indent = ' '.repeat(spaces);
  return str
    .split(/\r\n|\r|\n/)
    .map((line) => indent + line)
    .join('\n');
};

// Convert JSON to example FER format with proper colon syntax
const jsonToExampleFer = (json) => {
  const { name, description, request, response } = json;
  const { url, method, params, headers, body } = request || {};
  const { headers: responseHeaders, status: responseStatus, statusText: responseStatusText, body: responseBody } = response || {};

  let fer = '';

  if (name) {
    fer += `name: ${name}\n`;
  }

  if (description) {
    const descriptionValue = getValueString(description);
    fer += `description: ${descriptionValue}\n`;
  }

  // Request block
  fer += '\nrequest: {\n';

  fer += `  url: ${url}\n`;

  fer += `  method: ${method}\n`;

  // Add mode field inside request block, right after method
  if (request && request.body && request.body.mode) {
    fer += `  mode: ${request.body.mode}\n`;
  }

  if (params && params.length) {
    const queryParams = params.filter((param) => param.type === 'query');
    const pathParams = params.filter((param) => param.type === 'path');

    if (queryParams.length) {
      fer += '  params:query: {\n';
      fer += `${indentStringCustom(queryParams
        .map((item) => `${item.enabled ? '' : '~'}${quoteKey(item.name)}: ${item.value}`)
        .join('\n'), 4)}`;
      fer += '\n  }\n\n';
    }

    if (pathParams.length) {
      fer += '  params:path: {\n';
      fer += `${indentStringCustom(pathParams
        .map((item) => `${item.enabled ? '' : '~'}${quoteKey(item.name)}: ${item.value}`)
        .join('\n'), 4)}`;
      fer += '\n  }\n\n';
    }
  }

  if (headers && headers.length) {
    fer += '  headers: {\n';
    fer += `${indentStringCustom(headers
      .map((item) => `${item.enabled ? '' : '~'}${quoteKey(item.name)}: ${item.value}`)
      .join('\n'), 4)}`;
    fer += '\n  }\n\n';
  }

  // All body types from request side
  if (body && body.json) {
    fer += `  body:json: {\n${indentStringCustom(body.json, 4)}\n  }\n\n`;
  }

  if (body && body.text) {
    fer += `  body:text: {\n${indentStringCustom(body.text, 4)}\n  }\n\n`;
  }

  if (body && body.xml) {
    fer += `  body:xml: {\n${indentStringCustom(body.xml, 4)}\n  }\n\n`;
  }

  if (body && body.sparql) {
    fer += `  body:sparql: {\n${indentStringCustom(body.sparql, 4)}\n  }\n\n`;
  }

  if (body && body.graphql && body.graphql.query) {
    fer += `  body:graphql: {\n${indentStringCustom(body.graphql.query, 4)}\n  }\n\n`;
  }

  if (body && body.graphql && body.graphql.variables) {
    fer += `  body:graphql:vars: {\n${indentStringCustom(body.graphql.variables, 4)}\n  }\n\n`;
  }

  if (body && body.formUrlEncoded && body.formUrlEncoded.length) {
    fer += `  body:form-urlencoded: {\n`;
    const enabledValues = body.formUrlEncoded
      .filter((item) => item.enabled)
      .map((item) => `${quoteKey(item.name)}: ${item.value}`)
      .join('\n');
    const disabledValues = body.formUrlEncoded
      .filter((item) => !item.enabled)
      .map((item) => `~${quoteKey(item.name)}: ${item.value}`)
      .join('\n');

    if (enabledValues) {
      fer += `${indentStringCustom(enabledValues, 4)}\n`;
    }
    if (disabledValues) {
      fer += `${indentStringCustom(disabledValues, 4)}\n`;
    }
    fer += '  }\n\n';
  }

  if (body && body.multipartForm && body.multipartForm.length) {
    fer += `  body:multipart-form: {\n`;
    const multipartForms = body.multipartForm;
    if (multipartForms.length) {
      fer += `${indentStringCustom(multipartForms
        .map((item) => {
          const enabled = item.enabled ? '' : '~';
          const contentType
            = item.contentType && item.contentType !== '' ? ' @contentType(' + item.contentType + ')' : '';

          if (item.type === 'text') {
            // Use getValueString to wrap multiline values with triple quotes
            const valueString = getValueString(item.value);
            return `${enabled}${quoteKey(item.name)}: ${valueString}${contentType}`;
          }

          if (item.type === 'file') {
            const filepaths = Array.isArray(item.value) ? item.value : [];
            const filestr = filepaths.join('|');
            const value = `@file(${filestr})`;
            return `${enabled}${quoteKey(item.name)}: ${value}${contentType}`;
          }
        })
        .join('\n'), 4)}\n`;
    }
    fer += '  }\n\n';
  }

  if (body && body.file && body.file.length) {
    fer += `  body:file: {\n`;
    const files = body.file;
    if (files.length) {
      fer += `${indentStringCustom(files
        .map((item) => {
          const selected = item.selected ? '' : '~';
          const contentType
            = item.contentType && item.contentType !== '' ? ' @contentType(' + item.contentType + ')' : '';
          const filePath = item.filePath || '';
          const value = `@file(${filePath})`;
          const itemName = 'file';
          return `${selected}${quoteKey(itemName)}: ${value}${contentType}`;
        })
        .join('\n'), 4)}\n`;
    }
    fer += '  }\n\n';
  }
  /**
   * Only remove the last line if there are two new lines at the end
   * else the stripLastLine function will remove the last line and the curly braces move to the end of last line
   */
  if (fer.endsWith('\n\n')) {
    fer = stripLastLine(fer);
  }

  fer += '}\n\n';

  // Response block
  if (response) {
    fer += 'response: {\n';

    // Response headers
    if (responseHeaders && responseHeaders.length) {
      fer += '  headers: {\n';
      fer += `${indentStringCustom(responseHeaders
        .map((item) => `${quoteKey(item.name)}: ${item.value}`)
        .join('\n'), 4)}`;
      fer += '\n  }\n\n';
    }

    // Response status
    if (responseStatus || responseStatusText) {
      fer += '  status: {\n';
      if (responseStatus !== undefined) {
        fer += `    code: ${responseStatus}\n`;
      }
      if (responseStatusText !== undefined) {
        fer += `    text: ${responseStatusText}\n`;
      }
      fer += '  }\n\n';
    }

    // Response body with type and content
    if (responseBody) {
      fer += '  body: {\n';

      if (responseBody.type) {
        fer += `    type: ${responseBody.type}\n`;
      }

      if (responseBody.content !== undefined) {
        let contentString = typeof responseBody.content === 'string' ? responseBody.content : JSON.stringify(responseBody.content, null, 2);
        fer += `    content: '''\n${indentStringCustom(contentString, 6)}\n    '''\n`;
      }

      fer += '  }\n\n';
    }

    fer = stripLastLine(fer);
    fer += '}';
  }

  /**
   * Only remove the last line if there are two new lines at the end
   * else the stripLastLine function will remove the last line and the curly braces move to the end of last line
   */
  while (fer.endsWith('\n')) {
    fer = stripLastLine(fer);
  }

  return fer;
};

module.exports = jsonToExampleFer;
