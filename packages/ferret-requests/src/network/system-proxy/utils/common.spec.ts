import { normalizeProxyUrl, normalizeNoProxy } from './common';

describe('normalizeProxyUrl', () => {
  it('should add http protocol when missing', () => {
    expect(normalizeProxyUrl('proxy.example.com:8080')).toBe('http://proxy.example.com:8080');
  });

  it('should not modify URL with existing protocol', () => {
    expect(normalizeProxyUrl('http://proxy.example.com:8080')).toBe('http://proxy.example.com:8080');
    expect(normalizeProxyUrl('https://proxy.example.com:8443')).toBe('https://proxy.example.com:8443');
  });

  it('should handle empty string', () => {
    expect(normalizeProxyUrl('')).toBe('');
  });

  it('should handle various protocols', () => {
    expect(normalizeProxyUrl('socks5://proxy.example.com:1080')).toBe('socks5://proxy.example.com:1080');
    expect(normalizeProxyUrl('socks4://proxy.example.com:1080')).toBe('socks4://proxy.example.com:1080');
  });

  it('should handle URLs without port', () => {
    expect(normalizeProxyUrl('proxy.example.com')).toBe('http://proxy.example.com');
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
