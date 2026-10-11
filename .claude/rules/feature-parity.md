---
paths:
  - "packages/**/*"
---

# Co-Related Features & Parity Surfaces

Ferret implements the same behaviour more than once — app vs CLI, `.fer` vs `.yml`, filestore vs
converters, implementation vs QuickJS shim. **A change to one side of a pair is not a finished
change**: the other side silently keeps the old behaviour and ships. The symptom is never a broken
build — it's a feature that works in the app but not in `fer run`, a field that survives save but
vanishes on export or migration, a `fer.*` method that is `undefined` in the default sandbox.

This rule maps *which* surfaces pair up. `.claude/rules/dsl-changes.md` owns the on-disk contract
in depth.

## When you work on a change

1. **Find the twin before writing the fix.** For every file you touch in the tables below, open
   its counterpart.
2. **Update the twin in the same change** when it's within what was asked.
3. **Otherwise, say so explicitly.** If the twin is out of scope, doesn't apply, or you're unsure,
   list it in your reply to the user (and in the PR description) with the path and why it was left
   — never leave a one-sided change unmentioned.
4. **Prefer unifying over copying.** If the logic has no Electron- or CLI-only dependency, move it
   into `@ferretclient/requests` / `@ferretclient/common` (respecting `.claude/rules/architecture.md`)
   instead of patching twice. Precedent: `utils/cookies.js` is one line in each runtime —
   `module.exports = require('@ferretclient/requests').cookies;`. Where both copies must stay, note the
   pairing in a comment at both sites.

## 1. App ↔ CLI — highest priority

`ferret-cli` is how collections run in CI. Several pipeline modules are **copied, not shared**, and
a bug fixed in the app is still present in `fer run` until its twin is fixed. Trace app-reported
bugs to the shared logic, not the reporting surface.

| Concern | `ferret-electron/src/…` | `ferret-cli/src/…` |
|---|---|---|
| Request execution — pre/post scripts, vars, asserts, tests, runner flow (`setNextRequest`, `skipRequest`) | `ipc/network/index.js` | `runner/run-single-request.js`, `commands/run.js` |
| Request assembly | `ipc/network/prepare-request.js` | `runner/prepare-request.js` |
| HTTP client, TLS, certs | `ipc/network/axios-instance.js` | `utils/axios-instance.js` |
| Interpolation | `ipc/network/interpolate-{vars,string}.js` | `runner/interpolate-{vars,string}.js` |
| Collection tree, `merge{Headers,Scripts,Vars,Auth}` | `utils/collection.js` | `utils/collection.js` |
| Collection loading, `ferret.json` / `opencollection.yml` config | `utils/collection-reader.js`, `app/collection-watcher.js` | `utils/collection.js` (`getCollectionConfig`) |
| Environments & persisted vars | `utils/environments.js` | `utils/environment.js`, `utils/persist-variables.js` |
| Proxy · OAuth 2.0 · form-data · filesystem | `utils/{proxy-util,oauth2,form-data,filesystem}.js` | `utils/{proxy-util,oauth2,form-data,filesystem}.js` |
| AWS SigV4 | `ipc/network/awsv4auth-helper.js` | `runner/awsv4auth-helper.js` |

- A new app runner option (tags, delay, bail) needs a `fer run` flag, or a stated reason.
- Import: the app imports Postman, Insomnia, OpenAPI, WSDL, OpenCollection and Bruno (JSON
  exports, zips and collection folders); `fer import` (`commands/import.js`) only OpenAPI and WSDL.
  Changes to a shared converter affect both. Bruno conversion is split by layer: script text in
  `@ferretclient/common` (`convertBrunoScript`), single files in `@ferretclient/filestore`
  (`convertBrunoFile`), JSON exports in `@ferretclient/converters` (`brunoToFerret`), and folders
  and zips in `ferret-electron/src/utils/bruno-import.js`, and whole workspaces (`workspace.yml`) in
  `ferret-electron/src/utils/bruno-workspace-import.js`, which reuses the folder converter per collection.
- **Known-divergent by design.** The CLI has no preferences store (so no `resolveInheritedSettings`),
  no Electron window, no system-browser OAuth, and no `@ferretclient/schema` validation. Its runner
  handles only `REQUEST_ITEM_TYPES = ['http-request', 'graphql-request']`
  (`ferret-cli/src/utils/collection.js`).

## 2. Persisted fields — every layer that carries a field list

A field is added in one place and read in many. Each of these keeps its **own** list, aligned by
hand:

| Layer | Where | Missed → |
|---|---|---|
| Types | `ferret-schema-types/src/collection/item.ts` | type drift |
| Yup schema | `ferret-schema/src/collections/index.js` — `.noUnknown(true).strict()` | **throws on save** |
| App save transform | `ferret-app/src/utils/collections/index.js` — `transformRequestToSaveToFilesystem`, `transform{Collection,Folder}RootToSave`, `transformCollectionToSaveToExportAsFile` | dropped before reaching disk / Ferret JSON export |
| On-disk formats | `ferret-filestore/src/formats/{fer,yml}` (+ `ferret-lang`) — parse **and** stringify | lost in one format |
| FER → YML migration | `ferret-electron/src/ipc/yml-migration.js` (fer parse → yml stringify) | lost when a user migrates |
| Collection config | `ferret.json` ↔ `opencollection.yml` — `utils/transformFerretConfig.js`, `stringifyCollection`, migration's config transform (e.g. `transformProxyConfig`), CLI `getCollectionConfig` | config lost or misread by CLI |
| OpenCollection import/export | `ferret-converters/src/opencollection/items/{http,graphql,grpc,websocket}.ts`, `folder.ts`, `environment.ts` — **both** directions; app entry `ferret-app/src/utils/exporters/opencollection.js` | lost on export or import |
| Other converters | `postman/{postman-to-ferret,ferret-to-postman}.js`, `insomnia/`, `openapi/`, `wsdl/`; app exporters `postman-collection.js`, `openapi-spec.js`, `ferret-environment.js` | lost on import/export where the target can represent it |

The migration also rewrites content, not just shape: `fer.runRequest("x.fer")` paths are stripped
of `.fer`, and tab snapshots are remapped. A new script API that takes a file path, a new file
type, or a new `ferret.json` key needs a matching migration step.

## 3. Scripting API ↔ QuickJS shim

`ferret-js/src/{fer,ferret-request,ferret-response}.js` implement the API. The **QuickJS sandbox — the
default "safe" mode — bridges each method explicitly** in `ferret-js/src/sandbox/quickjs/shims/`
(`fer.js`, `ferret-request.js`, `ferret-response.js`, `ferret-grpc.js`, …). Implementation only →
works in developer mode, `undefined` for most users.

## 4. Scope levels — collection ↔ folder ↔ request

Auth, headers, vars, scripts and tests exist at three levels plus `inherit`. Each level has its own
UI (`CollectionSettings/`, `FolderSettings/`, `RequestPane/`), and resolution lives in the merge
helpers in **each** runtime's `utils/collection.js`. A feature at one level needs a stated decision
for the other two and for `inherit`.

## 5. Protocols — HTTP ↔ GraphQL ↔ gRPC ↔ WebSocket

`REQUEST_TYPES` (`ferret-app/src/utils/common/constants.js`, `ferret-electron/src/utils/constants.js`)
lists all four. Each has its own `parse*`/`stringify*` in `ferret-filestore/src/formats/yml/items/`
and its own converter in `ferret-converters/src/opencollection/items/`. "HTTP only" is a legitimate
scope — leaving it unstated is how a gap becomes a bug report. Widening CLI protocol support is a
deliberate decision, not an incidental one.

## 6. Request shaping ↔ code generation

`GenerateCodeItem/utils/snippet-generator.js` consumes headers, body, `settings` and resolved auth.
A new auth mode or a setting that changes the wire request should change the generated snippet.

## Parity checklist

- [ ] Every twin in §1 opened; updated, or listed to the user with a reason
- [ ] App-reported bug fixes verified on the CLI path
- [ ] Shared logic moved to a leaf package where the DAG allows, instead of patched twice
- [ ] Persisted field carried through every layer in §2 — including migration and converters (both directions)
- [ ] New/changed `fer.*`, `req.*`, `res.*` API bridged in the QuickJS shim
- [ ] Collection / folder / request levels and `inherit` each decided
- [ ] gRPC and WebSocket considered; any "HTTP only" scope stated
- [ ] Code generation updated if the wire request changed
- [ ] Tests on **both** sides of every pair touched
