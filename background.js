// background.js — SFMC Scout
// Copyright (c) 2026 Aldorino Rrushi

import { handleFetchDEUsageQueries, handleFetchDEUsageAutomations, handleFetchDEUsageJourneys, handleFetchJourneyEventDefinition, handleFetchDEUsageAutomationsStream, handleFetchDEUsageJourneysStream, handleInvalidateUsageIndex, handleFetchFieldDefinitions, handleUpdateFieldDefinitions, handleCreateFieldDefinitions } from './handlers/de/index.js';
import { handleFetchAutomationDetails, handleFetchAutomationSteps, handleFetchAutomationDefinition, handleFetchActivityCode } from './handlers/automation/index.js';
import { handleGetSnippets, handleUpdateSnippetUsageCount } from './handlers/snippet/index.js';
import { handleUniversalSearch, handleUniversalSearchStream } from './handlers/search/index.js';
import { handleCheckAsyncStatus } from './handlers/async/index.js';
import { handleRegisterContentScript, getRegisteredTabs } from './handlers/registration/index.js';
import { handleDESearch, handleCreateDE, handleExportDE, handleImportDE, handleGenerateReport, handleFetchFolderChildren } from './handlers/actions/index.js';

// ============================================================
//  TOKEN INTERCEPTION (CPM-style webRequest capture)
// ============================================================
// Captures x-csrf-token from outgoing SFMC requests and stores
// in chrome.storage.local. No login form needed — tokens come
// from the active SFMC browser session.

// Classify URL to the right token storage key
function classifyTokenKey(url) {
    if (url.includes('content-builder') || url.includes('/asset/v1') || url.includes('/asset/v2')) return 'scout_cbToken';
    if (url.includes('contactsmeta') || url.includes('data-internal/v1/customobjects') || url.includes('data-internal/v1/contacts')) return 'scout_deToken';
    if (url.includes('fuelapi/automation') || url.includes('fuelapi/legacy/v1/beta/automations') || url.includes('/automation/v1/')) return 'scout_autoToken';
    if (url.includes('fuelapi/interaction/v1') || url.includes('/interaction/v1/')) return 'scout_journeyToken';
    return 'scout_adminToken'; // CloudPages, general admin
}

chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
        if (!details.requestHeaders) return;

        // ── Capture CSRF token ───────────────────────────────────────────────
        const tokenHeader = details.requestHeaders.find(
            h => h.name.toLowerCase() === 'x-csrf-token'
        );
        if (tokenHeader && tokenHeader.value && tokenHeader.value.length >= 20) {
            const storageKey = classifyTokenKey(details.url);
            const token = tokenHeader.value;
            chrome.storage.local.set({ [storageKey]: token, [storageKey + '_ts']: Date.now() });
            if (storageKey === 'scout_cbToken') chrome.storage.local.set({ scout_pageToken: token });
            else if (storageKey === 'scout_adminToken' || storageKey === 'scout_deToken') chrome.storage.local.set({ scout_adminToken: token });
        }

        // ── Capture MID from Authorization: Bearer header ────────────────────
        // Contact Builder and contacts-internal requests send "Authorization: Bearer {MID}"
        // where MID is the 9-10 digit account member ID, zero-padded to 10 digits.
        const authHeader = details.requestHeaders.find(
            h => h.name.toLowerCase() === 'authorization'
        );
        if (authHeader && authHeader.value) {
            const bearerMatch = authHeader.value.match(/^Bearer\s+0*(\d{5,12})$/);
            if (bearerMatch && bearerMatch[1]) {
                chrome.storage.local.get(['scout_contactsMid'], (r) => {
                    if (!r.scout_contactsMid) {
                        chrome.storage.local.set({ scout_contactsMid: bearerMatch[1] });
                        console.log('[SCOUT] MID captured from Authorization header:', bearerMatch[1]);
                    }
                });
            }
        }

        // ── Capture MID from x-mid or x-account-id request headers ──────────
        const midHeader = details.requestHeaders.find(
            h => h.name.toLowerCase() === 'x-mid' ||
                 h.name.toLowerCase() === 'x-account-id' ||
                 h.name.toLowerCase() === 'x-memberid'
        );
        if (midHeader && midHeader.value && midHeader.value.match(/^\d{5,12}$/)) {
            chrome.storage.local.get(['scout_contactsMid'], (r) => {
                if (!r.scout_contactsMid) {
                    chrome.storage.local.set({ scout_contactsMid: midHeader.value });
                    console.log('[SCOUT] MID captured from request header:', midHeader.name, midHeader.value);
                }
            });
        }
    },
    {
        urls: [
            'https://*.marketingcloudapps.com/*',
            'https://*.exacttarget.com/*'
        ]
    },
    ['requestHeaders']
);

// ── Capture MID from response headers ────────────────────────────────────────
// SFMC API responses often include x-mid or similar in response headers.
// Wrapped in try/catch — onHeadersReceived with responseHeaders can fail in
// some MV3 environments; we don't want it to crash the service worker.
try {
    chrome.webRequest.onHeadersReceived.addListener(
        function(details) {
            if (!details.responseHeaders) return;

            // NOTE: The previous passive capture re-fetched `update-token.html` from inside
            // onHeadersReceived to parse {accessToken,legacyToken}. That re-fetch ALSO fired
            // onHeadersReceived (same URL pattern), causing a self-triggering infinite loop
            // that hit ~78k requests and crashed DevTools. We rely on onBeforeSendHeaders
            // x-csrf-token capture + Authorization Bearer MID capture (above) instead, which
            // are passive and loop-safe.

            const midHeader = details.responseHeaders.find(
                h => h.name.toLowerCase() === 'x-mid' ||
                     h.name.toLowerCase() === 'x-account-id' ||
                     h.name.toLowerCase() === 'x-memberid' ||
                     h.name.toLowerCase() === 'x-member-id'
            );
            if (midHeader && midHeader.value && midHeader.value.match(/^\d{5,12}$/)) {
                chrome.storage.local.get(['scout_contactsMid'], (r) => {
                    if (!r.scout_contactsMid) {
                        chrome.storage.local.set({ scout_contactsMid: midHeader.value });
                        console.log('[SCOUT] MID captured from response header:', midHeader.name, midHeader.value);
                    }
                });
            }
        },
        {
            urls: [
                'https://*.marketingcloudapps.com/*',
                'https://*.exacttarget.com/*'
            ]
        },
        ['responseHeaders']
    );
} catch (e) {
    console.warn('[SCOUT] onHeadersReceived not available:', e.message);
}

// ============================================================
//  CORS PROXY — makes credentialed SFMC API requests
// ============================================================
async function makeAPIRequest(url, method, headers, body) {
    const opts = {
        method: method || 'GET',
        headers: headers || {},
        credentials: 'include'
    };
    if (body && method !== 'GET') opts.body = typeof body === 'string' ? body : JSON.stringify(body);

    try {
        const res = await fetch(url, opts);
        const text = await res.text();
        let data = null;
        try { data = JSON.parse(text); } catch (_) { data = text; }
        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        return { ok: false, status: 0, error: err.message };
    }
}

// ============================================================
//  CSRF TOKEN HELPERS
// ============================================================
// Store the contactsmeta CSRF token in DE + admin slots only.
// CB, Auto, and Journey use section-specific tokens that rotate per module —
// they must be captured via webRequest as the user (or ghost tabs) navigate those sections.
function storeCsrfTok(tok, mid, cb) {
    const ts = Date.now();
    const data = {
        scout_deToken:    tok, scout_deToken_ts:    ts,
        scout_adminToken: tok, scout_adminToken_ts: ts,
        scout_pageToken:  tok
    };
    if (mid) data.scout_contactsMid = mid;
    chrome.storage.local.set(data, () => cb({ success: true, token: tok }));
}

// Direct service worker fetch fallback (may fail when SW lacks session cookies)
function fetchCsrfDirectly(url, instance, sendResponse) {
    fetch(url, { method: 'GET', credentials: 'include' })
    .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
    })
    .then(html => parseCsrfFromHtml(html, instance, sendResponse))
    .catch(err => sendResponse({ success: false, error: err.message }));
}

// Parse CSRF token + MID from HTML, then store and respond
function parseCsrfFromHtml(html, instance, sendResponse) {
        // ── MID diagnostic logging ────────────────────────────────────────────
        const digitCandidates = [...html.matchAll(/["':=\s,\{](\d{7,12})[\s"',\}\)]/g)].map(m => m[1]);
        console.log('[SCOUT] MID candidates from HTML:', [...new Set(digitCandidates)].slice(0, 20));
        const midIdx = html.search(/accountId|memberId|MID|mid\b/i);
        if (midIdx >= 0) console.log('[SCOUT] HTML near MID keyword:', html.slice(Math.max(0, midIdx - 50), midIdx + 200));

        // Try to extract account MID from the same page — used as Authorization: Bearer {MID}
        // in contacts-internal API calls.  Must be ≥ 5 digits and non-zero.
        const midPatterns = [
            /global\.contacts\.accountId\s*[=:]\s*["']?(\d{5,12})["']?/,
            /global\.contacts\.memberId\s*[=:]\s*["']?(\d{5,12})["']?/,
            /["']accountId["']\s*:\s*["']?(\d{5,12})["']?/i,
            /["']memberId["']\s*:\s*["']?(\d{5,12})["']?/i,
            /["']MID["']\s*:\s*["']?(\d{5,12})["']?/,
            /accountMID\s*[=:]\s*["']?(\d{5,12})["']?/i,
            /account_id\s*[=:]\s*["']?(\d{5,12})["']?/i,
            /"mid"\s*:\s*"?(\d{5,12})"?/i,
            /data-mid=["'](\d{5,12})["']/i,
            /\bMID\s*=\s*["']?(\d{5,12})["']?/,
        ];
        let mid = null;
        for (const p of midPatterns) {
            const mm = html.match(p);
            if (mm && mm[1] && parseInt(mm[1]) > 0) { mid = mm[1]; break; }
        }
        console.log('[SCOUT] MID extraction result from HTML:', mid);

        // Try all known SFMC CSRF token embedding patterns (ordered most-specific first)
        const patterns = [
            /global\.contacts\.csrfToken\s*=\s*["']([A-Za-z0-9+\/=_\-]{20,})["']/,
            /window\._csrfToken\s*=\s*["']([A-Za-z0-9+\/=_\-]{20,})["']/,
            /window\.csrfToken\s*=\s*["']([A-Za-z0-9+\/=_\-]{20,})["']/,
            /["']?_csrfToken["']?\s*:\s*["']([A-Za-z0-9+\/=_\-]{20,})["']/,
            /["']?csrfToken["']?\s*:\s*["']([A-Za-z0-9+\/=_\-]{20,})["']/,
            /CsrfToken\s*=\s*["']([A-Za-z0-9+\/=_\-]{20,})["']/i,
            /data-csrftoken=["']([A-Za-z0-9+\/=_\-]{20,})["']/i,
            /<meta\s+name=["']csrf-token["']\s+content=["']([^"']{20,})["']/i,
            /<meta\s+content=["']([^"']{20,})["']\s+name=["']csrf-token["']/i,
            /name=["']_csrfToken["'][^>]*value=["']([^"']{20,})["']/i,
            /value=["']([A-Za-z0-9+\/=_\-]{20,})["'][^>]*name=["']_csrfToken["']/i,
            /"csrftoken"\s*:\s*"([^"]{20,})"/i,
            /csrfToken["']?\s*=\s*["']([A-Za-z0-9+\/=_\-]{20,})["']/
        ];
        let token = null;
        for (const pattern of patterns) {
            const m = html.match(pattern);
            if (m && m[1] && m[1].length >= 20) { token = m[1]; break; }
        }

        if (!token) {
            sendResponse({ success: false, error: 'csrfToken not found in HTML', htmlSnippet: html.slice(0, 500) });
            return;
        }

        // Token found — now try to get MID via API if HTML scraping didn't find it
        if (mid) {
            storeCsrfTok(token, mid, sendResponse);
        } else {
            // Fallback: fetch MID from the account API using the token we just captured
            fetchMidFromApi(instance, token, (resolvedMid) => {
                console.log('[SCOUT] MID from API fallback:', resolvedMid);
                storeCsrfTok(token, resolvedMid, sendResponse);
            });
        }
}

// Fetch account MID via API — tries cookie-only endpoints first (no token needed),
// then falls back to contactsmeta with CSRF if a token has been captured. The MID
// is the 5-10 digit business-unit / account ID used as Bearer auth for the
// contacts-internal API (per HAR: Authorization: Bearer 0073735963).
async function fetchMidFromApi(instance, csrfToken, cb) {
    const stack = (instance || '').replace(/^mc\./, '');
    if (!stack) { cb(null); return; }

    // Cookie-only endpoints — no CSRF required, no app-domain origin issues
    const cookieOnlyEndpoints = [
        `https://mc.${stack}.exacttarget.com/cloud/fuelapi/legacy/v1/beta/organization/user/@me`,
        `https://mc.${stack}.exacttarget.com/cloud/fuelapi/legacy/v1/beta/account`,
        `https://mc.${stack}.exacttarget.com/cloud/fuelapi/platform-internal/v1/accounts?%24pageSize=5&%24page=1&includeParentDetails=true`,
    ];
    // Contactsmeta fallbacks — only useful when a CSRF token has been captured
    const csrfEndpoints = csrfToken ? [
        `https://mc.${stack}.marketingcloudapps.com/contactsmeta/fuelapi/legacy/v1/beta/organization/user/@me`,
        `https://mc.${stack}.marketingcloudapps.com/contactsmeta/fuelapi/legacy/v1/beta/account`,
        `https://mc.${stack}.marketingcloudapps.com/contactsmeta/fuelapi/platform-internal/v1/accounts?%24pageSize=5&%24page=1&includeParentDetails=true`,
    ] : [];

    const extractMid = (data) =>
        data.businessUnitId || data.defaultBusinessunitid ||
        data.memberId || data.memberID || data.MID || data.mid ||
        data.accountId || data.AccountId ||
        (data.items && data.items[0] && (data.items[0].accountId || data.items[0].mid)) ||
        (data.entry && (data.entry.memberId || data.entry.memberID || data.entry.accountId));

    const tryEndpoint = async (url, headers) => {
        try {
            const res = await fetch(url, { method: 'GET', credentials: 'include', headers });
            if (!res.ok) return null;
            const data = await res.json();
            const mid = extractMid(data);
            return (mid && String(mid).match(/^\d{5,12}$/)) ? String(mid) : null;
        } catch (_) { return null; }
    };

    const baseHeaders = { 'accept': 'application/json', 'x-requested-with': 'XMLHttpRequest' };
    const csrfHeaders = { ...baseHeaders, 'x-csrf-token': csrfToken };

    for (const url of cookieOnlyEndpoints) {
        const mid = await tryEndpoint(url, baseHeaders);
        if (mid) { cb(mid); return; }
    }
    for (const url of csrfEndpoints) {
        const mid = await tryEndpoint(url, csrfHeaders);
        if (mid) { cb(mid); return; }
    }
    cb(null);
}

// Ghost tabs/windows are no longer used — all read APIs go through the cookie-only
// /cloud/fuelapi/ proxy on mc.{stack}.exacttarget.com which accepts session cookies.
// The legacy OPEN_GHOST_TAB(S) handlers below are stubbed for backwards compatibility.

// ============================================================
//  MESSAGE HUB
// ============================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { action, type } = request;
    const key = action || type;
    if (!key) return;

    // --- Token messages ---
    if (key === 'GET_TOKENS') {
        chrome.storage.local.get(['scout_cbToken', 'scout_deToken', 'scout_autoToken', 'scout_journeyToken', 'scout_adminToken', 'scout_pageToken'], (result) => {
            // Resolve best available token for each role
            const cbToken   = result.scout_cbToken   || result.scout_pageToken  || null;
            const deToken   = result.scout_deToken   || result.scout_adminToken || null;
            const autoToken = result.scout_autoToken || result.scout_adminToken || null;
            const journeyToken = result.scout_journeyToken || result.scout_adminToken || null;
            const adminToken   = result.scout_adminToken || null;
            sendResponse({
                success: true,
                tokens: {
                    pageHookToken:  cbToken,
                    appcoreToken:   adminToken,
                    cbToken, deToken, autoToken, journeyToken, adminToken
                }
            });
        });
        return true;
    }

    if (key === 'TOKEN_CAPTURED') {
        const storageKey = classifyTokenKey(request.url || '');
        chrome.storage.local.set({ [storageKey]: request.token, [storageKey + '_ts']: Date.now() });
        // Legacy compat
        if (request.tokenType === 'pageHook') chrome.storage.local.set({ scout_pageToken: request.token });
        else chrome.storage.local.set({ scout_adminToken: request.token });
        sendResponse({ success: true });
        return true;
    }

    if (key === 'CLEAR_TOKENS') {
        chrome.storage.local.remove([
            'scout_cbToken', 'scout_deToken', 'scout_autoToken', 'scout_journeyToken',
            'scout_adminToken', 'scout_pageToken',
            'scout_cbToken_ts', 'scout_deToken_ts', 'scout_autoToken_ts', 'scout_journeyToken_ts',
            'scout_adminToken_ts', 'scout_pageToken_ts'
        ], () => { sendResponse({ success: true }); });
        return true;
    }

    // --- FETCH_CSRF: live session ping via the cookie-only /cloud/fuelapi/ proxy ---
    // Read APIs don't need a CSRF token; we just need confirmation that the user has
    // a live SFMC session (cookies present) on this stack. The folder list endpoint is
    // cheap (~1 KB) and returns 200 on a valid session, 401/403 on a stale one.
    //
    // We deliberately do NOT fetch admin.html?hub=1 — it 302s to an OAuth page that
    // CORS-blocks chrome-extension origins and previously caused a runaway refresh loop.
    if (key === 'FETCH_CSRF') {
        const inst = (request.instance || '').replace(/^mc\./, '');
        const probeUrl = inst
            ? `https://mc.${inst}.exacttarget.com/cloud/fuelapi/legacy/v1/beta/folder/0/children?$pageSize=1`
            : null;

        const respondFromStorage = (sessionOk, hint) => {
            chrome.storage.local.get(
                ['scout_adminToken', 'scout_deToken', 'scout_cbToken', 'scout_contactsMid'],
                (r) => {
                    const haveTok = !!(r.scout_adminToken || r.scout_deToken || r.scout_cbToken);
                    sendResponse({
                        success: sessionOk,
                        sessionOk,
                        haveCsrfToken: haveTok,
                        token: r.scout_adminToken || r.scout_deToken || r.scout_cbToken || null,
                        mid: r.scout_contactsMid || null,
                        hint
                    });
                }
            );
        };

        if (!probeUrl) {
            respondFromStorage(false, 'No SFMC instance detected — open an SFMC tab first.');
            return true;
        }

        fetch(probeUrl, { method: 'GET', credentials: 'include', headers: { 'accept': 'application/json' } })
            .then(r => {
                if (r.ok) return respondFromStorage(true, null);
                if (r.status === 401 || r.status === 403) {
                    return respondFromStorage(false, `Not logged in to SFMC (HTTP ${r.status}). Open SFMC in this browser and sign in.`);
                }
                return respondFromStorage(false, `Session probe returned HTTP ${r.status}.`);
            })
            .catch(err => respondFromStorage(false, `Session probe failed: ${err.message}`));
        return true;
    }

    // --- Legacy ghost-tab handlers — now no-ops ---
    // Read APIs use the cookie-only /cloud/fuelapi/ proxy on mc.{stack}.exacttarget.com.
    // Per-section CSRF tokens are still captured passively via the webRequest listener
    // when the user naturally navigates SFMC, used only by the remaining write paths.
    if (key === 'OPEN_GHOST_TAB' || key === 'OPEN_GHOST_TABS') {
        sendResponse({ success: true, noop: true });
        return true;
    }

    // --- Debug: get tokens with full timestamps ---
    if (key === 'GET_TOKENS_DETAILED') {
        chrome.storage.local.get([
            'scout_cbToken', 'scout_cbToken_ts',
            'scout_deToken', 'scout_deToken_ts',
            'scout_autoToken', 'scout_autoToken_ts',
            'scout_journeyToken', 'scout_journeyToken_ts',
            'scout_adminToken', 'scout_adminToken_ts',
            'scout_pageToken', 'scout_contactsMid'
        ], (r) => {
            sendResponse({
                success: true,
                tokens: {
                    cb:      { value: r.scout_cbToken || r.scout_pageToken || null, ts: r.scout_cbToken_ts || null },
                    de:      { value: r.scout_deToken || null,      ts: r.scout_deToken_ts || null },
                    auto:    { value: r.scout_autoToken || null,    ts: r.scout_autoToken_ts || null },
                    journey: { value: r.scout_journeyToken || null, ts: r.scout_journeyToken_ts || null },
                    admin:   { value: r.scout_adminToken || null,   ts: r.scout_adminToken_ts || null }
                },
                contactsMid: r.scout_contactsMid || null
            });
        });
        return true;
    }

    // --- Contact MID (used as Authorization: Bearer for contacts-internal API) ---
    if (key === 'GET_CONTACT_MID') {
        chrome.storage.local.get(['scout_contactsMid'], (r) => {
            sendResponse({ mid: r.scout_contactsMid || null });
        });
        return true;
    }

    // --- Active MID probe: returns cached MID, or actively fetches one via
    // cookie-only endpoints (no CSRF required) if not yet captured. Use this
    // before calling the contacts-internal API which needs Authorization: Bearer {MID}.
    if (key === 'FETCH_MID') {
        chrome.storage.local.get(['scout_contactsMid', 'scout_adminToken', 'scout_deToken'], (r) => {
            if (r.scout_contactsMid) {
                sendResponse({ success: true, mid: r.scout_contactsMid, source: 'cache' });
                return;
            }
            const csrf = r.scout_adminToken || r.scout_deToken || null;
            fetchMidFromApi(request.instance, csrf, (mid) => {
                if (mid) {
                    chrome.storage.local.set({ scout_contactsMid: mid });
                    sendResponse({ success: true, mid, source: 'probe' });
                } else {
                    sendResponse({ success: false, mid: null, hint: 'MID probe failed — open Contact Builder once so the passive header capture can pick it up.' });
                }
            });
        });
        return true;
    }

    // --- CORS proxy ---
    if (key === 'MAKE_REQUEST') {
        makeAPIRequest(request.url, request.method, request.headers, request.body)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ ok: false, error: err.message }));
        return true;
    }

    // --- Snippet handlers ---
    if (key === 'getSnippets') {
        handleGetSnippets(request, sendResponse);
        return true;
    }
    if (key === 'updateSnippetUsageCount') {
        handleUpdateSnippetUsageCount(request, sendResponse);
        return true;
    }

    // --- Registration ---
    if (key === 'registerContentScript') {
        handleRegisterContentScript(request, sender, sendResponse);
        return true;
    }

    // --- DE usage handlers ---
    if (key === 'fetchDEUsageQueries') {
        handleFetchDEUsageQueries(request, sendResponse);
        return true;
    }
    if (key === 'fetchDEUsageAutomations') {
        handleFetchDEUsageAutomations(request, sendResponse);
        return true;
    }
    if (key === 'fetchDEUsageJourneys') {
        handleFetchDEUsageJourneys(request, sendResponse);
        return true;
    }
    if (key === 'fetchJourneyEventDefinition') {
        handleFetchJourneyEventDefinition(request, sendResponse);
        return true;
    }
    if (key === 'invalidateUsageIndex') {
        handleInvalidateUsageIndex(request, sendResponse);
        return true;
    }
    if (key === 'fetchFieldDefinitions') {
        handleFetchFieldDefinitions(request, sendResponse);
        return true;
    }
    if (key === 'updateFieldDefinitions') {
        handleUpdateFieldDefinitions(request, sendResponse);
        return true;
    }
    if (key === 'createFieldDefinitions') {
        handleCreateFieldDefinitions(request, sendResponse);
        return true;
    }
    if (key === 'checkAsyncStatus') {
        handleCheckAsyncStatus(request, sendResponse);
        return true;
    }

    // --- Automation handlers ---
    if (key === 'fetchAutomationDetails') {
        handleFetchAutomationDetails(request, sendResponse);
        return true;
    }
    if (key === 'fetchAutomationSteps') {
        handleFetchAutomationSteps(request, sendResponse);
        return true;
    }
    if (key === 'fetchAutomationDefinition') {
        handleFetchAutomationDefinition(request, sendResponse);
        return true;
    }
    if (key === 'fetchActivityCode') {
        handleFetchActivityCode(request, sendResponse);
        return true;
    }

    // --- Universal search ---
    if (key === 'universalSearch') {
        handleUniversalSearch(request, sendResponse);
        return true;
    }

    // --- DE quick actions ---
    if (key === 'deSearch') {
        handleDESearch(request, sendResponse).catch(err =>
            sendResponse({ success: false, error: err.message }));
        return true;
    }
    if (key === 'createDE') {
        handleCreateDE(request, sendResponse).catch(err =>
            sendResponse({ success: false, error: err.message }));
        return true;
    }
    if (key === 'exportDE') {
        handleExportDE(request, sendResponse).catch(err =>
            sendResponse({ success: false, error: err.message }));
        return true;
    }
    if (key === 'importDE') {
        handleImportDE(request, sendResponse).catch(err =>
            sendResponse({ success: false, error: err.message }));
        return true;
    }
    if (key === 'generateReport') {
        handleGenerateReport(request, sendResponse).catch(err =>
            sendResponse({ success: false, error: err.message }));
        return true;
    }
    if (key === 'fetchFolderChildren') {
        handleFetchFolderChildren(request, sendResponse).catch(err =>
            sendResponse({ success: false, error: err.message }));
        return true;
    }
});

// Streaming search via port
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'universalSearchStream') {
        port.onMessage.addListener((request) => {
            if (request.action === 'universalSearchStream') {
                handleUniversalSearchStream(request, port);
            }
        });
    }
    if (port.name === 'fetchDEUsageAutomationsStream') {
        port.onMessage.addListener((request) => {
            if (request.action === 'fetchDEUsageAutomationsStream') {
                handleFetchDEUsageAutomationsStream(request, port);
            }
        });
    }
    if (port.name === 'fetchDEUsageJourneysStream') {
        port.onMessage.addListener((request) => {
            if (request.action === 'fetchDEUsageJourneysStream') {
                handleFetchDEUsageJourneysStream(request, port);
            }
        });
    }
});

// Cleanup registered tabs on close
chrome.runtime.onInstalled.addListener(() => {});
chrome.tabs.onRemoved.addListener((tabId) => {
    const registeredTabs = getRegisteredTabs();
    if (registeredTabs) registeredTabs.delete(tabId);
});

// ── Toolbar icon click ───────────────────────────────────────────────────────
// The debug page (chrome-extension://{id}/debug.html) is parked for now.
// The contact-search feature it hosts works in dev/sandbox orgs but is
// unreliable in production where the contacts-internal CSRF token rotates
// faster than the panel can refresh, so we don't expose it as the default
// toolbar action yet. The page, the handlers, and the routing are all left
// intact in the codebase for future re-enablement.
//
// To re-enable: uncomment the listener below and the action.default_title in
// manifest.json. The page is still accessible directly at
//   chrome-extension://{extension-id}/debug.html
// (Settings → Extensions → SFMC Scout → "Details" → "Inspect views" picks up
// debug.html when it's loaded in any tab.)
//
// chrome.action.onClicked.addListener(() => {
//     chrome.tabs.create({ url: chrome.runtime.getURL('debug.html') });
// });
