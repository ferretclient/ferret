const fs = require('fs');
const path = require('path');
const ferToJson = require('../../src/ferToJson');
const jsonToFer = require('../../src/jsonToFer');

describe('Custom Method Conversion Tests', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  describe('parse (FER to JSON)', () => {
    it('should parse FETCH custom method from FER to JSON', () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'custom-method.fer'), 'utf8');
      const expected = require(path.join(fixturesDir, 'custom-method.json'));
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse X-CUSTOM method from FER to JSON', () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'custom-method-x-custom.fer'), 'utf8');
      const expected = require(path.join(fixturesDir, 'custom-method-x-custom.json'));
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse custom method with special characters from FER to JSON', () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'custom-method-with-special-chars.fer'), 'utf8');
      const expected = require(path.join(fixturesDir, 'custom-method-with-special-chars.json'));
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });
  });

  describe('stringify (JSON to FER)', () => {
    it('should stringify FETCH custom method from JSON to FER', () => {
      const input = require(path.join(fixturesDir, 'custom-method.json'));
      const expected = fs.readFileSync(path.join(fixturesDir, 'custom-method.fer'), 'utf8');
      const output = jsonToFer(input);

      expect(output).toEqual(expected);
    });

    it('should stringify X-CUSTOM method from JSON to FER', () => {
      const input = require(path.join(fixturesDir, 'custom-method-x-custom.json'));
      const expected = fs.readFileSync(path.join(fixturesDir, 'custom-method-x-custom.fer'), 'utf8');
      const output = jsonToFer(input);

      expect(output).toEqual(expected);
    });

    it('should stringify custom method with special characters from JSON to FER', () => {
      const input = require(path.join(fixturesDir, 'custom-method-with-special-chars.json'));
      const expected = fs.readFileSync(path.join(fixturesDir, 'custom-method-with-special-chars.fer'), 'utf8');
      const output = jsonToFer(input);

      expect(output).toEqual(expected);
    });
  });
});
