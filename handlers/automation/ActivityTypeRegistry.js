// handlers/automation/ActivityTypeRegistry.js
// Sourced from SFMC Automation Viewer popup.js:645-660 and IntelliType ActivityCodeHandler.js

/**
 * SFMC Activity Type Registry
 *
 * endpointType: path segment used in AutomationStudioFuel3 API
 * null = no code endpoint (display metadata only)
 */
export const ACTIVITY_TYPES = {
    42:   { name: 'Send Email',        endpointType: null,                color: '#0176d3' },
    43:   { name: 'Import',            endpointType: 'imports',           color: '#7f8c8d' },
    53:   { name: 'File Transfer',     endpointType: 'filetransfers',     color: '#7f8c8d' },
    73:   { name: 'Data Extract',      endpointType: 'dataextracts',      color: '#7f8c8d' },
    300:  { name: 'SQL Query',         endpointType: 'queries',           color: '#032d60' },
    303:  { name: 'Filter',            endpointType: 'filterdefinitions', color: '#7f8c8d' },
    423:  { name: 'Script (SSJS)',     endpointType: 'scripts',           color: '#1b5e20' },
    427:  { name: 'Build Audience',    endpointType: null,                color: '#7f8c8d' },
    440:  { name: 'Data Extract',      endpointType: 'dataextracts',      color: '#7f8c8d' },
    457:  { name: 'File Transfer',     endpointType: 'filetransfers',     color: '#7f8c8d' },
    467:  { name: 'Wait',              endpointType: null,                color: '#b0b0b0' },
    771:  { name: 'SF Send',           endpointType: null,                color: '#0176d3' },
    1000: { name: 'Data Verification', endpointType: 'dataverifications', color: '#7f8c8d' },
    1018: { name: 'Verification',      endpointType: null,                color: '#7f8c8d' },
    3014: { name: 'Push Notification', endpointType: null,                color: '#0176d3' },
};

export function getActivityTypeName(typeId) {
    const id = Number(typeId);
    return ACTIVITY_TYPES[id]?.name || `Activity (${typeId})`;
}

export function getActivityEndpointType(typeId) {
    const id = Number(typeId);
    return ACTIVITY_TYPES[id]?.endpointType || null;
}

export function getActivityColor(typeId) {
    const id = Number(typeId);
    return ACTIVITY_TYPES[id]?.color || '#9ba8bc';
}
