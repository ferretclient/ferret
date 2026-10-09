# Request history

Ferret remembers the requests you send so you can look back at what went out and what came back, even after restarting the app.

History lives only on your computer, in Ferret's local database. Nothing is uploaded.

## Using it

Open the **History** section in the sidebar.

- Entries are listed newest first, grouped under *Today*, *Yesterday* and dates.
- **Search** matches the URL, request name, method, collection name and status code.
- Click an entry to see its **request** and **response** (headers and body) in a dialog.
- **Open request** jumps to the saved request the entry came from, when its collection is open and the request still exists.
- **Delete entry** removes one entry. The trash icon in the section header clears all history after asking you to confirm.

## What is recorded

Every request you send with the **Send** button, including failures that never reached a server (shown as *Failed* with the error). The following are not recorded:

- requests sent by the collection runner or the CLI,
- gRPC and WebSocket sessions (only HTTP and GraphQL requests are recorded),
- requests a script sends with `fer.sendRequest` or `fer.runRequest`,
- requests you cancel.

The URL shown is the **resolved** one, with variables filled in.

## Privacy

- **Credentials are masked before anything is saved.** The values of sensitive headers (`Authorization`, `Cookie`, `Set-Cookie`, API keys, tokens, secrets, passwords…) and of sensitive query parameters (`api_key`, `access_token`, `password`…) are replaced with `<redacted>`.
- Request and response **bodies are saved as sent and received**, so a password inside a JSON body is kept. If that matters, turn bodies off (below).
- Bodies larger than 1 MB are cut at 1 MB and marked as truncated.

## Settings

**Preferences → General → History**:

| Setting | Default | Effect |
| --- | --- | --- |
| Save request history | on | turn it off to stop recording (existing entries stay until you clear them) |
| Include request and response bodies | on | turn it off to keep only the request line, headers, status and timing |

History is limited automatically to the **last 1,000 requests** and **30 days**; older entries are removed as new ones are saved.

## Where it is stored

In `ferret.db` inside Ferret's data folder (see [Getting started](getting-started.md#3-run-the-app)). The database is disposable: if it ever has to be rebuilt, history starts empty and nothing you authored is affected.
