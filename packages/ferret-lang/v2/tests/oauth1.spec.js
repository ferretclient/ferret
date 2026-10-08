const ferToJson = require('../src/ferToJson');
const jsonToFer = require('../src/jsonToFer');
const collectionFerToJson = require('../src/collectionFerToJson');
const jsonToCollectionFer = require('../src/jsonToCollectionFer');

// ---------------------------------------------------------------------------
// ferToJson  –  request-level parsing
// ---------------------------------------------------------------------------
describe('OAuth1 ferToJson (request-level)', () => {
  it('should parse all oauth1 fields with text private key', () => {
    const input = `
meta {
  name: OAuth1 Test
  type: http
  seq: 1
}

get {
  url: https://api.example.com/resource
  body: none
  auth: oauth1
}

auth:oauth1 {
  consumer_key: my_consumer_key
  consumer_secret: my_consumer_secret
  access_token: my_access_token
  token_secret: my_token_secret
  callback_url: https://example.com/callback
  verifier: my_verifier
  signature_method: HMAC-SHA1
  private_key: my_private_key
  timestamp: 1234567890
  nonce: abc123
  version: 1.0
  realm: my_realm
  placement: header
  include_body_hash: true
}
`.trim();

    const result = ferToJson(input);

    expect(result.auth.oauth1).toEqual({
      consumerKey: 'my_consumer_key',
      consumerSecret: 'my_consumer_secret',
      accessToken: 'my_access_token',
      accessTokenSecret: 'my_token_secret',
      callbackUrl: 'https://example.com/callback',
      verifier: 'my_verifier',
      signatureMethod: 'HMAC-SHA1',
      privateKey: 'my_private_key',
      privateKeyType: 'text',
      timestamp: '1234567890',
      nonce: 'abc123',
      version: '1.0',
      realm: 'my_realm',
      placement: 'header',
      includeBodyHash: true
    });
  });

  it('should parse empty/missing optional fields as empty strings', () => {
    const input = `
meta {
  name: Minimal OAuth1
  type: http
}

get {
  url: https://api.example.com/resource
  auth: oauth1
}

auth:oauth1 {
  consumer_key: ck
  consumer_secret:
  access_token:
  token_secret:
  callback_url:
  verifier:
  signature_method: HMAC-SHA1
  private_key:
  timestamp:
  nonce:
  version:
  realm:
  placement: header
  include_body_hash: false
}
`.trim();

    const result = ferToJson(input);

    expect(result.auth.oauth1.consumerKey).toBe('ck');
    expect(result.auth.oauth1.consumerSecret).toBe('');
    expect(result.auth.oauth1.accessToken).toBe('');
    expect(result.auth.oauth1.accessTokenSecret).toBe('');
    expect(result.auth.oauth1.callbackUrl).toBe('');
    expect(result.auth.oauth1.verifier).toBe('');
    expect(result.auth.oauth1.privateKey).toBe('');
    expect(result.auth.oauth1.privateKeyType).toBe('text');
    expect(result.auth.oauth1.timestamp).toBe('');
    expect(result.auth.oauth1.nonce).toBe('');
    expect(result.auth.oauth1.version).toBe('');
    expect(result.auth.oauth1.realm).toBe('');
    expect(result.auth.oauth1.includeBodyHash).toBe(false);
  });

  it('should parse @file() private key as file type', () => {
    const input = `
meta {
  name: OAuth1 File Key
  type: http
}

get {
  url: https://api.example.com/resource
  auth: oauth1
}

auth:oauth1 {
  consumer_key: ck
  consumer_secret:
  access_token: at
  token_secret: ts
  callback_url:
  verifier:
  signature_method: RSA-SHA1
  private_key: @file(keys/my-private-key.pem)
  timestamp:
  nonce:
  version: 1.0
  realm:
  placement: header
  include_body_hash: false
}
`.trim();

    const result = ferToJson(input);

    expect(result.auth.oauth1.privateKey).toBe('keys/my-private-key.pem');
    expect(result.auth.oauth1.privateKeyType).toBe('file');
  });

  it('should parse multiline private key (triple-quoted PEM)', () => {
    const input = `
meta {
  name: OAuth1 Multiline PEM
  type: http
}

get {
  url: https://api.example.com/resource
  auth: oauth1
}

auth:oauth1 {
  consumer_key: ck
  consumer_secret: cs
  access_token: at
  token_secret: ts
  callback_url:
  verifier:
  signature_method: RSA-SHA1
  private_key: '''
    -----BEGIN FAKE TEST KEY-----
    TESTREPLACEMENTdGhpcyBpcyBub3QgYQ==
    -----END FAKE TEST KEY-----
  '''
  timestamp:
  nonce:
  version: 1.0
  realm:
  placement: header
  include_body_hash: false
}
`.trim();

    const result = ferToJson(input);

    expect(result.auth.oauth1.privateKeyType).toBe('text');
    expect(result.auth.oauth1.privateKey).toContain('-----BEGIN FAKE TEST KEY-----');
    expect(result.auth.oauth1.privateKey).toContain('-----END FAKE TEST KEY-----');
    expect(result.auth.oauth1.privateKey).toContain('TESTREPLACEMENTdGhpcyBpcyBub3QgYQ==');
    // Verify no leading spaces are preserved in the parsed key lines
    const keyLines = result.auth.oauth1.privateKey.split('\n').filter((l) => l.length > 0);
    keyLines.forEach((line) => {
      expect(line).not.toMatch(/^\s/);
    });
  });

  it('should parse variable reference in private key as text type', () => {
    const input = `
meta {
  name: OAuth1 Variable Key
  type: http
}

get {
  url: https://api.example.com/resource
  auth: oauth1
}

auth:oauth1 {
  consumer_key: ck
  consumer_secret:
  access_token: at
  token_secret: ts
  callback_url:
  verifier:
  signature_method: RSA-SHA1
  private_key: {{my_private_key}}
  timestamp:
  nonce:
  version: 1.0
  realm:
  placement: header
  include_body_hash: false
}
`.trim();

    const result = ferToJson(input);

    expect(result.auth.oauth1.privateKey).toBe('{{my_private_key}}');
    expect(result.auth.oauth1.privateKeyType).toBe('text');
  });

  it('should parse all signature methods correctly', () => {
    const signatureMethods = ['HMAC-SHA1', 'HMAC-SHA256', 'HMAC-SHA512', 'RSA-SHA1', 'RSA-SHA256', 'RSA-SHA512', 'PLAINTEXT'];

    for (const method of signatureMethods) {
      const input = `
meta {
  name: OAuth1 ${method}
  type: http
}

get {
  url: https://api.example.com/resource
  auth: oauth1
}

auth:oauth1 {
  consumer_key: ck
  consumer_secret: cs
  access_token: at
  token_secret: ts
  callback_url:
  verifier:
  signature_method: ${method}
  private_key:
  timestamp:
  nonce:
  version: 1.0
  realm:
  placement: header
  include_body_hash: false
}
`.trim();

      const result = ferToJson(input);
      expect(result.auth.oauth1.signatureMethod).toBe(method);
    }
  });

  it('should parse placement values: header, query, body', () => {
    for (const placement of ['header', 'query', 'body']) {
      const input = `
meta {
  name: OAuth1 Params To ${placement}
  type: http
}

get {
  url: https://api.example.com/resource
  auth: oauth1
}

auth:oauth1 {
  consumer_key: ck
  consumer_secret: cs
  access_token: at
  token_secret: ts
  callback_url:
  verifier:
  signature_method: HMAC-SHA1
  private_key:
  timestamp:
  nonce:
  version: 1.0
  realm:
  placement: ${placement}
  include_body_hash: false
}
`.trim();

      const result = ferToJson(input);
      expect(result.auth.oauth1.placement).toBe(placement);
    }
  });

  it('should parse include_body_hash true and false', () => {
    const makeInput = (val) => `
meta {
  name: OAuth1 Body Hash
  type: http
}

get {
  url: https://api.example.com/resource
  auth: oauth1
}

auth:oauth1 {
  consumer_key: ck
  consumer_secret: cs
  access_token:
  token_secret:
  callback_url:
  verifier:
  signature_method: HMAC-SHA1
  private_key:
  timestamp:
  nonce:
  version: 1.0
  realm:
  placement: header
  include_body_hash: ${val}
}
`.trim();

    expect(ferToJson(makeInput('true')).auth.oauth1.includeBodyHash).toBe(true);
    expect(ferToJson(makeInput('false')).auth.oauth1.includeBodyHash).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// collectionFerToJson  –  collection/folder-level parsing
// ---------------------------------------------------------------------------
describe('OAuth1 collectionFerToJson (collection/folder-level)', () => {
  it('should parse all oauth1 fields at collection level', () => {
    const input = `
auth {
  mode: oauth1
}

auth:oauth1 {
  consumer_key: col_consumer_key
  consumer_secret: col_consumer_secret
  access_token: col_access_token
  token_secret: col_token_secret
  callback_url: https://col.example.com/cb
  verifier: col_verifier
  signature_method: HMAC-SHA256
  private_key: col_private_key
  timestamp: 9999999999
  nonce: col_nonce
  version: 1.0
  realm: col_realm
  placement: query
  include_body_hash: true
}
`.trim();

    const result = collectionFerToJson(input);

    expect(result.auth.mode).toBe('oauth1');
    expect(result.auth.oauth1).toEqual({
      consumerKey: 'col_consumer_key',
      consumerSecret: 'col_consumer_secret',
      accessToken: 'col_access_token',
      accessTokenSecret: 'col_token_secret',
      callbackUrl: 'https://col.example.com/cb',
      verifier: 'col_verifier',
      signatureMethod: 'HMAC-SHA256',
      privateKey: 'col_private_key',
      privateKeyType: 'text',
      timestamp: '9999999999',
      nonce: 'col_nonce',
      version: '1.0',
      realm: 'col_realm',
      placement: 'query',
      includeBodyHash: true
    });
  });

  it('should parse @file() private key at collection level', () => {
    const input = `
auth {
  mode: oauth1
}

auth:oauth1 {
  consumer_key: ck
  consumer_secret:
  access_token:
  token_secret:
  callback_url:
  verifier:
  signature_method: RSA-SHA1
  private_key: @file(certs/private.pem)
  timestamp:
  nonce:
  version: 1.0
  realm:
  placement: header
  include_body_hash: false
}
`.trim();

    const result = collectionFerToJson(input);

    expect(result.auth.oauth1.privateKey).toBe('certs/private.pem');
    expect(result.auth.oauth1.privateKeyType).toBe('file');
  });

  it('should parse multiline private key at collection level', () => {
    const input = `
auth {
  mode: oauth1
}

auth:oauth1 {
  consumer_key: ck
  consumer_secret:
  access_token:
  token_secret:
  callback_url:
  verifier:
  signature_method: RSA-SHA256
  private_key: '''
    -----BEGIN FAKE RSA TEST KEY-----
    RkFLRUtFWXJlYWxrZXlkYXRhZm9ydGVz
    -----END FAKE RSA TEST KEY-----
  '''
  timestamp:
  nonce:
  version: 1.0
  realm:
  placement: header
  include_body_hash: false
}
`.trim();

    const result = collectionFerToJson(input);

    expect(result.auth.oauth1.privateKeyType).toBe('text');
    expect(result.auth.oauth1.privateKey).toContain('-----BEGIN FAKE RSA TEST KEY-----');
    expect(result.auth.oauth1.privateKey).toContain('RkFLRUtFWXJlYWxrZXlkYXRhZm9ydGVz');
    expect(result.auth.oauth1.privateKey).toContain('-----END FAKE RSA TEST KEY-----');
    // Verify no leading spaces are preserved in the parsed key lines
    const keyLines = result.auth.oauth1.privateKey.split('\n').filter((l) => l.length > 0);
    keyLines.forEach((line) => {
      expect(line).not.toMatch(/^\s/);
    });
  });
});

// ---------------------------------------------------------------------------
// jsonToFer  –  request-level serialization
// ---------------------------------------------------------------------------
describe('OAuth1 jsonToFer (request-level)', () => {
  it('should serialize all oauth1 fields with text private key', () => {
    const json = {
      meta: { name: 'OAuth1 Serialize', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://api.example.com/resource', body: 'none', auth: 'oauth1' },
      auth: {
        oauth1: {
          consumerKey: 'ck',
          consumerSecret: 'cs',
          accessToken: 'at',
          accessTokenSecret: 'ts',
          callbackUrl: 'https://example.com/cb',
          verifier: 'v',
          signatureMethod: 'HMAC-SHA1',
          privateKey: 'pk',
          privateKeyType: 'text',
          timestamp: '123',
          nonce: 'n',
          version: '1.0',
          realm: 'r',
          placement: 'header',
          includeBodyHash: false
        }
      }
    };

    const fer = jsonToFer(json);

    expect(fer).toContain('auth:oauth1 {');
    expect(fer).toContain('consumer_key: ck');
    expect(fer).toContain('consumer_secret: cs');
    expect(fer).toContain('access_token: at');
    expect(fer).toContain('token_secret: ts');
    expect(fer).toContain('callback_url: https://example.com/cb');
    expect(fer).toContain('verifier: v');
    expect(fer).toContain('signature_method: HMAC-SHA1');
    expect(fer).toContain('private_key: pk');
    expect(fer).toContain('timestamp: 123');
    expect(fer).toContain('nonce: n');
    expect(fer).toContain('version: 1.0');
    expect(fer).toContain('realm: r');
    expect(fer).toContain('placement: header');
    expect(fer).toContain('include_body_hash: false');
  });

  it('should serialize file private key with @file() wrapper', () => {
    const json = {
      meta: { name: 'OAuth1 File', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://api.example.com/resource', auth: 'oauth1' },
      auth: {
        oauth1: {
          consumerKey: 'ck',
          consumerSecret: '',
          accessToken: '',
          accessTokenSecret: '',
          callbackUrl: '',
          verifier: '',
          signatureMethod: 'RSA-SHA1',
          privateKey: 'keys/private.pem',
          privateKeyType: 'file',
          timestamp: '',
          nonce: '',
          version: '1.0',
          realm: '',
          placement: 'header',
          includeBodyHash: false
        }
      }
    };

    const fer = jsonToFer(json);

    expect(fer).toContain('private_key: @file(keys/private.pem)');
  });

  it('should serialize multiline private key with triple quotes', () => {
    const pem = '-----BEGIN FAKE TEST KEY-----\nTESTREPLACEMENTdGhpcyBpcyBub3QgYQ==\nRkFLRUtFWXJlYWxrZXlkYXRhZm9ydGVz\n-----END FAKE TEST KEY-----';

    const json = {
      meta: { name: 'OAuth1 PEM', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://api.example.com/resource', auth: 'oauth1' },
      auth: {
        oauth1: {
          consumerKey: 'ck',
          consumerSecret: '',
          accessToken: '',
          accessTokenSecret: '',
          callbackUrl: '',
          verifier: '',
          signatureMethod: 'RSA-SHA1',
          privateKey: pem,
          privateKeyType: 'text',
          timestamp: '',
          nonce: '',
          version: '1.0',
          realm: '',
          placement: 'header',
          includeBodyHash: false
        }
      }
    };

    const fer = jsonToFer(json);

    expect(fer).toContain('private_key: \'\'\'');
    expect(fer).toContain('-----BEGIN FAKE TEST KEY-----');
    expect(fer).toContain('-----END FAKE TEST KEY-----');
  });

  it('should serialize empty optional fields', () => {
    const json = {
      meta: { name: 'OAuth1 Empty', type: 'http', seq: 1 },
      http: { method: 'get', url: 'https://api.example.com/resource', auth: 'oauth1' },
      auth: {
        oauth1: {
          consumerKey: 'ck',
          consumerSecret: '',
          accessToken: '',
          accessTokenSecret: '',
          callbackUrl: '',
          verifier: '',
          signatureMethod: 'HMAC-SHA1',
          privateKey: '',
          privateKeyType: 'text',
          timestamp: '',
          nonce: '',
          version: '',
          realm: '',
          placement: 'header',
          includeBodyHash: false
        }
      }
    };

    const fer = jsonToFer(json);

    // Empty fields should still be present
    expect(fer).toMatch(/consumer_secret:\s*$/m);
    expect(fer).toMatch(/access_token:\s*$/m);
    expect(fer).toMatch(/token_secret:\s*$/m);
    expect(fer).toMatch(/callback_url:\s*$/m);
    expect(fer).toMatch(/verifier:\s*$/m);
    expect(fer).toMatch(/private_key:\s*$/m);
    expect(fer).toMatch(/timestamp:\s*$/m);
    expect(fer).toMatch(/nonce:\s*$/m);
    expect(fer).toMatch(/version:\s*$/m);
    expect(fer).toMatch(/realm:\s*$/m);
  });
});

// ---------------------------------------------------------------------------
// jsonToCollectionFer  –  collection/folder-level serialization
// ---------------------------------------------------------------------------
describe('OAuth1 jsonToCollectionFer (collection/folder-level)', () => {
  it('should serialize oauth1 at collection level', () => {
    const json = {
      auth: {
        mode: 'oauth1',
        oauth1: {
          consumerKey: 'col_ck',
          consumerSecret: 'col_cs',
          accessToken: 'col_at',
          accessTokenSecret: 'col_ts',
          callbackUrl: '',
          verifier: '',
          signatureMethod: 'HMAC-SHA256',
          privateKey: '',
          privateKeyType: 'text',
          timestamp: '',
          nonce: '',
          version: '1.0',
          realm: '',
          placement: 'query',
          includeBodyHash: true
        }
      }
    };

    const fer = jsonToCollectionFer(json);

    expect(fer).toContain('auth {');
    expect(fer).toContain('mode: oauth1');
    expect(fer).toContain('auth:oauth1 {');
    expect(fer).toContain('consumer_key: col_ck');
    expect(fer).toContain('consumer_secret: col_cs');
    expect(fer).toContain('signature_method: HMAC-SHA256');
    expect(fer).toContain('placement: query');
    expect(fer).toContain('include_body_hash: true');
  });

  it('should serialize @file() private key at collection level', () => {
    const json = {
      auth: {
        mode: 'oauth1',
        oauth1: {
          consumerKey: 'ck',
          consumerSecret: '',
          accessToken: '',
          accessTokenSecret: '',
          callbackUrl: '',
          verifier: '',
          signatureMethod: 'RSA-SHA1',
          privateKey: 'certs/key.pem',
          privateKeyType: 'file',
          timestamp: '',
          nonce: '',
          version: '1.0',
          realm: '',
          placement: 'header',
          includeBodyHash: false
        }
      }
    };

    const fer = jsonToCollectionFer(json);

    expect(fer).toContain('private_key: @file(certs/key.pem)');
  });
});

// ---------------------------------------------------------------------------
// Round-trip tests  –  ferToJson → jsonToFer → ferToJson
// ---------------------------------------------------------------------------
describe('OAuth1 round-trip (request-level)', () => {
  it('should survive round-trip with all fields populated', () => {
    const json = {
      meta: { name: 'OAuth1 Roundtrip', type: 'http', seq: '1' },
      http: { method: 'get', url: 'https://api.example.com/resource', body: 'none', auth: 'oauth1' },
      auth: {
        oauth1: {
          consumerKey: 'ck',
          consumerSecret: 'cs',
          accessToken: 'at',
          accessTokenSecret: 'ts',
          callbackUrl: 'https://example.com/cb',
          verifier: 'ver',
          signatureMethod: 'HMAC-SHA1',
          privateKey: 'inline_pk',
          privateKeyType: 'text',
          timestamp: '1234567890',
          nonce: 'abc',
          version: '1.0',
          realm: 'testrealm',
          placement: 'header',
          includeBodyHash: true
        }
      },
      settings: { encodeUrl: true, timeout: 0 }
    };

    const fer = jsonToFer(json);
    const parsed = ferToJson(fer);

    expect(parsed.auth.oauth1).toEqual(json.auth.oauth1);
  });

  it('should survive round-trip with file private key', () => {
    const json = {
      meta: { name: 'OAuth1 File RT', type: 'http', seq: '1' },
      http: { method: 'get', url: 'https://api.example.com/resource', auth: 'oauth1' },
      auth: {
        oauth1: {
          consumerKey: 'ck',
          consumerSecret: '',
          accessToken: 'at',
          accessTokenSecret: 'ts',
          callbackUrl: '',
          verifier: '',
          signatureMethod: 'RSA-SHA1',
          privateKey: 'keys/private.pem',
          privateKeyType: 'file',
          timestamp: '',
          nonce: '',
          version: '1.0',
          realm: '',
          placement: 'header',
          includeBodyHash: false
        }
      },
      settings: { encodeUrl: true, timeout: 0 }
    };

    const fer = jsonToFer(json);
    const parsed = ferToJson(fer);

    expect(parsed.auth.oauth1.privateKey).toBe('keys/private.pem');
    expect(parsed.auth.oauth1.privateKeyType).toBe('file');
  });

  it('should survive round-trip with multiline PEM private key', () => {
    const pem = '-----BEGIN FAKE TEST KEY-----\nTESTREPLACEMENTdGhpcyBpcyBub3QgYQ==\nRkFLRUtFWXJlYWxrZXlkYXRhZm9ydGVz\n-----END FAKE TEST KEY-----';

    const json = {
      meta: { name: 'OAuth1 PEM RT', type: 'http', seq: '1' },
      http: { method: 'get', url: 'https://api.example.com/resource', auth: 'oauth1' },
      auth: {
        oauth1: {
          consumerKey: 'ck',
          consumerSecret: '',
          accessToken: '',
          accessTokenSecret: '',
          callbackUrl: '',
          verifier: '',
          signatureMethod: 'RSA-SHA256',
          privateKey: pem,
          privateKeyType: 'text',
          timestamp: '',
          nonce: '',
          version: '1.0',
          realm: '',
          placement: 'header',
          includeBodyHash: false
        }
      },
      settings: { encodeUrl: true, timeout: 0 }
    };

    const fer = jsonToFer(json);
    const parsed = ferToJson(fer);

    expect(parsed.auth.oauth1.privateKey).toBe(pem);
    expect(parsed.auth.oauth1.privateKeyType).toBe('text');
  });
});

describe('OAuth1 round-trip (collection-level)', () => {
  it('should survive round-trip at collection level', () => {
    const json = {
      auth: {
        mode: 'oauth1',
        oauth1: {
          consumerKey: 'ck',
          consumerSecret: 'cs',
          accessToken: 'at',
          accessTokenSecret: 'ts',
          callbackUrl: 'https://example.com/cb',
          verifier: 'ver',
          signatureMethod: 'HMAC-SHA512',
          privateKey: '',
          privateKeyType: 'text',
          timestamp: '',
          nonce: '',
          version: '1.0',
          realm: '',
          placement: 'body',
          includeBodyHash: false
        }
      }
    };

    const fer = jsonToCollectionFer(json);
    const parsed = collectionFerToJson(fer);

    expect(parsed.auth.mode).toBe('oauth1');
    expect(parsed.auth.oauth1).toEqual(json.auth.oauth1);
  });

  it('should survive round-trip with file key at collection level', () => {
    const json = {
      auth: {
        mode: 'oauth1',
        oauth1: {
          consumerKey: 'ck',
          consumerSecret: '',
          accessToken: '',
          accessTokenSecret: '',
          callbackUrl: '',
          verifier: '',
          signatureMethod: 'RSA-SHA512',
          privateKey: 'keys/rsa.pem',
          privateKeyType: 'file',
          timestamp: '',
          nonce: '',
          version: '1.0',
          realm: '',
          placement: 'header',
          includeBodyHash: false
        }
      }
    };

    const fer = jsonToCollectionFer(json);
    const parsed = collectionFerToJson(fer);

    expect(parsed.auth.oauth1.privateKey).toBe('keys/rsa.pem');
    expect(parsed.auth.oauth1.privateKeyType).toBe('file');
  });
});
