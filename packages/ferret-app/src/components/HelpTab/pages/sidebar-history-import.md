## Sidebar, history and importing

### Make the sidebar yours

- **Reorder the sections:** drag the header of Collections, API Specs, Mock Servers or History onto another header. With the keyboard, focus a section's icon and press **Alt+Up** or **Alt+Down**.
- **Hide the ones you do not use:** open **Preferences → Display → Sidebar sections** and turn off **Show API Specs**, **Show Mock Servers** or **Show History**. Hiding only removes the section from the sidebar. Everything it does keeps working.
- **Collapse the whole sidebar** with **Ctrl+\\**, and search it with **Ctrl+F**.
- **Search across your collections and requests** with **Ctrl+K** or the **Search** button in the status bar.

### Request history

Every request you send is recorded on your computer in the **History** section of the sidebar, with passwords and tokens masked. Search it, click an entry to inspect what was sent and received, and delete entries one by one or all at once (the bin icon on the section header).

In **Preferences → General → History** you can turn recording off entirely (**Save request history**) or keep only the requests without their bodies (**Include request and response bodies**). History is never uploaded.

### Importing

Press **Ctrl+O**, or choose **Import Collection** from the home screen or the sidebar's **+** menu. Ferret can import:

| From | What to give it |
| --- | --- |
| **Postman** | A collection export (`.json`). |
| **Insomnia** | An export file. |
| **OpenAPI / Swagger** | A spec file (3.x or 2.0). Requests are created for you, grouped by tag or by path. |
| **WSDL** | A `.wsdl` or `.xml` file. |
| **cURL** | Create a request with **New Request → From cURL**, then paste the command. |
| **Bruno** | A whole Bruno folder, many collections at once, a zip, or a JSON export. |
| **Ferret / OpenCollection** | A zip or file exported from Ferret. |

Imports always make a copy. Your original files are not changed.

### Coming from Bruno

- **One collection or many:** choose **Import a Bruno folder** and pick the folder. Ferret finds every Bruno collection inside it (up to four levels deep), shows you the list and converts them.
- **A whole workspace:** open the workspace menu at the top left, choose **Import workspace**, then **Choose a Bruno workspace folder**. Ferret converts every collection the workspace lists, brings in collections stored elsewhere and keeps the workspace's name and global environments.
- **Scripts:** `bru.` becomes `fer.` automatically.

### Other sections

- **API Specs** opens an OpenAPI file next to your requests so you can read and edit it.
- **Mock Servers** (beta) serves the saved examples of a collection as a local fake API, handy while the real one is not ready.
