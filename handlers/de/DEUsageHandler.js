// handlers/de/DEUsageHandler.js
import { InstanceService } from '../../utils/InstanceService.js';

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
    const { deId, deName, deKey, instance } = request;
    const stack = (instance || 'mc.s51').replace(/^mc\./, '');
    const searchTerms = [deId, deName, deKey].filter(Boolean).map(s => s.toLowerCase());

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
                    const detailUrl = `https://mc.${stack}.exacttarget.com/cloud/fuelapi/automation/v1/automations/${auto.id}`;
                    const detailResp = await fetch(detailUrl, {
                        credentials: 'include',
                        headers: { 'accept': 'application/json, text/javascript, */*; q=0.01' }
                    });
                    if (!detailResp.ok) return;
                    const detail = await detailResp.json();

                    if (automationReferencesDE(detail, searchTerms)) {
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

function automationReferencesDE(automation, searchTerms) {
    const steps = automation.steps || automation.automationProcesses || [];
    for (const step of steps) {
        const activities = step.activities || step.stepActivities || [];
        for (const act of activities) {
            // Check targetDataExtensions array
            const targets = act.targetDataExtensions || [];
            if (targets.some(de => searchTerms.some(t => (de.name || de.id || '').toLowerCase().includes(t)))) return true;

            // Stringify the activity and check for any search term match
            const combined = JSON.stringify(act).toLowerCase();
            if (searchTerms.some(term => combined.includes(term))) return true;
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

        // Step 2: For each journey, fetch its Event Definition to check dataExtensionId.
        // The trigger's metaData.eventDefinitionId is the only link — the DE reference
        // is not present in the journey payload itself.
        const matchingJourneys = [];
        const eventDefCache = {}; // avoid duplicate fetches within this run
        const BATCH_SIZE = 5;

        for (let i = 0; i < itemsAll.length; i += BATCH_SIZE) {
            const batch = itemsAll.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(batch.map(async (journey) => {
                if (!journey.triggers || journey.triggers.length === 0) return null;
                for (const trigger of journey.triggers) {
                    const eventDefId = trigger.metaData && trigger.metaData.eventDefinitionId;
                    if (!eventDefId) continue;

                    // Fetch + cache the event definition
                    if (!eventDefCache[eventDefId]) {
                        try {
                            const evUrl = `https://mc.${INSTANCE}.exacttarget.com/cloud/fuelapi/interaction/v1/eventDefinitions/${eventDefId}`;
                            const evResp = await fetch(evUrl, { headers: { "accept": "application/json" }, credentials: "include" });
                            eventDefCache[eventDefId] = evResp.ok ? await evResp.json() : null;
                        } catch (_) {
                            eventDefCache[eventDefId] = null;
                        }
                    }

                    const eventDef = eventDefCache[eventDefId];
                    if (!eventDef) continue;

                    // The DE link is in eventDef.dataExtensionId or eventDef.arguments.dataExtensionId
                    const eventDeId = eventDef.dataExtensionId ||
                        (eventDef.arguments && eventDef.arguments.dataExtensionId);
                    if (eventDeId && eventDeId.toLowerCase() === deId.toLowerCase()) {
                        return {
                            id: journey.id,
                            name: journey.name,
                            version: journey.version,
                            eventName: eventDef.name || trigger.name || '',
                            eventType: eventDef.type || trigger.type || '',
                            dataExtensionName: eventDef.dataExtensionName || deName || ''
                        };
                    }
                }
                return null;
            }));

            for (const r of results) {
                if (r.status === 'fulfilled' && r.value) matchingJourneys.push(r.value);
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

    const sfmcInstance = instance || 's51'; // Default to s51 if no instance provided
    const url = `https://mc.${sfmcInstance}.exacttarget.com/cloud/fuelapi/interaction/v1/eventDefinitions/${eventDefinitionId}`;

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

