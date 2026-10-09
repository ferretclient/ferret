const REPOSITORY = 'jakahann/ferret-app';
const RELEASES_API_URL = `https://api.github.com/repos/${REPOSITORY}/releases?per_page=30`;
const RELEASES_PAGE_URL = `https://github.com/${REPOSITORY}/releases`;
const REQUEST_TIMEOUT_MS = 10000;

const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/;

const parseVersion = (value) => {
  const match = VERSION_PATTERN.exec(String(value ?? ''));
  if (!match) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split('.') : []
  };
};

const comparePrereleaseIdentifier = (a, b) => {
  const aIsNumber = /^\d+$/.test(a);
  const bIsNumber = /^\d+$/.test(b);
  if (aIsNumber && bIsNumber) return Math.sign(Number(a) - Number(b));
  if (aIsNumber) return -1;
  if (bIsNumber) return 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

// Semantic-version ordering: 1.0.0-rc.1 < 1.0.0, numeric identifiers compare as numbers.
// Returns a negative, zero or positive number; unparseable versions sort lowest.
const compareVersions = (a, b) => {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return Number(Boolean(left)) - Number(Boolean(right));

  for (let i = 0; i < 3; i++) {
    if (left.core[i] !== right.core[i]) return Math.sign(left.core[i] - right.core[i]);
  }
  if (!left.prerelease.length || !right.prerelease.length) {
    return right.prerelease.length - left.prerelease.length;
  }
  const shared = Math.min(left.prerelease.length, right.prerelease.length);
  for (let i = 0; i < shared; i++) {
    const order = comparePrereleaseIdentifier(left.prerelease[i], right.prerelease[i]);
    if (order !== 0) return order;
  }
  return Math.sign(left.prerelease.length - right.prerelease.length);
};

// GitHub's "latest" endpoint skips pre-releases, which is every release below 1.0, so the whole list is read.
const findLatestRelease = (releases) => {
  const published = (Array.isArray(releases) ? releases : []).filter((release) => release
    && !release.draft
    && parseVersion(release.tag_name));
  return published.reduce((latest, release) => (!latest || compareVersions(release.tag_name, latest.tag_name) > 0 ? release : latest), null);
};

// The page is opened in the user's browser, so only ever hand back a link inside this repository.
const safeReleaseUrl = (url) => (typeof url === 'string' && url.startsWith(`https://github.com/${REPOSITORY}/`) ? url : RELEASES_PAGE_URL);

const stripVersionPrefix = (tag) => String(tag).replace(/^v/, '');

/**
 * Reads the published releases once and compares the newest to `currentVersion`.
 * Never throws: every failure is reported as a result so the renderer can show it.
 * Nothing is downloaded or installed.
 */
const checkForUpdates = async ({ currentVersion, fetchImpl }) => {
  try {
    const response = await fetchImpl(RELEASES_API_URL, {
      headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': `ferret/${currentVersion}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    // GitHub answers 404 for a private repository and for one with no releases.
    if (response.status === 404) {
      return { status: 'unavailable', currentVersion, url: RELEASES_PAGE_URL };
    }
    if (!response.ok) {
      return { status: 'error', currentVersion, message: `GitHub answered with HTTP ${response.status}.` };
    }

    const latest = findLatestRelease(await response.json());
    if (!latest) {
      return { status: 'unavailable', currentVersion, url: RELEASES_PAGE_URL };
    }

    const latestVersion = stripVersionPrefix(latest.tag_name);
    return {
      status: compareVersions(latestVersion, currentVersion) > 0 ? 'update-available' : 'up-to-date',
      currentVersion,
      latestVersion,
      prerelease: Boolean(latest.prerelease),
      url: safeReleaseUrl(latest.html_url)
    };
  } catch (error) {
    return { status: 'error', currentVersion, message: error?.message || 'The request failed.' };
  }
};

module.exports = {
  compareVersions,
  findLatestRelease,
  checkForUpdates,
  RELEASES_API_URL,
  RELEASES_PAGE_URL
};
