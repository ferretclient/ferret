const fs = require('fs');
const path = require('path');

const { envJsonToFer } = require('../src');

describe('envJsonToFer', () => {
  it('should convert json file into .fer file', () => {
    const env = {
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
    };

    const expectedFerFile = fs.readFileSync(path.join(__dirname, 'fixtures', 'env.fer'), 'utf8');
    const actualFerFile = envJsonToFer(env);

    expect(expectedFerFile).toEqual(actualFerFile);
  });
});
