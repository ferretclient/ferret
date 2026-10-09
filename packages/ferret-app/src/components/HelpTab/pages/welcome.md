## Welcome to Ferret

Ferret is a desktop app for sending requests to APIs, checking what comes back, and writing tests for it. Everything you create is stored as ordinary files on your computer, so you can keep it in Git, back it up, or edit it in any text editor.

Ferret works offline. It never creates an account, never syncs to a server and never sends your data anywhere. The only network traffic is the requests you send, plus an update check that happens only if you ask for it.

### How things are organized

| Level | What it is |
| --- | --- |
| **Workspace** | A group of collections, shown in the menu at the top left. Most people use the one called *My Workspace*. |
| **Collection** | A folder on disk that holds related requests, environments and settings, for example one API. |
| **Folder** | A sub-folder inside a collection to group requests. |
| **Request** | One call to an API: a method, a URL, and optional headers, body, auth, scripts and tests. |

A collection is just a folder. Open a collection's **…** menu in the sidebar and choose **Reveal in File Explorer** (Finder on a Mac) to see its files. New collections use the open OpenCollection YAML format (`.yml` files); you can choose Ferret's `.fer` format under **Options** when you create one.

### A tour of the window

| Area | What you do there |
| --- | --- |
| **Sidebar** (left) | Your collections, plus API Specs, Mock Servers and History. Drag a section's header to reorder the sections, or hide the ones you do not use in **Preferences → Display**. |
| **Tabs** (top) | Every open request is a tab. Italic tabs are previews; they become permanent when you edit them. |
| **Request pane** (left half) | The method and URL bar with the **Send** button, and the tabs **Params, Body, Headers, Auth, Vars, Script, Assert, Tests, Docs, Settings**. The less common tabs sit behind the **»** button. |
| **Response pane** (right half) | The **Response** body, **Headers**, **Timeline** and **Tests**, with the status, time and size at the top. |
| **Environment picker** (top right) | Shows *No Environment* until you choose one. Environments hold values such as a base URL. |
| **Status bar** (bottom) | **Preferences** (gear), themes, **Search**, **Cookies**, **Dev Tools** and the app version. |

### What Ferret connects to

- The hosts in the requests you send.
- Proxies you configure.
- Git remotes, only when you use the Git features.
- GitHub, once, only if you press **Check for updates** and confirm the dialog.

Nothing else. There is no telemetry, no account and no cloud sync.

### Where to go next

The pages on the left are in a good reading order. If you only read one, read **Your first request**: it takes about five minutes.
