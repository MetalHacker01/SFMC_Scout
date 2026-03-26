// handlers/automation/ActivityCodeHandler.js
import { getActivityEndpointType, getActivityTypeName } from './ActivityTypeRegistry.js';

const STANDARD_HEADERS = {
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'x-requested-with': 'XMLHttpRequest',
    'tz': 'accountPreference'
};

/**
 * Fetch activity detail from SFMC AutomationStudioFuel3 API.
 * instance format: 'mc.s51' (used as-is in URL)
 * activityObjectId: the objectId/id of the activity
 * objectTypeId: numeric type ID (accepts string or number)
 */
export async function handleFetchActivityCode(request, sendResponse) {
    const { activityObjectId, objectTypeId, instance } = request;

    if (!activityObjectId) {
        sendResponse({ success: false, error: 'activityObjectId is required' });
        return;
    }

    const endpointType = getActivityEndpointType(objectTypeId);
    const typeName = getActivityTypeName(objectTypeId);

    // Types with no API endpoint — return metadata-only response
    if (!endpointType) {
        sendResponse({
            success: true,
            data: {
                type: 'metadata-only',
                typeName,
                objectTypeId,
                message: `${typeName} activities do not expose a code endpoint in SFMC.`
            }
        });
        return;
    }

    try {
        const result = await fetchActivityDetail(instance, activityObjectId, endpointType, objectTypeId);
        sendResponse({ success: true, data: result });
    } catch (err) {
        sendResponse({ success: false, error: err.message, typeName });
    }
}

async function fetchActivityDetail(instance, activityObjectId, endpointType, objectTypeId) {
    const timestamp = Date.now();
    const inst = instance || 'mc.s51';

    // Primary: marketingcloudapps.com
    const primaryUrl = `https://${inst}.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/automation/v1/${endpointType}/${activityObjectId}/?view=categoryinfo&_=${timestamp}`;

    let response = await fetch(primaryUrl, {
        method: 'GET',
        credentials: 'include',
        headers: STANDARD_HEADERS
    });

    if (!response.ok) {
        // Fallback: exacttarget.com
        const fallbackUrl = `https://${inst}.exacttarget.com/AutomationStudioFuel3/fuelapi/automation/v1/${endpointType}/${activityObjectId}/?view=categoryinfo&_=${timestamp}`;
        response = await fetch(fallbackUrl, {
            method: 'GET',
            credentials: 'include',
            headers: STANDARD_HEADERS
        });
        if (!response.ok) {
            throw new Error(`API ${response.status} for ${endpointType}/${activityObjectId}`);
        }
    }

    const data = await response.json();
    return parseActivityResponse(data, Number(objectTypeId));
}

/**
 * Normalize API response into a standard shape regardless of activity type.
 */
function parseActivityResponse(data, typeId) {
    const typeName = getActivityTypeName(typeId);

    switch (typeId) {
        case 300: // SQL Query
            return {
                type: 'code',
                typeName,
                code: data.queryText || '',
                codeLanguage: 'sql',
                name: data.name || '',
                description: data.description || '',
                targetDE: data.targetName || '',
                updateType: data.targetUpdateTypeName || '',
                metadata: { status: data.status, customerKey: data.customerKey }
            };

        case 423: // Script (SSJS/AMPScript)
            return {
                type: 'code',
                typeName,
                code: data.script || '',
                codeLanguage: 'javascript',
                name: data.name || '',
                description: data.description || '',
                metadata: { status: data.status, customerKey: data.customerKey }
            };

        case 73:   // Data Extract
        case 440:  // Data Extract (alt ID)
            return {
                type: 'metadata',
                typeName,
                name: data.name || '',
                description: data.description || '',
                metadata: {
                    extractType: data.extractType || data.dataExtractType || '',
                    filePattern: data.filePattern || data.fileNamePattern || '',
                    destination: data.destinationFolderLocationText || '',
                    status: data.status
                }
            };

        case 53:   // File Transfer
        case 457:  // File Transfer (alt ID)
            return {
                type: 'metadata',
                typeName,
                name: data.name || '',
                description: data.description || '',
                metadata: {
                    type: data.fileTransferType || '',
                    source: data.sourceUrl || '',
                    destination: data.destinationFolderLocationText || '',
                    pattern: data.fileNamePattern || data.filePattern || '',
                    status: data.status
                }
            };

        case 303: // Filter
            return {
                type: 'metadata',
                typeName,
                name: data.name || '',
                description: data.description || '',
                metadata: {
                    dataSourceName: data.dataSourceName || '',
                    dataSourceType: data.dataSourceType || '',
                    filterDefinitionXml: data.filterDefinitionXml ? '[Filter XML available]' : ''
                }
            };

        case 43:  // Import
            return {
                type: 'metadata',
                typeName,
                name: data.name || '',
                description: data.description || '',
                metadata: {
                    destinationObjectName: data.destinationObjectName || '',
                    updateType: data.updateType || '',
                    allowErrors: data.allowErrors,
                    notificationEmail: data.notificationEmailAddress || ''
                }
            };

        case 1000: // Data Verification
            return {
                type: 'metadata',
                typeName,
                name: data.name || '',
                description: data.description || '',
                metadata: {
                    dataExtensionKey: data.dataExtensionCustomerKey || '',
                    verificationType: data.verificationType || '',
                    threshold: data.threshold,
                    automationStatus: data.automationStatus
                }
            };

        default:
            return {
                type: 'metadata',
                typeName,
                name: data.name || '',
                description: data.description || '',
                metadata: Object.fromEntries(
                    Object.entries(data).filter(([k, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
                )
            };
    }
}
