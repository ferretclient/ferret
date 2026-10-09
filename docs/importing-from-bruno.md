# Importing from Bruno

Ferret reads Bruno collections and converts them to its own format. You can keep using your Bruno files; the import never changes them.

## What you can import

| What you have | How |
| --- | --- |
| A Bruno **collection folder** (`.bru` files, or the YAML format) | *Import Collection* → **Import a Bruno collection folder** |
| A **zip** of a Bruno collection | drop the zip into *Import Collection* |
| A Bruno **JSON export** | drop the `.json` file into *Import Collection* |
| Bruno **environment exports** | the environment import dialog |
| An **OpenAPI** file exported by Bruno | the normal OpenAPI import (request variants are kept) |

For a folder or zip, Ferret copies the collection into the location you choose and converts the copy. `.git` and `node_modules` are not copied; run `npm install` in the new folder if your scripts use npm packages.

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
- Collections are independent copies. Changes you make in Ferret do not flow back to the Bruno folder.

## What is not included

- Importing from the command line (`fer import` supports OpenAPI and WSDL only).
- Exporting a Ferret collection back to Bruno's format.
- Anything that depended on Bruno's hosted features.
