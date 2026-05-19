// handlers/search/JourneySearchService.js
// Search service for Journeys (Journey Builder)
//
// Uses SFMC's server-side `nameOrDescription=X` query-string filter — the same
// param Journey Builder's own UI sends (verified via HAR):
//
//   GET .../interaction/v1/interactions/
//       ?mostRecentVersionOnly=false&mostRecentVersionOrRunningOnly=true
//       &$page=1&$pageSize=50
//       &extras=trigger,stats,tag
//       &$orderBy=modifiedDate desc
//       &nameOrDescription=WW_2026_
//
// One fast call, server-side substring match across name + description. The
// previous client-side filter approach failed for production orgs with hundreds
// of journeys because matches often fall past the first page.

import { InstanceService } from '../../utils/InstanceService.js';

export class JourneySearchService {
    static MAX_RESULTS = 40;

    static async search(searchTerm, instance = null) {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }

        try {
            const sfmcInstance = instance || await InstanceService.getInstance();
            const term = searchTerm.trim();
            const encodedTerm = encodeURIComponent(term);

            // extras=trigger,stats,tag,activity,campaigns matches Journey
            // Builder's own UI request (verified via HAR) — gives us inline
            // trigger metaData so we can derive eventDefinitionId / dataExtensionName
            // / triggerType without a follow-up call for the row display.
            const url = `https://${sfmcInstance}.exacttarget.com/cloud/fuelapi/interaction/v1/interactions/` +
                `?mostRecentVersionOnly=false&mostRecentVersionOrRunningOnly=true` +
                `&$page=1&$pageSize=${this.MAX_RESULTS}` +
                `&extras=trigger%2Cstats%2Ctag%2Cactivity%2Ccampaigns` +
                `&$orderBy=modifiedDate%20desc` +
                `&nameOrDescription=${encodedTerm}`;

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: { 'accept': 'application/json' }
            });
            if (!response.ok) return [];

            const data = await response.json();
            const items = data.items || [];

            return items.slice(0, this.MAX_RESULTS).map(journey => {
                const trigger = (journey.triggers && journey.triggers[0]) || {};
                const tMeta = trigger.metaData || {};
                const hts = !!(journey.metaData &&
                    journey.metaData.highThroughputSending &&
                    journey.metaData.highThroughputSending.email);
                return {
                    type: 'journey',
                    id: journey.id,
                    // `key` is the externalKey/customerKey shown in SFMC UI
                    key: journey.key || null,
                    name: journey.name,
                    description: journey.description || '',
                    version: journey.version || 1,
                    status: journey.status || 'Unknown',
                    channel: journey.channel || '',
                    definitionType: journey.definitionType || '',
                    entryMode: journey.entryMode || '',
                    executionMode: journey.executionMode || '',
                    categoryId: journey.categoryId || null,
                    // metaData.highThroughputSending.email → small blue "HTS" pill
                    isHTS: hts,
                    // trigger-derived fields (driven by extras=trigger)
                    triggerType: trigger.type || '',
                    triggerName: trigger.name || '',
                    // trigger.description carries the entry criteria human-readable
                    // string (e.g. "EmailAddress contains arrushi") — shown in
                    // the detail card as "Entry Criteria".
                    triggerDescription: trigger.description || '',
                    triggerIconUrl: tMeta.iconUrl || '',
                    triggerTitle: tMeta.title || '',
                    eventDefinitionId: tMeta.eventDefinitionId || null,
                    eventDefinitionKey: tMeta.eventDefinitionKey || null,
                    // dataExtensionId is sometimes inline on the trigger meta,
                    // sometimes only resolvable via eventDefinitions GET
                    dataExtensionId: tMeta.dataExtensionId || null,
                    dataExtensionName: tMeta.dataExtensionName || '',
                    createdDate: journey.createdDate || null,
                    modifiedDate: journey.modifiedDate || null,
                    lastPublishedDate: journey.lastPublishedDate || null,
                    stats: journey.stats || null,
                    url: `https://${sfmcInstance}.exacttarget.com/cloud/#app/Journey%20Builder/%23${journey.id}`
                };
            });
        } catch (error) {
            return [];
        }
    }
}
