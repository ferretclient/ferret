cask "ferret" do
  arch arm: "arm64", intel: "x64"

  version "0.2.0"
  sha256 arm:   "0000000000000000000000000000000000000000000000000000000000000000",
         intel: "0000000000000000000000000000000000000000000000000000000000000000"

  url "https://github.com/ferretclient/ferret/releases/download/v#{version}/ferret_#{version}_#{arch}_mac.dmg"
  name "Ferret"
  desc "Offline API client for exploring and testing APIs"
  homepage "https://github.com/ferretclient/ferret"

  livecheck do
    url :url
    strategy :git
  end

  depends_on macos: ">= :big_sur"

  app "Ferret.app"

  zap trash: [
    "~/Library/Application Support/ferret",
    "~/Library/Preferences/io.github.ferretclient.ferret.plist",
    "~/Library/Saved Application State/io.github.ferretclient.ferret.savedState",
  ]

  caveats <<~EOS
    Ferret is not signed or notarized yet, so macOS may refuse to open it the first time.
    Either right-click the app and choose Open, or run:
      xattr -dr com.apple.quarantine /Applications/Ferret.app
  EOS
end
