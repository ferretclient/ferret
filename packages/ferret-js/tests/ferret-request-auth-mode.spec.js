const { describe, it, expect } = require('@jest/globals');
const FerretRequest = require('../src/ferret-request');

const makeReq = (overrides = {}) => ({
  url: 'http://localhost:5000/api',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    ...overrides.headers
  },
  data: undefined,
  ...overrides
});

describe('FerretRequest - getAuthMode()', () => {
  it('returns apikey for header placement when the api key header is present', () => {
    const req = new FerretRequest(
      makeReq({
        headers: { 'X-API-Key': 'secret' },
        apiKeyHeaderName: 'X-API-Key'
      })
    );

    expect(req.getAuthMode()).toBe('apikey');
  });

  it('returns none when pre-request script deletes the api key header', () => {
    const req = new FerretRequest(
      makeReq({
        headers: { 'X-API-Key': 'secret' },
        apiKeyHeaderName: 'X-API-Key'
      })
    );

    req.deleteHeader('X-API-Key');

    expect(req.getAuthMode()).toBe('none');
  });

  it('returns apikey for queryparams placement marker', () => {
    const req = new FerretRequest(
      makeReq({
        apiKeyAuthValueForQueryParams: {
          key: 'api_key',
          value: 'secret',
          placement: 'queryparams'
        }
      })
    );

    expect(req.getAuthMode()).toBe('apikey');
  });
});
