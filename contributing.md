## Let's make Ferret better, together!!

We are happy that you are looking to improve Ferret. Below are the guidelines to run Ferret on your computer.

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
| `ferret-toml` | TOML parser |
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

#### Customize Electron `userData` path

If `ELECTRON_USER_DATA_PATH` env-variable is present and its development mode, then `userData` path is modified accordingly.

e.g.

```sh
ELECTRON_USER_DATA_PATH=$(realpath ~/Desktop/ferret-test) npm run dev:electron
```

This will create a `ferret-test` folder on your Desktop and use it as the `userData` path.

### Troubleshooting

You might encounter a `Unsupported platform` error when you run `npm install`. To fix this, you will need to delete `node_modules` and `package-lock.json` and run `npm install`. This should install all the necessary packages needed to run the app.

```shell
# Delete node_modules in sub-directories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

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
# run the e2e test suite
npm run test:e2e

# run a single e2e test file
npx playwright test tests/collection/create-collection.spec.ts --project=default
```

### Linting

```bash
npm run lint:fix
```

Please also follow our [coding standards](CODING_STANDARDS.md).

### Raising Pull Requests

- Please keep the PR's small and focused on one thing
- Please add unit and/or e2e tests that cover your change where applicable
- Please follow the format of creating branches
  - feature/[feature name]: This branch should contain changes for a specific feature
    - Example: feature/dark-mode
  - bugfix/[bug name]: This branch should contain only bug fixes for a specific bug
    - Example bugfix/bug-1
