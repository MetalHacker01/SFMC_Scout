# ![SFMC Scout](icons/icon-48.png) SFMC Scout

**SFMC Scout** is a Chrome extension that injects a persistent side panel into Salesforce Marketing Cloud, giving developers and marketers instant access to search, automation details, Data Extension tools, journeys, assets, activities, snippets, and exportable reports without ever leaving the SFMC interface.

---

## Features

### Universal Search
Search across your entire SFMC account in one keystroke:
- **Data Extensions** — name, key, folder path
- **Automations** — name, status, last run
- **Journeys** — name, status, version, channel
- **Content Builder Assets & Emails** — name, type, folder, created by, asset ID
- **Activities** — SQL Queries, Scripts, Filters, Send Emails, Imports, File Transfers, Data Extracts

Click a result to open it inline (automations) or copy its name to clipboard (assets and emails).

### Automations
- Browse all automations with color-coded status badges (Active, Scheduled, Paused, Error, Ready)
- Click any automation to view its full step breakdown with every SQL query, Script, and activity
- Syntax-highlighted SQL and SSJS code blocks, expandable per step
- Open the automation directly in SFMC Automation Studio from the detail view

### Data Extension Tools
- **Search** — find any DE by name with field count, folder, and sendable flag
- **Create** — build a new DE with typed fields, sendable/testable config, and folder selector
- **Export** — download all DEs as structured JSON or individual files in a ZIP
- **Import** — restore DEs from a previously exported JSON with optional folder re-creation
- **Report** — generate a full HTML or CSV report of all DEs with row counts, field counts, and sendable mapping

### Journeys
- Browse all active and draft journeys with status, version, and channel
- Color-coded statuses: Running (green), Draft/Unpublished (yellow), Stopped (red)

### Reports
All reports open in a new tab as standalone HTML pages with:
- Live client-side filter input
- Sortable columns
- Color-coded status badges
- Extension logo and instance/date metadata
- Dark and light theme support

Available reports:
- **Automations Report** — name, status, key, last run, schedule, steps, folder, created by
- **Journeys Report** — name, status, key, version, channel
- **Assets Report** — name, type, status, ID, customer key, folder, created by
- **Activities Report** — name, colored type badge, key, target DE, description
- **Data Extensions Report** — full field inventory with row counts, sendable mapping, folder path

### Snippets
- Save, label, and tag reusable AMPscript, SSJS, and SQL code snippets
- Deploy a snippet directly into an open SFMC Ace editor (Cloud Pages, Script Activities)
- Full syntax highlighting preview

### Dark / Light Mode
Toggle between dark (default) and SFMC Marketing Cloud light mode at any time. The theme persists across sessions and applies to all reports generated during that session.

---

## Parked features (not currently exposed)

### Contact Search (debug page)
A debug page at `debug.html` hosts an experimental email/subscriber-key lookup that queries SFMC's contacts-internal API. It works reliably in dev / sandbox orgs but is **unreliable in production** because:

- The contacts-internal endpoint requires both `Authorization: Bearer {MID}` and `x-csrf-token` headers
- The CSRF token rotates faster than the panel can passively re-capture it on a high-traffic production org
- A 403 → manual CSRF refresh → retry cycle is required for every search

The page, handlers (`handlers/de/FieldDefinitionsHandler.js`, `FETCH_MID` SW message), and `parseContactsInternalResponse` parser are all kept intact in the codebase for future re-enablement. The toolbar-icon entry point is commented out in [background.js](background.js) (search for "Toolbar icon click").

**To re-enable for dev work:**
1. Uncomment the `chrome.action.onClicked.addListener` block at the bottom of `background.js`
2. Reload the extension
3. Click the toolbar icon to open the debug page
4. In the Contacts tab: navigate to Contact Builder once in any SFMC tab to passively populate MID + CSRF, then search by email or subscriber key

**Future enhancement plan:**
- Auto-retry on 403 with a silent passive re-capture (currently shown as a TODO)
- Pre-flight CSRF freshness check before each contacts call
- Expose a "Contacts" tab inside the main panel once the retry/freshness loop is stable

---

## Installation

> SFMC Scout is a developer tool intended for internal use. It is not published on the Chrome Web Store.

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the cloned `SFMC_Scout/` folder (the one containing `manifest.json`)
6. Navigate to any SFMC page and the **Scout** toggle button will appear on the right edge of the screen

> Full documentation is published as a GitHub Pages site from this repo's `index.html`. Enable Pages under **Settings → Pages → Branch: `main` / Folder: `/ (root)`**.

---

## How It Works

### Authentication (cookie-only proxy)
SFMC Scout authenticates against `mc.{stack}.exacttarget.com/cloud/fuelapi/...` — an internal proxy that SFMC's own SPA uses for cross-module API calls. It accepts the browser's existing SFMC session cookies, so **no CSRF token capture is required** for the search, browse, and read paths. The moment the user is logged into SFMC in any tab, every read API just works.

For the few endpoints that still require a CSRF token (POST creates, PATCH updates, contact-search), the extension passively captures `x-csrf-token` headers from SFMC's own outgoing requests via `webRequest.onBeforeSendHeaders`. **No ghost tabs are opened** — the capture is silent and only fires for headers SFMC itself was already sending. No credentials are stored externally.

#### Migration from ghost tabs (v2.1)
Prior versions opened a minimized background window with up to four hidden SFMC tabs on first load to force token-bearing requests. v2.1 dropped this entirely after discovering the `/cloud/fuelapi/` cookie-only proxy. See [GHOST_TABS_FIX.md](../CloudPages_Maestro/Chrome_Extension_CPM/GHOST_TABS_FIX.md) (sibling project doc) for the full migration playbook.

### Search performance caps
Every search type is capped at the top **40 matches** by relevance. With production orgs holding 10k+ assets / 5k+ automations, an uncapped query like `"test"` would overload the server (SFMC's search engine returned `System.OutOfMemoryException` on the wide multi-predicate query). The cap is intentional: the search bar surfaces the closest matches; the dedicated tabs (DE Tools, Automations, Reports) provide full paginated browsing for exhaustive use cases.

The result list groups by type and collapses each group to the top 10 — click "Show all N" to expand a specific group inline.

### Architecture

```
manifest.json         Chrome MV3 manifest
content.js            Panel HTML/CSS injection, UI logic, event handling
background.js         Service worker: webRequest interception, CORS proxy, message hub
panel.css             Panel and component styles
injected_script.js    Page-injected: SnippetManager + AceEditorHelper

handlers/
  actions/            Quick Action handlers (DE search, create, export, import, report)
  automation/         Automation detail, activity code, type registry
  auth/               Token refresh coordination
  de/                 DE folder service, field definitions, usage detection
  search/             Per-type search services (Automations, Journeys, Assets, DE, Activities)
  snippet/            Snippet CRUD

services/
  DECreationService   Create new Data Extensions via SOAP API
  DEExportService     Paginated DE export with folder path resolution
  DEImportService     Restore DEs from JSON, with optional folder creation
  DEReportService     Full DE HTML/CSV report generation
  DESearchService     DE search via REST API

utils/
  InstanceService     Stack detection from hostname (mc.s51 -> s51)
  APIService          Authenticated fetch wrapper (CORS proxy via background)
  CSRFService         Token retrieval from storage
  StorageService      chrome.storage.local helpers
  TokenService        Token classification and storage key mapping

core/
  SnippetManager      Snippet storage and Ace editor deployment
  AceEditorHelper     Ace editor detection and code injection
```

### SFMC Compatibility
Tested on standard SFMC stacks (`s1` through `s51`). Stack detection is automatic from the active tab URL.

---

## Stack Support

| Stack format | Example URL |
|---|---|
| `mc.s51` | `mc.s51.exacttarget.com` |
| `mc.s1` | `mc.s1.exacttarget.com` |
| Custom stacks | Detected automatically from `window.location.hostname` |

---

## Security & Privacy

- All API calls use the user's own authenticated SFMC browser session (`credentials: 'include'`)
- No data is sent to any external server
- Tokens are stored only in `chrome.storage.local`, local to the browser profile
- No login credentials are ever captured or stored

---

## Author

Built by **Aldorino Rrushi**, MarTech Solution Engineer

- [LinkedIn](https://www.linkedin.com/in/aldorino-rrushi/)
- [Portfolio](https://martech-maestro-folio-sroh.vercel.app/)
- [GitHub](https://github.com/MetalHacker01)

---

## License

© 2026 Aldorino Rrushi. All rights reserved.

This software is provided for internal use. Redistribution without permission is not permitted.
