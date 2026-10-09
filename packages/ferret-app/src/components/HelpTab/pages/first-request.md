## Your first request

This walks you through creating a collection, adding a request, sending it and reading the response. You need nothing but a URL to call. The example uses `https://httpbin.org/get`, a public test service, but any API works.

### 1. Create a collection

1. In the sidebar, open the **+** menu next to **Collections** and choose **Create collection**. (You can also click **Create Collection** on the home screen.)
2. Type a name, for example *Pet Store*.
3. Click the small **gear** next to the name to choose where it is stored. Use **Browse** to pick a folder, then press **Create**. If you set a **Default Location** in **Preferences → General**, Ferret stores new collections there, so you only need to confirm the name.

The collection appears in the sidebar and opens its overview.

### 2. Add a request

1. Hover over the collection and click the **…** menu, then choose **New Request** (or press **Ctrl+N**). The **+ Add request** link under an empty collection does the same.
2. Leave the type as **HTTP**. The other types are GraphQL, gRPC, WebSocket and **From cURL**, which turns a copied `curl` command into a request.
3. Give it a **Request Name**, for example *Get pets*.
4. Choose the method (GET is the default) and type the URL: `https://httpbin.org/get`.
5. Press **Create**.

The request opens in a tab.

### 3. Send it

Press the green **Send** button, or **Ctrl+Enter**. The response appears on the right with its **status** (for example `200 OK`), the **time** it took and its **size**.

### 4. Read the response

- **Response** shows the body. The dropdown above it (for example *JSON* or *HTML*) changes how the body is displayed, including a preview.
- **Headers** shows the headers the server sent back.
- The **»** button reveals **Timeline**, which lists everything that was sent and received, and **Tests**, which shows test results.
- The **…** menu at the top right of the response has actions such as copying it, downloading it and clearing it.

### 5. Shape the request

Use the tabs on the left half:

| Tab | What it is for |
| --- | --- |
| **Params** | Query parameters (`?page=2`) as a table. Editing the table edits the URL, and the other way round. Path parameters such as `/pets/:id` get their own table. |
| **Body** | The data you send with POST, PUT and PATCH. Choose JSON, form data, raw text and others. |
| **Headers** | Extra headers such as `Accept` or `X-Api-Key`. |
| **Auth** | Bearer token, Basic, API key, OAuth 2.0 and more. *Inherit* uses the setting from the folder or collection. |

Try it: open **Params**, add the name `page` and the value `2`, and watch the URL change to `…/get?page=2`. Send it again.

### 6. Save it

Press **Ctrl+S** or the save icon at the right of the URL bar. Saving writes the request to a file in your collection. Turn on **Enable Auto Save** in **Preferences → General** if you would rather not think about it.

### Handy extras

- The **</>** icon next to the URL generates code for the request (curl, JavaScript, Python and more).
- Everything you send is recorded in the **History** section of the sidebar, so you can find it again.

### Next

The URL above is typed in full. The next page shows how to keep the base URL in one place, so you can point the same requests at a local, staging or production server.
