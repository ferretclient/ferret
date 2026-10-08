import fs from 'node:fs';
import path from 'node:path';
import parseCollection from '../parseCollection';

const loadFixture = (name) =>
  fs.readFileSync(path.join(__dirname, 'fixtures', 'presets', `${name}.yml`), 'utf8');

describe('yml parseCollection - presets', () => {
  it('parses presets when request.type and request.url are present', () => {
    const { ferretConfig } = parseCollection(loadFixture('with-type-and-url'));

    expect(ferretConfig.presets).toEqual({
      requestType: 'graphql',
      requestUrl: 'https://example.com/graphql'
    });
  });

  it('defaults requestType and requestUrl to empty strings (not arrays) when request fields are missing', () => {
    const { ferretConfig } = parseCollection(loadFixture('empty-request'));

    expect(ferretConfig.presets).toEqual({
      requestType: '',
      requestUrl: ''
    });
    expect(Array.isArray(ferretConfig.presets.requestType)).toBe(false);
    expect(Array.isArray(ferretConfig.presets.requestUrl)).toBe(false);
  });

  it('does not set presets when the extension has no presets block', () => {
    const { ferretConfig } = parseCollection(loadFixture('no-presets'));

    expect(ferretConfig.presets).toBeUndefined();
  });

  it('does not set presets when presets exists but request key is absent', () => {
    const { ferretConfig } = parseCollection(loadFixture('no-request-key'));

    expect(ferretConfig.presets).toBeUndefined();
  });

  it('parses a realistic collection with only request.type set (no url) — defaults url to empty string', () => {
    const { ferretConfig } = parseCollection(loadFixture('type-only-realistic'));

    expect(ferretConfig.presets).toEqual({
      requestType: 'graphql',
      requestUrl: ''
    });
    expect(Array.isArray(ferretConfig.presets.requestUrl)).toBe(false);
    expect(ferretConfig.ignore).toEqual(['node_modules', '.git']);
  });

  it('parses a realistic collection with request.type http and request.url set', () => {
    const { ferretConfig } = parseCollection(loadFixture('url-only-realistic'));

    expect(ferretConfig.presets).toEqual({
      requestType: 'http',
      requestUrl: 'https://example.com/graphql'
    });
    expect(Array.isArray(ferretConfig.presets.requestType)).toBe(false);
    expect(Array.isArray(ferretConfig.presets.requestUrl)).toBe(false);
    expect(ferretConfig.ignore).toEqual(['node_modules', '.git']);
  });
});
