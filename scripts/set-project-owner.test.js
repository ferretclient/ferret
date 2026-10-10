'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { rewriteOwner, currentOwner } = require('./set-project-owner');

const ROOT = path.resolve(__dirname, '..');
const move = (text) => rewriteOwner(text, { from: 'alice', to: 'Bob', githubId: 42 });

test('links, mentions and copyright lines take the owner as written', () => {
  assert.equal(move('https://github.com/alice/ferret-app/issues'), 'https://github.com/Bob/ferret-app/issues');
  assert.equal(move('CODEOWNERS: @alice'), 'CODEOWNERS: @Bob');
  assert.equal(move('Copyright (c) 2026 @alice'), 'Copyright (c) 2026 @Bob');
  assert.equal(move('winget: alice.FerretApp'), 'winget: Bob.FerretApp');
});

test('Docker paths and Homebrew taps are lower-case', () => {
  assert.equal(move('ghcr.io/alice/ferret-app:latest'), 'ghcr.io/bob/ferret-app:latest');
  assert.equal(move('brew install --cask alice/tap/ferret-app'), 'brew install --cask bob/tap/ferret-app');
  assert.equal(move('repository alice/homebrew-tap'), 'repository bob/homebrew-tap');
});

test('the app ID is left alone, so installed copies keep updating', () => {
  assert.equal(move('io.github.alice.ferret'), 'io.github.alice.ferret');
});

test('winget files its manifests under the first letter of the publisher', () => {
  assert.equal(move('manifests/a/alice/FerretApp/0.2.0/'), 'manifests/b/Bob/FerretApp/0.2.0/');
});

test('the no-reply address gets the numeric id, and keeps one it already has', () => {
  assert.equal(move('alice@users.noreply.github.com'), '42+Bob@users.noreply.github.com');
  assert.equal(move('7+alice@users.noreply.github.com'), '7+Bob@users.noreply.github.com');
});

test('longer words that merely contain the old name are left alone', () => {
  assert.equal(move('alice-wonderland and malice and alices'), 'alice-wonderland and malice and alices');
});

test('rewriting to the same owner changes nothing', () => {
  const text = 'https://github.com/alice/ferret-app ghcr.io/alice/ferret-app io.github.alice.ferret 5+alice@users.noreply.github.com';
  assert.equal(rewriteOwner(text, { from: 'alice', to: 'alice', githubId: 42 }), text);
});

test('every tracked file agrees with the owner in project.json', () => {
  const { owner } = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.json'), 'utf8'));
  assert.equal(currentOwner(), owner, 'package.json homepage names a different owner than project.json; run: node scripts/set-project-owner.js');

  const stale = [];
  const references = [
    /github\.com\/([A-Za-z0-9-]+)\/ferret-app/g,
    /ghcr\.io\/([A-Za-z0-9-]+)\/ferret-app/g,
    /(?:^|[^\w.-])([A-Za-z0-9-]+)\.FerretApp\b/g
  ];
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString('utf8').split('\0');
  for (const file of files) {
    if (!file || /^(project\.json|package-lock\.json|scripts\/set-project-owner)/.test(file)) continue;
    let content;
    try {
      content = fs.readFileSync(path.join(ROOT, file));
    } catch {
      continue;
    }
    if (content.subarray(0, 8000).includes(0)) continue;
    const text = content.toString('utf8');
    for (const pattern of references) {
      for (const match of text.matchAll(pattern)) {
        if (match[1].toLowerCase() !== owner.toLowerCase()) stale.push(`${file}: ${match[0].trim()}`);
      }
    }
  }
  assert.deepEqual(stale, [], `Run "node scripts/set-project-owner.js" after editing project.json.\n${stale.join('\n')}`);
});

test('every file that spells out the app ID uses the one in project.json', () => {
  const { appId } = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.json'), 'utf8'));
  assert.match(appId, /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+){2,}$/, 'appId needs at least three dot-separated parts');

  const mismatched = [];
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString('utf8').split('\0');
  for (const file of files) {
    if (!file || /^(project\.json|package-lock\.json|scripts\/set-project-owner)/.test(file)) continue;
    let content;
    try {
      content = fs.readFileSync(path.join(ROOT, file));
    } catch {
      continue;
    }
    if (content.subarray(0, 8000).includes(0)) continue;
    for (const match of content.toString('utf8').matchAll(/io\.github\.[A-Za-z0-9-]+\.ferret\b/g)) {
      if (match[0] !== appId) mismatched.push(`${file}: ${match[0]}`);
    }
  }
  assert.deepEqual(mismatched, [], `These disagree with appId "${appId}" in project.json.`);
});
