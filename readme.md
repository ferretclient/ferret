<br />
<img src="assets/images/logo-transparent.png" width="80"/>

### Ferret - Open-source IDE for exploring and testing APIs.

[![Website](https://img.shields.io/badge/Website-Visit-blue)](https://ferret.io)

Ferret is an offline-first API client. It stores your collections directly in a folder on your filesystem, as plain-text `.fer` files or OpenCollection YAML, so you can version and review them with Git or any other version control system.

There is no cloud sync and no account: your data stays on your device.

## Table of Contents

- [Features](#features)
- [Building from Source](#building-from-source)
- [Ferret CLI](#ferret-cli)
- [Run with Docker](#run-with-docker)
- [Contribute](#contribute)
- [Security](#security)
- [License](#license)

## Features

- HTTP, GraphQL, gRPC and WebSocket requests
- Collections stored as plain-text files you can commit, diff and review
- Environments, variables and secrets
- Pre-request and post-response scripting, tests and assertions
- Import from Postman, Insomnia, OpenAPI and WSDL
- Collection runner in the desktop app and the CLI
- Runs on macOS, Windows and Linux

## Building from Source

Ferret requires Node **v22.12.0** (see `.nvmrc`).

```sh
nvm use
npm i --legacy-peer-deps
npm run setup

# Start the desktop app in development mode
npm run dev
```

See the [contributing guide](contributing.md) for the full development setup.

## Ferret CLI

The **Ferret CLI** runs your API collections from the command line, which is ideal for automated testing and CI/CD pipelines.

```sh
npm install -g @useferret/cli
```

Navigate to the directory containing your collection and run it:

```sh
# Run every request in the collection
fer run

# Run a single request
fer run request.fer

# Run a folder against a specific environment
fer run folder --env Local
```

For the full command reference, see the [Ferret CLI documentation](https://docs.ferret.io/fer-cli/overview).

## Run with Docker

Docker images for the **Ferret CLI** let you run API collections in CI/CD pipelines without installing Node.js on the host.

```sh
docker pull useferret/cli:latest

# Run a collection by mounting the current directory
docker run -v $(pwd):/ferret useferret/cli run
```

## Contribute

Contributions are welcome. Please check out the [contributing guide](contributing.md).

Even if you are not able to contribute code, please file bugs and feature requests on [GitHub](https://github.com/jakahann/ferret-app/issues).

## Security

See [security.md](security.md) for how to report a vulnerability.

## License

[MIT](license.md)
