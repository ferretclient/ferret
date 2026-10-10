const { compareVersions, findLatestRelease, checkForUpdates, RELEASES_API_URL, RELEASES_PAGE_URL } = require('./index');

const release = (tag, extra = {}) => ({
  tag_name: tag,
  html_url: `https://github.com/useferret/ferret/releases/tag/${tag}`,
  draft: false,
  prerelease: false,
  ...extra
});

const respond = (body, init = {}) => jest.fn().mockResolvedValue({
  ok: init.status === undefined || init.status < 400,
  status: init.status ?? 200,
  json: async () => body
});

describe('compareVersions', () => {
  it.each([
    ['0.2.0', '0.1.9', 1],
    ['0.2.0', '0.2.0', 0],
    ['1.0.0', '0.99.99', 1],
    ['0.10.0', '0.9.0', 1],
    ['1.0.0-rc.1', '1.0.0', -1],
    ['1.0.0-rc.2', '1.0.0-rc.10', -1],
    ['1.0.0-alpha', '1.0.0-alpha.1', -1],
    ['v0.3.0', '0.3.0', 0]
  ])('orders %s against %s', (a, b, expected) => {
    expect(Math.sign(compareVersions(a, b))).toBe(expected);
  });

  it('sorts unparseable versions lowest', () => {
    expect(compareVersions('nightly', '0.1.0')).toBeLessThan(0);
    expect(compareVersions('0.1.0', 'nightly')).toBeGreaterThan(0);
  });
});

describe('findLatestRelease', () => {
  it('picks the highest version, pre-releases included, ignoring drafts and non-version tags', () => {
    const latest = findLatestRelease([
      release('v0.1.0'),
      release('v0.3.0', { draft: true }),
      release('v0.2.0', { prerelease: true }),
      release('nightly')
    ]);
    expect(latest.tag_name).toBe('v0.2.0');
  });

  it('returns null when nothing qualifies', () => {
    expect(findLatestRelease([])).toBeNull();
    expect(findLatestRelease(null)).toBeNull();
  });
});

describe('checkForUpdates', () => {
  it('reports a newer release with a link to it', async () => {
    const fetchImpl = respond([release('v0.3.0', { prerelease: true })]);
    const result = await checkForUpdates({ currentVersion: '0.2.0', fetchImpl });

    expect(result).toEqual({
      status: 'update-available',
      currentVersion: '0.2.0',
      latestVersion: '0.3.0',
      prerelease: true,
      url: 'https://github.com/useferret/ferret/releases/tag/v0.3.0'
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(RELEASES_API_URL);
  });

  it('reports up to date when the newest release is the running version or older', async () => {
    const result = await checkForUpdates({ currentVersion: '0.2.0', fetchImpl: respond([release('v0.2.0'), release('v0.1.0')]) });
    expect(result.status).toBe('up-to-date');
    expect(result.latestVersion).toBe('0.2.0');
  });

  it('reports unavailable for a private repository or one without releases', async () => {
    const notFound = await checkForUpdates({ currentVersion: '0.2.0', fetchImpl: respond({}, { status: 404 }) });
    expect(notFound).toEqual({ status: 'unavailable', currentVersion: '0.2.0', url: RELEASES_PAGE_URL });

    const empty = await checkForUpdates({ currentVersion: '0.2.0', fetchImpl: respond([]) });
    expect(empty.status).toBe('unavailable');
  });

  it('reports other HTTP failures as errors', async () => {
    const result = await checkForUpdates({ currentVersion: '0.2.0', fetchImpl: respond({}, { status: 403 }) });
    expect(result).toEqual({ status: 'error', currentVersion: '0.2.0', message: 'GitHub answered with HTTP 403.' });
  });

  it('reports a network failure as an error instead of throwing', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.github.com'));
    const result = await checkForUpdates({ currentVersion: '0.2.0', fetchImpl });
    expect(result).toEqual({ status: 'error', currentVersion: '0.2.0', message: 'getaddrinfo ENOTFOUND api.github.com' });
  });

  it('never returns a link outside the repository', async () => {
    const result = await checkForUpdates({
      currentVersion: '0.1.0',
      fetchImpl: respond([release('v0.2.0', { html_url: 'https://evil.example/download' })])
    });
    expect(result.url).toBe(RELEASES_PAGE_URL);
  });
});
