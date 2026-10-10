<br />
<img src="assets/images/logo-transparent.png" width="120" alt="Ferret logo"/>

### Ferret: an offline API client for exploring and testing APIs

Ferret is a desktop app and command-line tool for sending requests, writing tests and organising API collections. Your collections are ordinary files in a folder, so you can version them with Git like any other code.

**Local by design.** No account, no cloud sync, no telemetry, no background calls to any server. Ferret only connects to the addresses in the requests you send, to proxies you configure, and to Git remotes you use. The one exception is **Check for updates**, which contacts GitHub only after you press it and confirm a dialog that says so.

## Contents

- [Features](#features)
- [Download](#download)
- [Run from source](#run-from-source)
- [Command line](#command-line)
- [Documentation](#documentation)
- [Coming from Bruno](#coming-from-bruno)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Features

- **Protocols:** HTTP, GraphQL, gRPC and WebSocket requests
- **Collections as files:** `.fer` text files or OpenCollection YAML, one file per request, easy to diff and review
- **Environments and variables:** several scopes, secrets that stay out of the files, data types, and **options** variables that let you pick a value by name (for example one of several company IDs)
- **Scripting and tests:** JavaScript before and after each request, Chai `expect` tests, no-code assertions, a sandboxed Safe Mode and a Developer Mode with npm packages
- **Collection runner** in the app and the **`fer` CLI** for CI, with JSON, JUnit and self-contained HTML reports
- **Request history:** every request you send, searchable and stored only on your computer, with credentials masked
- **Import:** Postman, Insomnia, OpenAPI, WSDL, OpenCollection and Bruno collections
- **Git integration**, a local **mock server**, response examples, cookies, proxies, client certificates and OAuth 2.0
- Light and dark themes (teal and azure) plus 20 more to choose from, and a sidebar whose sections you can reorder or hide
- Windows, macOS and Linux

## Download

Installers for Windows, macOS and Linux are published on the repository's **Releases** page. Builds are not signed yet, so your operating system will warn the first time you open one:

- **Windows:** SmartScreen shows "Windows protected your PC". Choose **More info → Run anyway**.
- **macOS:** right-click the app and choose **Open**, then confirm.
- **Linux:** make the AppImage executable (`chmod +x`) and run it, or install the `.deb` / `.rpm`.

**Updating:** Ferret never updates itself. Open **Preferences → Support → Check for updates**, confirm the dialog, and Ferret asks GitHub once for the latest release and tells you whether a newer version exists. You then download it from the release page yourself. While the repository is private, the check reports that no releases can be read.

No release yet, or you prefer to build it yourself? Follow the next section.

## Run from source

You need **Git** and **Node.js 22.12.x** (see [`.nvmrc`](.nvmrc); install it with [nvm](https://github.com/nvm-sh/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows)).

```bash
git clone https://github.com/jakahann/ferret-app.git
cd ferret-app

nvm use              # picks the Node version from .nvmrc (macOS / Linux)
npm run setup        # installs everything and builds the shared packages (a few minutes)

npm run dev          # opens Ferret in development mode
```

Other things you will want:

```bash
npm run dist         # build an installer for your operating system (output: packages/ferret-electron/out)
npm run check        # lint + all unit tests
npm test             # unit tests only
```

If port `3000` is busy, start with `FERRET_DEV_PORT=3100 npm run dev` (PowerShell: `$env:FERRET_DEV_PORT = 3100; npm run dev`).

The full walkthrough, with Windows, macOS and Linux details, running the tests, and troubleshooting, is in **[docs/getting-started.md](docs/getting-started.md)**.

## Command line

The `fer` command runs a collection without the app, which is what you want in CI:

```bash
cd packages/ferret-cli && npm link          # once, from a clone: puts `fer` on your PATH

fer run                                     # every request in the current collection
fer run --env Local --reporter-junit results.xml
fer run --env Local --env-var company=Company2
```

Ferret is not on npm yet, so the CLI runs from a clone for now. See **[docs/cli.md](docs/cli.md)** for every option and the exit codes.

## Documentation

| Guide | What it covers |
| --- | --- |
| [Getting started](docs/getting-started.md) | clone, install, run, test and build, with troubleshooting |
| [Environments and variables](docs/environments.md) | scopes, secrets, data types and options variables |
| [Scripting, tests and assertions](docs/scripting.md) | the `req`, `res` and `fer` APIs and the sandbox modes |
| [Command line](docs/cli.md) | `fer run` and `fer import`, reports, CI and exit codes |
| [Request history](docs/request-history.md) | what is saved, privacy and settings |
| [Importing from Bruno](docs/importing-from-bruno.md) | what is converted and how |
| [Releasing](docs/releasing.md) | versions, signing and publishing installers (maintainers) |
| [Playwright testing guide](docs/playwright-testing-guide.md) | writing and running end-to-end tests |
| [Contributing](contributing.md) and [coding standards](CODING_STANDARDS.md) | working on Ferret itself |

The app has its own offline Help: **Help → Documentation** opens a set of pages that explain how Ferret works and walk you through creating your first request.

## Coming from Bruno

Ferret imports Bruno collections: a collection folder (`.bru` or YAML), a folder that holds several collections, a whole workspace folder, a zip, or a JSON export. Open **Import Collection** and choose **Import a Bruno folder**. Files are converted to Ferret's format (`.fer`, `ferret.json`) and `bru.*` scripts become `fer.*`. Your original folder is not modified. Details: [Importing from Bruno](docs/importing-from-bruno.md).

## Contributing

Contributions are welcome. Start with the [contributing guide](contributing.md), which explains the project layout, how to run and test your changes, and how to open a pull request. Bugs and feature requests go in [GitHub issues](https://github.com/jakahann/ferret-app/issues).

There is no hosted CI. Checks run locally: linting on commit, the unit tests on push, and `npm run check` any time.

## Security

See [security.md](security.md) for how to report a vulnerability.

## License

[MIT](license.md). The code is free to use, modify and redistribute under that license.

Ferret started as a fork of [Bruno](https://github.com/usebruno/bruno) by Anoop M D, Anusree P S and contributors, which is also MIT-licensed. Their copyright notice is kept in the license file next to ours.

**Branding is not part of the license.** The Ferret name and logo are not covered by the MIT license. Please use your own name and logo for forks, and don't suggest your version is the official Ferret. Saying that a project is "based on Ferret" is welcome. More in [assets/README.md](assets/README.md).
