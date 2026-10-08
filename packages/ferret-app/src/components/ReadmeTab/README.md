## Ferret

Ferret is an offline API client. It sends the requests you write to the addresses you give it, and nothing else: there is no account, no cloud sync, no telemetry and no background calls to any server.

---

### Collections live on your disk

A collection is a folder. Every request is a plain-text file inside it, so you can version, diff and review collections with Git or any other tool.

* **`.yml`** — OpenCollection YAML, the default for new collections.
* **`.fer`** — the Fer markup format.
* **`opencollection.yml`** / **`ferret.json`** — collection-level settings.

Folders in the collection become folders in the sidebar. Collection and folder settings (headers, auth, variables, scripts) are inherited by the requests below them.

### Environments and variables

Environments hold the values that change between targets, such as base URLs and tokens. Reference any variable as `{{name}}` in URLs, headers, bodies and auth fields.

Variables can be defined at the request, folder, collection, environment and global-environment level. Environment values marked as secret are encrypted on this machine and never written into collection files.

### Scripting and tests

Each request, folder and collection can run JavaScript before the request is sent and after the response arrives. Scripts get:

* `req` — the outgoing request, editable in pre-request scripts.
* `res` — the response, in post-response scripts and tests.
* `fer` — helpers such as `fer.getEnvVar()`, `fer.setEnvVar()`, `fer.getVar()`, `fer.setVar()`, `fer.setNextRequest()` and `fer.sleep()`.
* `test()` and `expect()` — write assertions that show up in the Tests tab and in runner results.

```javascript
test('returns the created user', () => {
  expect(res.status).to.equal(201);
  fer.setVar('userId', res.body.id);
});
```

Scripts run in Safe Mode by default, a sandbox with no access to your file system outside the collection. Developer Mode can be enabled per collection when a script needs Node.js modules.

### Running collections

The collection runner sends every request in a collection or folder in order and reports the results of tests and assertions.

The same collections run from the command line with the Ferret CLI, for CI pipelines:

```bash
# Run the collection in the current directory
fer run --env Local

# Run one folder and write a self-contained HTML report
fer run users --env Local --reporter-html results.html
```

### Importing

Collections can be imported from Postman, Insomnia, OpenAPI, WSDL and OpenCollection files.

Coming from Bruno? Import a Bruno collection folder, zip or JSON export and it is converted to Ferret: `bruno.json` becomes `ferret.json`, `.bru` files become `.fer`, and scripts using `bru.*` are rewritten to `fer.*`. The original Bruno folder is never modified.

### Privacy

Ferret only connects to:

* the hosts in the requests you send,
* proxies you configure,
* Git remotes you configure, when you use Git features.
