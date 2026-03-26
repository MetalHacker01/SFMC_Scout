// handlers/snippet/SnippetHandler.js
import { ConfigService } from '../../utils/ConfigService.js';

const debug = false;

/**
 * Fetch snippets (both custom and from the server) and send them as a response.
 * @param {Object} request 
 * @param {Function} sendResponse 
 */
export async function handleGetSnippets(request, sendResponse) {
    try {
        // Get custom snippets and token from local storage
        const { customSnippets, token } = await new Promise((resolve) => {
            chrome.storage.local.get(['customSnippets', 'token'], resolve);
        });

        // Always include local snippets, even if server fetch fails
        let allSnippets = customSnippets || [];

        if (token) {
            try {
                // Attempt to fetch server snippets only if token exists
                const headers = { Authorization: `Bearer ${token}` };
                const response = await fetch(ConfigService.getApiUrl('/snippets'), { headers });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && Array.isArray(data.data)) {
                        // Merge local and server snippets
                        allSnippets = [...allSnippets, ...data.data];
                    } else {
                    }
                } else {
                }
            } catch (serverError) {
            }
        } else {
        }

        // Return whatever snippets we have (local + server if available)
        sendResponse({ snippets: allSnippets });
    } catch (error) {
        // Fallback to empty array if everything fails
        sendResponse({ snippets: [] });
    }
}

/**
 * Update the usage count of a snippet by sending a request to the server.
 * @param {Object} request - Should contain snippetId.
 * @param {Function} sendResponse 
 */
export async function handleUpdateSnippetUsageCount(request, sendResponse) {
    const { snippetId } = request;
    if (!snippetId) return;
    try {
        const { token } = await new Promise((resolve) => {
            chrome.storage.local.get(['token'], resolve);
        });

        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(ConfigService.getApiUrl('/snippets/use'), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify({ snippetId }),
        });

        if (!response.ok && debug) {
        }

        sendResponse({ success: response.ok });
    } catch (error) {
        sendResponse({ success: false });
    }
}

