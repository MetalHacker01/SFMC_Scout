/**
 * DE Creation Service
 * Shared service for creating Data Extensions
 * Extracted from popup/assets/data-handler.js for reuse
 */

import { InstanceService } from '../utils/InstanceService.js';

/**
 * Read the CSRF token captured passively from outgoing SFMC requests.
 * The webRequest listener in background.js stores it as scout_deToken/scout_adminToken
 * whenever the user navigates Contact Builder or any contactsmeta page.
 *
 * Returns null if no token has been captured yet — caller should surface a clear
 * "please open Contact Builder once and retry" error rather than proactively fetching
 * admin.html (which redirects to OAuth and causes a CORS-induced retry loop).
 */
async function getCapturedDeToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['scout_deToken', 'scout_adminToken'], (r) => {
            resolve(r.scout_deToken || r.scout_adminToken || null);
        });
    });
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

    // Primary endpoint: cookie-only proxy on the main domain — no CSRF token required.
    // Tries this first; if the proxy rejects POST without CSRF (some BUs may), retries
    // against the contactsmeta endpoint with a passively-captured token.
    const stack = instance.replace(/^mc\./, '');
    const apiUrl       = `https://mc.${stack}.exacttarget.com/cloud/fuelapi/internal/v1/customobjects/`;
    const fallbackUrl  = `https://${instance}.marketingcloudapps.com/contactsmeta/fuelapi/internal/v1/customobjects/`;
    const csrfToken    = await getCapturedDeToken();

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

    const postOnce = async (url, withCsrf) => {
        const headers = { 'Content-Type': 'application/json' };
        if (withCsrf && csrfToken) headers['x-csrf-token'] = csrfToken;
        return fetch(url, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(payload)
        });
    };

    // Attempt 1: cookie-only main-domain proxy, no token.
    let response;
    try {
        response = await postOnce(apiUrl, false);
    } catch (e) {
        throw new Error(`DE creation failed: ${e.message} — ensure SFMC is open and you are logged in`);
    }

    // If the proxy returned 401/403, retry through contactsmeta with a captured CSRF token.
    if ((response.status === 401 || response.status === 403) && csrfToken) {
        try { response = await postOnce(fallbackUrl, true); } catch (_) {}
    } else if ((response.status === 401 || response.status === 403) && !csrfToken) {
        throw new Error('DE creation requires a captured CSRF token. Open Contact Builder once in this browser, then retry.');
    }

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

    return await response.json();
}

