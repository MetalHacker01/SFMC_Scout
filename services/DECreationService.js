/**
 * DE Creation Service
 * Shared service for creating Data Extensions
 * Extracted from popup/assets/data-handler.js for reuse
 */

import { InstanceService } from '../utils/InstanceService.js';

/**
 * Fetch the CSRF token for DE operations by loading the contactsmeta admin page
 * and parsing global.contacts.csrfToken from the HTML — same approach as IntellyType.
 * This is the only reliable method that works without prior page navigation.
 */
async function fetchContactsMetaToken(instance) {
    const url = `https://${instance}.marketingcloudapps.com/contactsmeta/admin.html?hub=1`;
    const response = await fetch(url, { method: 'GET', credentials: 'include' });
    if (!response.ok) {
        throw new Error(`Cannot reach contactsmeta (HTTP ${response.status}) — ensure you are logged into SFMC`);
    }
    const html = await response.text();
    const match = html.match(/global\.contacts\.csrfToken\s*=\s*'([^']+)'/);
    if (!match || !match[1]) {
        throw new Error('CSRF token not found in contactsmeta page — ensure you are logged into SFMC and have access to Data Extensions');
    }
    return match[1];
}

/**
 * Create a Data Extension
 * @param {string} deName - Data Extension name
 * @param {Array} fields - Array of field objects
 * @param {string} folderId - Folder ID (default: "0")
 * @param {boolean} isSendable - Whether DE is sendable
 * @param {boolean} isTestable - Whether DE is testable
 * @param {string} sendableField - Sendable field name (if sendable)
 * @param {string} subscriberField - Subscriber field name (if sendable)
 * @param {string} instance - SFMC instance (e.g., 'mc.s50')
 * @returns {Promise<Object>} Created DE result with id
 */
export async function createDataExtension(deName, fields, folderId = "0", isSendable = false, isTestable = false, sendableField = null, subscriberField = null, instance = null) {
    if (!instance) {
        instance = await InstanceService.getInstance();
    }
    
    // Ensure full instance format
    if (!instance.startsWith('mc.')) {
        instance = `mc.${instance}`;
    }

    const csrfToken = await fetchContactsMetaToken(instance);
    const apiUrl = `https://${instance}.marketingcloudapps.com/contactsmeta/fuelapi/internal/v1/customobjects/`;

    // Normalize fields to match API requirements
    const normalizedFields = fields.map((field, index) => {
        const normalizedField = {
            name: field.name,
            ordinal: field.ordinal !== undefined ? field.ordinal : index,
            type: field.type !== undefined ? field.type : 0,
            length: field.length !== undefined ? field.length : (field.type === 0 ? 50 : 0),
            scale: field.scale !== undefined ? field.scale : 0,
            isPrimaryKey: field.isPrimaryKey || false,
            isTemplateField: false,
            isHidden: false,
            isReadOnly: false,
            isOverridable: false,
            isInheritable: false,
            updatable: true,
            retrievable: true,
            isActive: true,
            mustOverride: false,
            isNullable: field.isNullable !== undefined ? field.isNullable : !field.isPrimaryKey
        };
        
        // Only add defaultValue if it exists and is not empty
        if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '') {
            normalizedField.defaultValue = field.defaultValue;
        }
        
        return normalizedField;
    });

    const payload = {
        importActivity: {},
        name: deName,
        categoryID: folderId || "0",
        isSendable: isSendable || false,
        isTestable: isTestable || false,
        isActive: true,
        status: 0,
        isObjectDeletable: true,
        isFieldAdditionAllowed: true,
        isFieldModificationAllowed: true,
        fields: normalizedFields
    };

    if (isSendable) {
        if (!sendableField || sendableField.trim() === '') {
            throw new Error('SendableCustomObjectField cannot be blank when creating a sendable Data Extension');
        }
        if (!subscriberField || subscriberField.trim() === '') {
            throw new Error('SendableSubscriberField cannot be blank when creating a sendable Data Extension');
        }
        payload.sendableCustomObjectField = sendableField.trim();
        payload.sendableSubscriberField = subscriberField.trim();
        payload.SendAttributeStorageName = sendableField.trim();
        payload.SendContactKeyStorageName = subscriberField.trim();
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMsg = `HTTP ${response.status}`;
        try {
            const errorData = JSON.parse(errorText);
            errorMsg = errorData.message || errorData.error || errorData.errorMessage || errorMsg;
        } catch (_) {
            if (errorText) errorMsg = errorText.slice(0, 200);
        }
        throw new Error(`Failed to create DE: ${errorMsg}`);
    }

    const result = await response.json();
    return result;
}

