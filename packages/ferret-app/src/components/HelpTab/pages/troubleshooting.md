## Troubleshooting

### A request fails with a certificate error

The server uses a certificate your computer does not trust, for example a self-signed one on a test server. The safest fix is to add the certificate authority under **Preferences → General → Certificates → Use Custom CA Certificate**. For a server you trust and control, you can turn off **SSL/TLS Certificate Verification** in the same place. Turning it off applies to every request, so turn it back on afterwards.

### A request never gets through, or times out

- Check the URL, including `http://` or `https://`.
- Raise **Request Timeout (ms)** under **Preferences → General → Requests** if the server is just slow.
- If your network needs a proxy, set it in **Preferences → Proxy**. The default can follow the system's settings.
- Open **Timeline** in the response pane to see exactly what was sent and where it stopped.

### `{{name}}` is not replaced

- Choose an environment in the picker at the top right. Without one, only collection, folder and request variables exist.
- Check the spelling and capital letters.
- A variable higher in the priority list may be overriding the value you expect. See *Variables and environments*.
- Secret values live on the environment's **Secrets** tab. They resolve the same way as other variables.

### My script does nothing, or cannot find a package

Scripts run in Safe Mode by default. It blocks files and npm packages. If you trust the collection, switch it to **Developer Mode** in **Collection Settings → Security**. Errors from a script appear in the response pane and in **Dev Tools**.

### A tab says "Something went wrong"

Close the tab and reopen the request. If the same request fails again, its file may be damaged; open it in a text editor from **Reveal in File Explorer**. **Dev Tools** in the status bar shows the underlying error.

### I lost a request I did not save

Everything you send is in **History** in the sidebar, and unsaved changes in a tab are kept until you close it. Turn on **Auto Save** in **Preferences → General** to stop it happening.

### Windows says "Windows protected your PC", or macOS will not open Ferret

The installers are not signed yet. On Windows choose **More info → Run anyway**. On a Mac, right-click the app and choose **Open**. Linux needs no extra step beyond making an AppImage executable.

### Still stuck?

Report it in the project's issue tracker (**Preferences → Support → Report Issues**), with what you did, what you expected and what happened.
