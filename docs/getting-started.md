# Getting started: run Ferret from a clone

This guide takes you from a fresh `git clone` to a running Ferret on Windows, macOS or Linux, and shows how to run the tests and build an installer.

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| **Git** | any recent | to clone the repository |
| **Node.js** | **22.12.x** (see [`.nvmrc`](../.nvmrc)) | newer 22.x releases also work. Ferret uses Node's built-in `node:sqlite`, which 22.12 needs a flag for; the scripts below set it for you |
| **npm** | the one that ships with Node 22 | the repository is an npm-workspaces monorepo |

The default setup normally needs no compiler or Python: the native dependencies ship prebuilt binaries.

Install Node with a version manager so the right version is picked up automatically:

- **macOS / Linux:** [nvm](https://github.com/nvm-sh/nvm), then `nvm install` inside the repository.
- **Windows:** [nvm-windows](https://github.com/coreybutler/nvm-windows) (`nvm install 22.12.0` then `nvm use 22.12.0`) or the installer from [nodejs.org](https://nodejs.org).

Check it with `node -v` (it should print `v22.x`).

## 2. Clone and set up

```bash
git clone https://github.com/useferret/ferret.git
cd ferret

# macOS / Linux with nvm: use the version from .nvmrc
nvm use

# install dependencies and build the shared packages (takes a few minutes the first time)
npm run setup
```

`npm run setup` is the only install command you need. It:

1. removes any existing `node_modules` folders (so you always start clean),
2. installs dependencies with `npm i --legacy-peer-deps` (the flag is required),
3. installs the platform-specific terminal module for your OS,
4. builds the shared packages that the app and CLI consume (`graphql-docs`, `ferret-query`, `ferret-common`, `ferret-converters`, `ferret-requests`, `schema-types`, `ferret-filestore`, `ferret-sqlite`),
5. bundles the JavaScript sandbox libraries used by scripts.

> The repository root is named `ferret` when cloned from GitHub; the commands are the same wherever you put it.

## 3. Run the app

```bash
npm run dev
```

This starts the UI dev server and opens the Ferret desktop window. Changes to the UI hot-reload. To also hot-reload the Electron main process use `npm run dev:watch`.

**Port already in use?** The dev server uses port `3000`. If something else is on that port, pick another one for both the dev server and the app:

```bash
# macOS / Linux / Git Bash
FERRET_DEV_PORT=3100 npm run dev

# Windows PowerShell
$env:FERRET_DEV_PORT = 3100; npm run dev
```

**Keep your real data out of development.** Point Ferret at a throwaway data folder:

```bash
# macOS / Linux / Git Bash
ELECTRON_USER_DATA_PATH="$HOME/ferret-dev-data" npm run dev

# Windows PowerShell
$env:ELECTRON_USER_DATA_PATH = "$HOME\ferret-dev-data"; npm run dev
```

Without it, development uses the same data folder as an installed Ferret:

| OS | Data folder |
| --- | --- |
| Windows | `%APPDATA%\ferret` |
| macOS | `~/Library/Application Support/ferret` |
| Linux | `~/.config/ferret` |

## 4. After you change code

`npm run dev` does **not** rebuild the shared packages. If you edit one of them, rebuild it, or run its watcher:

```bash
npm run build:ferret-common      # also :ferret-requests, :ferret-filestore, :ferret-sqlite,
                                 # :ferret-converters, :ferret-query, :schema-types, :graphql-docs
npm run watch:common             # also watch:requests, watch:converters
```

Packages that run straight from source (`ferret-js`, `ferret-lang`, `ferret-schema`, `ferret-cli`, `ferret-electron`) need no rebuild.

## 5. Checks and tests

There is no hosted CI. Checks run on your machine, through git hooks and npm scripts:

| When | What runs |
| --- | --- |
| `git commit` | ESLint on the staged files (`nano-staged`) |
| `git push` | the full unit test suite (`npm test`) |
| on demand | `npm run check` runs lint plus all unit tests |

```bash
npm test                                   # unit tests, every package
npm run check                              # lint + unit tests
npm run lint:fix                           # fix lint problems
npm test --workspace=packages/ferret-app   # one package
npm test --workspace=packages/ferret-app -- path/to/file.spec.js   # one file
```

To skip the pre-push tests once, use `git push --no-verify`.

### End-to-end tests

The Playwright suite drives the real Electron app against a local test server.

```bash
npm run test:e2e                                          # whole suite (long)
npx playwright test tests/history --project=default       # one folder
```

It starts the UI dev server and the test server (port `8081`) for you. Both ports must be free; to use a different UI port set `FERRET_DEV_PORT` as above. The suite needs no internet: it only talks to `localhost`, except the few `proxy` tests that need proxy host names. See the [Playwright testing guide](playwright-testing-guide.md).

## 6. Build an installer

```bash
npm run dist
```

This builds the UI for production (`npm run build:web`), copies it into the Electron package, and runs `electron-builder` for the operating system you are on. Output goes to `packages/ferret-electron/out/`, named `ferret_<version>_<arch>_<os>.<ext>`:

| Built on | Produces |
| --- | --- |
| Windows | NSIS installer `.exe` for x64 and arm64 |
| macOS | `.pkg`, `.dmg` and `.zip` for x64 and arm64 |
| Linux | AppImage for x64 and arm64. For packages run `npm run dist:deb --workspace=packages/ferret-electron` or `dist:rpm` |

Installers must be built on their own operating system; one machine cannot produce all three. The [release workflow](releasing.md) builds all of them on GitHub. Builds are **unsigned** unless you provide signing credentials, so Windows SmartScreen and macOS Gatekeeper warn on first launch.

## 7. Run the command-line tool

```bash
cd packages/ferret-cli && npm link      # puts `fer` on your PATH
fer --help
```

See the [CLI guide](cli.md).

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Unsupported platform` or other odd install errors | Re-run `npm run setup`; it removes every `node_modules` folder first, so it starts clean |
| `No such built-in module: node:sqlite` when running a test directly | Run tests through `npm test`; bare `jest` misses the `--experimental-sqlite` flag Node 22.12 needs |
| The app opens but shows a different website or a blank window | Another program is using port `3000`. Use `FERRET_DEV_PORT` (section 3) |
| UI changes appear but shared-package changes don't | Rebuild the package (section 4) |
| `npm run setup` fails on `npm i` | Check `node -v` is 22.x and that you are not behind a proxy that blocks the registry |
| Windows: `npm run dist` fails with "Cannot create symbolic link ... A required privilege is not held" | electron-builder unpacks a signing tool that contains symlinks. Turn on **Developer Mode** (Settings → System → For developers) or run the terminal as administrator, then build again. For a quick unsigned local installer without either, run `CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win nsis --x64 --config electron-builder-config.js -c.win.signAndEditExecutable=false` from `packages/ferret-electron` (the exe then has the default Electron icon and version info) |
| Windows: paths with spaces break a command | Run the commands from a folder whose path has no spaces |
