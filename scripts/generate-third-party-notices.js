#!/usr/bin/env node
// Generates THIRD_PARTY_NOTICES.md from the production dependency trees of the packages that ship (the
// desktop app's main process, its UI bundle and the CLI). Run `npm run licenses` after changing production
// dependencies and commit the result; the file is also packaged into the app.
//
// Read-only on node_modules. Platform-specific packages that are not installed on this machine are listed
// from package-lock.json instead (their license text is not available here).

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'THIRD_PARTY_NOTICES.md');
const SHIPPED = ['packages/ferret-electron', 'packages/ferret-app', 'packages/ferret-cli'];
const MAX_TEXT_BYTES = 200 * 1024;

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const isWorkspacePackage = (name) => name.startsWith('@useferret/') || name === 'ferret';

const findPackageDir = (fromDir, name) => {
  for (let dir = fromDir; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    if (path.dirname(dir) === dir) return null;
  }
};

const licenseOf = (pkg) => {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && pkg.license.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type || l).join(' OR ');
  return 'UNKNOWN';
};

const repositoryOf = (pkg) => {
  const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository && pkg.repository.url;
  return (repo ? repo.replace(/^git\+/, '').replace(/\.git$/, '') : pkg.homepage) || '';
};

const authorOf = (pkg) => {
  const author = pkg.author;
  if (!author) return '';
  return (typeof author === 'string' ? author : author.name || '').replace(/\s*<[^>]*>|\s*\([^)]*\)/g, '').trim();
};

const textFilesIn = (dir, pattern) => fs.readdirSync(dir)
  .filter((file) => pattern.test(file) && fs.statSync(path.join(dir, file)).isFile())
  .sort()
  .map((file) => ({ name: file, text: fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n').trim() }))
  .filter((entry) => entry.text && Buffer.byteLength(entry.text) <= MAX_TEXT_BYTES);

const collectPackages = () => {
  const found = new Map();
  const missing = new Set();

  for (const start of SHIPPED) {
    const rootDir = path.join(ROOT, start);
    const root = readJson(path.join(rootDir, 'package.json'));
    const queue = Object.keys({ ...root.dependencies, ...root.optionalDependencies }).map((name) => ({ name, from: rootDir }));

    while (queue.length) {
      const { name, from } = queue.shift();
      const dir = findPackageDir(from, name);
      if (!dir) { missing.add(name); continue; }

      const pkg = readJson(path.join(dir, 'package.json'));
      const key = `${pkg.name}@${pkg.version}`;
      if (found.has(key)) continue;

      const real = fs.realpathSync(dir);
      found.set(key, {
        key,
        name: pkg.name,
        license: licenseOf(pkg),
        repository: repositoryOf(pkg),
        author: authorOf(pkg),
        licenses: textFilesIn(real, /^(licen[sc]e|copying)/i),
        notices: textFilesIn(real, /^notice/i),
        workspace: isWorkspacePackage(pkg.name)
      });
      for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })) queue.push({ name: dep, from: real });
    }
  }

  const installedNames = new Set([...found.values()].map((p) => p.name));
  return { packages: [...found.values()].filter((p) => !p.workspace), missing: [...missing].filter((n) => !installedNames.has(n)) };
};

const missingFromLockfile = (names) => {
  const lock = readJson(path.join(ROOT, 'package-lock.json')).packages;
  return names.sort().map((name) => {
    const entry = Object.entries(lock).find(([key]) => key.endsWith(`node_modules/${name}`));
    return entry ? `${name}@${entry[1].version} — ${entry[1].license || 'license not recorded'}` : `${name} — not in package-lock.json`;
  });
};

const fence = (text) => `\`\`\`text\n${text.replace(/```/g, "'''")}\n\`\`\``;
const normalize = (text) => text.replace(/\s+/g, ' ').trim();

const SPECIAL_SECTIONS = `## 1. The project and the platform

**Bruno** — Ferret started as a fork of Bruno (https://github.com/usebruno/bruno), MIT license.
Copyright (c) 2022 Anoop M D, Anusree P S and Contributors. Parts: Copyright (c) 2024, 2025 Anoop M D,
Anusree P S and Contributors, and Copyright (c) 2026 Bruno Software Inc. and Contributors.

**Electron** — MIT license. Copyright (c) Electron contributors; Copyright (c) 2013-2020 GitHub Inc.
**Chromium** and its dependencies — see \`LICENSES.chromium.html\`, shipped next to the application.

## 2. Fonts, data and colour palettes

**Inter** font (via @fontsource/inter) — SIL Open Font License 1.1. Copyright 2016 The Inter Project Authors
(https://github.com/rsms/inter). The license text is reproduced with the @fontsource/inter package in section 4.

**Browser data** (caniuse-lite) — Creative Commons Attribution 4.0 International, from caniuse.com
(https://github.com/browserslist/caniuse-lite). The license text is reproduced with the package in section 4.

**Colour palettes** used for the built-in themes, all under the MIT license (text in section 3):

- Catppuccin — Copyright (c) 2021 Catppuccin (https://github.com/catppuccin/catppuccin)
- Nord — Copyright (c) 2016-present Sven Greb (https://github.com/nordtheme/nord)
- Dracula — Copyright (c) 2023 Dracula Theme (https://github.com/dracula/dracula-theme)
- Gruvbox — Copyright (c) Pavel Pertsev (https://github.com/morhetz/gruvbox), licensed MIT/X11
- Cyberdream — Copyright (c) 2023 Scott McKendry (https://github.com/scottmckendry/cyberdream.nvim)
- Visual Studio Code Dark+ and Light+ colours — Copyright (c) 2015 - present Microsoft Corporation
  (https://github.com/microsoft/vscode)

## 3. Source files with their own copyright headers (MIT)

- GraphQL Contributors (c) 2021 and Facebook, Inc. (c) 2017 — the GraphiQL-derived editor and documentation
  explorer files in \`packages/ferret-app\` and \`packages/ferret-graphql-docs\`
- Marijn Haverbeke and others (c) 2017 — \`packages/ferret-app/src/utils/codemirror/javascript-lint.js\`
- Nick Carneiro (c) 2014-2016 — \`packages/ferret-app/src/utils/curl/curl-to-json.js\`
- Aleksandr Komlev (c) 2016 — \`packages/ferret-electron/src/utils/machine-id.js\`

${fence(`MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.`)}
`;

const main = () => {
  const { packages, missing } = collectPackages();
  packages.sort((a, b) => a.key.localeCompare(b.key));

  // Packages with identical license text share one printed copy.
  const groups = new Map();
  const withoutText = [];
  for (const pkg of packages) {
    if (!pkg.licenses.length) { withoutText.push(pkg); continue; }
    const key = pkg.licenses.map((l) => normalize(l.text)).join('\n---\n');
    if (!groups.has(key)) groups.set(key, { licenses: pkg.licenses, packages: [] });
    groups.get(key).packages.push(pkg);
  }
  const orderedGroups = [...groups.values()].sort((a, b) => b.packages.length - a.packages.length || a.packages[0].key.localeCompare(b.packages[0].key));

  const lines = [];
  lines.push('# Third-party notices', '');
  lines.push('Ferret is released under the MIT license (see `license.md`). It includes the software, fonts and data listed');
  lines.push('below, each under its own license. This file is generated by `scripts/generate-third-party-notices.js`');
  lines.push('(`npm run licenses`) from the production dependencies of the app and the command-line tool.', '');
  lines.push(SPECIAL_SECTIONS);

  lines.push(`## 4. npm packages (${packages.length + missing.length})`, '');
  lines.push('Packages that share the same license text are listed together, and the text is printed once.', '');
  let index = 0;
  for (const group of orderedGroups) {
    index += 1;
    const ids = [...new Set(group.packages.map((p) => p.license))].join(', ');
    lines.push(`### 4.${index} ${ids} — ${group.packages.length} package${group.packages.length === 1 ? '' : 's'}`, '');
    for (const pkg of group.packages) lines.push(`- ${pkg.key}${pkg.repository ? ` — ${pkg.repository}` : ''}`);
    lines.push('');
    for (const license of group.licenses) lines.push(fence(license.text), '');
    for (const pkg of group.packages) {
      for (const notice of pkg.notices) lines.push(`NOTICE for ${pkg.key}:`, '', fence(notice.text), '');
    }
  }

  if (withoutText.length) {
    index += 1;
    lines.push(`### 4.${index} Packages that declare a license but ship no license file — ${withoutText.length} packages`, '');
    lines.push('Each is used under the license it declares in its `package.json`; the copyright holder is the package author.', '');
    for (const pkg of withoutText) {
      const noticeNote = pkg.notices.length ? ` (NOTICE below)` : '';
      lines.push(`- ${pkg.key} — ${pkg.license}${pkg.author ? ` — ${pkg.author}` : ''}${pkg.repository ? ` — ${pkg.repository}` : ''}${noticeNote}`);
    }
    lines.push('');
    for (const pkg of withoutText.filter((p) => p.notices.length)) {
      for (const notice of pkg.notices) lines.push(`NOTICE for ${pkg.key}:`, '', fence(notice.text), '');
    }
  }

  if (missing.length) {
    index += 1;
    lines.push(`### 4.${index} Platform-specific packages (installed only on the matching operating system)`, '');
    for (const entry of missingFromLockfile(missing)) lines.push(`- ${entry}`);
    lines.push('');
  }

  fs.writeFileSync(OUTPUT, `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)}: ${packages.length} packages, ${orderedGroups.length} distinct license texts, ${withoutText.length} without a license file, ${missing.length} platform-specific.`);
};

main();
