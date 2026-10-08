const fs = require('node:fs');
const path = require('node:path');
const { ferRequestParseAndRedactBodyData } = require("../utils/request-parse-and-redact-body-data");

describe("parse and redact body data", () => {
  it("should redact body blocks from the fer file string", () => {
    const fixturesPath = `/fixtures/request-parse-and-redact-body-data`;
    const inputFerString = fs.readFileSync(path.join(__dirname, fixturesPath, './input.fer'), 'utf8');
    const expectedOutputFerString = fs.readFileSync(path.join(__dirname, fixturesPath, './output.fer'), 'utf8');

    const res = ferRequestParseAndRedactBodyData(inputFerString);
    expect(res.ferFileStringWithRedactedBody).toBe(expectedOutputFerString);
    expect(res.extractedBodyContent).toEqual({
      graphql: `
{
  launchesPast {
    launch_site {
      site_name
    }
    launch_success
  }
}
      `.trim(),
      json: `
{
  "hello": "world"
}     
      `.trim(),
      sparql: `
SELECT * WHERE {
  ?subject ?predicate ?object .
}
LIMIT 10
      `.trim(),
      text: `This is a text body`, 
      xml: `
<xml>
  <name>John</name>
  <age>30</age>
</xml>
      `.trim()
    })
  });
});