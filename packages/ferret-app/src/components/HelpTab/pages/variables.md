## Variables and environments

A **variable** is a name you can use instead of a value. Write it as `{{name}}` in a URL, header, body or auth field, and Ferret replaces it with the real value when the request is sent. An **environment** is a named set of variables, such as *Local*, *Staging* and *Production*, that you switch between without editing any request.

### Try it: keep the base URL in one place

1. Click the environment picker at the top right (it says *No Environment*). On the **Collection** tab choose **Create**.
2. Name the environment *Local* and press Enter. The **Environments** tab opens and *Local* is selected for you.
3. On its **Variables** tab, add a variable: name `baseUrl`, value `https://httpbin.org`, then press **Save**.
4. In your request, change the URL to `{{baseUrl}}/get` and press **Send**.

To point the same requests at another server, create a second environment with a different `baseUrl` and switch to it. No request changes. Press **Ctrl+E** to open the environment editor at any time.

### Secrets

Put sensitive values such as an API key on the environment's **Secrets** tab instead of **Variables**. Their values are encrypted on your computer and are never written into the collection files, so you can keep the collection in Git without leaking them. You use them in requests exactly like other variables, with `{{name}}`.

### Where variables can live

If the same name is defined in more than one place, the one highest in this list wins.

| Priority | Level | Where you set it |
| --- | --- | --- |
| 1 (wins) | **Runtime** | Set by a script with `fer.setVar` while the app is running. |
| 2 | **Request** | The request's **Vars** tab. |
| 3 | **Folder** | The folder's settings. |
| 4 | **Environment** | The environment editor. |
| 5 | **Collection** | The collection's settings. |
| 6 | **Global** | The **Global** tab of the environment editor. Shared by every collection. |

### Choosing one of several values

Sometimes a setting has a few known values, for example several company IDs. Give the variable the **options** type and add name and value pairs such as `Company1 = 12345` and `Company2 = 43214`. The environment picks a default.

Each request can then choose its own: open the request's **Vars** tab and use the **Environment options** section at the top. The dropdown shows the names, and the request sends the matching value.

A request does not need an environment for this. In a request's **Vars** table, open the small type dropdown in a variable's value cell (hover the row if you do not see it) and choose **options**. Add the choices with **Add options**, then pick one from the dropdown. Folders and collections can do the same in their own **Vars** tab.

### When a variable does not resolve

If a request still shows `{{name}}` or the server complains about it:

- Make sure an environment is selected in the picker.
- Check the spelling. Names are case sensitive.
- Check the variable is enabled, and that something higher in the priority list is not overriding it.

### Next

Variables can also be set by scripts, which is how you pass a value from one request to the next. That is on the next page.
