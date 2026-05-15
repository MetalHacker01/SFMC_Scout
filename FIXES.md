# SFMC Scout — Fix Log

A chronological log of bugs and their working fixes. **Read this before touching any related code.** Anything that lands here is verified-working; never undo without re-reading "Never regress to" and confirming with the user.

---

## 2026-05-15 — Ghost-tab elimination (architecture migration)

**Problem:** First-load opened a minimized popup window with 4 ghost tabs cycling through Content Builder / Automation / Journey / CloudPages to capture per-section CSRF tokens. Felt like a virus, slow, and triggered intermittent token-staleness errors.

**Root cause:** All API calls hit `mc.{stack}.marketingcloudapps.com/{module}/fuelapi/...`, which requires `x-csrf-token`. Each module's token rotates independently. Only way to capture them was to force SFMC to issue requests for each module → ghost tabs.

**Fix:** Switch every read API to `mc.{stack}.exacttarget.com/cloud/fuelapi/...` — an internal SFMC proxy that accepts session cookies and skips CSRF entirely. Verified via SFMC Companion / SFMC Inspector reverse engineering. See `../CloudPages_Maestro/Chrome_Extension_CPM/GHOST_TABS_FIX.md` for the full playbook.

**Verified by:** No more ghost tabs spawning on first load. Asset search runs without any token capture step.

**Never regress to:** `marketingcloudapps.com/contactsmeta/fuelapi/...` or `marketingcloudapps.com/AutomationStudioFuel3/fuelapi/...` for read APIs. Those paths require CSRF tokens; the migration was specifically to avoid them.

---

## 2026-05-15 — `update-token.html` SW request loop (78k requests, DevTools crash)

**Problem:** Service worker fired 78k+ requests to `update-token.html` on a single SFMC tab load, crashing Chrome DevTools.

**Root cause:** `chrome.webRequest.onHeadersReceived` had a passive-capture block that called `fetch(details.url)` from inside the handler whenever it saw an `update-token.html` response. That fetch's own response triggered `onHeadersReceived` again → infinite self-triggering loop.

**Fix:** Removed the entire `if (details.url.includes('update-token.html')) { fetch(details.url, ...) }` block from `background.js onHeadersReceived`. Kept the loop-safe `onBeforeSendHeaders` x-csrf-token capture (it only reads outgoing headers — never triggers a fetch).

**Verified by:** DevTools Network panel no longer floods. Service worker stays idle when no user action.

**Never regress to:** Calling `fetch()` from inside any `chrome.webRequest.onHeadersReceived` listener that matches the same URL pattern it's about to fetch. If you must re-fetch, hard-filter by request method or by `details.tabId === -1` (SW-originated) to avoid self-trigger.

---

## 2026-05-15 — Asset search OOM on production orgs

**Problem:** `POST /asset/v1/content/assets/query` returned `HTTP 400 { errorcode: 30001, message: "System.OutOfMemoryException" }` for searches like "test" on production orgs with 100k+ assets.

**Root cause:** `pageSize: 500` × **multi-page pagination loop** × 6 OR'd `contains` predicates × 250-value `assetType.id` filter. SFMC's search engine had to score every asset against every predicate before paging, blowing the per-request memory budget.

**Fix:** [handlers/search/AssetSearchService.js](handlers/search/AssetSearchService.js)
- `pageSize: 40` (matches SFMC's own UI per HAR)
- **Single page only** — no `MAX_PAGES` loop
- Kept the wide 6-predicate OR (name + content + description + fileName + subjectline + customerKey) — this is what finds emails by their internal name when the display name differs
- Kept the full 250-value `assetType.id` filter — covers all asset types users search

**Verified by:** Searched "WW_2026_" on production. Returned ~40 results (mix of templates, emails, assets) in <1s. No OOM.

**Never regress to:** `pageSize: 500` OR multi-page pagination loop on `/asset/v1/content/assets/query`. Don't narrow the OR predicate to name-only — that misses templated emails whose displayed name doesn't contain the search term.

---

## 2026-05-15 — Automation/Journey/Activity search returned nothing on prod orgs

**Problem:** Searching "WW_2026_" returned 0 automations, 0 journeys, 0 activities — even though SFMC's own UI returned matches for the same term.

**Root cause:** We were paginating client-side: fetch first N items (sorted by lastRunTime/modifiedDate) and filter client-side. On large prod orgs (5k+ automations, 425+ journeys, 5k+ queries), legitimate matches sit past the first page. Worse, the pagination param names were wrong on some endpoints (`$page` vs `$itemsPerPage`/`$startIndex`).

**Fix:** Switch to **server-side filter params** for each endpoint, captured from SFMC's own UI HARs:

| Endpoint | Server-side filter param |
|---|---|
| `/legacy/v1/beta/automations/automation/definition/` | `$where=name like X` (with `$top` + `$skip`) |
| `/interaction/v1/interactions/` | `nameOrDescription=X` |
| `/automation/v1/queries/`, scripts, filters, send-email, imports, file-transfers, data-extracts | `$filter=name like "X"` (quotes mandatory, URL-encoded) |
| `/data-internal/v1/customobjects` | `$search=X` |

Each one is a single fast call returning only matching items.

**Verified by:** "WW_2026_" returned 2 automations, 40 journeys (of 425 matches), 40 query activities (of 54 matches) — all in <1s combined. Confirmed network panel shows the server-filter params in each request URL.

**Never regress to:** `name=X` for journeys (wrong param — it's `nameOrDescription`). Don't switch to unquoted `$filter=name like X` for activities (server rejects). Don't drop server-side filtering in favor of client-side — that's the regression that broke this twice already.

---

## 2026-05-15 — DE search showed `[Unknown Folder]` (4th attempt — the actual root cause)

**Problem:** Same as previous entries. Reported again: `M1_Test_PulseDE`, `M1_Test_MobileMaster_Filter`, `M1_Test_SeedList_Filter`, `M1_Test_Octa_Filtered`, `M1_Test_AIL_Filtered`, `M1_Test_Records_Filtered` all returned `Data Extensions/[Unknown Folder]` while the local `M1_Test_Aldo_SFMC_Scouta` returned the correct `Data Extensions/Test/UAT_DIana`. The DE Report shows ALL paths correctly including shared. The folder-picker modal also shows shared folders correctly.

**Root cause (the actual one):** **Two independent bugs that I missed for three earlier "fixes":**

1. **I was editing the wrong file.** `handlers/search/DESearchService.js` (the class with `static search()`) is **dead code** — `handlers/search/index.js` exports it, but **nothing imports the class anywhere**. The DE Tools search input dispatches through `ActionsHandler.handleDESearch` which imports `searchDataExtensions` from `services/DESearchService.js`. **That** is the file the search bar actually runs. Verified via `grep -rn "DESearchService\.search\|searchDataExtensions\b"` — the only call site for the class is the `index.js` re-export.

2. **In the file that IS wired up (`services/DESearchService.js`), Pass 3 was missing `&includeFullPath=true` on the per-folder customobjects call.** Specifically [fetchSharedCategoryTree line 77](services/DESearchService.js#L77):
   ```js
   fetchAllDEPages(`${base}/data-internal/v1/customobjects/category/${folderId}?retrievalType=1`)
   ```
   This call hits the right endpoint and returns the shared-subfolder DEs, but **without `includeFullPath=true` the server doesn't populate `categoryFullPath`**. So every DE coming out of Pass 3 had `categoryFullPath = null`. The legacy fallback `fetchFolderPath(categoryId)` then hits `/legacy/v1/beta/folder/{id}` GET — which returns 401/403 on the cookie-only proxy for shared folder IDs (the user's session is authenticated via cookie but lacks the CSRF needed for single-folder GETs on contactsmeta). With both the primary path AND the fallback returning null/error, the pathSegments walker produced `Data Extensions/[Unknown Folder]` — which is what the user sees.

   The DE Report works for the same shared DEs because [DEReportService.js fetchAllDeData line 123](services/DEReportService.js#L123) **does include `&includeFullPath=true`** on its per-folder Pass 3 call. Verified — it's the only structural difference between the report's Pass 3 and the search's Pass 3.

**Fix:** Rewrote `services/DESearchService.js` (the right file this time):
1. Added `&includeFullPath=true` to the per-folder Pass 3 call in `fetchSharedCategoryTree`.
2. Belt-and-braces: during the children walk, build a `folderId → fullPath` map (every `/folder/{id}/children` response gives us folder names with IDs, so we accumulate parent paths as we descend). Any DE that comes out with `categoryFullPath` still null after all 3 passes gets patched from this map using its `categoryId`.
3. Each visited folder also records its own path in the map, so DEs returned from `category/{folderId}?retrievalType=1` whose `categoryFullPath` somehow isn't populated still get the right path.
4. Removed the `fetchFolderPath(categoryId)` fallback entirely — it relies on `/folder/{id}` GET which doesn't work on the cookie-only proxy for shared folder IDs.
5. Result: cached for 5 minutes per BU. The cache stores both the merged DE list AND the folderId→path map.

**Verified by:** 2026-05-15 — user confirmed "finally they do show". Search for `M1_Test` now returns shared-folder DEs (`M1_Test_PulseDE`, `M1_Test_MobileMaster_Filter`, etc.) with their real `Shared Items\...` paths instead of `Data Extensions/[Unknown Folder]`.

**Never regress to:**
- **Editing `handlers/search/DESearchService.js`** thinking it's the search bar's code. It's NOT WIRED UP. Always grep for the function/import name first. The class `DESearchService` is dead code — kept for now in case future routing changes, but should be deleted or wired up properly later.
- **Calling `/customobjects/category/{folderId}?retrievalType=1` WITHOUT `&includeFullPath=true`** in Pass 3. The DE Report has had this param forever and works; the search was missing it. Always copy the report's call shape verbatim.
- **Relying on `fetchFolderPath(categoryId)` for path resolution on the cookie-only proxy.** It hits `/legacy/v1/beta/folder/{id}` which returns 401/403 for shared folder IDs. Build a `folderId → path` map during the top-down children walk instead (children responses contain folder names; accumulate them as you descend).
- **Treating "DE Report works but search doesn't" as a mystery.** Run a structural diff between the two services' Pass 3 calls. The first different param is your answer.
- Using `/customobjects?$search=X` for path-aware searches. The endpoint's name-search and folder-path behaviour are decoupled; $search doesn't reliably populate categoryFullPath.

---

## 2026-05-15 — DE search showed `[Unknown Folder]` (3rd attempt, superseded by entry above)

**Problem:** Searching a DE returned the row correctly but the folder column read `[Unknown Folder]` or `Data Extensions/[Unknown Folder]`. Reproduced on production: `M1_Test_Aldo_SFMC_Scouta` (in `Data Extensions/Test/UAT_DIana`) returned the correct path, but `M1_Test_PulseDE`, `M1_Test_MobileMaster_Filter`, `M1_Test_SeedList_Filter`, `M1_Test_Octa_Filtered`, `M1_Test_AIL_Filtered`, `M1_Test_Records_Filtered` all returned `[Unknown Folder]` — these all live in this BU's `Shared Items` folder tree. The DE Report and the Create-DE folder-picker modal both showed the same paths correctly.

**Root cause (now fully diagnosed):** Three distinct DE storage shapes exist on a BU, and **all three** must be queried to get full coverage:
1. **Local DEs** — stored under this BU's own `Data Extensions` root. Caught by `/customobjects/category/0?retrievalType=1`. ✓
2. **Cross-BU synced DEs** — DEs from OTHER BUs synced into this BU. Caught by `/customobjects/category/0?retrievalType=2`. ✓
3. **This-BU "Shared Items" tree** — DEs this BU created and placed inside its own `Shared Items` folder hierarchy. NOT caught by retrievalType=1 OR =2. Must be discovered by walking the folder tree: `/legacy/v1/beta/folder?$where=allowedtypes in ('shared_data',...)` to find shared roots → `/legacy/v1/beta/folder/{rootId}/children` to find subfolders → `/customobjects/category/{folderId}?retrievalType=1&includeFullPath=true` to fetch DEs in each subfolder, recursively. **This is what the DE Report and `services/DESearchService.js` (legacy path) have always done.** My earlier rewrite of `handlers/search/DESearchService.js` only did passes 1 & 2 — so shape #3 DEs returned with no `categoryFullPath`, rendering as `[Unknown Folder]`.

Also: the `/data-internal/v1/customobjects?$search=X` endpoint **does NOT populate `categoryFullPath` reliably** — it returns null/missing on a fresh session and only fills in after SFMC's own UI has navigated the DE list for that BU and primed the server-side cache. **Even with `includeFullPath=true` in the query.** That's why we stopped using $search.

The per-folder GET endpoint (`legacy/v1/beta/folder/{id}`, no `/children`) returns 401/403 on shared folder IDs — confirmed via HAR — so it's not a viable fallback. But `legacy/v1/beta/folder/{id}/children` DOES work for the user's session because the folder modal in the Create-DE flow uses it.

**Fix:** Rewrote `handlers/search/DESearchService.js` to mirror the report's full approach with **three passes** plus an in-memory cache:
1. **Pass 1** — `category/0?retrievalType=1&includeFullPath=true` (paginated $pagesize=1000) — local DEs.
2. **Pass 2** — `category/0?retrievalType=2&includeFullPath=true` (paginated) — cross-BU synced DEs.
3. **Pass 3** — Walk the shared folder tree:
   - `GET /legacy/v1/beta/folder?$where=allowedtypes in ('dataextension','shared_data','synchronizeddataextension','salesforcedataextension')&Localization=true` → filter for `type === 'shared_data'` roots.
   - For each root: `GET /legacy/v1/beta/folder/{id}/children?Localization=true&$top=1000` to enumerate top-level subfolders.
   - Recurse 3 levels deep: for each folder, in parallel, fetch `customobjects/category/{folderId}?retrievalType=1&includeFullPath=true` AND `folder/{folderId}/children`. Dedupe by id across all passes.
4. Result is cached for 5 minutes keyed by API base URL. `invalidateCache(instance)` clears it on BU switch.
5. Filter the cache client-side by `name.toLowerCase().includes(term)`. Read `item.categoryFullPath` (back-slash → forward-slash normalisation).

**Verified by:** TBD — user testing required.

**Never regress to:**
- **Skipping Pass 3 (shared folder tree walk).** retrievalType=1 + retrievalType=2 alone do NOT cover this BU's `Shared Items` subfolders. This is the regression that produced [Unknown Folder] on `M1_Test_PulseDE` & friends. The DE Report (which the user holds up as the working reference) has always had Pass 3 — copy its structure.
- Using `/customobjects?$search=X` for path resolution. The endpoint's name-search and folder-path behaviour are decoupled; $search returns matches but doesn't reliably populate categoryFullPath. Use `/category/0` (which the DE Report uses) for any path-aware fetch.
- Reading `item.categoryPath` — the field is `categoryFullPath`. `categoryPath` is essentially always missing.
- Calling `legacy/v1/beta/folder/{id}` (no `/children`) for shared/cross-BU folder IDs. Both `mc.{stack}.exacttarget.com` and `mc.{stack}.marketingcloudapps.com` proxies return 401/403. **Use `folder/{id}/children` instead — that one works.**
- Treating "DE Report works but search doesn't" as a mystery. The report's endpoint structure (three passes incl. folder-tree walk) is the source of truth — copy it verbatim.
- Trusting `includeFullPath=true` alone to fix things on the `$search` variant. It doesn't.

---

## 2026-05-15 — Toast UI was always dark + ugly green left border + too long

**Problem:** Toast notifications were always dark (ignoring panel theme), had a garish 3px colored left border, lived 3.5 seconds.

**Root cause:** Toast container was appended to `<body>` (not inside the panel), so the `--s-*` CSS variables resolved to dark defaults regardless of panel theme. Border-left styling was applied per-status.

**Fix:** [panel.css](panel.css) + [content.js toast()](content.js):
- Container gets its own dedicated `--tt-*` CSS variables, with a `.scout-light` override class
- `toast()` and `applyTheme()` both toggle `.scout-light` on the container to mirror panel theme
- Status communicated through a 22×22 colored icon chip on the left instead of a 3px border
- 12px border radius, soft elevation, spring-physics slide-in
- Default duration: 2000ms

**Verified by:** TBD — user testing required.

**Never regress to:** Appending the toast node directly to `<body>` without theme-class mirror. Re-adding the 3px colored left border. Toast duration >2s by default.

---

## 2026-05-15 — Theme toggle needed 2 clicks the first time

**Problem:** On first ever extension load, clicking the theme toggle did nothing visually. Second click flipped the theme.

**Root cause:** `S.theme = 'light'` is the default in state, but the panel HTML mounts WITHOUT the `scout-light` class (visually dark). On first load, the saved-theme storage check fires async — and only called `applyTheme()` IF a saved value existed. With no saved value, applyTheme never ran, so the DOM stayed dark while `S.theme` said light. First click toggled internal state light→dark with no visual change (DOM was already dark); second click finally toggled back to light and applied the class.

**Fix:** [content.js](content.js) — call `applyTheme()` unconditionally in the storage-load callback, regardless of whether `scout_theme` is set:

```js
chrome.storage.local.get(['scout_theme'], res => {
    if (res.scout_theme === 'light' || res.scout_theme === 'dark') {
        S.theme = res.scout_theme;
    }
    applyTheme();
});
```

**Verified by:** TBD — user testing required.

**Never regress to:** Wrapping the `applyTheme()` call inside an `if (res.scout_theme)` guard. The default state needs to be reflected in the DOM on every mount.

---

## 2026-05-15 — `Service worker registration failed. Status code: 15`

**Problem:** Extension failed to register the service worker on reload, with no source location.

**Root cause:** `AssetSearchService.js` had a missing close paren — `const buildBody = (pageNum) => ({...};` instead of `(pageNum) => ({...});`. Script mode (`node --check`) accepted it as a no-op block expression after a useless return; ESM mode (which MV3 uses) rejected it.

**Fix:** Added the missing `)` before `;`. Going forward, validate SW changes by simulating in ESM mode (`node --input-type=module -e "await import('./background.js')"` with stubbed `chrome.*`).

**Verified by:** SW loaded clean. `chrome://extensions/` showed "Service Worker: active".

**Never regress to:** Trusting `node --check` alone for SW files. MV3 SW runs as ES module; script-mode parse leniency hides real syntax errors. The stubbed-chrome `import()` simulation is in `~/AppData/Local/Temp/sw_test*.mjs`.

---

## 2026-05-15 — "Extension context invalidated" spam in console

**Problem:** Console flooded with `Uncaught Error: Extension context invalidated. at content.js:231` after every extension reload.

**Root cause:** When the extension reloads, content scripts in already-open SFMC tabs become orphaned. Their `chrome.runtime` object exists but `chrome.runtime.id` is null, so any `sendMessage` call throws.

**Fix:** [content.js](content.js) added `safeSendMessage()` and `safeConnect()` wrappers near the top of the IIFE. Replaced call sites in `refreshAllTokensWithGhostTabs` and `loadTokens` with the safe versions. Orphan path now no-ops cleanly with a one-time toast asking the user to refresh the tab.

**Verified by:** Reloading the extension while an SFMC tab is open no longer floods the console.

**Never regress to:** Bare `chrome.runtime.sendMessage(...)` calls from content.js. Always go through `safeSendMessage`. Same for `chrome.runtime.connect` → `safeConnect`.

---
