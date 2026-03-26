// handlers/search/ActivitySearchService.js
// Search service for all 7 Activity types

import { InstanceService } from '../../utils/InstanceService.js';

export class ActivitySearchService {
    static async search(searchTerm, instance = null) {
        if (!searchTerm || searchTerm.trim().length === 0) return [];

        const sfmcInstance = instance || await InstanceService.getInstance();
        const searchLower = searchTerm.toLowerCase().trim();
        const base = `https://${sfmcInstance}.marketingcloudapps.com/AutomationStudioFuel3/fuelapi`;

        // SFMC ActivityDetails URL type IDs (matches objectTypeId in automation steps)
        const TYPE_ID = { 'SQL Query': 300, 'Script': 423, 'Send Email': 42, 'Import': 43, 'File Transfer': 457, 'Data Extract': 440, 'Filter': 303 };

        const endpoints = [
            { url: `${base}/automation/v1/queries/?$orderBy=modifiedDate%20desc&retrievalType=1&$pageSize=500`, activityType: 'query', label: 'SQL Query' },
            { url: `${base}/automation/v1/scripts/?$orderBy=modifiedDate%20desc&$pageSize=500`, activityType: 'script', label: 'Script' },
            { url: `${base}/automation/v1/filters/?$pageSize=500`, activityType: 'filter', label: 'Filter' },
            { url: `${base}/messaging-internal/v1/emailsenddefinition/?$pageSize=500`, activityType: 'sendemail', label: 'Send Email' },
            { url: `${base}/automation/v1/imports?$pageSize=500`, activityType: 'import', label: 'Import' },
            { url: `${base}/automation/v1/filetransfers?$pageSize=500`, activityType: 'filetransfer', label: 'File Transfer' },
            { url: `${base}/automation/v1/dataextracts?$pageSize=500`, activityType: 'dataextract', label: 'Data Extract' }
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
                items
                    .filter(a => a.name && a.name.toLowerCase().includes(searchLower))
                    .forEach(a => {
                        const key = a.key || a.customerKey || a.CustomerKey || '';
                        const target = a.targetDataExtension ? (a.targetDataExtension.name || '') :
                                       a.dataExtensionTarget ? (a.dataExtensionTarget.name || '') :
                                       a.destinationObject ? (a.destinationObject.name || '') : '';
                        // Build SFMC deep-link using ActivityDetails/{typeId}/{objectId}
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
                    });
            } catch (_) {}
        }));

        return results;
    }
}
