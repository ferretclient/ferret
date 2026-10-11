const fs = require('fs');
const { generateHtmlReport } = require('@ferretclient/common/runner');
const { CLI_VERSION } = require('../constants');

const REPORT_SCRIPT_MODULES = ['vue/dist/vue.global.prod.js', 'naive-ui/dist/index.prod.js'];

// Inlined rather than linked so the report renders with no network access. `</script` inside the
// bundled source would close the tag early, so it is escaped the way JSON-in-HTML embeds do it.
const getInlineReportScripts = () =>
  REPORT_SCRIPT_MODULES.map((modulePath) => {
    const source = fs.readFileSync(require.resolve(modulePath), 'utf8').replace(/<\/script/gi, '<\\/script');
    return `<script>${source}</script>`;
  }).join('\n');

const makeHtmlOutput = async (results, outputPath, runCompletionTime, environment = null) => {
  let runnerResults = results;
  if (!results) {
    runnerResults = [];
  } else if (results.results) {
    // Convert CLI format to expected format: array of { iterationIndex, results, summary }
    runnerResults = [{
      iterationIndex: 0,
      results: results.results,
      summary: results.summary
    }];
  } else if (Array.isArray(results)) {
    runnerResults = results;
  }

  const htmlString = generateHtmlReport({
    runnerResults: runnerResults,
    version: `ferret v${CLI_VERSION}`,
    environment: environment,
    runCompletionTime: runCompletionTime,
    inlineScripts: getInlineReportScripts()
  });
  fs.writeFileSync(outputPath, htmlString);
};

module.exports = makeHtmlOutput;
