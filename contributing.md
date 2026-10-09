## Let's make Ferret better, together!!

We are happy that you are looking to improve Ferret. Below are the guidelines to run Ferret on your computer. For a step-by-step walkthrough from `git clone` to a running app, see [Getting started](docs/getting-started.md).

### Technology Stack

Ferret is built using React and Electron.

Libraries we use

- CSS - Tailwind
- Code Editors - Codemirror
- State Management - Redux
- Icons - Tabler Icons
- Forms - formik
- Schema Validation - Yup
- Request Client - axios
- Filesystem Watcher - chokidar
- i18n - i18next

> [!IMPORTANT]
> You would need [Node v22.x or the latest LTS version](https://nodejs.org/en/) (the exact version is pinned in `.nvmrc`). We use npm workspaces in the project

### Project Structure

All packages live under `packages/`:

| Package | Description |
| --- | --- |
| `ferret-app` | React frontend (renderer) |
| `ferret-electron` | Electron desktop app (main process) |
| `ferret-cli` | Command line interface to run collections |
| `ferret-common` | Shared utilities |
| `ferret-requests` | Request handling (auth, network, etc.) |
| `ferret-converters` | Import/export converters (Postman, Insomnia, OpenAPI, etc.) |
| `ferret-filestore` | File storage and parsing of collection files |
| `ferret-sqlite` | SQLite storage layer |
| `ferret-lang` | `.fer` language parser |
| `ferret-toml` | TOML helpers (not used by the app today) |
| `ferret-schema` / `ferret-schema-types` | Schema validation and shared types |
| `ferret-js` | Script, test, vars and assert runtimes |
| `ferret-query` | Query with deep navigation, filter and map support |
| `ferret-graphql-docs` | GraphQL documentation explorer |
| `ferret-tests` | Test collection and server used by CLI tests |

End-to-end (Playwright) tests live in the top-level `tests/` directory.

## Development

Ferret is a desktop app. Below are the instructions to run Ferret.

> Note: We use React for the frontend and rsbuild for build and dev server.

### Local Development

#### 1. Setup

```bash
# use the node version from .nvmrc
nvm use

# install dependencies and build all packages
npm run setup
```

`npm run setup` does the following for you:

- removes existing `node_modules` directories
- installs dependencies (`npm i --legacy-peer-deps`) and platform-specific native modules
- builds the shared packages: `graphql-docs`, `ferret-query`, `ferret-common`, `ferret-converters`, `ferret-requests`, `schema-types`, `ferret-filestore` and `ferret-sqlite`
- bundles the JS sandbox libraries for `ferret-js`

#### 2. Run the app

```bash
# run electron and react app concurrently
npm run dev

# or, with hot-reload of the electron main process
npm run dev:watch
```

You can also run them separately:

```bash
# run react app (terminal 1)
npm run dev:web

# run electron app (terminal 2)
npm run dev:electron
```

#### Rebuilding shared packages

`npm run dev` does **not** rebuild the shared packages. If you change one of them (e.g. `ferret-common`, `ferret-requests`, `ferret-filestore`, `ferret-sqlite`), rebuild it so the app picks up your changes:

```bash
npm run build:ferret-common
npm run build:ferret-requests
npm run build:ferret-filestore
npm run build:ferret-sqlite

# or run a watcher while developing
npm run watch:common
npm run watch:requests
npm run watch:converters
```

#### Use a different dev port

The UI dev server uses port `3000`. If it is taken, set `FERRET_DEV_PORT` (it applies to both the dev server and the app):

```sh
FERRET_DEV_PORT=3100 npm run dev            # macOS / Linux / Git Bash
$env:FERRET_DEV_PORT = 3100; npm run dev    # Windows PowerShell
```

#### Customize Electron `userData` path

If `ELECTRON_USER_DATA_PATH` env-variable is present and its development mode, then `userData` path is modified accordingly.

e.g.

```sh
ELECTRON_USER_DATA_PATH=$(realpath ~/Desktop/ferret-test) npm run dev:electron
```

This will create a `ferret-test` folder on your Desktop and use it as the `userData` path.

### Troubleshooting

If `npm install` reports `Unsupported platform` or leaves the install in a strange state, re-run `npm run setup`. It deletes every `node_modules` folder first and installs again, on every operating system. Other common problems (port in use, `node:sqlite` errors, stale shared packages) are covered in [Getting started](docs/getting-started.md#troubleshooting).

### Testing

Please add tests along with your changes:

- **Unit tests** (Jest) for logic changes — place them in the package you're changing.
- **End-to-end tests** (Playwright) for user-facing changes in the app — see the [Playwright testing guide](docs/playwright-testing-guide.md).

#### Unit tests

```bash
# run tests for a single package
npm run test --workspace=packages/ferret-app
npm run test --workspace=packages/ferret-electron
npm run test --workspace=packages/ferret-cli
npm run test --workspace=packages/ferret-common
npm run test --workspace=packages/ferret-requests
npm run test --workspace=packages/ferret-converters
npm run test --workspace=packages/ferret-filestore
npm run test --workspace=packages/ferret-sqlite
npm run test --workspace=packages/ferret-js
npm run test --workspace=packages/ferret-lang
npm run test --workspace=packages/ferret-schema
npm run test --workspace=packages/ferret-query
npm run test --workspace=packages/ferret-toml

# run a single test file
npm run test --workspace=packages/ferret-app -- path/to/file.spec.js

# run tests over all workspaces
npm test --workspaces --if-present
```

#### End-to-end tests

```bash
# run the e2e test suite (long: roughly 1,600 tests)
npm run test:e2e

# a quick subset tagged @sanity
npm run test:e2e:sanity

# run a single e2e test file or folder
npx playwright test tests/collection/create-collection.spec.ts --project=default
npx playwright test tests/history --project=default
```

The suite launches the real Electron app and needs the UI dev server (port `3000`, or `FERRET_DEV_PORT`) and the test server (port `8081`); Playwright starts both for you. The tests only talk to `localhost`, apart from the proxy specs under `tests/proxy`, which need proxy host names that exist only on a hosted test network and are expected to fail locally.

### Linting and local checks

```bash
npm run lint:fix     # fix lint problems
npm run check        # lint + all unit tests
```

There is no hosted CI, so checks run on your machine through git hooks: ESLint runs on the files you commit, and the full unit test suite runs when you `git push` (skip it once with `git push --no-verify`). Please run `npm run check` before opening a pull request.

Please also follow our [coding standards](CODING_STANDARDS.md).

### Building an installer and releasing

`npm run dist` builds an installer for the operating system you are on. Maintainers publish releases with the workflow described in [Releasing](docs/releasing.md); `npm run version:set <version>` sets one version on every package.

### Raising Pull Requests

- Please keep the PR's small and focused on one thing
- Please add unit and/or e2e tests that cover your change where applicable
- Please follow the format of creating branches
  - feature/[feature name]: This branch should contain changes for a specific feature
    - Example: feature/dark-mode
  - bugfix/[bug name]: This branch should contain only bug fixes for a specific bug
    - Example bugfix/bug-1
