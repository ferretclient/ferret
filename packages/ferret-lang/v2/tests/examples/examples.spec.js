const fs = require('fs');
const path = require('path');
const ferToJson = require('../../src/ferToJson');
const jsonToFer = require('../../src/jsonToFer');

describe('Examples functionality', () => {
  describe('Fixture-based tests', () => {
    it('should parse examples-simple.fer correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'examples-simple.fer'), 'utf8');
      const expected = require('./fixtures/json/examples-simple.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse examples-complex.fer correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'examples-complex.fer'), 'utf8');
      const output = ferToJson(input);

      // Basic structure validation
      expect(output.meta).toBeDefined();
      expect(output.http).toBeDefined();
      expect(output.examples).toBeDefined();
      expect(Array.isArray(output.examples)).toBe(true);
      expect(output.examples).toHaveLength(3);

      // Check each example has the expected structure
      output.examples.forEach((example, index) => {
        expect(example.name).toBeDefined();
        expect(example.description).toBeDefined();
        expect(example.request).toBeDefined();
        expect(example.request.url).toBeDefined();
        if (example.response) {
          expect(example.response.status).toBeDefined();
          expect(example.response.body).toBeDefined();
        }
      });

      // Check specific examples
      const jsonExample = output.examples[0];
      expect(jsonExample.name).toBe('JSON API Example');
      expect(jsonExample.request.url).toBeDefined();
      if (jsonExample.request.body && jsonExample.request.body.json) {
        expect(jsonExample.request.body.json).toContain('"format": "json"');
      }

      const xmlExample = output.examples[1];
      expect(xmlExample.name).toBe('XML API Example');
      if (xmlExample.request.body && xmlExample.request.body.xml) {
        expect(xmlExample.request.body.xml).toContain('<format>xml</format>');
      }

      const textExample = output.examples[2];
      expect(textExample.name).toBe('Text API Example');
    });
  });

  describe('Basic examples parsing', () => {
    it('should parse a single example block', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'ferToJson-single-example.fer'), 'utf8');
      const expected = require('./fixtures/json/ferToJson-single-example.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse multiple example blocks', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'ferToJson-multiple-examples.fer'), 'utf8');
      const expected = require('./fixtures/json/ferToJson-multiple-examples.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should handle examples with response blocks', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'ferToJson-response-example.fer'), 'utf8');
      const expected = require('./fixtures/json/ferToJson-response-example.json');
      const output = ferToJson(input);
      expect(output).toEqual(expected);
    });
  });

  describe('Examples with different body types', () => {
    it('should handle examples with JSON body', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'ferToJson-json-body.fer'), 'utf8');
      const expected = require('./fixtures/json/ferToJson-json-body.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should handle examples with XML body', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'ferToJson-xml-body.fer'), 'utf8');
      const expected = require('./fixtures/json/ferToJson-xml-body.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should handle examples with text body', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'ferToJson-text-body.fer'), 'utf8');
      const expected = require('./fixtures/json/ferToJson-text-body.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty example blocks', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'ferToJson-empty-example.fer'), 'utf8');
      const expected = require('./fixtures/json/ferToJson-empty-example.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should work without any examples', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'ferToJson-no-examples.fer'), 'utf8');
      const expected = require('./fixtures/json/ferToJson-no-examples.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse swapped status/statusText from pre-fix Postman imports', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'ferToJson-swapped-status.fer'), 'utf8');
      const expected = require('./fixtures/json/ferToJson-swapped-status.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });
  });

  describe('jsonToFer conversion', () => {
    it('should convert JSON with examples to FER format', () => {
      const jsonInput = require('./fixtures/json/jsonToFer-simple.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'jsonToFer-simple.fer'), 'utf8');
      const output = jsonToFer(jsonInput);
      expect(output).toEqual(expected);
    });

    it('should handle multiple examples correctly', () => {
      const jsonInput = require('./fixtures/json/jsonToFer-multiple.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'jsonToFer-multiple.fer'), 'utf8');
      const output = jsonToFer(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle examples with response blocks', () => {
      const jsonInput = require('./fixtures/json/jsonToFer-response.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'jsonToFer-response.fer'), 'utf8');
      const output = jsonToFer(jsonInput);
      expect(output).toEqual(expected);
    });

    it('should handle examples with different body types', () => {
      const jsonInput = require('./fixtures/json/jsonToFer-bodytypes.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'jsonToFer-bodytypes.fer'), 'utf8');
      const output = jsonToFer(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle round-trip conversion correctly', () => {
      const originalFer = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'examples-simple.fer'), 'utf8');
      const jsonFromFer = ferToJson(originalFer);
      const ferFromJson = jsonToFer(jsonFromFer);
      const jsonFromFerAgain = ferToJson(ferFromJson);

      // The examples should be preserved through the round-trip
      expect(jsonFromFerAgain.examples).toBeDefined();
      expect(Array.isArray(jsonFromFerAgain.examples)).toBe(true);
      expect(jsonFromFerAgain.examples).toHaveLength(2);
      expect(jsonFromFerAgain.examples[0].name).toBe('Get User by ID');
      expect(jsonFromFerAgain.examples[1].name).toBe('Create New User');
    });

    it('should handle empty examples array', () => {
      const jsonInput = {
        meta: {
          name: 'No Examples API',
          type: 'http'
        },
        http: {
          method: 'get',
          url: 'https://api.example.com/test'
        },
        examples: []
      };

      const expected = `meta {
  name: No Examples API
  type: http
}

get {
  url: https://api.example.com/test
}
`;

      const output = jsonToFer(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle examples with minimal structure', () => {
      const jsonInput = {
        meta: {
          name: 'Test API',
          type: 'http'
        },
        http: {
          url: 'https://api.example.com/test',
          method: 'get'
        },
        examples: [
          {
            name: 'Example Request',
            description: 'A simple example',
            request: {
              url: 'https://api.example.com/example',
              method: 'get'
            }
          }
        ]
      };

      const expected = `meta {
  name: Test API
  type: http
}

get {
  url: https://api.example.com/test
}

example {
  name: Example Request
  description: A simple example
  
  request: {
    url: https://api.example.com/example
    method: get
  }
}
`;

      const output = jsonToFer(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle examples without description', () => {
      const jsonInput = {
        meta: {
          name: 'Test API',
          type: 'http'
        },
        http: {
          url: 'https://api.example.com/test',
          method: 'get'
        },
        examples: [
          {
            name: 'Example Request',
            request: {
              url: 'https://api.example.com/example',
              method: 'get'
            }
          }
        ]
      };

      const expected = `meta {
  name: Test API
  type: http
}

get {
  url: https://api.example.com/test
}

example {
  name: Example Request
  
  request: {
    url: https://api.example.com/example
    method: get
  }
}
`;

      const output = jsonToFer(jsonInput);

      expect(output).toEqual(expected);
    });
  });

  describe('Examples with binary bodies', () => {
    it('should round-trip a binary (base64) example body byte-for-byte', () => {
      // Real binary bytes (not valid UTF-8) covering the full 0-255 range,
      // so the base64 string exercises '+', '/' and '=' padding.
      const originalBytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i)); // [0, 1, 2, 3, 4, 5, 6, 7, ..., 253, 254, 255] -> 00 01 02 03 04 05 06 07 ... FD FE FF
      const base64Content = originalBytes.toString('base64');

      const jsonInput = {
        meta: {
          name: 'Binary Example API',
          type: 'http',
          seq: 1
        },
        http: {
          method: 'get',
          url: 'https://api.example.com/image'
        },
        examples: [
          {
            name: 'PNG Response',
            request: {
              url: 'https://api.example.com/image',
              method: 'get'
            },
            response: {
              status: '200',
              statusText: 'OK',
              headers: [{ name: 'content-type', value: 'image/png', enabled: true }],
              body: {
                type: 'binary',
                content: base64Content
              }
            }
          }
        ]
      };

      const fer = jsonToFer(jsonInput);
      const parsed = ferToJson(fer);

      const parsedBody = parsed.examples[0].response.body;
      expect(parsedBody.type).toBe('binary');
      expect(parsedBody.content).toBe(base64Content);
      expect(Buffer.from(parsedBody.content, 'base64').equals(originalBytes)).toBe(true);
      expect(jsonToFer(parsed)).toEqual(fer);
    });
  });

  describe('Complex examples with auth', () => {
    it('should parse complex-with-auth.fer correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'complex-with-auth.fer'), 'utf8');
      const expected = require('./fixtures/json/complex-with-auth.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse form-data-complex.fer correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'form-data-complex.fer'), 'utf8');
      const expected = require('./fixtures/json/form-data-complex.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse multiple-examples-variations.fer correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'multiple-examples-variations.fer'), 'utf8');
      const expected = require('./fixtures/json/multiple-examples-variations.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse oauth2-examples.fer correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'oauth2-examples.fer'), 'utf8');
      const expected = require('./fixtures/json/oauth2-examples.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    describe('jsonToFer conversion for complex fixtures', () => {
      it('should convert complex-with-auth.json to FER format and preserve examples', () => {
        const jsonInput = require('./fixtures/json/complex-with-auth.json');
        const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'complex-with-auth.fer'), 'utf8');
        const output = jsonToFer(jsonInput);
        expect(output).toEqual(expected);
      });

      it('should convert form-data-complex.json to FER format and preserve examples', () => {
        const jsonInput = require('./fixtures/json/form-data-complex.json');
        const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'form-data-complex.fer'), 'utf8');
        const output = jsonToFer(jsonInput);
        expect(output).toEqual(expected);
      });

      it('should convert multiple-examples-variations.json to FER format and preserve examples', () => {
        const jsonInput = require('./fixtures/json/multiple-examples-variations.json');
        const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'multiple-examples-variations.fer'), 'utf8');
        const output = jsonToFer(jsonInput);
        expect(output).toEqual(expected);
      });

      it('should convert oauth2-examples.json to FER format and preserve examples', () => {
        const jsonInput = require('./fixtures/json/oauth2-examples.json');
        const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'oauth2-examples.fer'), 'utf8');
        const output = jsonToFer(jsonInput);
        expect(output).toEqual(expected);
      });
    });
  });

  describe('Examples with multiline descriptions', () => {
    it('should parse examples with multiline descriptions', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'examples-multiline-description.fer'), 'utf8');
      const expected = require('./fixtures/json/examples-multiline-description.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should convert examples with multiline descriptions to FER format', () => {
      const jsonInput = require('./fixtures/json/examples-multiline-description.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'examples-multiline-description.fer'), 'utf8');
      const output = jsonToFer(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should parse example without description field', () => {
      const ferInput = `meta {
  name: Test API
  type: http
}

example {
  name: Example Request
  
  request: {
    url: https://api.example.com/example
    method: get
  }
}
`;

      const output = ferToJson(ferInput);

      expect(output.examples).toBeDefined();
      expect(output.examples).toHaveLength(1);
      expect(output.examples[0].name).toBe('Example Request');
      expect(output.examples[0].description).toBeUndefined();
    });
  });

  describe('Examples with multiline strings and contentType', () => {
    it('should parse examples with multiline strings and @contentType annotations', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'examples-multiline-contenttype.fer'), 'utf8');
      const expected = require('./fixtures/json/examples-multiline-contenttype.json');
      const output = ferToJson(input);

      expect(output).toEqual(expected);
    });

    it('should correctly extract contentType from multiline values', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'examples-multiline-contenttype.fer'), 'utf8');
      const output = ferToJson(input);

      const example = output.examples[0];
      const multipartForm = example.request.body.multipartForm;

      // Check that multiline values with @contentType are parsed correctly
      const testField = multipartForm.find((f) => f.name === 'test');
      expect(testField).toBeDefined();
      expect(testField.value).toContain('"hello"');
      expect(testField.contentType).toBe('application/json');

      // Check single-line value with @contentType
      const simpleField = multipartForm.find((f) => f.name === 'simple');
      expect(simpleField).toBeDefined();
      expect(simpleField.value).toBe('cat and mouse');
      expect(simpleField.contentType).toBe('text/plain');

      // Check multiline value without @contentType
      const arrayField = multipartForm.find((f) => f.name === 'array');
      expect(arrayField).toBeDefined();
      expect(arrayField.value).toContain('"coolade"');
      expect(arrayField.contentType).toBe('');

      // Check complex multiline JSON with @contentType
      const jsonValueField = multipartForm.find((f) => f.name === 'jsonValue');
      expect(jsonValueField).toBeDefined();
      expect(jsonValueField.value).toContain('"key": "value"');
      expect(jsonValueField.contentType).toBe('application/json');
    });

    it('should handle round-trip conversion for multiline strings with contentType', () => {
      const originalFer = fs.readFileSync(path.join(__dirname, 'fixtures', 'fer', 'examples-multiline-contenttype.fer'), 'utf8');
      const jsonFromFer = ferToJson(originalFer);
      const ferFromJson = jsonToFer(jsonFromFer);
      const jsonFromFerAgain = ferToJson(ferFromJson);

      // The examples should be preserved through the round-trip
      expect(jsonFromFerAgain.examples).toBeDefined();
      expect(Array.isArray(jsonFromFerAgain.examples)).toBe(true);
      expect(jsonFromFerAgain.examples).toHaveLength(1);

      const example = jsonFromFerAgain.examples[0];
      const multipartForm = example.request.body.multipartForm;

      // Verify contentType is preserved
      const testField = multipartForm.find((f) => f.name === 'test');
      expect(testField.contentType).toBe('application/json');
      expect(testField.value).toContain('"hello"');

      const jsonValueField = multipartForm.find((f) => f.name === 'jsonValue');
      expect(jsonValueField.contentType).toBe('application/json');
      expect(jsonValueField.value).toContain('"key": "value"');
    });
  });
});
