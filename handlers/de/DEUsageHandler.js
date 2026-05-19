// handlers/de/DEUsageHandler.js
import { InstanceService } from '../../utils/InstanceService.js';

// ─── Session-scoped usage index ─────────────────────────────────────────────
// Keyed by instance (e.g. 'mc.s51'). Rebuilt when stale (> 15 min) or manually
// invalidated. Survives across multiple DE panel opens within the same SW lifetime.
const _usageIndex = new Map();
const INDEX_TTL = 15 * 60 * 1000; // 15 minutes

function _getIndex(instance) {
    if (!_usageIndex.has(instance)) {
        _usageIndex.set(instance, {
            automations: new Map(),      // id → full detail object
            journeyList: [],             // all journey objects from last full fetch
            journeyEventDefs: new Map(), // eventDefId → eventDef object
            automationsTs: null,
            journeysTs: null
        });
    }
    return _usageIndex.get(instance);
}

function _isStale(ts) {
    return !ts || (Date.now() - ts) > INDEX_TTL;
}
// ────────────────────────────────────────────────────────────────────────────

const debug = false;

/**
 * Handle fetching DE usage data from SFMC.
 * @param {Object} request - Contains deId and instance
 * @param {Function} sendResponse 
 */
export async function handleFetchDEUsageQueries(request, sendResponse) {
    const { deId, deName, deKey, instance } = request;
    const stack = (instance || 'mc.s51').replace(/^mc\./, '');

    try {
        const url = `https://mc.${stack}.exacttarget.com/cloud/fuelapi/automation/v1/queries/` +
            `?$orderBy=modifiedDate%20desc&retrievalType=1&$pageSize=1000&$page=1`;

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: { 'accept': 'application/json', 'x-requested-with': 'XMLHttpRequest' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const allQueries = data.items || data.entry || [];

        // Filter: query SQL or target must reference this DE by name or key.
        // deId intentionally excluded — internal GUIDs don't appear in SQL text.
        const searchTerms = [deName, deKey].filter(Boolean).map(s => s.toLowerCase());

        const matching = searchTerms.length === 0 ? allQueries : allQueries.filter(q => {
            const sql = (q.queryText || '').toLowerCase();
            const targetName = (q.targetName || '').toLowerCase();
            return searchTerms.some(term => sql.includes(term) || targetName.includes(term));
        });

        sendResponse({ success: true, data: matching, total: allQueries.length });
    } catch (err) {
        sendResponse({ success: false, error: err.message });
    }
}

/**
 * Handle fetching automation data from SFMC and checking for DE usage.
 * @param {Object} request - Contains deId and instance
 * @param {Function} sendResponse 
 */
export async function handleFetchDEUsageAutomations(request, sendResponse) {
    const { deName, deKey, instance } = request;
    const stack = (instance || 'mc.s51').replace(/^mc\./, '');
    const matchSpec = { name: (deName || '').toLowerCase(), key: (deKey || '').toLowerCase() };

    try {
        const listUrl = `https://mc.${stack}.exacttarget.com/cloud/fuelapi/legacy/v1/beta/automations/automation/definition/` +
            `?$sort=lastRunTime%20desc&view=gridView`;
        const listResp = await fetch(listUrl, {
            credentials: 'include',
            headers: { 'accept': 'application/json, text/javascript, */*; q=0.01' }
        });
        if (!listResp.ok) throw new Error(`List HTTP ${listResp.status}`);
        const listData = await listResp.json();
        const automations = listData.entry || listData.items || [];

        const matching = [];
        const BATCH_SIZE = 5;

        for (let i = 0; i < automations.length; i += BATCH_SIZE) {
            const batch = automations.slice(i, i + BATCH_SIZE);
            await Promise.allSettled(batch.map(async (auto) => {
                try {
                    // view=targetObjects → smaller payload (only steps→activities→targetObject)
                    const detailUrl = `https://mc.${stack}.exacttarget.com/cloud/fuelapi/automation/v1/automations/${auto.id}?view=targetObjects`;
                    const detailResp = await fetch(detailUrl, {
                        credentials: 'include',
                        headers: { 'accept': 'application/json, text/javascript, */*; q=0.01' }
                    });
                    if (!detailResp.ok) return;
                    const detail = await detailResp.json();

                    if (automationReferencesDE(detail, matchSpec)) {
                        matching.push({
                            id: auto.id || detail.id,
                            name: detail.name || auto.name,
                            status: detail.status,
                            lastRunTime: auto.lastRunTime || detail.lastRunTime
                        });
                    }
                } catch (_) { /* skip this automation */ }
            }));
        }

        sendResponse({ success: true, data: matching });
    } catch (err) {
        sendResponse({ success: false, error: err.message });
    }
}

/**
 * Streaming version of automation usage lookup.
 * Builds (and caches) a full automation detail index in parallel.
 * Posts progress messages during the first build; subsequent calls within
 * INDEX_TTL are instant in-memory searches.
 *
 * Port message protocol (background → content):
 *   { type: 'progress', done: N, total: M }   — emitted after each detail settles
 *   { type: 'result',   data: Array }          — search complete
 *   { type: 'error',    message: string }      — list fetch failed
 *
 * @param {Object} request  — { deId, deName, deKey, instance }
 * @param {chrome.runtime.Port} port
 */
export async function handleFetchDEUsageAutomationsStream(request, port) {
    const { deName, deKey, instance } = request;
    const stack = (instance || 'mc.s51').replace(/^mc\./, '');
    const matchSpec = { name: (deName || '').toLowerCase(), key: (deKey || '').toLowerCase() };

    const controller = new AbortController();
    const { signal } = controller;
    port.onDisconnect.addListener(() => controller.abort());

    try {
        const idx = _getIndex(instance);

        if (_isStale(idx.automationsTs)) {
            // ── Step A: fetch automation list ───────────────────────────────
            const listUrl =
                `https://mc.${stack}.exacttarget.com/cloud/fuelapi/legacy/v1/beta/automations/automation/definition/?$sort=lastRunTime%20desc&view=gridView`;
            const listResp = await fetch(listUrl, {
                credentials: 'include',
                headers: { 'accept': 'application/json, text/javascript, */*; q=0.01' },
                signal
            });
            if (!listResp.ok) throw new Error(`List HTTP ${listResp.status}`);
            const listData = await listResp.json();
            const automations = listData.entry || listData.items || [];
            const total = automations.length;
            let done = 0;

            // ── Step B: fetch ALL detail requests simultaneously ────────────
            // view=targetObjects → smaller payload (only steps→activities→targetObject)
            idx.automations.clear();
            await Promise.allSettled(
                automations.map(async (auto) => {
                    try {
                        const detailResp = await fetch(
                            `https://mc.${stack}.exacttarget.com/cloud/fuelapi/automation/v1/automations/${auto.id}?view=targetObjects`,
                            {
                                credentials: 'include',
                                headers: { 'accept': 'application/json, text/javascript, */*; q=0.01' },
                                signal
                            }
                        );
                        if (detailResp.ok) {
                            idx.automations.set(auto.id, await detailResp.json());
                        }
                    } catch (_) { /* skip this automation */ }
                    done++;
                    try { port.postMessage({ type: 'progress', done, total }); } catch (_) {}
                })
            );

            // Only stamp the timestamp when the full build completes (not on abort)
            if (!signal.aborted) idx.automationsTs = Date.now();
        }

        if (signal.aborted) return;

        // ── Step C: search index in memory ─────────────────────────────────
        const matching = [];
        for (const [id, detail] of idx.automations) {
            if (automationReferencesDE(detail, matchSpec)) {
                matching.push({
                    id: detail.id || id,
                    name: detail.name,
                    status: detail.status,
                    lastRunTime: detail.lastRunTime || null
                });
            }
        }
        port.postMessage({ type: 'result', data: matching });

    } catch (err) {
        if (err.name === 'AbortError') return;
        try { port.postMessage({ type: 'error', message: err.message }); } catch (_) {}
    }
}

/**
 * Streaming version of journey usage lookup.
 * Fetches all journey pages + event definitions (with per-index cache).
 * Same port message protocol as handleFetchDEUsageAutomationsStream.
 *
 * @param {Object} request  — { deId, deName, instance }
 * @param {chrome.runtime.Port} port
 */
export async function handleFetchDEUsageJourneysStream(request, port) {
    const { deId, deName, instance } = request;
    if (!deId) { try { port.postMessage({ type: 'error', message: 'Missing DE ID' }); } catch (_) {} return; }

    const rawInstance = instance || 'mc.s51';
    const INSTANCE = rawInstance.replace(/^mc\./, '');
    const PAGE_SIZE = 500;

    const controller = new AbortController();
    const { signal } = controller;
    port.onDisconnect.addListener(() => controller.abort());

    try {
        const idx = _getIndex(instance);

        if (_isStale(idx.journeysTs)) {
            // ── Step A: fetch all journey pages ────────────────────────────
            let page = 1;
            let fetched = 0;
            let totalCount = 0;
            idx.journeyList = [];

            do {
                const url =
                    `https://mc.${INSTANCE}.exacttarget.com/cloud/fuelapi/interaction/v1/interactions/` +
                    `?mostRecentVersionOnly=false&mostRecentVersionOrRunningOnly=true` +
                    `&$page=${page}&$pageSize=${PAGE_SIZE}` +
                    `&extras=trigger,stats,tag&$orderBy=modifiedDate%20desc`;
                const resp = await fetch(url, {
                    headers: { 'accept': 'application/json' },
                    credentials: 'include',
                    signal
                });
                if (!resp.ok) break;
                const data = await resp.json();
                if (page === 1) totalCount = data.count || 0;
                const items = data.items || [];
                idx.journeyList.push(...items);
                fetched += items.length;
                try { port.postMessage({ type: 'progress', done: fetched, total: totalCount || fetched }); } catch (_) {}
                if (items.length < PAGE_SIZE || fetched >= totalCount) break;
                page++;
            } while (!signal.aborted);

            // ── Step B: bulk-fetch event definitions in a single page ───────
            // The /eventDefinitions list endpoint accepts $pageSize=1000 and returns
            // every definition for the BU. One request beats N individual lookups.
            const evResp = await fetch(
                `https://mc.${INSTANCE}.exacttarget.com/cloud/fuelapi/interaction/v1/eventDefinitions?$sort=createdDate%20desc&$pageSize=1000&$page=1`,
                { headers: { 'accept': 'application/json' }, credentials: 'include', signal }
            );
            if (evResp.ok) {
                const evData = await evResp.json();
                for (const ev of (evData.items || [])) {
                    if (ev.id) idx.journeyEventDefs.set(ev.id, ev);
                    if (ev.eventDefinitionKey) idx.journeyEventDefs.set(ev.eventDefinitionKey, ev);
                }
                try { port.postMessage({ type: 'progress', done: idx.journeyList.length, total: idx.journeyList.length, evDone: (evData.items || []).length, evTotal: (evData.items || []).length }); } catch (_) {}
            }

            if (!signal.aborted) idx.journeysTs = Date.now();
        }

        if (signal.aborted) return;

        // ── Step C: search index in memory ─────────────────────────────────
        const matchingJourneys = [];
        const enrichedRow = (journey, trigger, evDef) => {
            const tMeta = (trigger && trigger.metaData) || {};
            const hts = !!(journey.metaData &&
                journey.metaData.highThroughputSending &&
                journey.metaData.highThroughputSending.email);
            return {
                id: journey.id,
                key: journey.key || null,
                name: journey.name,
                version: journey.version || 1,
                status: journey.status || 'Unknown',
                channel: journey.channel || '',
                definitionType: journey.definitionType || '',
                entryMode: journey.entryMode || '',
                executionMode: journey.executionMode || '',
                isHTS: hts,
                triggerType: (evDef && evDef.type) || (trigger && trigger.type) || '',
                eventName: (evDef && evDef.name) || (trigger && trigger.name) || '',
                eventType: (evDef && evDef.type) || (trigger && trigger.type) || '',
                eventDefinitionId: tMeta.eventDefinitionId || (evDef && evDef.id) || null,
                eventDefinitionKey: tMeta.eventDefinitionKey || (evDef && evDef.eventDefinitionKey) || null,
                dataExtensionName: (evDef && evDef.dataExtensionName) || deName || '',
                createdDate: journey.createdDate || null,
                modifiedDate: journey.modifiedDate || null,
                lastPublishedDate: journey.lastPublishedDate || null
            };
        };
        for (const journey of idx.journeyList) {
            for (const trigger of (journey.triggers || [])) {
                // Fast path: dataExtensionId is sometimes inline in trigger metadata
                const directDeId = trigger.metaData && trigger.metaData.dataExtensionId;
                if (directDeId && directDeId.toLowerCase() === deId.toLowerCase()) {
                    matchingJourneys.push(enrichedRow(journey, trigger, null));
                    break;
                }
                // Slow path: look up via event definition
                const evId = trigger.metaData && trigger.metaData.eventDefinitionId;
                if (!evId) continue;
                const evDef = idx.journeyEventDefs.get(evId);
                if (!evDef) continue;
                const evDeId = evDef.dataExtensionId ||
                    (evDef.arguments && evDef.arguments.dataExtensionId);
                if (evDeId && evDeId.toLowerCase() === deId.toLowerCase()) {
                    matchingJourneys.push(enrichedRow(journey, trigger, evDef));
                    break; // only include a journey once even if it has multiple matching triggers
                }
            }
        }
        port.postMessage({ type: 'result', data: matchingJourneys });

    } catch (err) {
        if (err.name === 'AbortError') return;
        try { port.postMessage({ type: 'error', message: err.message }); } catch (_) {}
    }
}

// Strict structural match — replaces previous "stringify-and-substring" haystack
// which produced false positives whenever an activity payload happened to contain
// the DE name (e.g. as a comment, label, or unrelated reference).
//
// We match an automation if any activity's targetObject / targetDataExtensions
// names or keys EXACTLY equal the DE we're searching for (case-insensitive).
// SQL FROM-clause references are intentionally NOT matched here — those are
// covered by handleFetchDEUsageQueries which scans queryText.
function automationReferencesDE(automation, matchSpec) {
    const { name, key } = matchSpec;
    const targetMatches = (t) => {
        if (!t) return false;
        const tn = (t.name || '').toLowerCase();
        const tk = (t.key  || t.customerKey || '').toLowerCase();
        return (key  && (tk === key  || tn === key)) ||
               (name && (tn === name || tk === name));
    };

    const steps = automation.steps || automation.automationProcesses || [];
    for (const step of steps) {
        const activities = step.activities || step.stepActivities || [];
        for (const act of activities) {
            // view=targetObjects exposes act.targetObject directly
            if (targetMatches(act.targetObject)) return true;

            // Legacy shape: targetDataExtensions[]
            for (const t of (act.targetDataExtensions || [])) {
                if (targetMatches(t)) return true;
            }
        }
    }
    return false;
}

/**
 * Handle fetching journey data from SFMC and checking for DE usage.
 *
 * The journey trigger only stores metaData.eventDefinitionId — the actual
 * dataExtensionId lives inside the Event Definition itself. So we:
 *   1. Fetch all journeys (paginated)
 *   2. For each journey trigger, fetch its Event Definition (with per-run cache)
 *   3. Match eventDef.dataExtensionId === deId
 *
 * @param {Object} request - Contains deId, deName, instance
 * @param {Function} sendResponse
 */
export async function handleFetchDEUsageJourneys(request, sendResponse) {
    const { deId, deName, instance } = request;
    if (!deId) {
        sendResponse({ success: false, error: 'Missing DE ID' });
        return;
    }

    const rawInstance = instance || await InstanceService.getInstance();
    const INSTANCE = rawInstance.replace(/^mc\./, '');
    const pageSize = 50;
    let currentPage = 1;
    let itemsAll = [];
    let totalCount = 0;

    try {
        // Step 1: Fetch all journeys with trigger extras
        do {
            const url = `https://mc.${INSTANCE}.exacttarget.com/cloud/fuelapi/interaction/v1/interactions/?mostRecentVersionOnly=false&mostRecentVersionOrRunningOnly=true&$page=${currentPage}&$pageSize=50&extras=trigger,stats,tag&$orderBy=modifiedDate%20desc`;
            const response = await fetch(url, {
                headers: { "accept": "application/json" },
                method: "GET",
                credentials: "include"
            });
            if (!response.ok) throw new Error(`Failed to fetch journeys page ${currentPage}: ${response.status}`);
            const data = await response.json();
            if (currentPage === 1) {
                totalCount = data.count || (Array.isArray(data.items) ? data.items.length : 0);
            }
            if (Array.isArray(data.items)) itemsAll.push(...data.items);
            currentPage++;
        } while (itemsAll.length < totalCount);

        // Step 2: bulk-fetch event definitions once, then resolve in-memory.
        // The trigger's metaData.eventDefinitionId is the only link — the DE reference
        // is not present in the journey payload itself, it lives in the event definition.
        const eventDefIndex = {};
        try {
            const bulkUrl = `https://mc.${INSTANCE}.exacttarget.com/cloud/fuelapi/interaction/v1/eventDefinitions?$sort=createdDate%20desc&$pageSize=1000&$page=1`;
            const bulkResp = await fetch(bulkUrl, { headers: { "accept": "application/json" }, credentials: "include" });
            if (bulkResp.ok) {
                const bulkData = await bulkResp.json();
                for (const ev of (bulkData.items || [])) {
                    if (ev.id) eventDefIndex[ev.id] = ev;
                    if (ev.eventDefinitionKey) eventDefIndex[ev.eventDefinitionKey] = ev;
                }
            }
        } catch (_) { /* fall through with empty index */ }

        const matchingJourneys = [];
        for (const journey of itemsAll) {
            for (const trigger of (journey.triggers || [])) {
                const eventDefId = trigger.metaData && trigger.metaData.eventDefinitionId;
                if (!eventDefId) continue;
                const eventDef = eventDefIndex[eventDefId];
                if (!eventDef) continue;

                // The DE link is in eventDef.dataExtensionId or eventDef.arguments.dataExtensionId
                const eventDeId = eventDef.dataExtensionId ||
                    (eventDef.arguments && eventDef.arguments.dataExtensionId);
                if (eventDeId && eventDeId.toLowerCase() === deId.toLowerCase()) {
                    const tMeta = trigger.metaData || {};
                    const hts = !!(journey.metaData &&
                        journey.metaData.highThroughputSending &&
                        journey.metaData.highThroughputSending.email);
                    matchingJourneys.push({
                        id: journey.id,
                        key: journey.key || null,
                        name: journey.name,
                        version: journey.version || 1,
                        status: journey.status || 'Unknown',
                        channel: journey.channel || '',
                        definitionType: journey.definitionType || '',
                        entryMode: journey.entryMode || '',
                        executionMode: journey.executionMode || '',
                        isHTS: hts,
                        triggerType: eventDef.type || trigger.type || '',
                        eventName: eventDef.name || trigger.name || '',
                        eventType: eventDef.type || trigger.type || '',
                        eventDefinitionId: tMeta.eventDefinitionId || eventDef.id || null,
                        eventDefinitionKey: tMeta.eventDefinitionKey || eventDef.eventDefinitionKey || null,
                        dataExtensionName: eventDef.dataExtensionName || deName || '',
                        createdDate: journey.createdDate || null,
                        modifiedDate: journey.modifiedDate || null,
                        lastPublishedDate: journey.lastPublishedDate || null
                    });
                    break; // only include a journey once even if multiple triggers match
                }
            }
        }

        sendResponse({ success: true, data: { items: matchingJourneys, count: matchingJourneys.length, pageSize } });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Handle fetching event definition details for a specific journey.
 * @param {Object} request - Contains eventDefinitionId and instance
 * @param {Function} sendResponse
 */
export async function handleFetchJourneyEventDefinition(request, sendResponse) {
    const { eventDefinitionId, instance } = request;
    if (!eventDefinitionId) {
        sendResponse({ success: false, error: 'Missing Event Definition ID' });
        return;
    }

    // instance arrives as either 'mc.s11' or 's11' — strip the optional 'mc.'
    // prefix before prepending it again, otherwise the URL becomes
    // mc.mc.s11.exacttarget.com (which 404s and surfaces as
    // "No data returned" to the UI).
    const stack = (instance || 's51').replace(/^mc\./, '');
    const url = `https://mc.${stack}.exacttarget.com/cloud/fuelapi/interaction/v1/eventDefinitions/${eventDefinitionId}`;

    try {
        const response = await fetch(url, {
            headers: {
                "accept": "application/json",
            },
            method: "GET",
            credentials: "include" // Crucial for using browser cookies
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch event definition: ${response.status}`);
        }

        const data = await response.json();
        sendResponse({ success: true, data: data });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Fetch a single journey interaction's full detail. Returns the journey
 * including the `activities[]` array (used to derive the accurate activity
 * count that matches SFMC's UI — count of entries whose `type` is set).
 * This replaces the older goal-statistics call for activity count.
 *
 * @param {Object} request - { interactionId, versionNumber, instance }
 * @param {Function} sendResponse
 */
export async function handleFetchJourneyInteractionDetail(request, sendResponse) {
    const { interactionId, versionNumber, instance } = request;
    if (!interactionId) {
        sendResponse({ success: false, error: 'Missing interaction ID' });
        return;
    }
    const stack = (instance || 's51').replace(/^mc\./, '');
    const ver = versionNumber || 1;
    const url = `https://mc.${stack}.exacttarget.com/cloud/fuelapi/interaction/v1/interactions/${interactionId}?extras=all&includeStops=true&versionNumber=${ver}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: { accept: 'application/json' }
        });
        if (!response.ok) {
            sendResponse({ success: false, error: `HTTP ${response.status}` });
            return;
        }
        const data = await response.json();
        sendResponse({ success: true, data });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Fetch goal statistics for a journey version. Kept for legacy callers; no
 * longer used by the detail card (we now read population from the bulk-search
 * `stats.cumulativePopulation` and activity count from the interaction detail).
 *
 * @param {Object} request - Contains interactionId (journey UUID) + versionNumber + instance
 * @param {Function} sendResponse
 */
export async function handleFetchJourneyGoalStats(request, sendResponse) {
    const { interactionId, versionNumber, instance } = request;
    if (!interactionId) {
        sendResponse({ success: false, error: 'Missing interaction ID' });
        return;
    }
    const stack = (instance || 's51').replace(/^mc\./, '');
    const ver = versionNumber || 1;
    const url = `https://mc.${stack}.exacttarget.com/cloud/fuelapi/interaction/v1/goalstatistics/${interactionId}?versionNumber=${ver}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: { accept: 'application/json' }
        });
        if (!response.ok) {
            sendResponse({ success: false, error: `HTTP ${response.status}` });
            return;
        }
        const data = await response.json();
        sendResponse({ success: true, data });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Invalidate the session index for a specific type so the next expand
 * triggers a fresh build.
 *
 * @param {Object} request  — { instance, indexType: 'automations' | 'journeys' }
 * @param {Function} sendResponse
 */
export function handleInvalidateUsageIndex(request, sendResponse) {
    const idx = _usageIndex.get(request.instance);
    if (idx) {
        if (request.indexType === 'automations') idx.automationsTs = null;
        if (request.indexType === 'journeys')    idx.journeysTs = null;
    }
    sendResponse({ success: true });
}
