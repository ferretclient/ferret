---
paths:
  - "packages/**/*"
---

# Dependency Boundaries

Internal `@useferret/*` dependencies (from each `package.json`) form a strict DAG. **New code must
respect it** — a cyclic or upward dependency is an architectural bug, not a convenience.

The full monorepo map (build tools, request pipeline, sandbox, file formats, core data-model
types, dependency versions) is the on-demand reference `.claude/reference/architecture.md` — read
it before non-trivial cross-package or architectural work.

## Dependency direction & ownership boundaries

- **Leaf libs — zero internal `@useferret/*` deps:** ferret-common, ferret-lang, ferret-query,
  ferret-requests, ferret-graphql-docs, ferret-schema, ferret-schema-types, ferret-toml, ferret-sqlite
  (a leaf, but *not* platform-neutral — see guardrail 6).
- **Mid consumers:** ferret-js → (common, query); ferret-converters → (common, schema; schema-types
  as devDep); ferret-filestore → (common, lang; schema-types as devDep).
- **Top consumers (things flow *into* them, never out):** ferret-cli → (common, converters,
  filestore, js, lang, requests); ferret-electron → (common, converters, filestore, js, lang,
  requests, schema, sqlite); ferret-app → (common, converters, graphql-docs, schema).

Guardrails this enforces:

1. **ferret-common is the browser-safe base leaf.** It runs in the web renderer (`ferret-app`), not
   just Node, so it must stay platform-neutral: no Node built-ins (`fs`, `path`, `os`, `crypto`,
   `child_process`, `node:*`) and no dependency that itself pulls in Node. It currently ships with
   zero runtime dependencies — keep it that way. It also depends on no other `@useferret/*` package;
   a util that needs Node or another ferret package belongs in a different package.
2. **No shared/library package may import ferret-app or ferret-electron.** Renderer- or
   Electron-specific code must not be pushed down into a lib to make it importable upward.
3. **ferret-js must stay Electron-free.** It runs in both the Electron main process *and* the CLI
   (ferret-cli → js). Adding an `electron`/IPC import to ferret-js breaks the CLI. Sandbox logic
   belongs in ferret-js; host wiring belongs in ferret-electron.
4. **ferret-schema-types is types-only** (a *devDependency* of converters/filestore, built with
   plain `tsc`). Import types from it; never add runtime code or a runtime import of it.
5. **ferret-schema (Yup) and ferret-schema-types (TS types) are distinct and both live.** app +
   converters use `@useferret/schema` for runtime validation; filestore + converters use
   `@useferret/schema-types` for compile-time types. A data-model change usually touches both.
6. **ferret-sqlite is main-process only.** `@useferret/sqlite` (= `/node`) imports `node:sqlite`,
   `node:fs` and `node:crypto`; importing it from the renderer breaks the bundle. The renderer
   reaches statements only through the per-statement IPC handlers in ferret-electron. See
   `.claude/rules/sqlite.md`.

## Declared dependencies must match real imports

A package's `package.json` is the contract; workspace hoisting hides breaches of it. Declare every
import in the manifest of the package that imports it — one resolving only because a sibling or the
root happens to pull it in is a latent break. Test- and build-only packages belong in
`devDependencies`; anything in `dependencies` ships to users with its transitive tree. Drop a
declaration when the change removes its last consumer.
