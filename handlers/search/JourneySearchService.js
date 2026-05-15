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

            const url = `https://${sfmcInstance}.exacttarget.com/cloud/fuelapi/interaction/v1/interactions/` +
                `?mostRecentVersionOnly=false&mostRecentVersionOrRunningOnly=true` +
                `&$page=1&$pageSize=${this.MAX_RESULTS}` +
                `&extras=trigger%2Cstats%2Ctag` +
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

            return items.slice(0, this.MAX_RESULTS).map(journey => ({
                type: 'journey',
                id: journey.id,
                name: journey.name,
                version: journey.version || 1,
                status: journey.status || 'Unknown',
                modifiedDate: journey.modifiedDate || null,
                url: `https://${sfmcInstance}.exacttarget.com/cloud/#app/Journey%20Builder/%23${journey.id}`
            }));
        } catch (error) {
            return [];
        }
    }
}
