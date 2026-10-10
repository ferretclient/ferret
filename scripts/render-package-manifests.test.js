'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseChecksums, renderCask, renderWinget, renderAll, assetName } = require('./render-package-manifests');

const HASH = (character) => character.repeat(64);

const CHECKSUMS = [
  `${HASH('a')}  ferret_0.2.0_arm64_mac.dmg`,
  `${HASH('b')}  ferret_0.2.0_x64_mac.dmg`,
  `${HASH('c')} *ferret_0.2.0_x64_win.exe`,
  `${HASH('d')}  ferret_0.2.0_arm64_win.exe`,
  `${HASH('e')}  ferret_0.2.0_x64_linux.AppImage`,
  ''
].join('\n');

test('parseChecksums reads text and binary mode lines and ignores everything else', () => {
  const sums = parseChecksums(`${CHECKSUMS}\nnot a checksum line\r\n`);

  assert.equal(sums.get('ferret_0.2.0_arm64_mac.dmg'), HASH('a'));
  assert.equal(sums.get('ferret_0.2.0_x64_win.exe'), HASH('c'));
  assert.equal(sums.size, 5);
});

test('the Homebrew cask carries the version and a checksum per architecture', () => {
  const cask = renderCask({ version: '0.2.0', sums: parseChecksums(CHECKSUMS) });

  assert.match(cask, /^cask "ferret-app" do/);
  assert.match(cask, /version "0\.2\.0"/);
  assert.ok(cask.includes(`sha256 arm:   "${HASH('a')}"`));
  assert.ok(cask.includes(`intel: "${HASH('b')}"`));
  assert.ok(cask.includes('releases/download/v#{version}/ferret_#{version}_#{arch}_mac.dmg'));
  assert.match(cask, /app "Ferret\.app"/);
  assert.match(cask, /xattr -dr com\.apple\.quarantine/);
});

test('winget gets three manifests with upper-case checksums and the release URLs', () => {
  const files = renderWinget({ version: '0.2.0', sums: parseChecksums(CHECKSUMS), releaseDate: '2026-10-11' });

  assert.deepEqual(Object.keys(files), [
    'jakahann.FerretApp.yaml',
    'jakahann.FerretApp.installer.yaml',
    'jakahann.FerretApp.locale.en-US.yaml'
  ]);
  const installer = files['jakahann.FerretApp.installer.yaml'];
  assert.ok(installer.includes(`InstallerSha256: ${HASH('c').toUpperCase()}`));
  assert.ok(installer.includes('https://github.com/jakahann/ferret-app/releases/download/v0.2.0/ferret_0.2.0_x64_win.exe'));
  assert.match(installer, /InstallerType: nullsoft/);
  assert.match(installer, /ReleaseDate: 2026-10-11/);
  assert.match(files['jakahann.FerretApp.locale.en-US.yaml'], /License: MIT/);
});

test('rendering stops with a clear message when a release file is missing from the checksums', () => {
  const withoutArm = CHECKSUMS.split('\n').filter((line) => !line.includes('arm64_mac')).join('\n');

  assert.throws(
    () => renderAll({ version: '0.2.0', checksumsText: withoutArm }),
    /no entry for ferret_0\.2\.0_arm64_mac\.dmg/
  );
});

test('rendering rejects something that is not a version', () => {
  assert.throws(() => renderAll({ version: 'v0.2', checksumsText: CHECKSUMS }), /not a version/);
});

test('release file names follow the electron-builder pattern', () => {
  assert.equal(assetName('1.2.3', 'x64', 'win', 'exe'), 'ferret_1.2.3_x64_win.exe');
});
