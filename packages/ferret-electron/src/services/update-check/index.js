const REPOSITORY = 'ferretclient/ferret';
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

const DOWNLOAD_URL_PREFIX = `https://github.com/${REPOSITORY}/releases/download/`;
const CHECKSUMS_ASSET_NAME = 'SHA256SUMS.txt';

// Only files published on this repository's releases are ever downloaded.
const isTrustedDownloadUrl = (url) => typeof url === 'string' && url.startsWith(DOWNLOAD_URL_PREFIX);

// The installer for this operating system and processor, named the way the release workflow names its files:
// ferret_<version>_<arch>_<os>.<ext>. Linux gets only the AppImage, built for x64; the .deb and .rpm need a
// package manager, so those users are sent to the release page.
const installerFileName = ({ version, platform, arch }) => {
  const known = arch === 'x64' || arch === 'arm64';
  if (platform === 'win32' && known) return { name: `ferret_${version}_${arch}_win.exe`, action: 'restart' };
  if (platform === 'darwin' && known) return { name: `ferret_${version}_${arch}_mac.dmg`, action: 'open' };
  if (platform === 'linux' && arch === 'x64') return { name: `ferret_${version}_x86_64_linux.AppImage`, action: 'reveal' };
  return null;
};

/**
 * The installer to offer for `release`, or null when this system has none or the release does not publish a
 * checksum file next to it (an installer is never offered without a way to verify it).
 * `action` says what installing means here: restart Ferret, open a disk image, or show a file.
 */
const pickInstaller = (release, { version, platform, arch }) => {
  const wanted = installerFileName({ version, platform, arch });
  if (!wanted) return null;
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const installer = assets.find((asset) => asset?.name === wanted.name);
  const checksums = assets.find((asset) => asset?.name === CHECKSUMS_ASSET_NAME);
  if (!installer || !checksums) return null;
  if (!isTrustedDownloadUrl(installer.browser_download_url) || !isTrustedDownloadUrl(checksums.browser_download_url)) return null;
  return {
    name: wanted.name,
    action: wanted.action,
    size: Number(installer.size) || 0,
    url: installer.browser_download_url,
    checksumsUrl: checksums.browser_download_url
  };
};

/**
 * Reads the published releases once and compares the newest to `currentVersion`.
 * Never throws: every failure is reported as a result so the renderer can show it.
 * Nothing is downloaded or installed here; the result only names the installer that fits this computer.
 */
const checkForUpdates = async ({ currentVersion, fetchImpl, platform = process.platform, arch = process.arch }) => {
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
    const newer = compareVersions(latestVersion, currentVersion) > 0;
    const installer = newer ? pickInstaller(latest, { version: latestVersion, platform, arch }) : null;
    return {
      status: newer ? 'update-available' : 'up-to-date',
      currentVersion,
      latestVersion,
      prerelease: Boolean(latest.prerelease),
      url: safeReleaseUrl(latest.html_url),
      ...(installer ? { installer } : {})
    };
  } catch (error) {
    return { status: 'error', currentVersion, message: error?.message || 'The request failed.' };
  }
};

module.exports = {
  compareVersions,
  findLatestRelease,
  pickInstaller,
  isTrustedDownloadUrl,
  checkForUpdates,
  RELEASES_API_URL,
  RELEASES_PAGE_URL
};
