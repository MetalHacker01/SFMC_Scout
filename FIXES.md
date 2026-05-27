# SFMC Scout — Fix Log

A chronological log of bugs and their working fixes. **Read this before touching any related code.** Anything that lands here is verified-working; never undo without re-reading "Never regress to" and confirming with the user.

---

## 2026-05-27 — Quick search asset/email rows show the full folder breadcrumb (not just the leaf)

**Problem:** Universal search result rows for Assets and Emails showed only the immediate folder name (e.g. "Test"), while the Assets report correctly showed the full path ("Content Builder / Email / Test").

**Root cause:** The collapsed result row rendered `r.path` directly (`content.js` ~1457), which is `item.category.name` — the leaf folder only, set in `AssetSearchService` (line 204). The full-path helper `buildFolderPath` and the `_assetCategoryCache` already existed, but the category tree was only fetched on row *expand* (`ensureAssetCategoryTree` at the asset expand handler), so collapsed rows never had the data. The Assets report works because `generateAssetsReport` fetches the whole category tree up front (its local `buildAssetPath` + `catMap`) and resolves every row before rendering.

**Fix:**
1. `renderSearchResults` now kicks `ensureAssetCategoryTree(getCurrentInstance())` once when the results contain any asset/email row with a `categoryId`, then re-renders when the tree loads. Guarded on `_assetCategoryCache.size === 0 && !_assetCategoryLoad` so it fires at most once per session (no render loop).
2. The asset/email row meta now uses `buildFolderPath(r.categoryId, r.path)` — the same resolution the detail card (~1206) and the report use — falling back to the leaf `r.path` until the tree finishes loading.
3. **Layout:** the folder path moved to its own wrapping line (`.scout-result-row-folder`, folder icon + `word-break: break-word`) so a deep breadcrumb never crowds the fixed metadata. createdBy/createdDate dropped from the collapsed row (still in the detail card). Applied to assets/emails, activities, and the default row type. See [[feedback-variable-length-own-line]].
4. **Prod pagination (the part that broke on large orgs):** the category fetch was a single page of 500 (`$page=1&$pagesize=500`) in BOTH `handleFetchAssetCategories` (quick search) and the report's inline catMap fetch. Sandboxes have < 500 Content Builder folders so everything resolved; production has more, so a result's leaf/ancestor category sat on a later page, the parent-chain walk found nothing, and it fell back to the leaf name. Both fetches now loop pages until `count` is reached (safety cap 60 pages = 30k categories).

**Verified by:** Sandbox confirmed working by user. Prod (thousands of items) initially failed — fixed by the pagination change (#4); re-verification on prod pending.

**Never regress to:**
- **Rendering `r.path` directly for asset/email rows.** `r.path` is only the leaf folder name. Resolve the full breadcrumb via `buildFolderPath(r.categoryId, r.path)`, and make sure `ensureAssetCategoryTree` has been kicked off so `_assetCategoryCache` is populated — otherwise it silently falls back to the leaf.
- **Re-fetching the category tree on every render.** The guard (`size === 0 && !_assetCategoryLoad`) is what stops the `.then(renderSearchResults)` from looping. Keep both halves of it.
- **Fetching `/asset/v1/content/categories` as a single `$page=1&$pagesize=500` call.** That works in sandbox and silently fails in production (>500 folders) — paths collapse to the leaf with no error. Always paginate to `count`. This bit BOTH the quick-search handler and the report; keep both paginated.
- **Putting the variable-length path back inline with the fixed metadata.** It belongs on its own wrapping line. See [[feedback-variable-length-own-line]].
- **Extending the layout change to activities' path *resolution* without checking.** Activities resolve their own breadcrumb upstream (ActivitySearchService); only the layout (own line) was applied to them, not `buildFolderPath`. Don't blanket-apply `buildFolderPath` to every row type.

---

## 2026-05-19 — Journey audit-log timeline modal + scrollable SQL preview

**Two enhancements:**

*Journey audit log:*
Added a CTA on the journey detail card (next to "Open in JB") that opens an inline modal showing the lifecycle of edits to that journey — Create / Modify / Publish events with user, timestamp, version, and publish status. Available in both main search journey rows and the DE Usage "Used in → Journeys" list.

Endpoint: `mc.{stack}.exacttarget.com/cloud/fuelapi/interaction/v1/interactions/{id}/audit/all` — cookie-only proxy version of the documented `marketingcloudapps.com/contactsmeta/fuelapi/...` path. Works with session cookies alone, no CSRF needed (same pattern every other read path uses).

Modal layout:
- Summary strip at the top — colored action pills (e.g. "12 Modify · 4 Publish · 1 Create") + total events + unique editors count
- Vertical timeline below — left dot column color-coded by action (Create = accent, Modify = neutral, Publish = success / red on failed), content column shows action name + version chip + publishStatus pill + user + humanized timestamp
- Note at the bottom calling out that "Publish" means the definition was saved to runtime — not necessarily that contacts started entering (SFMC's audit log doesn't expose a dedicated "Activated" event, which the user flagged)

Reuses the asset-preview modal's `.scout-preview-overlay` / `.scout-preview-modal` shell (backdrop blur, scale-in animation, Esc + click-outside to close). Fetcher caches per `interactionId` in a module-scoped Map — re-opens are instant.

*SQL preview scrollable in DE Used In:*
Previously the query preview pre-block sliced SQL at 400 chars with a "…" — confusing because users couldn't see the rest. Now: full SQL rendered, container capped at `max-height: 280px` with `overflow-y: auto`. Custom scrollbar styling so it doesn't look out of place in dark mode. `word-break: break-word` (was `break-all`) keeps long identifiers from splitting mid-character when possible.

**Files touched:**
- `handlers/de/DEUsageHandler.js` — new `handleFetchJourneyAuditLog` (cookie-only proxy GET to `/audit/all`)
- `handlers/de/index.js`, `background.js` — export + route `fetchJourneyAuditLog`
- `content.js` — `_journeyAuditCache`, `fetchJourneyAuditLog`, `formatAuditTime`, `showJourneyAuditModal`, `renderJourneyAuditTimeline`; new `I.clock` icon; `renderJourneyDetail` header now has two-button action group; click dispatch in BOTH search + DE-usage binders refactored to discriminate on `data-jbUrl` vs `data-auditId`
- `panel.css` — `.scout-audit-*` block (summary pills, timeline with vertical line, dots, action/version/status row, note footer), `.scout-jdetail-head-actions` for the two-button card header, removed `.slice(0,400)` truncation + made `.scout-query-sql` scrollable

**Verified by:** TBD — user testing required.

**Never regress to:**
- **Hitting `marketingcloudapps.com/contactsmeta/fuelapi/...` directly for read paths that the cookie-only proxy can serve.** The same `interaction/v1/interactions/{id}/audit/all` path lives at `mc.{stack}.exacttarget.com/cloud/fuelapi/...` — no CSRF token needed. Single source of truth for auth across the extension.
- **Slicing query previews with "…" instead of scrolling.** SQL is long because business logic is long; cutting it off mid-clause is misleading. Cap the container with `max-height` + `overflow-y: auto` and let the user read all of it inline.
- **A single dispatch handler on `.scout-jdetail-open` reading only one data attribute.** When new card-header buttons get added (Audit, "Open in JB", future), the handler must check all relevant `data-*` attributes — otherwise new buttons silently no-op. Pattern: `if (btn.dataset.jbUrl) ... else if (btn.dataset.auditId) ...`.
- **Hardcoding "Activated" status into audit timeline UI.** SFMC's audit endpoint doesn't surface an Activate event explicitly — Publish is the closest signal. Note this in the modal footer so users don't think the data is missing.

---

## 2026-05-19 — Public-facing polish: README ghost-tabs link, Mermaid timing, missing icons, license clarity

**Problems:**
1. **README link to `GHOST_TABS_FIX.md` 404'd from GitHub Pages.** It pointed to a sibling-repo path (`../CloudPages_Maestro/Chrome_Extension_CPM/GHOST_TABS_FIX.md`) that doesn't exist when the README is rendered standalone from the SFMC Scout repo.
2. **Every mermaid diagram in `index.html` rendered as "Syntax error in text".** The `applyMermaid(true)` call set `startOnLoad: true` and exited without explicitly calling `mermaid.run()`. But the script block runs AT THE END of `<body>` — DOMContentLoaded has already fired by the time `mermaid.initialize` is called, so `startOnLoad: true` is a silent no-op. Result: mermaid never processed the diagrams at first paint.
3. **Two iconoir classes rendered as colored squares** instead of icons — `iconoir-play-outline` (Automation Inspector feature card) and `iconoir-cancel` (Safari compatibility bullet). The CDN's class catalog shifts over time; both class names appear to have been renamed in the live `iconoir@main` build.
4. **License contradiction in README footer** — README said "Redistribution without permission is not permitted" but the LICENSE file is MIT (which explicitly grants redistribution). User wanted fully open source WITH attribution.

**Fix:**
1. `README.md` — replaced the `GHOST_TABS_FIX.md` link with an inline two-paragraph description of the migration (why ghost tabs felt virus-like, how `mc.{stack}.exacttarget.com/cloud/fuelapi/...` cookie-only proxy replaced them, where CSRF tokens still come from).
2. `index.html applyMermaid()` — always uses `startOnLoad: false` and explicitly calls `mermaid.run({ nodes })`. Initial render path now: cache `originalCode` from `textContent` on first visit, call `mermaid.run()`. Theme-toggle path: restore from `originalCode` + drop `data-processed` + `mermaid.run()`.
3. `index.html` — replaced `<i class="iconoir-play-outline">` and `<i class="iconoir-cancel">` with inline SVGs that don't depend on the CDN's class catalog. Same Iconoir geometry, no external lookup.
4. `README.md` License section — rewritten as "License & Attribution":
   - Confirmed MIT (open source, free to fork/modify/redistribute commercial settings).
   - Three concrete attribution expectations: (a) keep the `LICENSE` file + copyright notice intact; (b) credit the original author somewhere visible (README mention, About page, link back); (c) a quick LinkedIn tag or release-note mention on derivative tools is appreciated.
   - Worked examples of attribution lines users can copy.
   - Removed the "Redistribution without permission is not permitted" line which directly contradicted MIT.

**Re: licensing choice** — kept **MIT** rather than switching to CC BY 4.0 or Apache 2.0:
- MIT already requires retention of the copyright + license text in any copy or substantial portion — that's legally enforceable attribution.
- It's the most universally understood OSS license; reduces friction for forkers and contributors.
- Stronger attribution expectations (visible credit in About pages) belong in README convention, not the license file — keeps the license simple and standard.

**Verified by:** TBD — user testing on GitHub Pages required.

**Never regress to:**
- **Linking `../CloudPages_Maestro/...` paths from this repo's README.** GitHub renders relative paths inside the repo only; sibling-repo references 404. Inline the relevant content or link to the sibling repo's actual GitHub URL.
- **`mermaid.initialize({ startOnLoad: true })` from inline scripts at the end of `<body>`.** DOMContentLoaded has fired by then; the auto-load hook is a no-op. Always pair with an explicit `mermaid.run()` call.
- **Reliance on the live `iconoir@main` class catalog without a fallback.** When an icon class fails, drop the inline SVG using Iconoir's published path geometry — same visual, no CDN dependency drift.
- **License/README mismatch.** If the LICENSE file says MIT but the README footer says "no redistribution", users distrust both. Pick one stance and reconcile them.

---

## 2026-05-19 — Automation folder: replicate the detail view's exact two-call hydration (with numeric id from the legacy listing)

**Problem:** Previous fix tried to resolve automation folder paths via a single bulk folder-tree fetch using `categoryId`. Result: only top-level folders like "my automations" rendered — anything deeper showed "—". The folder-tree response apparently doesn't include enough parent-chain data, OR `categoryId` from v1 doesn't match the folder ids in that response.

**Insight:** The in-panel automation detail view ALREADY does this correctly. Its flow:
1. Call `automation/v1/automations/{GUID}` → get `steps[]`.
2. Call `legacy/v1/beta/bulk/automations/automation/definition/{LEGACY_NUMERIC_ID}` → get `def.folderPath` (the full breadcrumb pre-formatted by SFMC).

The two endpoints use DIFFERENT id formats. The detail view works because clicks come from the legacy gridView search results, whose items carry the numeric id in `item.id`. The previous report attempt tried to use the v1 GUID against the legacy bulk endpoint and got 400 "Definition_ID could not be parsed".

**Fix:** Stop reinventing — match the detail view exactly.

The report already fetches BOTH bulk lists at the top of `generateAutomationsReport`:
- v1 bulk `automation/v1/automations` → `id` = GUID
- legacy gridView `legacy/v1/beta/automations/automation/definition/?view=gridView` → `id` = legacy numeric, `key` = GUID

Both lists share the `key` field (GUID). The merge step joins on `key`, so for every v1 automation we already have the matching legacy listing entry — and therefore the legacy numeric id. Captured as `_legacyId` during the merge.

Hydration then fires two parallel calls per automation:
- v1 detail with the GUID `a.id` → `steps.length` → `_stepCount`
- Legacy bulk with the numeric `a._legacyId` → `def.folderPath || def.categoryPath` → `_folderPath`

Both calls use the EXACT id format their endpoint expects. Same parse logic the detail view's enrichment block uses (`leg.definition || leg.automation || (Array.isArray(leg.items) ? leg.items[0] : null) || leg`). Same headers (`'GET', { 'accept': 'application/json' }`).

Removed the bulk folder-tree walk fallback — unnecessary now that the per-row legacy bulk call returns the pre-formatted breadcrumb directly.

**Verified by:** TBD — user testing required.

**Never regress to:**
- **Using a single id format across BOTH `automation/v1/automations/{id}` and `legacy/v1/beta/bulk/automations/automation/definition/{id}`.** They look like the same hierarchy of endpoints but want DIFFERENT id formats: v1 wants the GUID, legacy bulk wants the numeric id. Joining the two list endpoints by their shared `key` (GUID) is the bridge that gives you both ids.
- **Reinventing folder resolution when the panel already has a working path.** If the in-panel detail view shows the folder correctly, the API supports it — replicate that exact two-endpoint pattern instead of inventing a folder-tree-walk fallback.
- **Skipping the legacy gridView fetch** in the report. It supplies `_legacyId` for every automation; without it, the legacy bulk endpoint can't be called and folder stays empty.

---

## 2026-05-19 — Automation folder hydration: GUID vs legacy ID mismatch on `legacy/v1/beta/bulk/...`

**Problem:** Per-row hydration in the automations report was firing two endpoints — one of them returned 400 for every single automation:

```
{
  "globalErrors": [],
  "objectErrors": [{
    "objectName": "List`1",
    "error": "REST Parameter is invalid.",
    "additionalInfo": { "pairs": [
      { "key": "ErrorCode", "value": "InvalidParameter" },
      { "key": "Parameter", "value": "Definition_ID could not be parsed, please encode correctly" }
    ]}
  }]
}
```

**Root cause:** The endpoint `legacy/v1/beta/bulk/automations/automation/definition/{id}` expects the **legacy numeric ID** (e.g. `12345`), not the **v1 GUID** (e.g. `1204754d-d766-4f2f-8ef9-ff7550922e36`). The in-panel detail view works because users typically click from the search results, which uses the legacy `gridView` listing and hands the click an item with the legacy numeric id. The report iterates the v1 bulk list (`automation/v1/automations`) whose items have GUIDs — passing those to the legacy bulk endpoint hits the error parser.

**Fix:** Dropped the legacy bulk per-id call entirely. Hydration now:
1. **Stage 1 (per row, batched parallel ×10)** — fetch only `automation/v1/automations/{id}` which accepts the GUID. Extract:
   - `steps[].length` (or `automationProcesses[].length`) → `_stepCount`
   - `categoryId` → `_categoryId` for the stage-2 walk
2. **Stage 2 (one bulk fetch)** — `legacy/v1/beta/folder?$where=allowedtypes in ('automations','automation')&$pagesize=2000`. Build a flat `folderMap` keyed by id with `{ name, parentId }`. Walk each automation's categoryId up the chain to produce a breadcrumb like `my automations / Production Team Folder / Chris Chan Training / Cengage`. Same exact pattern the asset report uses.

This is the same approach the in-panel asset detail card uses for asset folders — single bulk category fetch, in-memory parent walk. No per-row folder GETs, no legacy/v1 ID mismatch traps.

**Verified by:** TBD — user testing required.

**Never regress to:**
- **Passing v1 GUIDs to `legacy/v1/beta/bulk/automations/automation/definition/{id}`.** That endpoint's "Definition_ID" parameter wants the legacy numeric ID. If the calling context only has the GUID, don't call this endpoint — use the folder-tree walk pattern instead.
- **Trusting that "this endpoint works in the in-panel view" implies it works anywhere.** Sometimes the in-panel call path has a different upstream id source than the report does. Verify with the actual ID format the report has access to.
- **Two-endpoint hydration when one endpoint is silently 400ing.** The Promise.allSettled wrapper hides the failure; result looks fine to the script but data never populates. Pick the endpoint whose ID format you actually have.

---

## 2026-05-19 — Two real bugs: CSV button non-functional everywhere + automation folder still empty

**Problems:**
1. **"Download CSV" button does nothing on any report.** Worked in DE blob but failed identically across Automations / Journeys / Assets / Activities.
2. **Automation Folder column still empty.** Previous fix added the legacy-bulk per-id call, but the column never populated for any row.

**Root cause — CSV button:**
The embedded inline `<script>` in `reportHtmlShell` had this regex literal at the top of `_downloadCsv()`:

```js
return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
```

`reportHtmlShell` is itself one big template literal. Inside a JS template literal, `\n` and `\r` are escape sequences that the OUTER literal eagerly resolves to actual newline + CR characters. So the HTML written out to the report contained:

```js
return /[",
]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
```

The newline lives literally INSIDE the regex literal — which is a JS `SyntaxError` (regex literals can't span lines). The entire `<script>` block fails to parse, so neither the CSV click handler NOR the search-filter input handler get registered. To the user: button is dead.

The DE report's separate shell in `services/DEReportService.js` had the right escaping (`\\n\\r`) — it actually worked — but the user (reasonably) treated all 5 reports as one population. So the DE one had been quietly working; user assumed all broken.

**Root cause — automation folder:**
Multiple compounding issues with the previous attempt:
1. The hydration fired all 500+ automations × 2 endpoints in one giant `Promise.allSettled` — SFMC silently 429-throttled most of them.
2. Headers default to `{accept, content-type}` from `sfmcFetch`. The working detail view uses only `accept: application/json` on the GET. The extra content-type may have shifted some responses to error.
3. Field-name fallback was thin — only checked `def.folderPath || def.categoryPath`. Some response shapes use `def.categoryNamePath` or no path string at all (just `categoryId`).
4. No fallback for the (likely) case where the bulk endpoint returns categoryId but no breadcrumb string.

**Fix:**

*CSV button:*
- `content.js reportHtmlShell` — changed `/[",\n\r]/` to `/[",\\n\\r]/` so the outer template literal outputs the escape sequences correctly (resulting `\n` and `\r` are valid inside a regex character class). Single character fix restores the entire script.

*Automation folder hydration:*
- `content.js generateAutomationsReport` — three-layer strategy:
  1. **Batched parallel (10 at a time)** instead of all-at-once. Avoids the rate-limit silence.
  2. **Headers match the working detail view exactly** — `'GET', { 'accept': 'application/json' }` on both v1 and legacy bulk fetches. No content-type on GET.
  3. **Expanded field fallback** — checks `def.folderPath || def.categoryPath || def.categoryNamePath || def.folderLocationText`. Captures `def.categoryId` separately when no path field is returned.
  4. **Bulk folder-tree fallback** — for any automation still without a folder string after per-row hydration, fetches `/legacy/v1/beta/folder?$where=allowedtypes in ('automations','automation')&$pagesize=2000` ONCE, builds a parentId map, walks chains client-side. Same approach as the asset report.
- `_stepCount` extraction also widened to check `v1.steps` OR `v1.automationProcesses` (different SFMC versions wrap the step list differently).

**Verified by:** TBD — user testing required.

**Never regress to:**
- **Bare `\n` / `\r` inside a regex character class embedded in a template literal.** Use `\\n` / `\\r` so the template literal preserves the escape into the output. Same trap waiting for tabs, form-feeds, etc.
- **Fire-and-forget `Promise.allSettled` over hundreds of SFMC fetches.** Batch in groups of 10 to avoid silent throttling. SFMC's rate limiter doesn't return 429 reliably — it just hangs / returns partial responses.
- **Trusting a single field name to surface SFMC's folder breadcrumb.** Try `folderPath`, `categoryPath`, `categoryNamePath`, `folderLocationText` in turn. Capture `categoryId` as a separate-fallback path-walk target.
- **Skipping the folder-tree-walk fallback** when the bulk endpoint returns only `categoryId`. The asset report demonstrates the pattern — fetch all folders once, walk parents in memory, no per-row recursive calls.

---

## 2026-05-19 — Polish pass: DE button width, dark-mode Email ID readability, automation folder via legacy bulk, docs refresh

**Problems:**
1. **DE Report button stretched to full width** after the CSV button was moved into the blob. The button had `style="flex:1;"` carried over from when there were two buttons.
2. **Asset detail Email ID mono pill unreadable in dark mode** — text was `--s-text` (white) on a browser-default `<code>` background that some Chrome versions ship with a light-grey background, producing white-on-near-white.
3. **Automation report Folder column still empty** after the previous attempt to hydrate via `automation/v1/automations/{id}?view=categoryinfo`. That endpoint does NOT return `folderLocationText` for automations (only for activities/queries). The detail-view code paths confirmed the correct source: `legacy/v1/beta/bulk/automations/automation/definition/{id}` → `def.folderPath || def.categoryPath`.
4. **Documentation drift** — `index.html` Journeys + Reports + Search sections still described the old shape (no detail cards, single-button reports, no in-blob CSV). README's feature bullets out of date.

**Fix:**
1. `content.js renderDEReport` + `renderReportSubView('de')` — dropped `style="flex:1;"` from the single primary button. Natural width now matches automations / journeys / assets / activities report buttons.
2. `panel.css .scout-adetail-headbit-mono` — gave it the same explicit background + border + accent-on-hover treatment as `.scout-jdetail-mono`. No more reliance on `<code>` browser defaults. Readable in both light and dark.
3. `content.js generateAutomationsReport` — replaced the v1 `?view=categoryinfo` hydration with a parallel pair: `automation/v1/automations/{id}` (for `steps.length`) AND `legacy/v1/beta/bulk/automations/automation/definition/{id}` (for `def.folderPath || def.categoryPath`). Same legacy-bulk endpoint the in-panel automation detail view has always used to resolve breadcrumbs like "my automations / Production Team Folder / Chris Chan Training / Cengage".
4. `index.html`:
   - Journeys section rewritten — describes the row pills, expand-on-click detail card, schedule humanizer behaviour (with a callout warning about the unreliable `scheduleState` field), the four status colour groups.
   - Reports section rewritten — new column shapes per report, "Download CSV (in-blob)" feature line, enrichment-source notes, asset clickable CDN links.
   - Search section expanded — covers asset Preview modal flow (template vs email endpoint shapes), per-row activity hydration, journey detail card.
5. `README.md` — Universal Search, Journeys, Reports bullets refreshed to match the new behaviour.

**Verified by:** TBD — user testing required.

**Never regress to:**
- `flex:1;` on the single DE Report primary button. With one button, flex:1 stretches it to fill — natural width keeps the panel tight and consistent with the other report cards.
- Letting `<code>` elements inherit browser-default styling on dark surfaces. Always set explicit `background` + `color` + (ideally) `border` so the pill reads in both themes. Same trap caught `.scout-adetail-headbit-mono` here.
- `automation/v1/automations/{id}?view=categoryinfo` as the folder source for AUTOMATIONS. That param works on activities (queries, scripts, etc.) and returns `folderLocationText`, but the same param on the automations endpoint does NOT return a folder field. Use `legacy/v1/beta/bulk/automations/automation/definition/{id}` and read `def.folderPath || def.categoryPath`.
- Letting docs drift behind the implementation. `index.html` is the public face — when feature shape changes, the matching section gets a same-PR update.

---

## 2026-05-19 — Report consolidation: in-blob CSV button, asset 403 fix, journey Entry DE join, automation enrichment

**Problem cluster:**
1. **Assets report broken with 403 EBADCSRFTOKEN** — the report still hit `content-builder.{stack}.marketingcloudapps.com/fuelapi/asset/v1/content/assets/query` which requires a fresh CSRF token. When the captured `cbToken` went stale, the report failed.
2. **Journey report Entry DE column was empty for every journey.** The bulk-search response's `triggers[0].metaData` does NOT include `dataExtensionName` — it has only `eventDefinitionId`. Resolving the DE name requires joining to the event-definition record. We weren't doing that.
3. **Automations report missing steps + folder** even though those columns existed in the table header. Code was reading `a.stepCount` / `a.categoryPath` / `leg.activityCount` / `leg.categoryPath` — none of which the SFMC bulk endpoints actually return. Result: every row showed "—".
4. **CSV export limited to DE** — every other report (Automations / Journeys / Assets / Activities) was view-only. User wanted CSV download available on all reports, moved INTO the generated blob page itself so the panel UI stays tight.

**Fix:**

*Asset report 403:*
- `content.js generateAssetsReport` — switched the bulk-search URL from `content-builder.{stack}.marketingcloudapps.com/fuelapi/...` (CSRF-required) to `mc.{stack}.exacttarget.com/cloud/fuelapi/...` (cookie-only proxy). Removed the `freshCbToken` fetch + `x-csrf-token` header. Same request body shape; no migration cost.

*Journey Entry DE:*
- `content.js generateJourneysReport` — bulk-fetches all event definitions once (`/interaction/v1/eventDefinitions?$sort=createdDate desc&$pageSize=1000&$page=1`) and builds an index keyed by both `id` (lowercased) and `eventDefinitionKey`. For each journey row, `resolveEntryDe(j)` checks `triggers[0].metaData.dataExtensionName` first (rare inline case), then falls back to the eventDef join via `eventDefinitionId`. Same pattern DEUsageHandler uses for journey DE lookup.

*Automations report enrichment:*
- After the initial bulk fetch + legacy merge, fires parallel `automation/v1/automations/{id}?view=categoryinfo` GETs for every automation. Extracts `folderLocationText` → `_folderPath` (when not already set from legacy) and `steps.length` → `_stepCount`. HTTP/2 multiplexes; wall-time cost ≈ one extra request for hundreds of automations. Status line shows "Enriching N automations…" while in flight.

*CSV in every report blob:*
- `content.js reportHtmlShell` — added 9th `csvData` parameter `{ headers, rows }`. When present:
  - Renders a "Download CSV" button in the report header (accent-filled, download-arrow icon)
  - Embeds the data as JSON inside a `<script>` (escaped `</script>` via `<`)
  - Client-side `_downloadCsv()` builds the CSV with UTF-8 BOM, proper quote escaping (`"`, `,`, `\n`, `\r`), and triggers a `<a download>` click — wholly self-contained, no extension round-trip
  - File name: `{Report_Title}_{timestamp}.csv`
- `generateAutomationsReport`, `generateJourneysReport`, `generateAssetsReport`, `generateActivitiesReport` — each builds a `csvData` object alongside the HTML rows and passes it as the 9th arg.
- `services/DEReportService.js` — added matching `<button id="report-csv-btn">` + style block + embedded CSV via `buildDeCsvData(allDeData)`. Header CSV available on the DE report too.
- `content.js renderDEReport` + the Reports → DE tab — removed the standalone panel "Export CSV" buttons; only "View HTML Report" remains. CSV now flows through the blob's in-page button per the user's "move it inside" request.

*Activities report enrichment:*
- Parallel hydration via `?view=categoryinfo` on all 7 activity-type endpoints, same pattern as activity search. Adds Update Type + Folder columns.

**Verified by:** TBD — user testing required.

**Never regress to:**
- **Asset report on `content-builder.{stack}.marketingcloudapps.com/fuelapi/...`.** That path requires a fresh CSRF token; the `mc.{stack}.exacttarget.com/cloud/fuelapi/...` cookie-only proxy works for the same `/asset/v1/content/assets/query` endpoint. Stale tokens → 403; stale cookies don't happen because they refresh on every SFMC tab navigation.
- **Reading `triggers[0].metaData.dataExtensionName` as the Entry DE source.** That field is empty 99% of the time. Always bulk-fetch `/interaction/v1/eventDefinitions` and join by `eventDefinitionId`.
- **Trusting `legacy.activityCount` / `legacy.categoryPath` / `a.stepCount` / `a.categoryPath` for automation enrichment.** None of those fields are reliably populated by the SFMC list endpoints. The only reliable source is `automation/v1/automations/{id}?view=categoryinfo` per row — same pattern as activities.
- **Standalone panel "Export CSV" buttons in addition to the in-blob button.** User explicitly asked for the CSV to live INSIDE the report blob (top header). Reintroducing a panel-side CSV button duplicates the UX.
- **Sequential hydration** for the per-row `?view=categoryinfo` calls in any of the report generators. Use `Promise.allSettled` — HTTP/2 multiplexes; 500 parallel ≈ 1 wall-time request worth.

---

## 2026-05-19 — Activity search rows now show folder + update type inline

**Problem:** Main search results for activities (SQL Query / Script / Filter / Send Email / Import / File Transfer / Data Extract) showed only the activity type label + modified date in the meta line. No folder location, no SQL update mode — both visible in the SFMC UI and useful at-a-glance scan signals.

**Fix:** `handlers/search/ActivitySearchService.js`:
1. **Free fields from bulk listing** — captured `targetUpdateTypeName` and `categoryId` from each item in the initial activity-type search (already present in the response payload).
2. **Folder hydration via parallel `?view=categoryinfo`** — after the initial search completes, fires per-row GETs against the same 7 endpoint families (`queries`, `scripts`, `filters`, `imports`, `filetransfers`, `dataextracts`, `emailsenddefinition`) with `?view=categoryinfo` appended. SFMC returns `folderLocationText` (e.g. "Query/Production Team/Aldorino/X") which we convert to " / "-separated form for display. Up to 40 parallel fetches; HTTP/2 multiplexes so wall-time cost is ≈ one extra request, not 40×. Failures silent (row keeps null path).
3. **Update mode also hydrated** as a fallback for endpoints that don't return it inline (the bulk SQL listing already has it; the per-row hydration covers Imports/Extracts when needed).
4. `_hydrationKey` is the address used for the per-row call (queries use objectId, others use customerKey). Stripped from the response before sending back over the message bus.

`content.js renderSearchRows` — added an `else if (r.type === 'activity')` branch:
- Line 1: type · folder breadcrumb · update-mode pill
- Line 2: modified date
- Update mode rendered as a small `.scout-result-row-pill` (8px tall, mono-uppercase, light bg) so it reads at a glance without competing with the row name.

`panel.css` — added `.scout-result-row-pill` definition.

**Verified by:** TBD — user testing required.

**Never regress to:**
- Sequential per-row hydration calls. Use `Promise.allSettled` over all results so HTTP/2 multiplexes — sequential turns 40 × 50 ms into 40 × 200 ms even though parallel would still finish in ~200 ms.
- Sending the internal `_hydrationKey` over the chrome.runtime message bus. It's an implementation detail of the hydration pass — delete it before returning so the row payload stays clean.
- Using `categoryId` alone to build a folder breadcrumb client-side for activities. `folderLocationText` is a pre-built breadcrumb from `?view=categoryinfo` — using it avoids a separate "fetch all automation categories + walk parentIds" step.

---

## 2026-05-19 — HTML reports + activity detail: parity with the new card features

**Problem:** The HTML reports for journeys and assets still showed the old column shape — none of the new useful fields (population, HTS, trigger type, Email ID, full folder path) made it into the static reports. Activity detail viewer was missing folder location entirely and didn't surface SQL `targetUpdateTypeName` even though SFMC's own UI shows it.

**Insight from HAR (`mc.s11.exacttarget.com.har`):** SFMC's UI requests activity detail with `?view=categoryinfo` query param. Response includes:
- `folderLocationText: "Query/Production Team/Aldorino Rrushi/SafetyLeadership Journey"` — full breadcrumb in one field, no folder-tree walk needed.
- `targetUpdateTypeName: "Overwrite"` (or Append / Update / Update Add) — the SQL/Import/Extract target update mode.
- `validatedQueryText` — compiled SQL with INSERT INTO + qualified table names.
- `parentCategoryId: [...]` — parent chain.

The same `?view=categoryinfo` works for every activity endpoint family (`queries`, `scripts`, `filters`, `imports`, `filetransfers`, `dataextracts`, `emailsenddefinition`) — consistent SFMC pattern.

**Fix:**

*Journeys report:*
- `content.js generateJourneysReport` — dropped Key + Created columns (noise in a report). Added: `HTS` (small blue pill if `metaData.highThroughputSending.email`), `Trigger` (`triggers[0].type`), `Entry DE` (`triggers[0].metaData.dataExtensionName` when inline), `Population` (`stats.cumulativePopulation`, right-aligned, locale-formatted). New column order: Name · Status · v · HTS · Trigger · Entry DE · Population · Channel · Modified.

*Assets report:*
- `content.js generateAssetsReport` — fetches `/asset/v1/content/categories?$page=1&$pagesize=500` once at the start of the report (cookie-only proxy). Builds an in-memory category map and walks `parentId` chains to render the full folder breadcrumb (e.g. "Content Builder / Email / API_Email") in the Folder column.
- Added `Email ID` column (right-aligned mono, `data.email.legacy.legacyId`) — only populated for email assets, dashes elsewhere.
- Name cell is now a clickable CDN link when `fileProperties.publishedURL` is present — turns the report into a one-click asset audit for uploaded files. Subtle underline, inherits report row color.

*Activity detail viewer:*
- `content.js renderActivityDetail` endpoint map — appended `?view=categoryinfo` to all 7 activity-type endpoints (queries / scripts / filters / imports / filetransfers / dataextracts / emailsenddefinition).
- Header info grid now shows: `Update Type` row (from `targetUpdateTypeName` — Overwrite / Append / Update / Update Add) and `Folder` row spanning full width (from `folderLocationText`, rendered with " / " separators for readability).

**Verified by:** TBD — user testing required.

**Never regress to:**
- Reports that copy only the search payload's top-level fields. SFMC bulk-search responses include `stats.cumulativePopulation`, `metaData.highThroughputSending.email`, `triggers[0]` (with `type` and inline DE meta) — all reportable without per-row fetches. Skipping them throws away free signal.
- Per-row fetch to derive activity folder paths. `?view=categoryinfo` returns the full breadcrumb in `folderLocationText` directly. The flat path is the standard SFMC pattern — don't reinvent it via parentId traversal for activities.
- Bulk-fetching `/asset/v1/content/categories` per row when generating reports. Fetch once at the top of the report function, build a Map, walk parentIds in memory — same idea used for the in-panel asset detail card.
- Hiding `targetUpdateTypeName` from the activity detail. For SQL/Import/Extract activities, the update mode (Overwrite vs Append vs Update) is critical operational info — never just "what does this run?".

---

## 2026-05-19 — Journey/asset card iteration: schedule fix, quieter asset card, full folder path, template preview, activity-count from interaction GET

**Problem cluster (user feedback after first detail-card rollout):**

Journey card:
1. **Schedule rendered as "No Schedule" for every journey** even when the eventDef had a fully populated recurring schedule (e.g. `frequency: Hourly`, `interval: 1`, `endDateTime`, `timeZone`).
2. External Key row was noise — never useful at a glance.
3. Entry Source row's DE GUID code-pill was clutter.
4. `entryMode` in row meta ("SingleEntryAcrossAllVersions") meant nothing to anyone.
5. Population fetched via a separate `goalstatistics` GET when the bulk-search payload already had `stats.cumulativePopulation`.
6. Activity count off — needed to match the SFMC UI "Activity Count: 3" badge, not the goal-stats-derived `days[].activities[]` filtering.
7. Entry Criteria displayed as a single-line code pill — wrapped poorly for long AND/OR filter expressions.

Asset/email card:
1. **Template preview 404'd** — `/artifacts/thumbnail/html` is email-only; templates use `/artifacts/thumbnail/` (no /html).
2. Card felt heavy — big stat-pill strip (Status / Email ID / Size / Dimensions) + buttons + Customer Key row. User wanted "quieter".
3. `Type: id 197` code pill in the detail card was meaningless.
4. Folder only showed the leaf category name ("Email"), not the full path ("Content Builder / Email / API_Email").
5. Asset ID wasn't on the search-result row meta line — user wanted it inline there alongside Email ID for emails.

**Root cause for the schedule bug:** `humanizeJourneySchedule` short-circuited on `metaData.scheduleState === 'No Schedule'` — but the SFMC API populates `scheduleState='No Schedule'` even when the actual `schedule` object has full data (`frequency`, `startDateTime`, `interval`, `endDateTime` etc.). The scheduleState text is unreliable — the only correct signal is whether the `schedule` object's data fields are populated.

**Fix:**
1. `content.js humanizeJourneySchedule` — removed the `scheduleState === 'No Schedule'` short-circuit entirely. Now decides "schedule present?" by checking `schedule.frequency || schedule.startDateTime || flowMode in {runOnce, recurring}`. Recurring branch handles `Hourly/Daily/Weekly/Monthly` with `interval` ("Hourly" / "Every 2 days"), formats start/end dates, appends timezone. Falls back to "Run Once" for runOnce flow mode.
2. `content.js renderJourneyDetail` — dropped External Key row, dropped DE-ID code pill in Entry Source (kept type chip + DE name), dropped `Linked Automation` (already done in prior pass) + ctx line.
3. `content.js renderSearchRows` journey branch — dropped `entryMode` and external-key snippet from the row meta line.
4. `handlers/de/DEUsageHandler.js` — added `handleFetchJourneyInteractionDetail` that GETs `/interactions/{id}?extras=all&includeStops=true&versionNumber=N` (cookie-only proxy works). Returns the journey including the full `activities[]` array.
5. `content.js extractInteractionActivityCount(detail)` — counts entries in `activities[]` where `type` is set (unconfigured/placeholder activities have no type and are excluded). This matches the SFMC UI's "Activity Count" badge exactly.
6. `content.js loadJourneyDetail` — replaced goal-stats fetch with `fetchJourneyInteractionDetail`. Population now read directly from `j.stats.cumulativePopulation` (search payload — no fetch). Both eventDef + interaction-detail fire in parallel via `Promise.allSettled`.
7. `content.js renderJourneyDetail` — Entry Criteria row now a multi-line `<pre class="scout-jdetail-codeblock">` block that wraps long AND/OR filter expressions properly.
8. `handlers/search/AssetSearchService.js handleFetchAssetPreview` — now accepts `assetTypeName`. If type is `template` or `emailtemplate`, requests `/artifacts/thumbnail/` (no /html). Otherwise requests `/artifacts/thumbnail/html?includeHeaderFooter=true&includeDesignContent=true`. Note: `templatebasedemail` is an EMAIL, not a template — only `template`/`emailtemplate` use the bare variant.
9. `handlers/search/AssetSearchService.js` — new `handleFetchAssetCategories` handler hitting `/asset/v1/content/categories?$page=1&$pagesize=500`. Returns all categories with id/name/parentId so we can walk the chain client-side.
10. `content.js ensureAssetCategoryTree(instance)` — fetches the full category tree once per session (in-flight Promise dedupe so multiple simultaneous expands share one network call). `buildFolderPath(categoryId, fallbackName)` walks `parentId` up the chain to build "Content Builder / Email / API_Email" (limit depth 20, dedupe via `seen` Set).
11. `content.js renderAssetDetail` — rewritten quieter: NO stat strip (Status / Customer Key dropped entirely), inline header-meta strip with Email ID / Size / Dimensions as small mono-uppercase labelled text. Type row no longer has `id N` follower. Folder row uses the full resolved path. Actions are inline text links (Preview · View image · Copy name) with dot separators — not buttons.
12. `content.js renderSearchRows` asset/email branch — added `ID: {assetId}` and (when applicable) `Email ID: {legacyId}` to the row meta line.
13. `panel.css` — replaced `.scout-asset-actions` + `.scout-asset-action` button styles with `.scout-adetail-link` (text-link variant) + `.scout-adetail-action-sep` (dot separator) + `.scout-adetail-headmeta` / `.scout-adetail-headbit` / `.scout-adetail-headbit-mono` for the inline meta strip. Added `.scout-jdetail-codeblock` for journey criteria.

**Verified by:** TBD — user testing required.

**Never regress to:**
- **Trusting `metaData.scheduleState === 'No Schedule'`** as the gatekeeper for rendering a schedule. The API populates that field misleadingly. Only trust `schedule.frequency` / `schedule.startDateTime` to decide whether to render.
- Using `/artifacts/thumbnail/html` for templates (`assetTypeName === 'template'`). That endpoint 404s on pure templates; they need the bare `/artifacts/thumbnail/`. `templatebasedemail` is NOT a template — it's an email — and uses /html.
- Goal-statistics for journey activity count. The correct source is `interactions/{id}?extras=all` → `activities[]` filtered by `type`. Goal-stats inflates the count with `StartActivity` / `EmailAudience` / `StopInteractionActivity` plumbing rows that aren't in the UI count.
- Per-row GET to derive `cumulativePopulation`. The bulk-search response already includes it at `items[].stats.cumulativePopulation` — no extra fetch needed.
- Showing `assetTypeId` as an `id N` code pill in the detail card. Asset type IDs are internal — users don't think in those terms. Show only the friendly assetType displayName chip.
- Re-introducing the Status pill / Customer Key row on the asset detail card. User explicitly flagged both as visual noise.
- Single-line code pill for entry-criteria filter strings. Use a multi-line wrapping `<pre>` so long AND/OR clauses don't truncate.
- Returning only the leaf category name as the asset folder. Walk the full parent chain via `ensureAssetCategoryTree` / `buildFolderPath` to surface the full breadcrumb like SFMC's own UI.

---

## 2026-05-19 — Asset rows: inline detail card + rendered-HTML preview modal

**Problem:** Email / template / file rows in main search showed only name + modified date. Power users needed: the legacy Email ID (the integer "EmailID" Email Studio surfaces), file size + dimensions for uploads, the published CDN URL for view-in-browser, and a way to preview a rendered email/template thumbnail without leaving the panel. Visual style also needed to match the polished journey detail card so the two felt like siblings.

**Root cause:** `AssetSearchService` was only forwarding `id / name / assetType / path / modified*` from the search response. The bulk `/asset/v1/content/assets/query` endpoint actually returns `status.name`, `data.email.legacy.legacyId`, `fileProperties.{publishedURL,fileName,fileSize,width,height,extension}`, `customerKey`, `description`, `objectID`, `assetType.id` — all in the same payload. No extra GET needed for the basics. Only the rendered preview required a separate fetch.

**Fix:**
1. `handlers/search/AssetSearchService.js` — extended the mapped output to include `status` / `legacyId` / `customerKey` / `objectID` / `assetTypeName` / `assetTypeId` / `description` plus the entire `fileProperties` block (`publishedURL`, `fileName`, `fileSize`, `fileWidth`, `fileHeight`, `fileExtension`). All sourced from the existing bulk-search response payload — no second fetch per row.
2. `handlers/search/AssetSearchService.js` — new exported handler `handleFetchAssetPreview({ assetId, instance })`. Hits `/asset/v1/content/assets/{id}/artifacts/thumbnail/html?includeHeaderFooter=true&includeDesignContent=true` cookie-only on the `mc.{stack}.exacttarget.com/cloud/fuelapi/...` proxy. Returns `{ width, height, image }` where `image` is a raw base64 PNG payload.
3. `background.js` — imported `handleFetchAssetPreview`, routed via `action: 'fetchAssetPreview'`.
4. `content.js`:
   - State: `S.assetExpanded` (Set of asset IDs currently expanded inline).
   - Helpers: `getAssetCategory(item)` data-driven classification (email / template / file / code / other based on presence of `publishedURL` + `legacyId` + assetType name keywords — not a brittle ID list). `formatFileSize(bytes)`. `ASSET_STATUS_COLOR` legend.
   - `_assetPreviewCache` Map keyed by assetId — preview fetches dedupe per session.
   - `fetchAssetPreview(assetId, instance)` thin wrapper around `chrome.runtime.sendMessage`.
   - `renderAssetDetail(item)` builds an inline card with the same `.scout-jdetail-stats` strip + `.scout-jdetail-row` shape used by the journey card. Stat strip shows Status / Email ID / File Size / Dimensions. Field rows show Type / Folder / Created / Modified / File Name / Customer Key / Description. Action row shows context-appropriate buttons (Preview / View image / Copy name).
   - `showAssetPreviewModal(assetId, name)` injects a fullscreen overlay with backdrop-blur, fetches the base64 PNG via the new handler, renders it inside a modal card. Escape + click-outside both close.
   - Renderer change in `renderSearchRows()`: asset/email rows now toggle between chevron-right and chevron-down based on `S.assetExpanded` state; expanded rows append `renderAssetDetail(r)` below.
   - Click change in `bindSearchRowEvents()`: asset/email row click now toggles inline expand (was click-to-copy). Copy-name is now a button inside the expanded card. Preview/View-file buttons + mono-pill click-to-copy bound separately.
   - New icons: `I.eye` (Iconoir eye) for Preview, `I.image` (Iconoir image) for View-image.
5. `panel.css`:
   - `.scout-asset-detail` reuses the journey card's `.scout-jdetail-*` styles (stat strip + row grid).
   - `.scout-asset-actions` action-row with `.scout-asset-action` outline buttons + `.scout-asset-action-primary` accent-filled buttons. Hover lifts to accent.
   - `.scout-preview-overlay` full-screen backdrop with `backdrop-filter: blur(2px)`, fade-in 160 ms.
   - `.scout-preview-modal` centered card, scale-in 200 ms, soft elevation, white image background so transparent PNGs read correctly.
   - `.scout-preview-img` max-width responsive.

**Verified by:** TBD — user testing required.

**Never regress to:**
- Mapping asset rows with only `id / name / assetType / modifiedDate`. The bulk-search payload already contains everything — leaving fields off requires a per-row GET, which is wasteful.
- Per-row `GET /asset/v1/content/assets/{id}` to derive `status` / `legacyId` / `fileProperties` for the detail card. Those come back in the bulk-search response — the per-row fetch is reserved for the rendered preview only.
- Hardcoding asset type IDs to classify. SFMC has 200+ asset types; classify by presence of `publishedURL` (file) / `legacyId` or "email" in type name (email) / "template" in type name (template) / "block"/"snippet" in type name (code) instead.
- Click-to-copy-on-row for asset/email. Row click now toggles inline expand. Copy-name is a button inside the expanded card. This unifies behaviour with the journey expand pattern.
- Fetching the preview PNG eagerly on row expand. Fetch only on Preview button click; cache by assetId in `_assetPreviewCache` so re-opens are instant.
- Skipping `includeHeaderFooter=true&includeDesignContent=true` on the thumbnail endpoint. Without those query params the preview omits the global header/footer + design slots — the resulting render doesn't match what SFMC's own UI shows.

---

## 2026-05-18 — Journey detail card polish: activity count, stat strip, dropped Linked Automation + ctx line

**Problem:** User feedback on the detail card after first iteration:
1. **Linked Automation** row was noise. The `evDef.automationId` rarely matches a meaningful automation in JB's UI flow — usually points to a hidden interaction-system automation users can't navigate to.
2. **"Category: Audience · Used by 1 interaction"** ctx line was meaningless to the user — they didn't know what it referred to.
3. Real ask was **count of user-built activities in the journey** (not estimated population — that was my misread). Get from goal-stats `days[].activities[]`, but skip SFMC plumbing types `StartActivity` / `EmailAudience` / `StopInteractionActivity`.
4. Visual polish — the card needed to look at home next to the rest of the panel's components (step cards, code blocks, automation detail) rather than feeling like a separate stylistic island.

**Fix:**
1. `content.js` — added `extractJourneyActivityCount(goalStats)` that walks `days[].activities[]`, dedupes by `activityId` (same activity can appear on multiple days for long journeys), excludes the three plumbing types listed in `_JOURNEY_ACTIVITY_PLUMBING`. Stored as `state.activityCount`. Kept `extractEstPopulation` — both stats now render side-by-side in a top strip.
2. `renderJourneyDetail` — dropped the Linked Automation row, dropped the Category/interactionCount/lastPublished ctx row, kept Entry Source / Entry Criteria / Schedule / External Key / Description. Activity Count + Est. Population shown as accent-tinted stat pills at the top.
3. `panel.css` — full rewrite of the `.scout-journey-detail` block to use the app's `--s-*` tokens consistently: `--s-radius` for corners, `--s-accent` + `--s-accent-dim` for stats and chips, `--s-mono` for labels and technical strings, `--s-border` / `--s-border-mid` for hairlines. Added `.scout-jdetail-stats` strip and `.scout-jdetail-stat` pills (large mono number + uppercase mono label, mirrors the `.scout-step-card-num` accent-tinted treatment used in automation steps). Tighter row spacing (96px mono uppercase label column · flex-wrap value column with gap). "Open in JB" button now uses accent on hover (was muted text-3). Removed inline rgba fallbacks in favour of the actual `--s-*` tokens.
4. Removed `.scout-jdetail-autolink` CSS + both autolink click handlers in `bindSearchRowEvents` and `bindUsageInteractions` (the button no longer exists).

Both call sites (main search rows + DE Usage `Used by → Journeys`) share the same `renderJourneyDetail` and therefore inherit the polish automatically.

**Verified by:** TBD — user testing required.

**Never regress to:**
- **Including `StartActivity` / `EmailAudience` / `StopInteractionActivity` in the activity count.** Those are SFMC plumbing every journey has — including them inflates the count by 3 for trivial journeys. The user's count of "actual activities" excludes them.
- Counting `activityId` more than once across days. Long-running journeys (with wait steps) duplicate activity rows per day in goal-stats; dedupe via the `seen` Set.
- Re-adding the "Linked Automation" row or the "Category: X · Used by N interactions" ctx line. Both were flagged as noise.
- Hardcoded fallback rgbas in the journey card CSS (`rgba(127,127,127,0.08)` etc.). Use the `--s-*` tokens directly so theme switching stays consistent with the rest of the panel.
- Building a third call site that copies `renderJourneyDetail`'s logic. Both search + usage share the function; any new context (e.g. a future journey grid in Reports) must go through the same renderer.

---

## 2026-05-18 — Journey detail card: fixed `mc.mc.s11` URL, added est. population + entry criteria, Draft = amber

**Problem:** Three issues from demo testing:
1. Clicking any journey row showed `Couldn't load event definition: No data returned`. Network panel showed no traffic.
2. Draft journeys rendered with a grey pill — didn't match the amber "Draft" pill used elsewhere (Activity report) and SFMC's own JB UI.
3. Detail card didn't show the entry-criteria filter description (e.g. "EmailAddress contains arrushi") or the journey's estimated population — both visible in SFMC's own UI.

**Root cause:**
1. **Malformed URL.** `handleFetchJourneyEventDefinition` in `DEUsageHandler.js` did `https://mc.${sfmcInstance}.exacttarget.com/...` without stripping a leading `mc.` from the instance string. Content.js passes `instance='mc.s11'`, so the URL became `mc.mc.s11.exacttarget.com/...` → DNS fail → fetch caught at network layer → handler returned `success:false` → UI showed "No data returned." The eventDefinitionId IS being correctly extracted from the search payload's `triggers[0].metaData.eventDefinitionId` — only the URL was malformed.
2. Draft was mapped to `#64748b` (slate) in `JOURNEY_STATUS_COLOR`. Other "in-flux" statuses (Paused, Unpublished) already used `#b06f00` (amber).
3. The eventDefinitionId GET already returns `metaData.criteriaDescription`, but we weren't rendering it. The journey's row count comes from a separate endpoint (`/interaction/v1/goalstatistics/{journeyId}?versionNumber={N}` → `days[0].activities[0].cumulativePopulationForDay`) that wasn't wired up at all.

**Fix:**
1. `handlers/de/DEUsageHandler.js handleFetchJourneyEventDefinition`: `instance.replace(/^mc\./, '')` before prepending `mc.`. Now produces `mc.s11.exacttarget.com/...` regardless of whether the caller passes `mc.s11` or `s11`.
2. Added new handler `handleFetchJourneyGoalStats` that hits `/interaction/v1/goalstatistics/{interactionId}?versionNumber={ver}` cookie-only. Exported through `handlers/de/index.js`, routed in `background.js` via `action: 'fetchJourneyGoalStats'`.
3. Added `triggerDescription` to `JourneySearchService.search()` output — populated from `triggers[0].description` (the criteria string, when the trigger carries one).
4. `content.js`:
   - Added `_goalStatsCache` Map + `fetchJourneyGoalStats(interactionId, versionNumber, instance)`.
   - Added `extractEstPopulation(goalStats)` that prefers `StartActivity` row's `cumulativePopulationForDay`, falls back to first row.
   - `loadJourneyDetail` now fires `Promise.allSettled([fetchJourneyEventDef, fetchJourneyGoalStats])` — both independent; either can fail without blocking the other.
   - `renderJourneyDetail` now shows: **Est. Population** row (first, with cumulative-contacts subtext) · **Entry Criteria** row (from `evDef.metaData.criteriaDescription`, fallback to `j.triggerDescription`). All other rows unchanged.
   - `JOURNEY_STATUS_COLOR['Draft'] = '#b06f00'` (amber).
5. `panel.css`: `.scout-jdetail-criteria` (monospace pill for criteria string) + `.scout-jdetail-sub-inline` (lighter inline subtext for est. population context).

**Verified by:** TBD — user testing required.

**Never regress to:**
- **Hardcoding `mc.${instance}` without stripping `mc.` first.** Every SFMC-host URL builder must `.replace(/^mc\./, '')` before prepending. The double-prefix bug surfaces as "No data returned" because the fetch fails DNS resolution silently.
- Treating "No data returned" as missing API support — always check the URL the handler actually built first.
- Grey Draft pill. Draft uses `#b06f00` (amber) project-wide (see `STATUS_COLORS` / `JOURNEY_STATUS_COLOR` / Activity Report).
- Calling `eventDefinitions/{id}` alone when expanding a journey. Always pair with `goalstatistics/{id}?versionNumber={N}` (parallel via `Promise.allSettled`) — the est. population is what makes the card useful at a glance.
- Reading `cumulativePopulationForDay` from a random day. Use `days[0]` (entry day) and prefer the `StartActivity` row — that's the one whose count matches SFMC's UI badge.

---

## 2026-05-18 — Activity report viewer now matches automation tab's code-block theme

**Problem:** Opening a SQL Query or Script activity from the Reports → Activities list rendered the body in a raw `<pre>` with inline styles — no header, no language label, no Copy button, no syntax highlighting. The Automations tab's step viewer (same content type) renders the same SQL/SSJS with a header bar, lang chip, Copy button, and color-coded SQL/SSJS keywords. The visual mismatch made the activity viewer feel half-finished.

**Root cause:** `renderActivityDetail` in `content.js` built its own `preStyle` + `labelStyle` inline strings and called `escHtml(queryText)` directly into a `<pre>`. The automation tab's `renderCodeContent(step)` already uses a shared `.scout-code-block` shape with `highlightSQL` / `highlightJavaScript`, and panel.css owns those classes for both themes. The two paths drifted independently.

**Fix:** Refactored `renderActivityDetail` to emit the same HTML shape as `renderCodeContent`:
1. SQL Query → `<div class="scout-code-block">` with `.scout-code-header` (SQL chip + Copy button) and `.scout-code-highlighted` running through `highlightSQL()`.
2. Script → same block with SSJS lang label running through `highlightJavaScript()`.
3. Metadata-only activities (Send Email, Import, Data Extract, File Transfer, Filter) → `.scout-activity-meta-panel` + `.scout-meta-table` (same shape the automation tab uses for non-code activities), including a `.scout-activity-type-badge` heading and `.scout-activity-desc` description row.
4. Bound `.scout-code-copy` click handler on the activity-detail container after innerHTML — mirrors the delegated handler in `renderAutomationDetail`.

Removed: every `preStyle` / `labelStyle` inline string and every `style="..."` inline block in the activity body. The classes own both light + dark theming via panel.css.

**Verified by:** TBD — user testing required.

**Never regress to:**
- Building inline `style="font-family:monospace;background:var(--s-bg-2);..."` for activity code bodies. The `.scout-code-block` / `.scout-code-highlighted` classes own the theme. Inline styles bypass theme switching and produce a visual mismatch with the automation tab.
- Rendering metadata-only activities (Send Email, Import, Data Extract, File Transfer, Filter) as a raw grid of `<div>`s. Use `.scout-activity-meta-panel` + `.scout-meta-table` — same shape as the automation tab.
- Skipping the `.scout-code-text` hidden span — the Copy button reads from it. Without that span, Copy silently grabs nothing.
- Calling `escHtml(code)` directly without `highlightSQL` / `highlightJavaScript`. The keyword highlighting is what makes the viewer feel like a code viewer rather than a text dump.

---

## 2026-05-18 — Inline journey detail card (entry source, schedule, linked automation, external key)

**Problem:** Even with status/version/HTS pills on journey rows, the user still had to leave the panel and open Journey Builder to see entry source DE, schedule (one-time vs recurring, start date, timezone), linked automation, or the eventDefinitionKey (externalKey). Demo flow was broken by the round-trip.

**Root cause:** Not a bug — the journey list response stops at `triggers[0].metaData.eventDefinitionId`. The remaining context (data extension name, `metaData.scheduleState`, `schedule.startDateTime/frequency/timeZone`, `automationId`) lives on the per-event-definition GET: `interaction/v1/eventDefinitions/{id}`. That endpoint already works cookie-only via `mc.{stack}.exacttarget.com/cloud/fuelapi/...` and a handler (`handleFetchJourneyEventDefinition`) was already wired in `background.js` — just not used from the UI.

**Fix:**
1. `content.js` — added `_evDefCache` Map (eventDefId → eventDef, session-scoped) + `fetchJourneyEventDef(id, instance)` that calls the existing handler.
2. Added `humanizeJourneySchedule(evDef)` mapping `metaData.scheduleFlowMode` + `runOnceScheduleMode` + `schedule.*` into "One-Time Schedule / Run On: 8/15/2025 10:30 AM India Standard Time" / "Every N Days · M occurrences · Ends: Occurrences" / "No Schedule".
3. Added `renderJourneyDetail(j, state)` that shows Entry Source (type + DE name + DE ID), Schedule (humanized + raw bits), External Key (click-to-copy), Linked Automation (deep-link to automations tab), Category + interaction count + last published date, and Description. Header has an "Open in JB" button.
4. State held in `S.journeyExpanded` (Set of journey IDs) + `S.journeyDetailState` (Map of state per id). Same expand state drives both main search rows AND DE Usage journey rows — expanding in one place opens the card in both.
5. Wired into `renderSearchRows()` — journey row click toggles expand (no longer opens URL; that's now a button inside the card). Chevron arrow flips on expand.
6. Wired into DE Usage `renderUsageDetail('journeys', ...)` — same expand pattern with absolute-positioned chevron.
7. `panel.css` — `.scout-journey-detail` card + `.scout-jdetail-*` row/label/value/mono/tag styles, theme-aware via existing `--s-*` tokens. Soft slide-in animation. Expanded rows get a subtle bg tint.

**Verified by:** TBD — user testing required.

**Never regress to:**
- Replacing the journey row click handler with `window.open(item.url)` for main search — that was the pre-Phase-C behavior. Click toggles the inline card; external open is the "Open in JB" button inside it.
- Calling `interaction/v1/eventDefinitions/{id}` from anywhere other than `handleFetchJourneyEventDefinition` (it's the single message route in `background.js`). Don't fetch directly from content.js — the cookie-only proxy works but the handler centralises retry/instance handling.
- Removing the `_evDefCache` — expanding a row twice should be instant on the second open. Without the cache, every expand fires a network call.
- Hardcoding theme colors in detail card CSS. Use `var(--s-bg-1)` / `var(--s-text)` / `var(--s-border-1)` so dark + light render the same hierarchy.

---

## 2026-05-18 — Journey rows now show status / version / HTS / channel pills

**Problem:** During demo, journey rows in both main search and the DE "Used by" panel showed only name + version. Users couldn't see at a glance whether a journey was Draft / Running / Stopped, what channel, what trigger type, or whether HTS (high-throughput sending) was enabled — info SFMC's own UI surfaces inline.

**Root cause:** Not a bug — the journey API response includes all of `status`, `channel`, `definitionType`, `entryMode`, `executionMode`, `metaData.highThroughputSending.email`, `triggers[0].type`, `triggers[0].metaData.eventDefinitionId`, etc., but `JourneySearchService.search()` and `DEUsageHandler` journey handlers were only forwarding `id / name / version / status / modifiedDate`. The UI never had the rest to render.

**Fix:**
1. `handlers/search/JourneySearchService.js` — expanded the mapped output to include `key` (externalKey), `channel`, `definitionType`, `entryMode`, `executionMode`, `isHTS`, `triggerType`, `triggerName`, `eventDefinitionId`, `eventDefinitionKey`, `dataExtensionId`, `dataExtensionName`, `createdDate`, `lastPublishedDate`, `stats`. Also added `activity,campaigns` to the `extras=` query string to match Journey Builder's UI HAR.
2. `handlers/de/DEUsageHandler.js` — both stream + non-stream journey lookups push the same enriched shape into `matchingJourneys`.
3. `content.js` — added `renderJourneyPills(j, variant)` helper + `JOURNEY_STATUS_COLOR` map. Main search renders status / vN / HTS / channel / definitionType / triggerType pills under journey rows. DE Usage journey items use a compact variant (status / vN / HTS) plus event name + modified date trailing.
4. `panel.css` — added `.scout-jpills` + `.scout-jp` pill styles, plus `.scout-usage-item-journey` vertical-layout override.

**Verified by:** TBD — user testing required.

**Never regress to:**
- Stripping fields out of `JourneySearchService.search()`'s mapped return. Every new field listed above is referenced by the UI; removing one silently breaks a pill.
- Dropping `activity,campaigns` from `extras=` — Journey Builder's UI sends them; the response shape relies on them.
- Inline `style="color: …"` for journey status. Use the `JOURNEY_STATUS_COLOR` map so the legend stays consistent across the panel.

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
