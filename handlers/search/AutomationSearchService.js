// handlers/search/AutomationSearchService.js
// Search service for Automations
//
// Uses SFMC's server-side $where=name like X filter — same as what the SFMC
// Automation Studio UI sends (verified via HAR capture):
//
//   GET .../legacy/v1/beta/automations/automation/definition/
//       ?$top=25&$skip=0
//       &$sort=lastRunTime%20desc
//       &view=gridView
//       &$where=name%20like%20WW_2026_
//
// This is dramatically better than the old paginate-then-filter approach:
//   - Single fast call instead of 10+ paginated requests
//   - Server returns ONLY matching automations (server-side index lookup)
//   - Found 2 matches in ~150 ms in a 5k-automation production org
//
// The previous client-side filter version would early-exit at 40 matches but
// still had to scan every page until then, which dragged for huge BUs and
// occasionally drifted (automations sorted by lastRunTime shift between pages
// as they execute).

import { InstanceService } from '../../utils/InstanceService.js';

export class AutomationSearchService {
    static MAX_RESULTS = 40;

    static async search(searchTerm, instance = null) {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }

        try {
            const sfmcInstance = instance || await InstanceService.getInstance();
            const term = searchTerm.trim();
            const encodedTerm = encodeURIComponent(term);

            // $top / $skip pagination + $where server-side filter (the UI's pattern).
            // $where=name like X is case-insensitive on this endpoint.
            const url = `https://${sfmcInstance}.exacttarget.com/cloud/fuelapi/legacy/v1/beta/automations/automation/definition/` +
                `?$top=${this.MAX_RESULTS}&$skip=0&$sort=lastRunTime%20desc&view=gridView&$where=name%20like%20${encodedTerm}`;

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: { 'accept': 'application/json, text/javascript, */*; q=0.01' }
            });
            if (!response.ok) {
                throw new Error(`Failed to search automations: ${response.status}`);
            }

            const data = await response.json();
            const items = data.entry || data.items || [];

            return items.slice(0, this.MAX_RESULTS).map(automation => {
                const automationId = automation.id || automation.key;
                return {
                    type: 'automation',
                    id: automationId,
                    name: automation.name,
                    status: automation.status || 'Unknown',
                    lastRunTime: automation.lastRunTime || null,
                    url: `https://${sfmcInstance}.exacttarget.com/cloud/#app/Automation%20Studio/AutomationStudioFuel3/%23Instance/${automationId}`
                };
            });
        } catch (error) {
            return [];
        }
    }
}
