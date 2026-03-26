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
            const url = `https://${instance}.marketingcloudapps.com/contactsmeta/fuelapi/asset/v1/content/assets?$page=1&$pageSize=100`;
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: { 'accept': 'application/json' }
            });

            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            const items = data.items || data.entry || [];
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

