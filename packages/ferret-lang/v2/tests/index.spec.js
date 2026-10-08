const fs = require('fs');
const path = require('path');
const ferToJson = require('../src/ferToJson');
const jsonToFer = require('../src/jsonToFer');

describe('ferToJson', () => {
  it('should parse the fer file', () => {
    const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'request.fer'), 'utf8');
    const expected = require('./fixtures/request.json');
    const output = ferToJson(input);

    expect(output).toEqual(expected);
  });
});

describe('jsonToFer', () => {
  it('should parse the json file', () => {
    const input = require('./fixtures/request.json');
    const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'request.fer'), 'utf8');
    const output = jsonToFer(input);

    expect(output).toEqual(expected);
  });
});

describe('round-trip', () => {
  it('should preserve all six script blocks through jsonToFer and back', () => {
    const json = {
      script: {
        req: 'req.setHeader(\'Content-Type\', \'application/json\');',
        res: 'expect(res.status).to.equal(200);',
        beforeCallStart: 'req.setMetadata(\'authorization\', \'Bearer token\');',
        afterCallEnd: 'if (res.getStatusCode() === 0) {\n  fer.setVar(\'ok\', true);\n}',
        beforeMessageSend: 'fer.setVar(\'sent\', fer.grpc.request.message.timestamp);',
        afterMessageReceive: 'if (fer.grpc.response.message.data) {\n  fer.setVar(\'received\', true);\n}'
      }
    };

    expect(ferToJson(jsonToFer(json))).toEqual(json);
  });
});
