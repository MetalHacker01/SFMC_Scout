// handlers/automation/AutomationHandler.js
import { InstanceService } from '../../utils/InstanceService.js';

const debug = false;

/**
 * Handle fetching automation details from SFMC API.
 * This is a placeholder for future enhancement - currently the Automation Viewer
 * extracts data from the DOM, but this could be used to fetch via API if needed.
 * @param {Object} request - Contains automationId and instance
 * @param {Function} sendResponse 
 */
export async function handleFetchAutomationDetails(request, sendResponse) {
    try {
        const { automationId, instance } = request;
        
        if (!automationId) {
            sendResponse({ success: false, error: 'Automation ID is required' });
            return;
        }
        
        // Get SFMC instance if not provided
        const sfmcInstance = instance || await InstanceService.getInstance();
        
        // Example API endpoint (adjust based on actual SFMC API)
        // Note: This is a placeholder - actual endpoint may vary
        const url = `https://${sfmcInstance}.exacttarget.com/cloud/fuelapi/automation/v1/automations/${automationId}`;
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'accept': 'application/json',
                'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-requested-with': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        sendResponse({ success: true, data });
        
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Handle fetching automation steps/activities from SFMC API.
 * This is a placeholder for future enhancement.
 * @param {Object} request - Contains automationId and instance
 * @param {Function} sendResponse 
 */
export async function handleFetchAutomationSteps(request, sendResponse) {
    try {
        const { automationId, instance } = request;
        
        if (!automationId) {
            sendResponse({ success: false, error: 'Automation ID is required' });
            return;
        }
        
        // Get SFMC instance if not provided
        const sfmcInstance = instance || await InstanceService.getInstance();
        
        // Example API endpoint (adjust based on actual SFMC API)
        // Note: This is a placeholder - actual endpoint may vary
        const url = `https://${sfmcInstance}.exacttarget.com/cloud/fuelapi/automation/v1/automations/${automationId}/steps`;
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'accept': 'application/json',
                'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-requested-with': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        sendResponse({ success: true, data });
        
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Normalize automation steps regardless of SFMC API response format.
 * Format A: steps[].activities[]         — /cloud/fuelapi/automation/v1/automations/{id}
 * Format B: steps[].stepActivities[]      — older format
 * Format C: automationProcesses[]         — legacy format
 *
 * Returns normalized array:
 * [{ name, stepNumber, activities: [{ name, activityType, objectTypeId, activityObjectId, description }] }]
 */
function normalizeSteps(data) {
    // Format A and B: top-level steps array
    if (Array.isArray(data.steps) && data.steps.length > 0) {
        return data.steps.map((step, idx) => {
            const rawActivities = step.activities || step.stepActivities || [];
            return {
                name: step.name || step.stepName || `Step ${idx + 1}`,
                stepNumber: step.stepNumber || (idx + 1),
                activities: rawActivities.map(act => ({
                    name: act.name || act.activityName || '',
                    activityType: act.activityType || act.activityTypeId,
                    objectTypeId: act.objectTypeId || act.activityType || act.activityTypeId,
                    activityObjectId: act.activityObjectId || act.id || act.objectId || '',
                    description: act.description || ''
                }))
            };
        });
    }

    // Format C: automationProcesses (legacy)
    if (Array.isArray(data.automationProcesses)) {
        return data.automationProcesses.map((proc, idx) => ({
            name: proc.name || `Step ${idx + 1}`,
            stepNumber: idx + 1,
            activities: (proc.activities || []).map(act => ({
                name: act.name || '',
                activityType: act.activityType || act.activityTypeId,
                objectTypeId: act.objectTypeId || act.activityType || act.activityTypeId,
                activityObjectId: act.activityObjectId || act.id || act.objectId || '',
                description: act.description || ''
            }))
        }));
    }

    return [];
}

/**
 * Handle fetching automation definition from SFMC API.
 * @param {Object} request - Contains automationId
 * @param {Function} sendResponse
 */
export async function handleFetchAutomationDefinition(request, sendResponse) {
    try {
        const { automationId, instance } = request;

        if (!automationId) {
            sendResponse({ success: false, error: 'Automation ID is required' });
            return;
        }

        // Use instance from content.js (e.g. 'mc.s51') — strip mc. prefix for URL building
        const inst = instance || await InstanceService.getInstance();
        const stack = inst.replace(/^mc\./, '');

        // Use the working REST endpoint (returns steps[].activities[] structure)
        const url = `https://mc.${stack}.exacttarget.com/cloud/fuelapi/automation/v1/automations/${automationId}`;


        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-requested-with': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();


        const normalized = {
            ...data,
            steps: normalizeSteps(data),
            _stepsNormalized: true
        };
        sendResponse({ success: true, data: normalized });

    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

