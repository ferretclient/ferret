#!/usr/bin/env node
// Sets one version number on every workspace package and on the `@useferret/*` dependencies that
// point at them, so the monorepo always releases as a unit.
//
//   node scripts/set-version.js 0.2.0
//
// Afterwards run `npm install --legacy-peer-deps` to refresh package-lock.json.

const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version || '')) {
  console.error('Usage: node scripts/set-version.js <major.minor.patch[-prerelease]>');
  process.exit(1);
}

const packagesDir = path.join(__dirname, '..', 'packages');
const manifests = fs.readdirSync(packagesDir)
  .map((name) => path.join(packagesDir, name, 'package.json'))
  .filter((file) => fs.existsSync(file));

const INTERNAL_DEPENDENCY = /"(@useferret\/[a-z0-9-]+)": "([\^~]?)\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?"/g;

let changed = 0;
for (const file of manifests) {
  const original = fs.readFileSync(file, 'utf8');
  // Only the top-level "version" line, not a dependency that happens to be named version.
  let updated = original.replace(/^(\s{2}"version": )"[^"]+"/m, `$1"${version}"`);
  updated = updated.replace(INTERNAL_DEPENDENCY, (_match, name, range) => `"${name}": "${range}${version}"`);

  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed++;
    console.log(`updated ${path.relative(process.cwd(), file)}`);
  }
}

console.log(`\nSet ${version} on ${manifests.length} packages (${changed} files changed).`);
console.log('Next: npm install --legacy-peer-deps   # refreshes package-lock.json');
