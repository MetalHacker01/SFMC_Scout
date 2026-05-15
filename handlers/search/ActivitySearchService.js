// handlers/search/ActivitySearchService.js
// Search service for all 7 Activity types
//
// Uses SFMC's server-side `$filter=name like "X"` filter — the same param
// Automation Studio's own UI sends (verified via HAR):
//
//   GET .../automation/v1/queries/
//       ?$page=1&$pageSize=25
//       &$orderBy=modifiedDate desc
//       &retrievalType=1
//       &$filter=name like "WW_2026_"
//
// All 7 activity endpoints accept the same $filter syntax. The quote-wrapped
// term is required — the API rejects unquoted values. We URL-encode the
// quotes too (%22) for parity with the SFMC UI request shape.
//
// The previous client-side filter approach pulled pageSize=500 from each of
// 7 endpoints and filtered client-side, which on a production org with
// thousands of activities both transferred huge payloads AND missed matches
// outside the first 500 by modifiedDate.

import { InstanceService } from '../../utils/InstanceService.js';

export class ActivitySearchService {
    static MAX_PER_TYPE = 40;
    static MAX_TOTAL = 40;

    static async search(searchTerm, instance = null) {
        if (!searchTerm || searchTerm.trim().length === 0) return [];

        const sfmcInstance = instance || await InstanceService.getInstance();
        const term = searchTerm.trim();
        // Quoted + URL-encoded — the API requires the value to be in quotes.
        const filterParam = `$filter=${encodeURIComponent(`name like "${term}"`)}`;
        const base = `https://${sfmcInstance}.exacttarget.com/cloud/fuelapi`;
        const PS = this.MAX_PER_TYPE;

        // SFMC ActivityDetails URL type IDs (matches objectTypeId in automation steps)
        const TYPE_ID = { 'SQL Query': 300, 'Script': 423, 'Send Email': 42, 'Import': 43, 'File Transfer': 457, 'Data Extract': 440, 'Filter': 303 };

        const endpoints = [
            { url: `${base}/automation/v1/queries/?$page=1&$pageSize=${PS}&$orderBy=modifiedDate%20desc&retrievalType=1&${filterParam}`, activityType: 'query', label: 'SQL Query' },
            { url: `${base}/automation/v1/scripts/?$page=1&$pageSize=${PS}&$orderBy=modifiedDate%20desc&${filterParam}`, activityType: 'script', label: 'Script' },
            { url: `${base}/automation/v1/filters/?$page=1&$pageSize=${PS}&${filterParam}`, activityType: 'filter', label: 'Filter' },
            { url: `${base}/messaging-internal/v1/emailsenddefinition/?$page=1&$pageSize=${PS}&${filterParam}`, activityType: 'sendemail', label: 'Send Email' },
            { url: `${base}/automation/v1/imports?$page=1&$pageSize=${PS}&${filterParam}`, activityType: 'import', label: 'Import' },
            { url: `${base}/automation/v1/filetransfers?$page=1&$pageSize=${PS}&${filterParam}`, activityType: 'filetransfer', label: 'File Transfer' },
            { url: `${base}/automation/v1/dataextracts?$page=1&$pageSize=${PS}&${filterParam}`, activityType: 'dataextract', label: 'Data Extract' }
        ];

        const results = [];

        await Promise.allSettled(endpoints.map(async ({ url, activityType, label }) => {
            try {
                const resp = await fetch(url, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'accept': 'application/json' }
                });
                if (!resp.ok) return;
                const data = await resp.json();
                const items = data.items || data.definitions || data.entry || [];
                for (let i = 0; i < items.length && i < ActivitySearchService.MAX_PER_TYPE; i++) {
                    const a = items[i];
                    if (!a.name) continue;
                    const key = a.key || a.customerKey || a.CustomerKey || '';
                    const target = a.targetDataExtension ? (a.targetDataExtension.name || '') :
                                   a.dataExtensionTarget ? (a.dataExtensionTarget.name || '') :
                                   a.destinationObject ? (a.destinationObject.name || '') : '';
                    const typeId = TYPE_ID[label];
                    const objectId = a.queryDefinitionId || a.id || a.objectId || '';
                    const sfmcUrl = (typeId && objectId)
                        ? `https://${sfmcInstance}.exacttarget.com/cloud/#app/Automation%20Studio/AutomationStudioFuel3/%23ActivityDetails/${typeId}/${objectId}`
                        : `https://${sfmcInstance}.exacttarget.com/cloud/#app/Automation%20Studio/AutomationStudioFuel3/%23Activities`;
                    results.push({
                        type: 'activity',
                        activityType,
                        activityTypeLabel: label,
                        id: objectId || key,
                        name: a.name,
                        description: a.description || a.Description || '',
                        target,
                        modifiedDate: a.modifiedDate || a.lastModifiedDate || null,
                        url: sfmcUrl
                    });
                }
            } catch (_) {}
        }));

        return results.slice(0, ActivitySearchService.MAX_TOTAL);
    }
}
