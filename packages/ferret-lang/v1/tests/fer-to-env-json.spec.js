const fs = require('fs');
const path = require('path');

const { ferToEnvJson } = require('../src');

describe('ferToEnvJson', () => {
  it('should parse .fer file contents', () => {
    const requestFile = fs.readFileSync(path.join(__dirname, 'fixtures', 'env.fer'), 'utf8');
    const result = ferToEnvJson(requestFile);

    expect(result).toEqual({
      variables: [
        {
          enabled: true,
          name: 'host',
          value: 'https://www.google.com',
          type: 'text'
        },
        {
          enabled: true,
          name: 'jwt',
          value: 'secret',
          type: 'text'
        },
        {
          enabled: false,
          name: 'Content-type',
          value: 'application/json',
          type: 'text'
        }
      ]
    });
  });
});
