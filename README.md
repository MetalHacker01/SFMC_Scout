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

## Installation

> SFMC Scout is a developer tool intended for internal use. It is not published on the Chrome Web Store.

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the `SFMC_Scout/` folder (the one containing `manifest.json`)
6. Navigate to any SFMC page and the **Scout** toggle button will appear on the right edge of the screen

---

## How It Works

### Token Capture
SFMC Scout captures session tokens passively by intercepting `x-csrf-token` headers from SFMC's own HTTP requests via Chrome's `webRequest` API. No credentials are stored or transmitted externally.

On first open, if tokens are not yet cached, the extension opens a minimized background window with SFMC sub-app tabs to trigger token-bearing requests. Tokens are stored locally in `chrome.storage.local` and reused until they expire.

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
