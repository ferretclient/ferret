#!/usr/bin/env node
// Renders package-manager manifests for a published release from its SHA256SUMS.txt:
//
//   node scripts/render-package-manifests.js 0.2.0 path/to/SHA256SUMS.txt [outDir]
//
// Writes a Homebrew cask and the three winget manifest files into outDir (default: dist/packaging).
// Nothing is submitted anywhere; see packaging/README.md for what to do with the output.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { owner: OWNER, repository: REPO_NAME, appId: APP_ID } = require('../project.json');
const { pascalCase } = require('./set-project-owner');

const REPOSITORY = `${OWNER}/${REPO_NAME}`;
const RELEASE_URL = (version, file) => `https://github.com/${REPOSITORY}/releases/download/v${version}/${file}`;
const WINGET_MANIFEST_VERSION = '1.6.0';
const WINGET_IDENTIFIER = `${OWNER}.${pascalCase(REPO_NAME)}`;
const DESCRIPTION = 'Offline API client for exploring and testing APIs';

// `sha256sum` writes "<hash>  <file>" (or "<hash> *<file>" in binary mode).
const parseChecksums = (text) => {
  const sums = new Map();
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^([0-9a-f]{64})\s+\*?(.+?)\s*$/i.exec(line);
    if (match) sums.set(match[2], match[1].toLowerCase());
  }
  return sums;
};

// Release files are named ferret_<version>_<arch>_<os>.<ext> (see electron-builder-config.js).
const assetName = (version, arch, os, ext) => `ferret_${version}_${arch}_${os}.${ext}`;

const requireChecksum = (sums, file) => {
  const sum = sums.get(file);
  if (!sum) {
    throw new Error(`SHA256SUMS.txt has no entry for ${file}. Release file names may have changed; update scripts/render-package-manifests.js.`);
  }
  return sum;
};

const renderCask = ({ version, sums }) => {
  const arm = requireChecksum(sums, assetName(version, 'arm64', 'mac', 'dmg'));
  const intel = requireChecksum(sums, assetName(version, 'x64', 'mac', 'dmg'));

  return `cask "ferret" do
  arch arm: "arm64", intel: "x64"

  version "${version}"
  sha256 arm:   "${arm}",
         intel: "${intel}"

  url "https://github.com/${REPOSITORY}/releases/download/v#{version}/ferret_#{version}_#{arch}_mac.dmg"
  name "Ferret"
  desc "${DESCRIPTION}"
  homepage "https://github.com/${REPOSITORY}"

  livecheck do
    url :url
    strategy :git
  end

  depends_on macos: ">= :big_sur"

  app "Ferret.app"

  zap trash: [
    "~/Library/Application Support/ferret",
    "~/Library/Preferences/${APP_ID}.plist",
    "~/Library/Saved Application State/${APP_ID}.savedState",
  ]

  caveats <<~EOS
    Ferret is not signed or notarized yet, so macOS may refuse to open it the first time.
    Either right-click the app and choose Open, or run:
      xattr -dr com.apple.quarantine /Applications/Ferret.app
  EOS
end
`;
};

const renderWinget = ({ version, sums, releaseDate }) => {
  const x64 = requireChecksum(sums, assetName(version, 'x64', 'win', 'exe'));
  const arm64 = requireChecksum(sums, assetName(version, 'arm64', 'win', 'exe'));
  const header = `PackageIdentifier: ${WINGET_IDENTIFIER}\nPackageVersion: ${version}`;
  const footer = (type) => `ManifestType: ${type}\nManifestVersion: ${WINGET_MANIFEST_VERSION}\n`;

  return {
    [`${WINGET_IDENTIFIER}.yaml`]: `${header}\nDefaultLocale: en-US\n${footer('version')}`,
    [`${WINGET_IDENTIFIER}.installer.yaml`]: `${header}
InstallerType: nullsoft
UpgradeBehavior: install${releaseDate ? `\nReleaseDate: ${releaseDate}` : ''}
Installers:
  - Architecture: x64
    InstallerUrl: ${RELEASE_URL(version, assetName(version, 'x64', 'win', 'exe'))}
    InstallerSha256: ${x64.toUpperCase()}
  - Architecture: arm64
    InstallerUrl: ${RELEASE_URL(version, assetName(version, 'arm64', 'win', 'exe'))}
    InstallerSha256: ${arm64.toUpperCase()}
${footer('installer')}`,
    [`${WINGET_IDENTIFIER}.locale.en-US.yaml`]: `${header}
PackageLocale: en-US
Publisher: ${OWNER}
PublisherUrl: https://github.com/${OWNER}
PackageName: Ferret
PackageUrl: https://github.com/${REPOSITORY}
License: MIT
LicenseUrl: https://github.com/${REPOSITORY}/blob/main/license.md
ShortDescription: ${DESCRIPTION}
Tags:
  - api
  - api-client
  - graphql
  - grpc
  - http
  - rest
${footer('defaultLocale')}`
  };
};

const renderAll = ({ version, checksumsText, releaseDate }) => {
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version || '')) {
    throw new Error(`"${version}" is not a version like 0.2.0`);
  }
  const sums = parseChecksums(checksumsText);
  return {
    'homebrew/ferret.rb': renderCask({ version, sums }),
    ...Object.fromEntries(Object.entries(renderWinget({ version, sums, releaseDate })).map(([name, content]) => [`winget/${name}`, content]))
  };
};

const main = () => {
  const [version, checksumsFile, outDir = path.join(__dirname, '..', 'dist', 'packaging')] = process.argv.slice(2);
  if (!version || !checksumsFile) {
    console.error('Usage: node scripts/render-package-manifests.js <version> <path to SHA256SUMS.txt> [outDir]');
    process.exit(1);
  }
  const files = renderAll({ version, checksumsText: fs.readFileSync(checksumsFile, 'utf8'), releaseDate: new Date().toISOString().slice(0, 10) });
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(outDir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    console.log(`wrote ${path.relative(process.cwd(), target)}`);
  }
};

if (require.main === module) main();

module.exports = { parseChecksums, renderCask, renderWinget, renderAll, assetName };
