# ferret-electron

The Electron main process: windows, IPC, file watching, request execution and the local database.

```bash
npm run dev          # from the repository root: starts the UI and this app together
npm start --workspace=packages/ferret-electron   # Electron only, expects the UI dev server on FERRET_DEV_PORT (default 3000)
```

Installers are built from the repository root with `npm run dist`. Packaging and signing are described in [docs/releasing.md](../../docs/releasing.md); the configuration is `electron-builder-config.js`.
