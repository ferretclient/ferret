; Keep the Windows installer sharp on high-DPI displays instead of letting
; Windows bitmap-scale the full NSIS UI.
ManifestDPIAware true

; Ask before deleting the data Ferret keeps in %APPDATA%\ferret (default workspace, collections, environments,
; cookies, history and settings). Updates reuse this uninstaller, so they never ask, and a silent uninstall
; (/S, as winget does) keeps the data. Collections saved in folders chosen by the user are never touched.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "Also delete your Ferret data?$\r$\n$\r$\nThis removes your default workspace, collections, environments, cookies, history and settings stored in:$\r$\n$APPDATA\ferret$\r$\n$\r$\nCollections you saved in other folders are not touched. Choose No to keep everything." /SD IDNO IDNO keepFerretData
      RMDir /r "$APPDATA\ferret"
    keepFerretData:
  ${endIf}
!macroend
