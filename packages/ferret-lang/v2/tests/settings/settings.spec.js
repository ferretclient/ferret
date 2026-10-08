const fs = require('fs');
const path = require('path');
const ferToJson = require('../../src/ferToJson');
const jsonToFer = require('../../src/jsonToFer');

describe('Settings Conversion Tests', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  describe('parse (FER to JSON)', () => {
    it('should parse minimal settings from FER to JSON', () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'settings-minimal.fer'), 'utf8');
      const expected = require(path.join(fixturesDir, 'settings-minimal.json'));
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse all settings options from FER to JSON', () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'settings-all-options.fer'), 'utf8');
      const expected = require(path.join(fixturesDir, 'settings-all-options.json'));
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });
  });

  describe('stringify (JSON to FER)', () => {
    it('should stringify minimal settings from JSON to FER (with defaults)', () => {
      const input = require(path.join(fixturesDir, 'settings-minimal.json'));
      const expected = fs.readFileSync(path.join(fixturesDir, 'settings-minimal.fer'), 'utf8');
      const output = jsonToFer(input);

      expect(output).toEqual(expected);
    });

    it('should stringify all settings options from JSON to FER', () => {
      const input = require(path.join(fixturesDir, 'settings-all-options.json'));
      const expected = fs.readFileSync(path.join(fixturesDir, 'settings-all-options.fer'), 'utf8');
      const output = jsonToFer(input);

      expect(output).toEqual(expected);
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity through JSON -> FER -> JSON conversion', () => {
      const originalJson = require(path.join(fixturesDir, 'settings-all-options.json'));

      // Convert JSON to FER
      const fer = jsonToFer(originalJson);

      // Convert FER back to JSON
      const convertedJson = ferToJson(fer);

      expect(convertedJson).toEqual(originalJson);
    });
  });
});
