# Homebrew tap for Ferret

Install Ferret on macOS with Homebrew:

```bash
brew install --cask jakahann/tap/ferret-app
```

This is the same as `brew tap jakahann/tap` followed by `brew install --cask ferret-app`. To update, run `brew upgrade --cask ferret-app`.

Ferret is not signed or notarized yet. If macOS refuses to open it, right-click the app and choose **Open**, or run `xattr -dr com.apple.quarantine /Applications/Ferret.app`.

## For maintainers

This folder is the starting point for the tap repository, `jakahann/homebrew-tap` (Homebrew requires the `homebrew-` prefix). `Casks/ferret-app.rb` here has placeholder checksums. After each release, regenerate it from the release's `SHA256SUMS.txt`:

```bash
node scripts/render-package-manifests.js <version> SHA256SUMS.txt
cp dist/packaging/homebrew/ferret-app.rb <tap checkout>/Casks/ferret-app.rb
```

Commit it to the tap and run `brew install --cask jakahann/tap/ferret-app` on a Mac to test. Copy this file to the tap as its `README.md` as well.
