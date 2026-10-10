# Releasing Ferret

This guide is for maintainers. It covers version numbers, the checks to pass before a release, and how installers for Windows, macOS and Linux are built and published.

## Version numbers

Ferret follows [semantic versioning](https://semver.org). Every package in the monorepo shares one version and is released together.

- **`0.x`**: pre-release. Features and the on-disk format may still change. GitHub marks these releases as *pre-release*.
- **`1.0.0`**: a stable promise. Do not tag it until the checklist below is complete.
- After `1.0.0`: patch (`1.0.1`) for fixes, minor (`1.1.0`) for backward-compatible features, major (`2.0.0`) for breaking changes to files or scripts.

Set the version everywhere with one command, then refresh the lockfile:

```bash
npm run version:set 0.2.0
npm install --legacy-peer-deps
```

`version:set` updates all `packages/*/package.json` files and the `@useferret/*` dependencies that point at them.

## The 1.0 checklist

Tag `1.0.0` only when all of these are true:

- [ ] `npm run check` passes (lint and every unit test).
- [ ] The end-to-end suite passes, apart from tests that need proxy host names (see below).
- [ ] A packaged installer (not just `npm run dev`) was installed and used on **each** of Windows, macOS and Linux.
- [ ] Installers are **signed** (Windows code-signing certificate; Apple Developer ID with notarization), so users do not get security warnings.
- [ ] The repository is public, so the documentation links, issue tracker and private vulnerability reporting (**Settings → Code security → Private vulnerability reporting**) work for everyone. If you later buy a domain, update the links listed in `git grep "jakahann/ferret-app"`.
- [ ] You have decided what is part of the stable promise: the `.fer` and `.yml` file formats, the `fer.*` script API, and the CLI options.
- [ ] Anything you do not want to support is removed or clearly marked experimental.

## Before every release

```bash
npm run check                         # lint + unit tests
npm run licenses                      # refresh THIRD_PARTY_NOTICES.md after dependency changes, and commit it
npm run dist                          # build an installer on your own OS and try it
```

Run the end-to-end suite against the dev server (see [Getting started](getting-started.md#end-to-end-tests)):

```bash
npm run test:e2e
```

A few specs, under `tests/proxy` and a handful of others, send traffic through proxy host names that only exist on a hosted test network. They fail locally for that reason and are not app regressions.

## Publishing: the release workflow

[`.github/workflows/release.yml`](../.github/workflows/release.yml) builds the installers on Windows, macOS and Linux runners and creates the GitHub release. It runs only when you push a version tag or start it by hand, never on ordinary pushes.

```bash
npm run version:set 0.2.0
npm install --legacy-peer-deps
git add -A && git commit -m "chore: release 0.2.0"
git push

git tag v0.2.0
git push origin v0.2.0               # starts the workflow
```

The workflow:

1. checks that the tag matches the app version (`v0.2.0` ↔ `0.2.0`),
2. builds each platform's installers (`npm run setup`, then `npm run dist`; on Linux also `.deb` and `.rpm`),
3. creates the release with auto-generated notes, the installers and a `SHA256SUMS.txt` file. Versions below 1.0 are marked pre-release.

To review before publishing, start it from **Actions → Release → Run workflow**, enter the tag and keep *draft* ticked; publish the draft from the Releases page when you are happy.

**The workflow needs GitHub Actions minutes.** Private repositories get a small monthly allowance; public repositories are free. If you have none left, publish by hand (below) or make the repository public first.

Cost: Linux, Windows and macOS minutes are billed at 1×, 2× and 10×, so one release uses roughly 3 hours of a private repository's allowance (public repositories are free). That is why the workflow is not tied to every push.

### What gets published

| Platform | Files |
| --- | --- |
| Windows | `ferret_<version>_x64_win.exe`, `ferret_<version>_arm64_win.exe` |
| macOS | `ferret_<version>_x64_mac.dmg` / `.pkg` / `.zip` and the same for `arm64` |
| Linux | `ferret_<version>_x64_linux.AppImage`, `.deb`, `.rpm`, and the same for `arm64` |

### Publishing by hand

If you cannot use the workflow, build on each operating system with `npm run dist`, collect the files from `packages/ferret-electron/out/`, and upload them to a release (Releases → *Draft a new release*, or `gh release create v0.2.0 files... --prerelease`).

## Names in package registries

**Ferret** is the brand name; the repository and every registry name use `ferret-app`. None of these exist yet; they are the planned names.

| Where | Name | Notes |
| --- | --- | --- |
| GitHub | `jakahann/ferret-app` | the repository |
| npm | `ferret-app` | the command-line tool; installs the `fer` command. `node scripts/bundle-cli.js` packs it with the internal packages into one self-contained tarball |
| Docker | `ghcr.io/jakahann/ferret-app` | the CLI image; Docker Hub is not planned |
| Homebrew | cask `ferret-app` | in a personal tap first, for example `jakahann/tap` |
| winget | `jakahann.FerretApp` | needs a public release and the installer's sha256 |

## Code signing

Without signing, Windows SmartScreen shows "Windows protected your PC" and macOS Gatekeeper refuses to open the app until the user right-clicks → Open. Both warnings are normal for unsigned software, and unsigned builds are fine for testing and early pre-releases.

To sign, add these as **repository secrets** (Settings → Secrets and variables → Actions). The workflow passes them to the build; when they are empty the build stays unsigned.

| Secret | Used for |
| --- | --- |
| `CSC_LINK`, `CSC_KEY_PASSWORD` | the code-signing certificate (a `.p12`/`.pfx` file, base64-encoded or a URL) and its password, for Windows and macOS |
| `APPLE_SIGNING_IDENTITY` | the macOS identity, for example `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_TEAM_ID`, `APPLE_ID`, `APPLE_ID_PASSWORD` | macOS notarization with an app-specific password. Notarization is skipped when `APPLE_TEAM_ID` is unset |

Certificates cost money: an Apple Developer account is $99 a year, and a Windows code-signing certificate is a paid product from a certificate authority.

## Where the pieces are

| What | Where |
| --- | --- |
| Packaging configuration | `packages/ferret-electron/electron-builder-config.js` |
| Build script | `scripts/build-electron.js` (`npm run dist`) |
| macOS notarization | `packages/ferret-electron/notarize.js` |
| Version script | `scripts/set-version.js` (`npm run version:set`) |
| Release workflow | `.github/workflows/release.yml` |
