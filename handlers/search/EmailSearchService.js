// handlers/search/EmailSearchService.js
// Search service for Emails

import { InstanceService } from '../../utils/InstanceService.js';

export class EmailSearchService {
    /**
     * Search Emails by name
     * @param {string} searchTerm - Search term
     * @param {string} instance - SFMC instance (optional)
     * @returns {Promise<Array>} Array of matching Emails
     */
    static async search(searchTerm, instance = null) {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }

        try {
            const sfmcInstance = instance || await InstanceService.getInstance();
            // Use alternative search method (more reliable)
            return await this.searchAlternative(searchTerm, sfmcInstance);
        } catch (error) {
            
            return [];
        }
    }

    /**
     * Alternative search method if primary fails
     */
    static async searchAlternative(searchTerm, instance) {
        try {
            // Cookie-only proxy on the main domain — no CSRF token needed.
            // Paginate through all asset pages so we don't silently miss matching emails
            // when the org has more than one page of assets.
            const PAGE_SIZE = 500;
            let page = 1;
            let total = 0;
            let items = [];
            while (true) {
                const url = `https://${instance}.exacttarget.com/cloud/fuelapi/asset/v1/content/assets?$page=${page}&$pageSize=${PAGE_SIZE}`;
                const response = await fetch(url, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'accept': 'application/json' }
                });
                if (!response.ok) {
                    if (page === 1) return [];
                    break;
                }
                const data = await response.json();
                const pageItems = data.items || data.entry || [];
                items = items.concat(pageItems);
                if (page === 1) total = data.count || data.totalCount || pageItems.length;
                if (pageItems.length < PAGE_SIZE || items.length >= total) break;
                page++;
            }
            const searchLower = searchTerm.toLowerCase().trim();

            // Filter emails by name
            return items
                .filter(item => item.assetType?.name === 'email' &&
                               item.name &&
                               item.name.toLowerCase().includes(searchLower))
                .map(item => {
                    const ownerObj = item.owner || item.createdBy || null;
                    const createdBy = ownerObj
                        ? (typeof ownerObj === 'string' ? ownerObj : (ownerObj.name || ownerObj.userName || ownerObj.email || ''))
                        : '';
                    return {
                        type: 'email',
                        id: item.id,
                        assetId: item.id,
                        name: item.name,
                        assetType: 'Email',
                        subject: item.views?.subjectline || item.subject || '',
                        status: item.status || 'Unknown',
                        path: item.category ? item.category.name : null,
                        modifiedDate: item.modifiedDate || null,
                        createdDate: item.createdDate || null,
                        createdBy: createdBy || null,
                        url: `https://${instance}.marketingcloudapps.com/contactsmeta/admin.html#app/content/contentBuilder/${item.id}`
                    };
                });
        } catch (error) {
            
            return [];
        }
    }
}

