# Changelog

All notable changes to Ferret are listed here. The format follows [Keep a Changelog](https://keepachangelog.com), and versions follow [semantic versioning](https://semver.org). Versions below 1.0 are pre-releases.

## [0.2.1] - 2026-10-13

### Added

- **Allow beta updates** in the Check for updates dialog. Ferret offers only official versions by default; tick the box to be offered release candidates (such as 0.3.0-rc.1) too. The choice is remembered, and nothing is sent until you confirm a check.

### Changed

- Updated `form-data` to 4.0.6 and removed the unused `multer` dependency.
- The "This is a pre-release" note in the update dialog now appears only for release candidates, not for every 0.x release.

## [0.2.0] - 2026-10-12

Ferret started as a fork of [Bruno](https://github.com/usebruno/bruno) and is a fully local, offline API client. This is the first version meant for other people.

### Added

- **Options variables**: a variable with named choices. The request sends the value of the chosen option. They work on requests, folders, collections and environments, in `.fer` and `.yml` files and in `fer run`. The choice can be made right under the URL bar.
- **Request history** with its own view.
- **Import from Bruno**: single collections, zips, exports, a folder of collections and a whole workspace.
- **Help pages** inside the app, including a first-request walkthrough.
- **Sidebar sections** can be reordered by dragging and hidden in Preferences → Display.
- **Check for updates** in Preferences → Support. Nothing happens in the background: you confirm the check, then choose to download, then choose to install. The installer is fetched from this repository's releases and compared with the SHA-256 checksum published with the release before it can be started. Windows runs the installer and closes Ferret, macOS opens the disk image, and Linux shows the AppImage in its folder. The installers are not signed yet, so Windows and macOS still show their usual warning.
- **Third-party notices** in Preferences → Support → Legal, shipped with every installer.
- Teal and azure default themes.
- An **Islands** layout. In Preferences → Themes → Layout you can put the sidebar, the editor and the console on separate rounded surfaces with a thin gap between them. In Islands the sidebar gets an activity rail: one icon per view (Collections, History, API Specs, Mock Servers) that shows that view alone, and choosing the active icon again collapses the pane to just the rail. Drag the icons (or press Alt+Up/Down on one) to rearrange them, and use the dots button at the bottom to choose which views are shown. Classic panes stay the default.
- The Windows uninstaller asks whether to delete Ferret's data (default workspace, collections, settings). Silent uninstalls and updates keep it.

### Changed

- The command-line tool is `fer`, and collections use the `.fer` file extension.
- The npm package is named `ferret-app` and the Docker image `ghcr.io/ferretclient/ferret`.

### Not yet available

- Installers are not signed or notarized, so Windows and macOS show a warning on first start.
- The npm package, Docker image, Homebrew cask and winget package are planned but not published.
