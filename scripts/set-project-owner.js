#!/usr/bin/env node
// Makes `owner` in project.json the GitHub owner everywhere it appears: repository, release and issue
// links, Docker image paths, the Homebrew tap, the winget identifier, copyright lines and CODEOWNERS.
// The app ID ("appId" in project.json) is never touched, so installed copies keep updating.
//
//   1. edit "owner" in project.json
//   2. node scripts/set-project-owner.js           (rewrites the files)
//      node scripts/set-project-owner.js --check   (lists files that disagree and exits 1)
//
// The previous owner is read from the "homepage" link in the root package.json, so running it twice is
// harmless. Rewriting files does not touch git history or the git remote; see docs/releasing.md.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const REPOSITORY = 'ferret-app';
const HOMEPAGE = new RegExp(`github\\.com/([A-Za-z0-9-]+)/${REPOSITORY}`);
const SKIPPED = new Set(['project.json', 'package-lock.json', 'scripts/set-project-owner.js', 'scripts/set-project-owner.test.js']);

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// `githubId` is needed because GitHub's no-reply address only links commits to a profile with the id prefix.
const rewriteOwner = (text, { from, to, githubId }) => {
  if (from === to) return text;
  const toLower = to.toLowerCase();

  // winget files its manifests under the first letter of the publisher
  const withManifestPath = text.replace(
    new RegExp(`manifests/[a-z0-9]/${escapeRegExp(from)}/`, 'gi'),
    `manifests/${toLower[0]}/${to}/`
  );

  const ownerPattern = new RegExp(`(\\d+\\+)?(?<![\\w-])${escapeRegExp(from)}(?![\\w-])(@users\\.noreply\\.github\\.com)?`, 'gi');
  return withManifestPath.replace(ownerPattern, (match, idPrefix, noreply, offset, whole) => {
    const before = whole.slice(Math.max(0, offset - 10), offset);
    const after = whole.slice(offset + match.length, offset + match.length + 14);
    // The app ID is fixed in project.json and deliberately survives an owner change.
    if (/io\.github\.$/.test(before)) return match;
    // These places are lower-case by rule: Docker registry paths and Homebrew tap names.
    const lowerCase = /ghcr\.io\/$/.test(before) || /^\/(homebrew-)?tap/.test(after);
    const name = lowerCase ? toLower : to;
    if (noreply) return `${idPrefix || `${githubId}+`}${name}${noreply}`;
    return `${idPrefix || ''}${name}`;
  });
};

const currentOwner = () => {
  const manifest = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
  const match = HOMEPAGE.exec(manifest);
  if (!match) throw new Error(`package.json has no github.com/<owner>/${REPOSITORY} homepage to read the current owner from`);
  return match[1];
};

const isText = (buffer) => !buffer.subarray(0, 8000).includes(0);

const trackedFiles = () => execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 })
  .toString('utf8').split('\0').filter((file) => file && !SKIPPED.has(file));

const main = () => {
  const check = process.argv.includes('--check');
  const { owner, githubId } = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.json'), 'utf8'));
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner || '') || !Number.isInteger(githubId)) {
    console.error('project.json needs a GitHub "owner" (a username) and a numeric "githubId".');
    process.exit(1);
  }
  const from = currentOwner();

  const changed = [];
  for (const file of trackedFiles()) {
    const full = path.join(ROOT, file);
    const buffer = fs.readFileSync(full);
    if (!isText(buffer)) continue;
    const original = buffer.toString('utf8');
    const updated = rewriteOwner(original, { from, to: owner, githubId });
    if (updated !== original) {
      changed.push(file);
      if (!check) fs.writeFileSync(full, updated);
    }
  }

  if (check) {
    if (changed.length) {
      console.error(`These files do not match project.json (owner "${owner}"):\n  ${changed.join('\n  ')}`);
      process.exit(1);
    }
    return;
  }
  if (!changed.length) {
    console.log(`Already "${owner}". Nothing to do.`);
    return;
  }
  console.log(`Rewrote ${changed.length} files from "${from}" to "${owner}".`);
  console.log('\nStill to do by hand:');
  console.log(`  git remote set-url origin https://github.com/${owner}/${REPOSITORY}.git`);
  console.log(`  git config --local user.email ${githubId}+${owner}@users.noreply.github.com`);
  console.log('  Rewrite older commits only if their author address should change too (see docs/releasing.md).');
};

if (require.main === module) main();

module.exports = { rewriteOwner, currentOwner };
