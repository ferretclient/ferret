# ferret-tests

A test server and a test collection. The server backs the Ferret CLI tests and the end-to-end (Playwright) tests, so they run without internet access.

## Test server

```bash
npm start --workspace=packages/ferret-tests      # from the repository root
```

It listens on port `8081` (override with the `PORT` environment variable) and exposes the endpoints the tests call:

| Path | What it does |
| --- | --- |
| `/ping`, `/headers`, `/query`, `/redirect-to-ping` | small fixtures |
| `/api/echo/*`, `/api/auth/*`, `/api/multipart/*`, `/api/redirect/*`, `/api/sse/*`, ... | feature-specific routes, plus GraphQL, gRPC and WebSocket servers |
| `/echo` and anything under it | answers any method with the request it received (method, URL, query, headers, body); used by fixtures that only need "a URL that responds" |

The end-to-end suite starts this server for you; start it yourself when running a collection by hand.

## Run the Ferret CLI against the test collection

```bash
cd packages/ferret-tests/collection

# run the collection against the local server
node ../../ferret-cli/bin/fer.js run --env Local --output junit.xml --format junit
```

## License

[MIT](../../license.md)
