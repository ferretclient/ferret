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

`version:set` updates all `packages/*/package.json` files and the `@ferretclient/*` dependencies that point at them.

## The 1.0 checklist

Tag `1.0.0` only when all of these are true:

- [ ] `npm run check` passes (lint and every unit test).
- [ ] The end-to-end suite passes, apart from tests that need proxy host names (see below).
- [ ] A packaged installer (not just `npm run dev`) was installed and used on **each** of Windows, macOS and Linux.
- [ ] Installers are **signed** (Windows code-signing certificate; Apple Developer ID with notarization), so users do not get security warnings.
- [ ] The repository is public, so the documentation links, issue tracker and private vulnerability reporting (**Settings → Code security → Private vulnerability reporting**) work for everyone. If you later buy a domain, update the links listed in `git grep "ferretclient/ferret"`.
- [ ] You have decided what is part of the stable promise: the `.fer` and `.yml` file formats, the `fer.*` script API, and the CLI options.
- [ ] Anything you do not want to support is removed or clearly marked experimental.

## First release checklist

The steps for the first public release (`0.2.0`, a pre-release). Steps marked *you* need an account or a decision that only the maintainer can make.

**Before the repository goes public**

- [ ] *you* Search for the name "Ferret" in trademark registers (WIPO Global Brand Database, USPTO, EUIPO) for software in your region. EUIPO (digital products) found no match for "ferret" or "ferret-app"; WIPO and USPTO are still to do. The MIT license covers the code, not the name or the logo.
- [ ] `npm run check` passes and `THIRD_PARTY_NOTICES.md` is current (`npm run licenses`).
- [ ] *you* Import the two rulesets in `.github/rulesets/` and apply the settings in [Repository settings](repository-settings.md), then make the repository public and enable **Settings → Code security → Private vulnerability reporting**.

**Dry run**

- [ ] Push a throwaway tag, for example `v0.2.0-rc.1`. The workflow builds Windows, macOS and Linux and creates a pre-release. Expect packaging problems on the first run, especially `.deb`/`.rpm` and macOS, which have never been built.
- [ ] Install the Windows build on a clean machine and walk through Help → first request. Ask someone to try macOS and Linux. On a Mac, confirm the environment option picker works.
- [ ] Delete the rc release and its tag.

**Release**

- [ ] Set the date in `CHANGELOG.md`, commit, then tag `v0.2.0` and push the tag. Keep it a pre-release.
- [ ] Edit the release notes: copy the changelog entry and add the first-start instructions for unsigned apps (Windows: *More info → Run anyway*; macOS: right-click → *Open*, or `xattr -dr com.apple.quarantine /Applications/Ferret.app`).
- [ ] Open the installed app and check that **Preferences → Support → Check for updates** finds the release. To try the whole flow, install the previous release candidate first, publish the next one, then check, download and install it from inside the app. The installer comes from `SHA256SUMS.txt`, so every release must publish that file.

**Package managers** (after the release exists)

- [ ] Download `SHA256SUMS.txt` from the release and run `node scripts/render-package-manifests.js 0.2.0 SHA256SUMS.txt`. It writes a Homebrew cask and winget manifests to `dist/packaging/`.
- [ ] *you* Homebrew: create a repository `ferretclient/homebrew-tap` from `packaging/homebrew-tap/` (its README is the install guide), copy `dist/packaging/homebrew/ferret.rb` over `Casks/ferret.rb` (the committed one has placeholder checksums), then test with `brew install --cask ferretclient/tap/ferret`.
- [ ] *you* winget: check the three files in `dist/packaging/winget/` with `winget validate`, and submit them as a pull request to `microsoft/winget-pkgs` under `manifests/f/ferretclient/Ferret/0.2.0/`.
- [ ] *you* Linux: the AppImage, `.deb` and `.rpm` come with the release. An AUR package (`ferret-app-bin`), Flathub and Snap can follow later.
- [ ] *you* npm: claim `ferret-app` by publishing the self-contained tarball from `node scripts/bundle-cli.js`, then publish the Docker image to `ghcr.io/ferretclient/ferret`.

**Later**

- [ ] *you* Apply for free Windows signing for open-source projects (SignPath), and decide on an Apple Developer account ($99 a year) for macOS signing and notarization.
- [ ] Delete the local backup branch `backup-before-trailer-removal` and `refs/original` once you no longer need them.

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
| macOS | `ferret_<version>_x64_mac.dmg` / `.zip` and the same for `arm64` |
| Linux | `ferret_<version>_x64_linux.AppImage`, `.deb`, `.rpm`, and the same for `arm64` |

### Publishing by hand

If you cannot use the workflow, build on each operating system with `npm run dist`, collect the files from `packages/ferret-electron/out/`, and upload them to a release (Releases → *Draft a new release*, or `gh release create v0.2.0 files... --prerelease`).

## Names in package registries

**Ferret** is the brand name; the repository is `ferretclient/ferret` and the command-line package is `ferret-app` (the bare `ferret` is taken on npm). None of these exist yet; they are the planned names.

| Where | Name | Notes |
| --- | --- | --- |
| GitHub | `ferretclient/ferret` | the repository |
| npm | `ferret-app` | the command-line tool; installs the `fer` command. `node scripts/bundle-cli.js` packs it with the internal packages into one self-contained tarball |
| Docker | `ghcr.io/ferretclient/ferret` | the CLI image; Docker Hub is not planned |
| Homebrew | cask `ferret` | in the organization's own tap, `ferretclient/tap` |
| winget | `ferretclient.Ferret` | needs a public release and the installer's sha256 |

## Changing the GitHub owner or repository name

Where the project lives on GitHub (`ferretclient/ferret` today) appears in links, Docker image paths, the Homebrew tap and the winget identifier. `project.json` is the single place that says where it is:

```json
{ "owner": "ferretclient", "repository": "ferret", "appId": "io.github.ferretclient.ferret" }
```

`appId` is the app's identity on macOS, Windows and Linux. Auto-update, user data and notarization all key off it, and no domain is involved. It is **never changed once a release exists** (installed copies would stop updating and lose their settings), so `npm run set-owner` leaves it alone and `npm test` checks that every file spelling it out agrees with `project.json`.

The maintainer's own handle (`@jakahann` in `CODEOWNERS` and the license lines, and the no-reply commit address) is a person, not a place, so it is not part of this and is never rewritten.

To move the project to another GitHub user or organization, or to rename the repository:

1. Transfer or rename the repository on GitHub first.
2. Edit `owner` and `repository` in `project.json`.
3. Run `npm run set-owner`. It rewrites every file that mentions the old location (it reads the old one from `homepage` in `package.json`), using lower-case where Docker and Homebrew require it.
4. Run the command it prints to update the git remote.
5. `npm test` fails if any tracked file still names a different location, so a missed reference shows up before a release.

Do this **before** the first release. Anything already shipped (an installer's update check, a published Docker image or Homebrew cask) keeps pointing at the old name.

Rewriting the author of older commits changes every commit hash, so do it only while the repository is private. Use `git filter-branch --env-filter` on `main`, keep a backup branch, and push with `git push --force-with-lease`.

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
| Package manager manifests | `scripts/render-package-manifests.js` (Homebrew cask, winget) |
| Release workflow | `.github/workflows/release.yml` |
