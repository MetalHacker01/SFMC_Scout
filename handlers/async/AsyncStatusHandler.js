// handlers/async/AsyncStatusHandler.js
import { InstanceService } from '../../utils/InstanceService.js';
import { TabService } from '../../utils/TabService.js';

const debug = false;

/**
 * Check async activity status
 * @param {Object} request - The request object containing activityId
 * @param {Function} sendResponse - Function to send response back
 */
export async function handleCheckAsyncStatus(request, sendResponse) {
    try {
        const { activityId } = request;
        const instance = await InstanceService.getInstance();

        const url = `https://${instance}.exacttarget.com/cloud/fuelapi/internal/v1/async/asyncactivitylog/${activityId}/310`;

        let response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,nl;q=0.7,ar;q=0.6',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'tz': 'accountPreference',
                'x-requested-with': 'XMLHttpRequest'
            }
        });

        // If 401, try refreshing the page context and retry once
        if (response.status === 401) {

            // Try to refresh the page context by making a request to the current page
            try {
                const tabs = await TabService.getActiveTab();
                const currentUrl = tabs[0].url;
                const baseUrl = currentUrl.split('#')[0];

                await fetch(baseUrl, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,nl;q=0.7,ar;q=0.6',
                        'sec-fetch-dest': 'document',
                        'sec-fetch-mode': 'navigate',
                        'sec-fetch-site': 'same-origin',
                        'sec-fetch-user': '?1',
                        'upgrade-insecure-requests': '1'
                    }
                });

                // Wait a bit for the session to refresh
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Retry the async status check
                response = await fetch(url, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'accept': 'application/json, text/javascript, */*; q=0.01',
                        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,nl;q=0.7,ar;q=0.6',
                        'sec-fetch-dest': 'empty',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-site': 'same-origin',
                        'tz': 'accountPreference',
                        'x-requested-with': 'XMLHttpRequest'
                    }
                });
            } catch (refreshError) {
            }
        }

        if (response.ok) {
            const data = await response.json();
            const isComplete = data.count === 0;
            sendResponse({ success: true, isComplete, data });
        } else {
            // Don't throw error, send response with error info so frontend can handle it
            sendResponse({ success: false, error: `Failed to check async status: ${response.status}` });
        }
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

