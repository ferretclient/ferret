const { parseRequestAndRedactBody, parseRequestViaWorker, DEFAULT_COLLECTION_FORMAT } = require('@useferret/filestore');

/**
 * Parses a large FER request string by redacting body blocks, parsing the remainder,
 * and then reinserting extracted body content into the parsed structure.
 * @param {string} ferContent
 * @param {string} format - Collection format, defaults to 'fer'
 * @returns {Promise<any>} parsed request JSON
 */
async function parseLargeRequestWithRedaction(ferContent, format = DEFAULT_COLLECTION_FORMAT) {
  const { ferFileStringWithRedactedBody, extractedBodyContent } = parseRequestAndRedactBody(ferContent, { format });
  const parsedData = await parseRequestViaWorker(ferFileStringWithRedactedBody, { format });

  if (!parsedData.request) {
    parsedData.request = {};
  }
  if (!parsedData.request.body) {
    parsedData.request.body = {};
  }

  if (extractedBodyContent.json) {
    parsedData.request.body.json = extractedBodyContent.json;
  }
  if (extractedBodyContent.text) {
    parsedData.request.body.text = extractedBodyContent.text;
  }
  if (extractedBodyContent.xml) {
    parsedData.request.body.xml = extractedBodyContent.xml;
  }
  if (extractedBodyContent.sparql) {
    parsedData.request.body.sparql = extractedBodyContent.sparql;
  }
  if (extractedBodyContent.graphql) {
    if (!parsedData.request.body.graphql) {
      parsedData.request.body.graphql = {};
    }
    parsedData.request.body.graphql.query = extractedBodyContent.graphql;
  }

  return parsedData;
}

module.exports = { parseLargeRequestWithRedaction };
