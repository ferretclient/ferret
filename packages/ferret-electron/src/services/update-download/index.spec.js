const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { downloadInstaller, findChecksum } = require('./index');

const BASE = 'https://github.com/ferretclient/ferret/releases/download/v0.3.0';
const NAME = 'ferret_0.3.0_x64_win.exe';
const CONTENT = Buffer.from('pretend installer bytes'.repeat(50));
const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const installer = (overrides = {}) => ({
  name: NAME,
  size: CONTENT.length,
  url: `${BASE}/${NAME}`,
  checksumsUrl: `${BASE}/SHA256SUMS.txt`,
  ...overrides
});

// A body read in small chunks, like a real download.
const bodyOf = (buffer, { failAfter } = {}) => {
  let offset = 0;
  return {
    getReader: () => ({
      read: async () => {
        if (failAfter !== undefined && offset >= failAfter) throw new Error('connection lost');
        if (offset >= buffer.length) return { done: true };
        const value = new Uint8Array(buffer.subarray(offset, offset + 100));
        offset += 100;
        return { done: false, value };
      },
      cancel: async () => {}
    })
  };
};

const fakeFetch = ({ checksums, file = CONTENT, failAfter } = {}) => jest.fn(async (url) => {
  if (url.endsWith('SHA256SUMS.txt')) {
    return { ok: true, status: 200, text: async () => checksums ?? `${sha(CONTENT)}  ${NAME}\n` };
  }
  return { ok: true, status: 200, headers: { get: () => String(file.length) }, body: bodyOf(file, { failAfter }) };
});

let directory;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ferret-update-test-'));
});
afterEach(() => {
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('findChecksum', () => {
  it('reads text and binary mode lines, ignoring other files and noise', () => {
    const text = [`${'a'.repeat(64)}  other.exe`, `${'B'.repeat(64)} *${NAME}`, 'not a checksum line', ''].join('\r\n');
    expect(findChecksum(text, NAME)).toBe('b'.repeat(64));
    expect(findChecksum(text, 'missing.exe')).toBeNull();
  });
});

describe('downloadInstaller', () => {
  it('saves the file once its checksum matches, reporting progress', async () => {
    const progress = jest.fn();
    const file = await downloadInstaller({ installer: installer(), directory, fetchImpl: fakeFetch(), onProgress: progress });

    expect(file).toBe(path.join(directory, NAME));
    expect(fs.readFileSync(file).equals(CONTENT)).toBe(true);
    expect(fs.existsSync(`${file}.part`)).toBe(false);
    expect(progress).toHaveBeenLastCalledWith({ received: CONTENT.length, total: CONTENT.length });
    expect(progress.mock.calls.length).toBeGreaterThan(1);
  });

  it('discards a file whose checksum does not match and says so', async () => {
    const tampered = Buffer.from('something else entirely');
    await expect(downloadInstaller({ installer: installer(), directory, fetchImpl: fakeFetch({ file: tampered }) }))
      .rejects.toThrow(/does not match its published checksum/);
    expect(fs.readdirSync(directory)).toEqual([]);
  });

  it('refuses when the release publishes no checksum for the file', async () => {
    const checksums = `${'a'.repeat(64)}  other.exe\n`;
    await expect(downloadInstaller({ installer: installer(), directory, fetchImpl: fakeFetch({ checksums }) }))
      .rejects.toThrow(/No checksum is published/);
    expect(fs.readdirSync(directory)).toEqual([]);
  });

  it('refuses addresses that are not this repository releases, before any request is made', async () => {
    const fetchImpl = fakeFetch();
    await expect(downloadInstaller({ installer: installer({ url: 'https://example.com/ferret.exe' }), directory, fetchImpl }))
      .rejects.toThrow(/not a Ferret release/);
    await expect(downloadInstaller({ installer: installer({ checksumsUrl: 'https://example.com/SHA256SUMS.txt' }), directory, fetchImpl }))
      .rejects.toThrow(/not a Ferret release/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(['..\\evil.exe', '../evil.exe', 'ferret.sh', 'notferret.exe', 'ferret_1.0.0_x64_win.exe/../x'])('refuses the file name %s', async (name) => {
    await expect(downloadInstaller({ installer: installer({ name }), directory, fetchImpl: fakeFetch() }))
      .rejects.toThrow(/unexpected file name/);
  });

  it('cleans up the partial file when the connection drops', async () => {
    await expect(downloadInstaller({ installer: installer(), directory, fetchImpl: fakeFetch({ failAfter: 200 }) }))
      .rejects.toThrow(/connection lost/);
    expect(fs.readdirSync(directory)).toEqual([]);
  });

  it('stops and cleans up when cancelled', async () => {
    const controller = new AbortController();
    const onProgress = jest.fn(() => controller.abort());
    await expect(downloadInstaller({ installer: installer(), directory, fetchImpl: fakeFetch(), onProgress, signal: controller.signal }))
      .rejects.toThrow(/cancelled/);
    expect(fs.readdirSync(directory)).toEqual([]);
  });

  it('reports an HTTP error from GitHub', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 404 }));
    await expect(downloadInstaller({ installer: installer(), directory, fetchImpl })).rejects.toThrow(/HTTP 404/);
  });

  it('replaces an older download of the same file', async () => {
    fs.writeFileSync(path.join(directory, NAME), 'old');
    const file = await downloadInstaller({ installer: installer(), directory, fetchImpl: fakeFetch() });
    expect(fs.readFileSync(file).equals(CONTENT)).toBe(true);
  });
});
