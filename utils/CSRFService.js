// utils/CSRFService.js — SGv2 shim
// Tokens are captured via background.js webRequest listener.
// This shim reads them from chrome.storage so existing handlers work unchanged.

export class CSRFService {
    static _cache = null;

    /** Get best CSRF token for a given scope.
     *  scope: 'de' | 'automation' | 'journey' | 'cb' | 'admin' (default: any available)
     */
    static async getToken(instance, scope) {
        return new Promise((resolve) => {
            chrome.storage.local.get([
                'scout_cbToken', 'scout_deToken', 'scout_autoToken',
                'scout_journeyToken', 'scout_adminToken', 'scout_pageToken'
            ], (result) => {
                let token = null;
                if (scope === 'de')        token = result.scout_deToken   || result.scout_adminToken || result.scout_cbToken;
                else if (scope === 'automation') token = result.scout_autoToken  || result.scout_adminToken;
                else if (scope === 'journey')    token = result.scout_journeyToken || result.scout_adminToken;
                else if (scope === 'cb')   token = result.scout_cbToken   || result.scout_pageToken;
                else token = result.scout_adminToken || result.scout_cbToken || result.scout_pageToken || result.scout_deToken;
                resolve(token || null);
            });
        });
    }

    /** Simplified version — same as getToken with no scope (any available) */
    static async getTokenSimple(instance) {
        return this.getToken(instance);
    }

    /** Get token specifically for DE operations */
    static async getDEToken(instance) {
        return this.getToken(instance, 'de');
    }

    /** No-op — cache is managed by chrome.storage TTL logic in background */
    static clearCache() {}
}
