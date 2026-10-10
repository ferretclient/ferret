'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { rewriteOwner, currentHome, pascalCase } = require('./set-project-owner');

const ROOT = path.resolve(__dirname, '..');
const move = (text) => rewriteOwner(text, { from: 'alice', to: 'Bob', fromRepo: 'ferret-app', toRepo: 'ferret' });
const rename = (text) => rewriteOwner(text, { from: 'alice', to: 'alice', fromRepo: 'ferret-app', toRepo: 'ferret' });

test('links and owner/repository constants take the new owner and repository', () => {
  assert.equal(move('https://github.com/alice/ferret-app/issues'), 'https://github.com/Bob/ferret/issues');
  assert.equal(move("const REPOSITORY = 'alice/ferret-app';"), "const REPOSITORY = 'Bob/ferret';");
  assert.equal(move('https://raw.githubusercontent.com/alice/ferret-app/refs/heads/main/x'), 'https://raw.githubusercontent.com/Bob/ferret/refs/heads/main/x');
  assert.equal(move('winget: alice.FerretApp'), 'winget: Bob.Ferret');
});

test('Docker paths and Homebrew taps are lower-case', () => {
  assert.equal(move('ghcr.io/alice/ferret-app:latest'), 'ghcr.io/bob/ferret:latest');
  assert.equal(move('brew install --cask alice/tap/ferret-app'), 'brew install --cask bob/tap/ferret-app');
  assert.equal(move('repository alice/homebrew-tap'), 'repository bob/homebrew-tap');
});

test('the maintainer handle, the app ID and the no-reply address are left alone', () => {
  const untouched = '@alice 7+alice@users.noreply.github.com io.github.alice.ferret Copyright (c) 2026 @alice';
  assert.equal(move(untouched), untouched);
});

test('winget files its manifests under the first letter of the publisher', () => {
  assert.equal(move('manifests/a/alice/FerretApp/0.2.0/'), 'manifests/b/Bob/Ferret/0.2.0/');
});

test('the repository can be renamed under the same owner', () => {
  assert.equal(rename('https://github.com/alice/ferret-app ghcr.io/alice/ferret-app alice.FerretApp'), 'https://github.com/alice/ferret ghcr.io/alice/ferret alice.Ferret');
});

test('longer words that merely contain the old name are left alone', () => {
  const text = 'alice-wonderland/ferret-app malice/ferret-app alices/ferret-app alice/ferret-app-bin';
  assert.equal(move(text), 'alice-wonderland/ferret-app malice/ferret-app alices/ferret-app alice/ferret-app-bin');
});

test('rewriting to the same owner and repository changes nothing', () => {
  const text = 'https://github.com/alice/ferret-app ghcr.io/alice/ferret-app alice.FerretApp';
  assert.equal(rewriteOwner(text, { from: 'alice', to: 'alice', fromRepo: 'ferret-app', toRepo: 'ferret-app' }), text);
});

test('repository names turn into winget package names', () => {
  assert.equal(pascalCase('ferret-app'), 'FerretApp');
  assert.equal(pascalCase('ferret'), 'Ferret');
});

const trackedTextFiles = () => {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString('utf8').split('\0');
  const texts = [];
  for (const file of files) {
    if (!file || /^(project\.json|package-lock\.json|scripts\/set-project-owner)/.test(file)) continue;
    let content;
    try {
      content = fs.readFileSync(path.join(ROOT, file));
    } catch {
      continue;
    }
    if (!content.subarray(0, 8000).includes(0)) texts.push({ file, text: content.toString('utf8') });
  }
  return texts;
};

test('every tracked file agrees with the owner and repository in project.json', () => {
  const { owner, repository } = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.json'), 'utf8'));
  assert.deepEqual(currentHome(), { owner, repository }, 'package.json homepage differs from project.json; run: npm run set-owner');

  const stale = [];
  const references = [
    /github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)/g,
    /ghcr\.io\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)/g
  ];
  for (const { file, text } of trackedTextFiles()) {
    for (const pattern of references) {
      for (const match of text.matchAll(pattern)) {
        // Links to other people's repositories (upstream Bruno, OpenCollection, ...) are fine; only ours must agree.
        const [, matchedOwner, matchedRepository] = match;
        const isOurs = matchedRepository.replace(/\.git$/, '') === repository || /^ferret-app$/.test(matchedRepository);
        if (isOurs && (matchedOwner.toLowerCase() !== owner.toLowerCase() || matchedRepository.replace(/\.git$/, '') !== repository)) stale.push(`${file}: ${match[0]}`);
      }
    }
  }
  assert.deepEqual(stale, [], `Run "npm run set-owner" after editing project.json.\n${stale.join('\n')}`);
});

test('every file that spells out the app ID uses the one in project.json', () => {
  const { appId } = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.json'), 'utf8'));
  assert.match(appId, /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+){2,}$/, 'appId needs at least three dot-separated parts');

  const mismatched = [];
  for (const { file, text } of trackedTextFiles()) {
    for (const match of text.matchAll(/io\.github\.[A-Za-z0-9-]+\.ferret\b/g)) {
      if (match[0] !== appId) mismatched.push(`${file}: ${match[0]}`);
    }
  }
  assert.deepEqual(mismatched, [], `These disagree with appId "${appId}" in project.json.`);
});
