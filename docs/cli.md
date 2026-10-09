# Ferret CLI (`fer`)

The CLI runs a collection from the command line, so the same requests, scripts, tests and assertions you build in the app can run in CI. It reads the collection folder directly and never needs the desktop app.

## Install

Ferret is not on npm yet. Run it from a clone (see [Getting started](getting-started.md)):

```bash
npm run setup                           # once, from the repository root
cd packages/ferret-cli && npm link      # puts `fer` on your PATH
fer --version
```

Or run it without linking: `node packages/ferret-cli/bin/fer.js run`.

## Run a collection

Run commands from inside a collection folder (the one with `ferret.json` or `opencollection.yml`).

```bash
fer run                         # every request in the collection
fer run request.fer             # one request
fer run users                   # every request in a folder
fer run users -r                # a folder, recursively
fer run request.fer users       # several targets in one run

fer run --env Local             # choose an environment (environments/Local.fer or .yml)
fer run --env-file ./ci.fer     # use an environment file from anywhere
fer run --env Local --env-var token=abc --env-var host=https://api.example.com
```

An `options` environment variable (a named list of values, see [Environments](environments.md)) is selected by name:

```bash
fer run --env Local --env-var company=Company2     # sends Company2's value
```

### Reports

```bash
fer run --reporter-json results.json
fer run --reporter-junit results.xml                     # for CI test reporters
fer run --reporter-html results.html                     # a single self-contained file, works offline
fer run --reporter-json r.json --reporter-html r.html    # several at once
```

`--reporter-skip-headers`, `--reporter-skip-all-headers`, `--reporter-skip-request-body`, `--reporter-skip-response-body` and `--reporter-skip-body` keep sensitive data out of a report.

### Selecting and controlling a run

| Option | Effect |
| --- | --- |
| `--tags a,b` / `--exclude-tags a` | run only requests (or folders) with / without these tags |
| `--tests-only` | run only requests that have a test or an active assertion |
| `--bail` | stop at the first failed request, test or assertion |
| `--delay 500` | wait 500 ms between requests |
| `--sandbox safe\|developer` | script sandbox. `safe` (default) is a sealed QuickJS sandbox; `developer` runs Node and can `require()` packages |
| `--global-env NAME` | use a global environment (needs the collection to be in a workspace; `--workspace-path` overrides detection) |
| `--verbose` | print debugging detail |

### Network options

| Option | Effect |
| --- | --- |
| `--insecure` | accept invalid TLS certificates |
| `--cacert FILE` | trust this CA certificate; `--ignore-truststore` makes it the only one |
| `--client-cert-config FILE` | client certificate configuration |
| `--noproxy` | ignore every proxy setting |
| `--disable-cookies` | do not store or send cookies |
| `--cache-ssl-session` | reuse TLS sessions between requests |

## Import an API description

```bash
fer import openapi --source api.yml --output ./my-collection --collection-name "My API"
fer import openapi -s https://example.com/openapi.json -o ./my-collection -g path
fer import wsdl --source service.wsdl --output ./my-collection
```

`--collection-format fer|opencollection` picks the file format (default `opencollection`, i.e. YAML) and `--group-by tags|path` how requests are grouped. To import Postman, Insomnia, OpenCollection or **Bruno** collections use the desktop app's *Import Collection* dialog.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | everything passed |
| `1` | a request, test or assertion failed |
| `2` | output folder does not exist |
| `3` | a request chain looped endlessly |
| `4` | not inside a collection |
| `5` | file not found |
| `6` | environment not found |
| `7`, `8` | malformed `--env-var` / `--global-env-var` |
| `9` | unknown output format |
| `10` | invalid file |
| `11`, `12`, `13` | workspace or global environment problems |
| `255` | any other error |

## Example: a CI step

```bash
fer run --env CI --tags smoke --bail --reporter-junit test-results/ferret.xml
```
