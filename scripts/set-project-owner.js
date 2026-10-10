#!/usr/bin/env node
// Makes `owner` and `repository` in project.json the GitHub home of the project everywhere they appear:
// repository, release and issue links, Docker image paths, the Homebrew tap and the winget identifier.
// The maintainer's own handle (CODEOWNERS, copyright lines, the no-reply commit address) and the app ID
// ("appId" in project.json) are never touched, so installed copies keep updating.
//
//   1. edit "owner" (and "repository") in project.json
//   2. node scripts/set-project-owner.js           (rewrites the files)
//      node scripts/set-project-owner.js --check   (lists files that disagree and exits 1)
//
// The previous owner and repository are read from the "homepage" link in the root package.json, so running
// it twice is harmless. Rewriting files does not touch git history or the git remote; see docs/releasing.md.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const HOMEPAGE = /github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)/;
const SKIPPED = new Set(['project.json', 'package-lock.json', 'scripts/set-project-owner.js', 'scripts/set-project-owner.test.js']);

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "ferret-app" -> "FerretApp", the form winget uses in package identifiers and manifest paths.
const pascalCase = (repository) => repository.split(/[-._]/).map((word) => word[0].toUpperCase() + word.slice(1)).join('');

const rewriteOwner = (text, { from, to, fromRepo, toRepo }) => {
  if (from === to && fromRepo === toRepo) return text;
  const toLower = to.toLowerCase();
  const [fromOwner, fromName] = [escapeRegExp(from), escapeRegExp(pascalCase(fromRepo))];

  return text
    // winget files its manifests under the first letter of the publisher
    .replace(
      new RegExp(`manifests/[a-z0-9]/${fromOwner}/${fromName}`, 'gi'),
      `manifests/${toLower[0]}/${to}/${pascalCase(toRepo)}`
    )
    .replace(new RegExp(`(?<![\\w@-])${fromOwner}\\.${fromName}\\b`, 'gi'), `${to}.${pascalCase(toRepo)}`)
    // Homebrew tap names are lower-case
    .replace(new RegExp(`(?<![\\w@-])${fromOwner}/((?:homebrew-)?tap)(?![\\w-])`, 'gi'), `${toLower}/$1`)
    // links, "owner/repository" constants and Docker image paths (lower-case by rule)
    .replace(new RegExp(`(ghcr\\.io/)?(?<![\\w@-])${fromOwner}/${escapeRegExp(fromRepo)}(?![\\w-])`, 'gi'), (match, registry) => (
      registry ? `${registry}${toLower}/${toRepo}` : `${to}/${toRepo}`
    ));
};

const currentHome = () => {
  const manifest = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
  const match = HOMEPAGE.exec(manifest);
  if (!match) throw new Error('package.json has no github.com/<owner>/<repository> homepage to read the current owner from');
  return { owner: match[1], repository: match[2] };
};

const isText = (buffer) => !buffer.subarray(0, 8000).includes(0);

const trackedFiles = () => execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 })
  .toString('utf8').split('\0').filter((file) => file && !SKIPPED.has(file));

const main = () => {
  const check = process.argv.includes('--check');
  const { owner, repository } = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.json'), 'utf8'));
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner || '') || !/^[A-Za-z0-9._-]+$/.test(repository || '')) {
    console.error('project.json needs a GitHub "owner" (a user or organization) and a "repository" name.');
    process.exit(1);
  }
  const { owner: from, repository: fromRepo } = currentHome();

  const changed = [];
  for (const file of trackedFiles()) {
    const full = path.join(ROOT, file);
    const buffer = fs.readFileSync(full);
    if (!isText(buffer)) continue;
    const original = buffer.toString('utf8');
    const updated = rewriteOwner(original, { from, to: owner, fromRepo, toRepo: repository });
    if (updated !== original) {
      changed.push(file);
      if (!check) fs.writeFileSync(full, updated);
    }
  }

  if (check) {
    if (changed.length) {
      console.error(`These files do not match project.json (${owner}/${repository}):\n  ${changed.join('\n  ')}`);
      process.exit(1);
    }
    return;
  }
  if (!changed.length) {
    console.log(`Already ${owner}/${repository}. Nothing to do.`);
    return;
  }
  console.log(`Rewrote ${changed.length} files from ${from}/${fromRepo} to ${owner}/${repository}.`);
  console.log('\nStill to do by hand:');
  console.log(`  git remote set-url origin https://github.com/${owner}/${repository}.git`);
};

if (require.main === module) main();

module.exports = { rewriteOwner, currentHome, pascalCase };
