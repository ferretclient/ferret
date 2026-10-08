const { redactLargeFerTextBlocks, restoreRedactedBlocks } = require('../utils/redact-large-text-blocks');
const { parseFerRequest, parseFerCollection } = require('../index');

const parseViaRedaction = (content, parser) => {
  const { skeleton, blocks } = redactLargeFerTextBlocks(content);
  return restoreRedactedBlocks(parser(skeleton), blocks);
};

const toCRLF = (content) => content.replace(/\n/g, '\r\n');

const requestFer = `meta {
  name: Redaction Test
  type: http
  seq: 1
}

get {
  url: https://example.com/api
  body: json
}

headers {
  content-type: application/json
}

body:json {
  {
    "hello": "world",
    "nested": {
      "a": 1,
      "b": [1, 2, 3]
    }
  }
}

body:text {
  This is a text body
  spanning multiple lines
}

script:pre-request {
  const x = 1;
  if (x) {
    console.log("hi");
  }
}

script:post-response {
  fer.setVar("y", 2);
}

tests {
  test("ok", function() {
    expect(1).to.equal(1);
  });
}

docs {
  # Title

  Some **markdown** docs with a fenced block:

      code line stays indented
}
`;

const graphqlFer = `meta {
  name: GraphQL Test
  type: graphql
  seq: 1
}

post {
  url: https://example.com/graphql
  body: graphql
}

body:graphql {
  {
    launchesPast {
      launch_site {
        site_name
      }
    }
  }
}

body:graphql:vars {
  {
    "limit": 10
  }
}
`;

const grpcFer = `meta {
  name: gRPC Test
  type: grpc
  seq: 1
}

grpc {
  url: grpc://localhost:50051
  method: /hello.Greeter/SayHello
  methodType: unary
}

body:grpc {
  name: message 1
  content: '''
    {
      "greeting": "hi"
    }
  '''
}

script:grpc:before-call-start {
  const startedAt = 1;
  if (startedAt) {
    fer.setVar("startedAt", startedAt);
  }
}

script:grpc:after-call-end {
  fer.setVar("endedAt", 2);
}

script:grpc:before-message-send {
  fer.setVar("sentAt", fer.grpc.request.message.timestamp);
}

script:grpc:after-message-receive {
  fer.setVar("receivedAt", fer.grpc.response.message.timestamp);
}

tests {
  test("hook ran", function() {
    expect(fer.getVar("startedAt")).to.equal(1);
  });
}
`;

const xmlSparqlFer = `meta {
  name: Others
  type: http
  seq: 1
}

post {
  url: https://example.com
  body: xml
}

body:xml {
  <xml>
    <name>John</name>
  </xml>
}

body:sparql {
  SELECT * WHERE {
    ?s ?p ?o .
  }
  LIMIT 10
}
`;

const collectionFer = `headers {
  x-trace: enabled
}

script:pre-request {
  fer.setEnvVar("base", "https://example.com");
}

tests {
  test("collection level", function() {
    expect(true).to.equal(true);
  });
}

docs {
  # Collection docs

  Notes for the whole collection.
}
`;

const folderFer = `meta {
  name: My Folder
  seq: 2
}

docs {
  # Folder docs
}
`;

const blankLinesFer = `meta {
  name: Blanks
  type: http
  seq: 1
}

post {
  url: https://example.com
  body: json
}

body:json {

  {
    "a": 1
  }


}
`;

const appFer = `meta {
  name: App Request
  type: http
  seq: 1
}

get {
  url: https://example.com
  body: none
  auth: none
}

app {
  enabled: true
  code: '''
    <div id="x">hi</div>
    <style>
    body {
      color: red;
    }
    </style>
    <script>
      function go() {
        return { ok: 1 };
      }
    </script>
  '''
}

docs {
  # Docs after the app block
}
`;

const standaloneAppFer = `meta {
  name: Dashboard
  type: app
  seq: 2
}

app {
  code: '''
    <div id="app">standalone</div>
  '''
}
`;

const appWithoutCodeFer = `meta {
  name: No Code
  type: http
  seq: 1
}

get {
  url: https://example.com
  body: none
  auth: none
}

app {
  enabled: true
}
`;

const appEmptyCodeFer = `meta {
  name: Empty Code
  type: http
  seq: 1
}

app {
  enabled: true
  code: '''
  '''
}
`;

const docsAboutAppCodeFer = `meta {
  name: Docs About App Code
  type: http
  seq: 1
}

get {
  url: https://example.com
}

docs {
  # How the app block works

  app {
    code: '''
      <div>hi</div>
    '''
  }
}
`;

const appWithoutCodeThenDocsFer = `meta {
  name: No Code Then Docs
  type: http
  seq: 1
}

get {
  url: https://example.com
}

app {
  enabled: true
}

docs {
  Set the code like this:

  code: '''
    <div>hi</div>
  '''
}
`;

describe('redactLargeFerTextBlocks', () => {
  describe('matches a normal parse (ohm oracle)', () => {
    const requestCases = [
      ['request with bodies, scripts, tests, docs', requestFer],
      ['graphql query + variables', graphqlFer],
      ['xml + sparql bodies', xmlSparqlFer],
      ['grpc request with lifecycle hooks', grpcFer],
      ['CRLF grpc request with lifecycle hooks', toCRLF(grpcFer)],
      ['CRLF request', toCRLF(requestFer)],
      ['leading + trailing blank lines in body', blankLinesFer],
      ['CRLF leading + trailing blank lines', toCRLF(blankLinesFer)],
      ['request-level app code', appFer],
      ['CRLF request-level app code', toCRLF(appFer)],
      ['standalone app item', standaloneAppFer],
      ['app block without code', appWithoutCodeFer],
      ['app block with an empty code value', appEmptyCodeFer],
      ['docs documenting an app code block', docsAboutAppCodeFer],
      ['app block without code followed by docs holding a code pair', appWithoutCodeThenDocsFer]
    ];

    it.each(requestCases)('%s', (_name, content) => {
      expect(parseViaRedaction(content, parseFerRequest)).toEqual(parseFerRequest(content));
    });

    const collectionCases = [
      ['collection', collectionFer],
      ['folder', folderFer],
      ['CRLF collection', toCRLF(collectionFer)]
    ];

    it.each(collectionCases)('%s', (_name, content) => {
      expect(parseViaRedaction(content, parseFerCollection)).toEqual(parseFerCollection(content));
    });
  });

  it('extracts each large text block and shrinks the skeleton', () => {
    const { skeleton, blocks } = redactLargeFerTextBlocks(requestFer);
    expect(blocks.length).toBe(6);
    expect(skeleton.length).toBeLessThan(requestFer.length);
    blocks.forEach((block) => {
      expect(skeleton).toContain(block.token);
      expect(skeleton).not.toContain(block.value);
    });
  });

  it('extracts the grpc lifecycle hooks and leaves the dictionary message block in place', () => {
    const { skeleton, blocks } = redactLargeFerTextBlocks(grpcFer);
    // all four lifecycle hooks + tests; `body:grpc` is a dictionary and stays in the skeleton
    expect(blocks.length).toBe(5);
    expect(skeleton.length).toBeLessThan(grpcFer.length);
    blocks.forEach((block) => {
      expect(skeleton).toContain(block.token);
      expect(skeleton).not.toContain(block.value);
    });
  });

  it('keeps the skeleton bounded regardless of block size', () => {
    const blob = 'x'.repeat(4 * 1024 * 1024);
    const fer = `meta {
  name: Huge
  type: http
  seq: 1
}

post {
  url: https://example.com
  body: json
}

body:json {
  { "blob": "${blob}" }
}
`;
    const { skeleton, blocks } = redactLargeFerTextBlocks(fer);
    expect(fer.length).toBeGreaterThan(4 * 1024 * 1024);
    expect(skeleton.length).toBeLessThan(1024);
    expect(blocks[0].value).toContain(blob);
  });

  it('keeps huge app code out of the skeleton, pair and delimiters intact', () => {
    const blob = 'x'.repeat(4 * 1024 * 1024);
    const fer = appFer.replace('<div id="x">hi</div>', `<div>${blob}</div>`);

    const { skeleton, blocks } = redactLargeFerTextBlocks(fer);
    expect(skeleton.length).toBeLessThan(1024);
    expect(skeleton).toMatch(/code: '''\n\s+__FER_REDACTED_TEXT_BLOCK_\w+__\n\s+'''/);
    expect(skeleton).toContain('enabled: true');
    expect(blocks.some((block) => block.value.includes(blob))).toBe(true);
  });

  it('leaves an app block whose code has no value untouched', () => {
    const { blocks } = redactLargeFerTextBlocks(appEmptyCodeFer);
    expect(blocks).toEqual([]);
  });

  it('leaves a code pair outside the app block untouched', () => {
    const { blocks } = redactLargeFerTextBlocks(docsAboutAppCodeFer);
    expect(blocks.length).toBe(1);
    expect(blocks[0].value).toContain("code: '''");
    expect(blocks[0].value).toContain('<div>hi</div>');
    expect(blocks[0].value).not.toContain('__FER_REDACTED_TEXT_BLOCK_');
  });

  it('leaves a code pair after an app block that has no code untouched', () => {
    const { blocks } = redactLargeFerTextBlocks(appWithoutCodeThenDocsFer);
    expect(blocks.length).toBe(1);
    expect(blocks[0].value).toContain("code: '''");
    expect(blocks[0].value).not.toContain('__FER_REDACTED_TEXT_BLOCK_');
  });

  it('leaves dictionary body blocks untouched', () => {
    const multipart = `meta {
  name: Multipart
  type: http
  seq: 1
}

post {
  url: https://example.com
  body: multipartForm
}

body:multipart-form {
  field: value
}
`;
    const { blocks } = redactLargeFerTextBlocks(multipart);
    expect(blocks.length).toBe(0);
    expect(parseViaRedaction(multipart, parseFerRequest)).toEqual(parseFerRequest(multipart));
  });

  it('captures nested braces in content without ending the block early', () => {
    const nested = `body:json {
  {
    "a": {
      "b": [ { "c": 1 } ],
      "d": {}
    }
  }
}

script:pre-request {
  function outer() {
    if (true) {
      return { ok: 1 };
    }
  }
}
`;
    const { blocks } = redactLargeFerTextBlocks(nested);
    expect(blocks.length).toBe(2);
    expect(blocks[0].value).toContain('"c": 1');
    expect(blocks[0].value).toContain('"d": {}');
    expect(blocks[1].value).toContain('return { ok: 1 };');
    expect(parseViaRedaction(nested, parseFerRequest)).toEqual(parseFerRequest(nested));
  });

  it('only redacts blocks at column 0, never indented tags', () => {
    const indented = `docs {
  Nested pseudo-block should be treated as content:
    body:json {
      { "a": 1 }
    }
}
`;
    const { blocks } = redactLargeFerTextBlocks(indented);
    expect(blocks.length).toBe(1);
    expect(blocks[0].value).toContain('body:json {');
  });

  it('returns content unchanged when no large text blocks are present', () => {
    const minimal = `meta {
  name: Bare
  type: http
  seq: 1
}

get {
  url: https://example.com
}
`;
    const { skeleton, blocks } = redactLargeFerTextBlocks(minimal);
    expect(blocks).toEqual([]);
    expect(skeleton).toBe(minimal);
  });
});

describe('restoreRedactedBlocks', () => {
  it('returns the parsed object unchanged when there are no blocks', () => {
    const parsed = { request: { body: { json: 'x' } } };
    expect(restoreRedactedBlocks(parsed, [])).toBe(parsed);
  });
});
