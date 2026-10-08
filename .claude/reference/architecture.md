# Architecture, Data Model & Dependencies (reference)

On-demand reference for the monorepo layout, the request pipeline, the sandbox, the core
data-model types, and dependency versions. This file is **not** auto-loaded — read it before
non-trivial cross-package or architectural work. The dependency DAG and ownership guardrails
(the invariants Claude must not break) live in the auto-attached rule
`.claude/rules/architecture.md`; the area-specific rules (`.claude/rules/electron-ipc.md`,
`.claude/rules/redux-store.md`, `.claude/rules/dsl-changes.md`) go deeper. This file is the map.

## Monorepo structure (npm workspaces)

```
packages/
  ferret-app/          React renderer (rsbuild, Redux Toolkit, styled-components)   [name @useferret/app]
  ferret-electron/     Electron main process (electron-builder)                     [name "ferret" — NOT scoped]
  ferret-js/           JS sandbox for user scripts (QuickJS + node:vm)
  ferret-common/       Shared utilities — the base leaf (rollup → dist/cjs+esm)
  ferret-converters/   Import/export (Postman, Insomnia, OpenAPI, …) (rollup)
  ferret-requests/     Shared HTTP/gRPC/WS request building blocks (rollup)
  ferret-filestore/    .fer/.yml serialization (rollup + tsc --emitDeclarationOnly)
  ferret-sqlite/       Local SQLite SDK — main-process only (codegen + rollup)
  ferret-query/        JSONPath-style query engine (rollup)
  ferret-lang/         Fer DSL grammars — v1 (arcsecond, legacy) + v2 (ohm-js, current)
  ferret-schema/       Yup runtime validation of collections/requests
  ferret-schema-types/ TypeScript type definitions only (tsc, types-only)
  ferret-graphql-docs/ GraphQL documentation generator (rollup)
  ferret-toml/         Thin wrapper over @iarna/toml (orphaned — on no live data path)
  ferret-cli/          Command-line runner (run straight from src/)
  ferret-tests/        Test servers (express: HTTP/HTTPS/proxy/GraphQL)
  ferret-docs/         @useferret/docs — placeholder stub (only package.json + readme, no src/)
tests/                Playwright e2e tests
playwright/           Test fixtures and helpers (index.ts)
```

Build tool per package (matters for the "rebuild shared packages" step in `.claude/CLAUDE.md`):
- **rollup** (emits `dist/cjs` + `dist/esm`): ferret-common, ferret-converters, ferret-requests,
  ferret-query, ferret-graphql-docs; **ferret-filestore** additionally runs `tsc --emitDeclarationOnly`;
  **ferret-sqlite** additionally runs a codegen prepass (`npm run generate`) that compiles
  `migrations/*.ts` + `statements/*.sql` into the gitignored `src/generated/`.
- **tsc only**: ferret-schema-types.
- **rsbuild**: ferret-app.
- **no build step (consumed straight from `src/`)**: ferret-js, ferret-lang, ferret-schema,
  ferret-toml, ferret-cli, ferret-electron, ferret-tests, ferret-docs.

The 8 packages that must be rebuilt after editing (they emit `dist/`): ferret-common,
ferret-requests, ferret-filestore, ferret-sqlite, ferret-converters, ferret-query, ferret-graphql-docs,
ferret-schema-types. Editing ferret-js / ferret-lang / ferret-schema / ferret-toml needs no rebuild.

## Dependency direction & ownership boundaries

The internal `@useferret/*` dependency DAG and the guardrails that protect it (ferret-common
browser-safe, ferret-js Electron-free, schema vs schema-types, no upward imports) are the
auto-loaded rule — see `.claude/rules/architecture.md`.

## Request execution pipeline

1. Renderer invokes `ipcMain.handle('send-http-request', …)` (`ferret-electron/src/ipc/network/index.js`).
2. Variables are interpolated via `interpolate` from `@useferret/common`
   (`ipc/network/interpolate-vars.js`).
3. Pre-request scripts run via `ScriptRuntime` (`ferret-js/src/runtime/script-runtime.js`).
4. The request is built/sent — axios for HTTP, plus gRPC (`@grpc/grpc-js`) and WebSocket clients;
   shared building blocks (auth interceptors like `addDigestInterceptor`/`applyOAuth1ToRequest`,
   cookies, `scripting.buildScriptedEntry`, grpc/ws helpers) come from `@useferret/requests`.
   ferret-requests is a *library of request pieces*, not the orchestrator — orchestration lives in
   `ipc/network`.
5. Post-response: **var extraction** via `VarsRuntime`, **tests** via `TestRuntime`, and
   **assertions** via `AssertRuntime` (all in `ferret-js/src/runtime/`) — these are distinct
   runtimes, not `ScriptRuntime`.
6. Result is returned to the renderer as a data object with an `error` field on failure (the
   handler does not reject — see `.claude/rules/electron-ipc.md` error convention).

## Script sandboxing (`ferret-js`)

- **QuickJS** (default / "safe" mode): WebAssembly sandbox via `quickjs-emscripten`
  (`src/sandbox/quickjs/`).
- **Node VM** ("developer" mode): `node:vm` `runInContext` (`src/sandbox/node-vm/`).
- Runtime selection is centralized: `getJsSandboxRuntime` maps
  `collection.securityConfig.jsSandboxMode` (`'safe'` default → `SANDBOX.QUICKJS`; `'developer'`
  → `SANDBOX.NODEVM`) — see `ferret-js/src/utils/sandbox.js` and `ipc/network/index.js`. Route new
  sandbox-mode logic through `getJsSandboxRuntime`; do not re-derive the mapping.
- Scripts get a `fer`, `req`, `res` (post-response only), `test`, `expect` (chai), `assert`
  (chai), and `console` context (`script-runtime.js`).

## File format system

- `ferret-filestore` is the central parse/serialize entry (`src/index.ts`), delegating to
  `formats/fer` and `formats/yml`.
- Two on-disk formats: **`.fer`** (Fer DSL) and **`.yml`** (OpenCollection YAML). New collections
  default to **`.yml`** (`DEFAULT_COLLECTION_FORMAT = 'yml'`).
- The current `.fer` grammar is **v2 (ohm-js)** (`ferret-lang/v2/src/`, used by filestore via
  `ferToJsonV2`/`jsonToFerV2`). **v1 (arcsecond)** (`ferret-lang/v1/src/`) is legacy.
- Collections live on the filesystem and are watched by chokidar.

Any on-disk shape change → follow `.claude/rules/dsl-changes.md`.

## Local persistence (not collection files)

Two distinct mechanisms — pick by what the data is:

- **`@useferret/sqlite`** (`ferret.db` under `userData`) — the SDK for derived/bulky secondary state.
  Migrations (`migrations/*.ts`) and statements (`statements/*.sql`) are authored and compiled into
  a typed layer for the main process. `services/sqlite` owns the DB, and `ipc/sqlite.js` exposes
  selected statements to the renderer, one hand-written handler per statement on
  `datastore:<statement_file>:<statement_name>`. Full guide: `.claude/rules/sqlite.md`.
- **electron-store JSON** (`ferret-electron/src/store/`) — preferences and small keyed app state;
  see `.claude/rules/electron-ipc.md`.

## Redux store (app side)

The authoritative slice list is the `reducer` map in
`ferret-app/src/providers/ReduxStore/index.js` (~11 slices; `collections/` is by far the largest).
Conventions, middleware, and side-effect boundaries: `.claude/rules/redux-store.md`.

## Providers (`ferret-app/src/providers/`)

Read the directory for the current set: `App/`, `ReduxStore/`, `Theme/`, `Hotkeys/`, `Toaster/`,
`PromptVariables/`.

## Key types (`ferret-schema-types`)

Core types live in `packages/ferret-schema-types/src/` — read them for the current shapes. The
top-level request is a union: `Request = HttpRequest | GrpcRequest | WebSocketRequest`
(`requests/index.ts`); code that handles "a request" must account for all three. Other central
types: `Collection` (`collection/collection.ts`), `Item` (request or folder, discriminated by
`type`, `collection/item.ts`), `Auth` (a `mode` union, `common/auth.ts`), `KeyValue` (headers /
params / assertions, `common/key-value.ts`), `Environment`, `Script`.

## Key dependencies (actual majors — verify in the relevant `package.json` before assuming)

Several are pinned to majors below the latest — do **not** assume the newest API:

- Frontend (`ferret-app`): **react 19**, **@reduxjs/toolkit ^1.8 (v1, NOT v2)**,
  **react-redux ^7 (v7)**, **styled-components ^5 (NOT v6)**, **tailwindcss ^3**,
  **@rsbuild/core ^1.1**, **codemirror 5.65.2 (CodeMirror 5, NOT the scoped `@codemirror/*`)**.
- Desktop (`ferret-electron`): **electron ~37.6**, **electron-builder 24.13.3**, **chokidar ^3.5**,
  **@grpc/grpc-js ^1.13**, **js-yaml ^4.1**, **electron-store ^8.1**. (`ws` is a dep of
  ferret-requests/ferret-tests, **not** ferret-electron.)
- Storage (`ferret-sqlite`): no runtime dependencies — the driver is Node's built-in **`node:sqlite`**
  (synchronous `DatabaseSync`); **tsx** is build-time (codegen) only.
- Parsing (`ferret-lang`): **arcsecond ^5** (v1, legacy), **ohm-js ^16.6** (v2, current).
  `ferret-toml` wraps **@iarna/toml** but is currently unused.
- **Hard pins in root `package.json` `overrides`: axios `1.16.0`, rollup `3.30.0`.** Bumping these
  in a leaf package has no effect — change the root override.
- **TypeScript is not uniform**: ferret-common `^5.8`, ferret-schema-types `^5.0`, but
  ferret-converters/filestore/graphql-docs/query/requests are `^4.8`. There is no root TS dep.
