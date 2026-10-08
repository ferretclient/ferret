import { normalizeProxyUrl, normalizeNoProxy } from './common';

describe('normalizeProxyUrl', () => {
  it('should add http protocol when missing', () => {
    expect(normalizeProxyUrl('proxy.ferret.io:8080')).toBe('http://proxy.ferret.io:8080');
  });

  it('should not modify URL with existing protocol', () => {
    expect(normalizeProxyUrl('http://proxy.ferret.io:8080')).toBe('http://proxy.ferret.io:8080');
    expect(normalizeProxyUrl('https://proxy.ferret.io:8443')).toBe('https://proxy.ferret.io:8443');
  });

  it('should handle empty string', () => {
    expect(normalizeProxyUrl('')).toBe('');
  });

  it('should handle various protocols', () => {
    expect(normalizeProxyUrl('socks5://proxy.ferret.io:1080')).toBe('socks5://proxy.ferret.io:1080');
    expect(normalizeProxyUrl('socks4://proxy.ferret.io:1080')).toBe('socks4://proxy.ferret.io:1080');
  });

  it('should handle URLs without port', () => {
    expect(normalizeProxyUrl('proxy.ferret.io')).toBe('http://proxy.ferret.io');
  });
});

describe('normalizeNoProxy', () => {
  it('should normalize comma-separated list', () => {
    expect(normalizeNoProxy('localhost,127.0.0.1')).toBe('localhost,127.0.0.1');
  });

  it('should convert semicolons to commas', () => {
    expect(normalizeNoProxy('localhost;127.0.0.1')).toBe('localhost,127.0.0.1');
  });

  it('should handle mixed delimiters', () => {
    expect(normalizeNoProxy('localhost;127.0.0.1,*.local')).toBe('localhost,127.0.0.1,*.local');
  });

  it('should trim whitespace', () => {
    expect(normalizeNoProxy('localhost , 127.0.0.1 ; *.local')).toBe('localhost,127.0.0.1,*.local');
  });

  it('should remove empty entries', () => {
    expect(normalizeNoProxy('localhost,,127.0.0.1')).toBe('localhost,127.0.0.1');
    expect(normalizeNoProxy('localhost;  ;127.0.0.1')).toBe('localhost,127.0.0.1');
  });

  it('should handle null input', () => {
    expect(normalizeNoProxy(null)).toBeNull();
  });

  it('should handle empty string', () => {
    expect(normalizeNoProxy('')).toBeNull();
  });

  it('should handle whitespace-only string', () => {
    expect(normalizeNoProxy('   ')).toBeNull();
  });

  it('should handle complex patterns', () => {
    expect(normalizeNoProxy('localhost;127.0.0.1;*.local;192.168.1.0/24;<local>')).toBe('localhost,127.0.0.1,*.local,192.168.1.0/24,<local>');
  });
});
