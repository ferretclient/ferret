# Importing from Bruno

Ferret reads Bruno collections and converts them to its own format. You can keep using your Bruno files; the import never changes them.

## What you can import

| What you have | How |
| --- | --- |
| A Bruno **collection folder** (`.bru` files, or the YAML format), or a **folder that holds several collections** | *Import Collection* → **Import a Bruno folder** |
| A Bruno **workspace folder** (Bruno 3, the folder with a `workspace.yml`) | the workspace menu in the title bar → **Import workspace** → **Choose a Bruno workspace folder** |
| A **zip** of a Bruno collection | drop the zip into *Import Collection* |
| A Bruno **JSON export** | drop the `.json` file into *Import Collection* |
| Bruno **environment exports** | the environment import dialog |
| An **OpenAPI** file exported by Bruno | the normal OpenAPI import (request variants are kept) |

For a folder or zip, Ferret copies the collection into the location you choose and converts the copy. `.git` and `node_modules` are not copied; run `npm install` in the new folder if your scripts use npm packages.

## Importing a whole workspace

A Bruno workspace is a folder with a `workspace.yml`, a `collections/` folder and an `environments/` folder for global environments. Ferret uses the same layout, so the import keeps the workspace as it is:

- The folder is copied to the location you choose and converted there; the original is not changed.
- Every collection listed in `workspace.yml` is converted, and the workspace keeps its name and collection order.
- A collection stored **outside** the workspace folder is copied into `collections/` and its entry is pointed there, like Bruno's "Move into Workspace". The original stays where it was.
- Files in `environments/` are converted when they need it (YAML environments are already compatible).
- Anything that could not be imported, such as a listed collection whose folder is missing, is reported in a message and the rest still imports.
- The workspace opens and becomes the active one.

Bruno's own application data (preferences, cookies and stored secrets) is not part of a workspace folder and is not imported. The default workspace Bruno keeps in its application data folder can be imported once you copy it into a normal folder.

## What is converted

| Bruno | Ferret |
| --- | --- |
| `bruno.json` | `ferret.json` |
| `*.bru` request, folder, collection and environment files | `*.fer` (same structure) |
| `extensions.bruno` in an OpenCollection YAML file | `extensions.ferret` |
| `bru.setVar(...)`, `const { getVar } = bru`, `window.bru…` in scripts, tests, gRPC hooks and Collection Apps | the same code using `fer` |
| `bru.runRequest("folder/request.bru")` | `fer.runRequest("folder/request.fer")` |

The conversion changes only code. A `bru` that appears inside a string, a comment, a URL, a request body, a test name or documentation is left exactly as it is, so `"https://bru.example.com"` stays untouched.

YAML collections keep their formatting and comments: the file is edited, not rewritten.

## After importing

- Open the collection and run a request. If a script behaves differently, check it for `bru` used in a way the converter cannot see, such as building the name from strings (`global['b' + 'ru']`).
- **A whole folder at once.** Pick a folder that contains Bruno collections (for example the folder where you keep all of them) and Ferret finds every collection in it, up to four levels deep, and lists them before you confirm. All of them are converted into the location you choose, and a collection that fails to convert is reported without stopping the others. `node_modules`, `.git` and symlinks are skipped, and a collection inside another collection is not imported separately.
- Collections are independent copies. Changes you make in Ferret do not flow back to the Bruno folder.

## What is not included

- Importing from the command line (`fer import` supports OpenAPI and WSDL only).
- Exporting a Ferret collection back to Bruno's format.
- Anything that depended on Bruno's hosted features.
