## Collections, folders and the runner

### Organize with folders

Open a collection's **…** menu and choose **New Folder** to group related requests, for example *Auth*, *Users* and *Orders*. Drag requests and folders in the sidebar to reorder or move them. Folders can contain folders.

The same **…** menu has the other actions you will use:

| Action | What it does |
| --- | --- |
| **Clone** (Ctrl+D), **Rename** (Ctrl+R) | Copy or rename the collection, folder or request you selected. |
| **Share** | Export the collection so someone else can import it. |
| **Reveal in File Explorer** | Shows the collection's files on disk. |
| **Open in Terminal** (Ctrl+T) | Opens a terminal in the collection's folder. |
| **Settings** | Collection-wide settings, described below. |
| **Remove** | Takes the collection out of Ferret. The files on disk are not deleted. |

### Settings shared by all requests

Collections and folders have their own settings tabs for **Headers**, **Vars**, **Auth**, **Script** and **Tests**. Anything you set there applies to every request inside, so you do not repeat it. A request's **Auth** tab set to *Inherit* uses the nearest folder or collection setting. A request can still override any of it.

This is the place for a shared `Authorization` header, a collection-wide token script, or a base URL variable.

### Run a whole collection

The runner sends every request in order and shows the result of each one, with its assertions and tests.

1. Open a collection's **…** menu and choose **Run** (or click the running figure at the top of the window).
2. Tick the requests to include and drag them to change their order, then press **Run**.
3. Watch the results appear. Failed assertions and tests are marked for each request.

Scripts can steer a run: `fer.setNextRequest('Name')` jumps to a request, `fer.skipRequest()` skips one, and `fer.stopExecution()` ends the run.

### Run it without the app

The `fer` command-line tool runs the same collections from a terminal or a CI server, with reports in JSON, JUnit or HTML:

```bash
fer run --env Local
fer run --env Local --reporter-junit results.xml
```

It is part of the Ferret source repository. See `docs/cli.md` there for every option.

### Document your collection

The **Docs** tab on a request, folder or collection holds notes written in Markdown. They are saved with the collection, so your team sees them too.

### Keep it in Git

Because a collection is just a folder of text files, you can commit it like code. Secret environment values are not stored in those files, so they are safe to commit.
