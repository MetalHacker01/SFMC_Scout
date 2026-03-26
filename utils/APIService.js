// utils/APIService.js — SFMC Scout
// Token retrieval uses chrome.storage (captured by webRequest in background.js).
// CSRFService and TokenService are removed — no login form required.

import { InstanceService } from './InstanceService.js';

export class APIService {

    static async get(url, options = {}) {
        return this._fetch(url, { ...options, method: 'GET' });
    }

    static async post(url, data, options = {}) {
        return this._fetch(url, {
            ...options, method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json', ...options.headers }
        });
    }

    static async patch(url, data, options = {}) {
        return this._fetch(url, {
            ...options, method: 'PATCH',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json', ...options.headers }
        });
    }

    static async delete(url, options = {}) {
        return this._fetch(url, { ...options, method: 'DELETE' });
    }

    static async _fetch(url, options = {}) {
        const fetchOptions = {
            ...options,
            headers: { 'Content-Type': 'application/json', ...options.headers },
            credentials: options.credentials || 'include'
        };
        try {
            const response = await fetch(url, fetchOptions);
            return response;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Make a credentialed SFMC API request.
     * @param {string} endpoint - Full URL or path
     * @param {Object} options - Fetch options
     * @param {string|null} instance - SFMC instance (e.g. "mc.s51" or "content-builder.s51")
     * @param {boolean} useCSRF - Whether to add x-csrf-token header
     */
    static async sfmcRequest(endpoint, options = {}, instance = null, useCSRF = false) {
        if (!instance) {
            instance = await InstanceService.getInstance();
        }

        const baseUrl = InstanceService.getApiBaseUrl(instance);
        const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

        const defaultHeaders = {
            'accept': 'application/json',
            ...options.headers
        };

        // Add CSRF token from chrome.storage (captured via webRequest)
        if (useCSRF && options.method && options.method !== 'GET') {
            try {
                const token = await APIService._getStoredCsrfToken();
                if (token) defaultHeaders['x-csrf-token'] = token;
            } catch (e) {
            }
        }

        const fetchOptions = {
            ...options,
            headers: defaultHeaders,
            credentials: 'include'
        };

        try {
            const response = await fetch(fullUrl, fetchOptions);
            return response;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get stored CSRF token from chrome.storage (set by background webRequest listener).
     * Prefers appcoreToken for most write operations.
     */
    static _getStoredCsrfToken() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['scout_adminToken', 'scout_pageToken'], (result) => {
                resolve(result.scout_adminToken || result.scout_pageToken || null);
            });
        });
    }
}
