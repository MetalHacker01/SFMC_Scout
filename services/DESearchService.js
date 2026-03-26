/**
 * DE Search Service
 * Shared service for searching Data Extensions
 * Extracted from popup/assets/data-handler.js for reuse
 */

import { InstanceService } from '../utils/InstanceService.js';
import { fetchFolderPath } from './DEExportService.js';

/**
 * Search for Data Extensions
 * @param {string} searchTerm - Search term
 * @param {string} instance - SFMC instance (e.g., 'mc.s50')
 * @returns {Promise<Array>} Array of matching Data Extensions
 */
export async function searchDataExtensions(searchTerm, instance = null) {
    if (!instance) {
        instance = await InstanceService.getInstance();
    }
    
    // Ensure full instance format
    if (!instance.startsWith('mc.')) {
        instance = `mc.${instance}`;
    }

    // SFMC's $search parameter only does prefix/starts-with matching.
    // Use /category/0 (all DEs from root) with pagesize=1000 and filter client-side for true contains matching.
    // Use marketingcloudapps.com/contactsmeta/fuelapi gateway (exacttarget.com gateway returns 400 on category/0 without $search)
    const apiUrl = `${InstanceService.getApiBaseUrl(instance)}/data-internal/v1/customobjects/category/0?retrievalType=1&$page=1&$pagesize=1000`;

    const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
        // Client-side contains filter — case-insensitive
        const term = searchTerm.toLowerCase();
        const matched = data.items.filter(item =>
            (item.name || '').toLowerCase().includes(term)
        );

        if (!matched.length) return [];

        // Fetch folder paths for matched items only
        const itemsWithPaths = await Promise.all(
            matched.map(async (item) => {
                let path = 'Uncategorized';
                try {
                    if (item.categoryId) {
                        path = await fetchFolderPath(item.categoryId, instance);
                    }
                } catch (error) {
                    path = 'Uncategorized';
                }

                return {
                    id: item.id,
                    name: item.name,
                    customerKey: item.key || item.customerKey || null,
                    path: path,
                    fieldCount: item.fieldCount,
                    rowCount: item.rowCount,
                    owner: item.ownerName || null,
                    isSendable: item.isSendable,
                    createdDate: item.createdDate || null,
                    modifiedDate: item.modifiedDate || null,
                    modifiedByName: item.modifiedByName || null
                };
            })
        );

        return itemsWithPaths;
    }

    return [];
}

