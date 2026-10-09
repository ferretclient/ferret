## Scripts, assertions and tests

Ferret can check responses for you and run small JavaScript snippets around a request. Everything below lives in the request's tabs. The less common ones are behind the **»** button.

| Tab | Runs | Use it to |
| --- | --- | --- |
| **Assert** | after the response | check things without code, for example `res.status` **equals** `200` |
| **Script** tab, **Pre Request** | before sending | set headers, build a body, set variables |
| **Script** tab, **Post Response** | after the response | save a value from the response into a variable |
| **Tests** | after the response | write checks with `test()` and `expect()` |

### Your first check

The easiest check needs no code. Open **Assert**. In the first empty row type `res.status` under **Expr**, keep the operator **equals** and type `200` under **Value**, then send the request. Open **Tests** in the response pane (behind **»**) to see it pass or fail.

### Your first test

Open the request's **Tests** tab and write:

```javascript
test('the request succeeds', () => {
  expect(res.getStatus()).to.equal(200);
});
```

Send the request. The result appears in the response pane under **Tests**. You can read the body with `res.body` or `res.getBody()`, headers with `res.getHeader('content-type')` and the time with `res.getResponseTime()`.

### Pass a value to the next request

Log in once and reuse the token:

1. In the login request, open the **Script** tab, choose **Post Response** and write:

   ```javascript
   fer.setVar('token', res.body.token);
   ```

2. In another request, open **Headers** and add `Authorization` with the value `Bearer {{token}}`.

`fer.setVar` creates a **runtime** variable. It lives while the app is running and beats every other level, as the variables page explains. Use `fer.getVar('token')` to read it back in a script.

### Changing the request from a script

In a **Pre Request** script, `req` is the request that is about to be sent:

```javascript
req.setHeader('X-Request-Time', new Date().toISOString());
```

Pre-request scripts run from the collection, then the folder, then the request, so shared setup can live in the collection's **Script** tab.

### Safe Mode and Developer Mode

Scripts run in a sealed sandbox by default (**Safe Mode**). They cannot read your files or load npm packages, so a collection you downloaded cannot harm your computer. **Developer Mode** lets scripts use Node and packages installed in the collection folder; turn it on only for collections you wrote or trust. The shield icon at the top right shows the current mode and opens the collection's security settings.

### Coming from Bruno?

The scripting object is called `fer` instead of `bru`. Importing a Bruno collection rewrites it for you.
