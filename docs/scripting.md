# Scripting, tests and assertions

Every request, folder and collection can run JavaScript before a request is sent and after the response arrives, and can attach tests and assertions to the response.

## Where scripts live

| Editor | Runs | Typical use |
| --- | --- | --- |
| **Script → Pre Request** | before the request is sent | set headers, sign a request, build a body, set variables |
| **Script → Post Response** | after the response arrives | extract a token or ID into a variable |
| **Tests** | after the response arrives | `test()` / `expect()` checks, shown in the response's Tests tab |
| **Assert** | after the response arrives | no-code checks such as `res.status eq 200` |

gRPC requests have four hooks instead: before call start, before message send, after message receive, after call end (request level only).

### Order across levels

Pre-request scripts always run **collection → folder → request**. For post-response scripts and tests the order is a collection setting (`scripts.flow`):

- **sandwich** (default): request → folder → collection
- **sequential**: collection → folder → request

## What a script can use

- **`req`**, the outgoing request: `req.getUrl()`, `req.setUrl()`, `req.getMethod()`, `req.setMethod()`, `req.getHeader()`, `req.setHeader()`, `req.setHeaders()`, `req.deleteHeader()`, `req.getBody()`, `req.setBody()`, `req.setTimeout()`, `req.setMaxRedirects()` and more.
- **`res`**, the response (post-response scripts and tests): `res.getStatus()`, `res.getStatusText()`, `res.getHeader()`, `res.getHeaders()`, `res.getBody()` (also `res.body`), `res.getResponseTime()`, `res.getSize()`, `res.getUrl()`.
- **`fer`**, helpers:
  - variables: `fer.getVar` / `fer.setVar` / `fer.hasVar` / `fer.deleteVar` (runtime), `fer.getEnvVar` / `fer.setEnvVar` (environment), `fer.getCollectionVar` / `fer.setCollectionVar`, `fer.getFolderVar`, `fer.getRequestVar`, `fer.getGlobalEnvVar` / `fer.setGlobalEnvVar`, `fer.getProcessEnv`
  - flow control: `fer.setNextRequest("Name")`, `fer.skipRequest()`, `fer.stopExecution()`, `await fer.runRequest("folder/request.fer")`, `await fer.sleep(ms)`
  - other: `fer.interpolate("{{x}}")`, `fer.cookies`, `fer.sendRequest(...)`
- **`test(name, fn)`** and **`expect(...)`** (Chai) for assertions.

```javascript
// Collection → Script → Pre Request: log in once and reuse the token
if (!fer.getVar('token')) {
  const login = await fer.runRequest('auth/Login');
  fer.setVar('token', login.data.token);
}
req.setHeader('Authorization', `Bearer ${fer.getVar('token')}`);
```

```javascript
// Request → Script → Post Response
fer.setVar('userId', res.body.id);
```

```javascript
// Request → Tests
test('creates the user', () => {
  expect(res.getStatus()).to.equal(201);
  expect(res.body.email).to.be.a('string');
});
```

## Safe Mode and Developer Mode

Set per collection in **Collection Settings → Security**:

- **Safe Mode** (default): scripts run in a sealed QuickJS sandbox. They cannot read files outside the collection, cannot reach the network except through requests and `fer.sendRequest`, and cannot load npm packages. Use it for collections you did not write.
- **Developer Mode**: scripts run in Node's `vm`, can `require()` Node built-ins and packages installed in the collection folder (`npm install` there). Use it only for code you trust.

The CLI selects the mode with `--sandbox safe|developer`.

## Using packages and your own files

In Developer Mode a script can `require()` Node built-ins and npm packages installed in the collection folder (run `npm install` there). Safe Mode cannot load packages.

## Coming from Bruno?

Bruno scripts use a global called `bru`; Ferret's is `fer`. The Bruno importer rewrites it for you (see [Importing from Bruno](importing-from-bruno.md)), including `.bru` paths passed to `runRequest`.
