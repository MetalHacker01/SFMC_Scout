// handlers/search/DESearchService.js
// Search service for Data Extensions

import { InstanceService } from '../../utils/InstanceService.js';

export class DESearchService {
    /**
     * Search Data Extensions by name
     * @param {string} searchTerm - Search term
     * @param {string} instance - SFMC instance (optional)
     * @returns {Promise<Array>} Array of matching Data Extensions
     */
    static async search(searchTerm, instance = null) {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }

        try {
            const sfmcInstance = instance || await InstanceService.getInstance();
            const encodedTerm = encodeURIComponent(searchTerm.trim());
            const baseUrl = `https://${sfmcInstance}.exacttarget.com/cloud/fuelapi/data-internal/v1/customobjects`;
            const params = `retrievalType=1&$page=1&$pagesize=100&$search=${encodedTerm}`;

            // Fetch standard DEs and shared DEs (parentId=7814) in parallel
            const [standardResult, sharedResult] = await Promise.allSettled([
                fetch(`${baseUrl}?${params}`, {
                    method: 'GET', credentials: 'include',
                    headers: { 'accept': 'application/json' }
                }),
                fetch(`${baseUrl}?${params}&parentId=7814`, {
                    method: 'GET', credentials: 'include',
                    headers: { 'accept': 'application/json' }
                })
            ]);

            const allItems = [];
            const seenIds = new Set();

            const extractItems = async (result) => {
                if (result.status !== 'fulfilled' || !result.value.ok) return;
                const data = await result.value.json();
                for (const item of (data.items || [])) {
                    if (!seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        allItems.push(item);
                    }
                }
            };

            await Promise.all([extractItems(standardResult), extractItems(sharedResult)]);

            return allItems.map(item => ({
                type: 'data-extension',
                id: item.id,
                name: item.name,
                customerKey: item.customerKey || item.key,
                fieldCount: item.fieldCount || 0,
                rowCount: item.rowCount || 0,
                isSendable: item.isSendable || false,
                categoryId: item.categoryId,
                path: item.categoryPath || null,
                url: `https://${sfmcInstance}.marketingcloudapps.com/contactsmeta/admin.html#admin/data-extension/${item.id}/properties/`
            }));
        } catch (error) {
            
            return [];
        }
    }
}

