// handlers/search/SearchService.js
// Unified search service that coordinates all search types

import { AutomationSearchService } from './AutomationSearchService.js';
import { JourneySearchService } from './JourneySearchService.js';
import { ActivitySearchService } from './ActivitySearchService.js';
import { AssetSearchService } from './AssetSearchService.js';
import { InstanceService } from '../../utils/InstanceService.js';

export class SearchService {
    /**
     * Perform universal search across all SFMC objects
     * @param {string} searchTerm - Search term
     * @param {Function} onResult - Callback function called for each result as it's found
     * @param {Function} onHint - Optional callback for asset search hint (e.g. "No Content Builder tab found")
     * @returns {Promise<Object>} Search results summary
     */
    static async searchAll(searchTerm, onResult = null, onHint = null, instanceOverride = null, filter = 'all') {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return { total: 0, results: [] };
        }

        const instance = instanceOverride || await InstanceService.getInstance();
        const results = [];
        let totalFound = 0;

        // Search all types in parallel, but emit results as they come
        const searchPromises = [
            // Automations
            AutomationSearchService.search(searchTerm, instance).then(autoResults => {
                autoResults.forEach(result => {
                    results.push(result);
                    totalFound++;
                    if (onResult) onResult(result);
                });
            }),

            // Journeys
            JourneySearchService.search(searchTerm, instance).then(journeyResults => {
                journeyResults.forEach(result => {
                    results.push(result);
                    totalFound++;
                    if (onResult) onResult(result);
                });
            }),


            // Activities
            ActivitySearchService.search(searchTerm, instance).then(activityResults => {
                activityResults.forEach(result => {
                    results.push(result);
                    totalFound++;
                    if (onResult) onResult(result);
                });
            }),


            // Content Builder assets — only run when filter requests them (skip for de/automation/journey/activity)
            ...(['all', 'asset', 'email'].includes(filter) ? [
                AssetSearchService.search(searchTerm, instance).then((assetPayload) => {
                    const assetResults = assetPayload.results || [];
                    if (assetPayload.hint && onHint) onHint(assetPayload.hint);
                    assetResults.forEach(result => {
                        results.push(result);
                        totalFound++;
                        if (onResult) onResult(result);
                    });
                })
            ] : [])
        ];

        // Wait for all searches to complete
        await Promise.allSettled(searchPromises);

        return {
            total: totalFound,
            results: results
        };
    }
}

