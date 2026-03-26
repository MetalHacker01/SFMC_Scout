// background.js — SFMC Scout
// Copyright (c) 2026 Aldorino Rrushi

import { handleFetchDEUsageQueries, handleFetchDEUsageAutomations, handleFetchDEUsageJourneys, handleFetchJourneyEventDefinition, handleFetchFieldDefinitions, handleUpdateFieldDefinitions, handleCreateFieldDefinitions } from './handlers/de/index.js';
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
        const tokenHeader = details.requestHeaders.find(
            h => h.name.toLowerCase() === 'x-csrf-token'
        );
        if (!tokenHeader || !tokenHeader.value || tokenHeader.value.length < 20) return;

        const storageKey = classifyTokenKey(details.url);
        const token = tokenHeader.value;
        chrome.storage.local.set({ [storageKey]: token, [storageKey + '_ts']: Date.now() });

        // Also keep legacy keys in sync for backward-compat
        if (storageKey === 'scout_cbToken') chrome.storage.local.set({ scout_pageToken: token });
        else if (storageKey === 'scout_adminToken' || storageKey === 'scout_deToken') chrome.storage.local.set({ scout_adminToken: token });
    },
    {
        urls: [
            'https://*.marketingcloudapps.com/*',
            'https://*.exacttarget.com/*'
        ]
    },
    ['requestHeaders']
);

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
function storeCsrfTok(tok, cb) {
    const ts = Date.now();
    chrome.storage.local.set({
        scout_deToken:    tok, scout_deToken_ts:    ts,
        scout_adminToken: tok, scout_adminToken_ts: ts,
        scout_pageToken:  tok
    }, () => cb({ success: true, token: tok }));
}

// Direct service worker fetch fallback (may fail on fresh BU — cookie/CORS context)
function fetchCsrfDirectly(url, sendResponse) {
    fetch(url, { method: 'GET', credentials: 'include' })
    .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
    })
    .then(html => {
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
        for (const pattern of patterns) {
            const m = html.match(pattern);
            if (m && m[1] && m[1].length >= 20) { storeCsrfTok(m[1], sendResponse); return; }
        }
        sendResponse({ success: false, error: 'csrfToken not found in HTML', htmlSnippet: html.slice(0, 500) });
    })
    .catch(err => sendResponse({ success: false, error: err.message }));
}

// Shared minimized popup window reused for all ghost tab captures
let ghostWindowId = null;

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

    // --- Fetch CSRF token via service worker (host_permissions bypass CORS) ---
    // executeScript runs in the page's JS context — cross-origin CORS still applies there.
    // The service worker fetch is NOT subject to CORS when host_permissions cover the URL,
    // so we go straight to fetchCsrfDirectly instead of executeScript.
    if (key === 'FETCH_CSRF') {
        const inst = request.instance; // e.g. 'mc.s11'
        if (!inst) { sendResponse({ success: false, error: 'No instance provided' }); return true; }
        const csrfUrl = `https://${inst}.marketingcloudapps.com/contactsmeta/admin.html?hub=1`;
        fetchCsrfDirectly(csrfUrl, sendResponse);
        return true;
    }

    // --- Debug: ghost tab for token capture (hidden in shared minimized window) ---
    if (key === 'OPEN_GHOST_TAB') {
        const tabUrl = request.url;
        const timeout = request.timeout || 12000;

        // Create the tab in a given window (or current window if windowId is null)
        const doCreate = (windowId) => {
            const opts = windowId != null
                ? { url: tabUrl, active: false, windowId }
                : { url: tabUrl, active: false };
            chrome.tabs.create(opts, (tab) => {
                if (chrome.runtime.lastError || !tab) {
                    sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Tab creation failed' });
                    return;
                }
                sendResponse({ success: true, tabId: tab.id });
                setTimeout(() => chrome.tabs.remove(tab.id, () => { void chrome.runtime.lastError; }), timeout);
            });
        };

        // Reuse or create a minimized popup window so ghost tabs never appear
        // in the user's main browser window tab bar
        const useOrCreateWindow = () => {
            if (ghostWindowId !== null) {
                chrome.windows.get(ghostWindowId, (w) => {
                    if (chrome.runtime.lastError || !w) {
                        ghostWindowId = null;
                        useOrCreateWindow();
                    } else {
                        doCreate(ghostWindowId);
                    }
                });
                return;
            }
            chrome.windows.create({ type: 'popup', state: 'minimized', focused: false }, (win) => {
                if (chrome.runtime.lastError || !win) {
                    doCreate(null); // fallback: open in user's window
                    return;
                }
                ghostWindowId = win.id;
                // Auto-close the ghost window after the longest tab (Auto: 35s) plus buffer
                setTimeout(() => {
                    if (ghostWindowId === win.id) {
                        chrome.windows.remove(win.id, () => { void chrome.runtime.lastError; });
                        ghostWindowId = null;
                    }
                }, 42000);
                doCreate(ghostWindowId);
            });
        };

        useOrCreateWindow();
        return true;
    }

    // --- Multi-tab ghost window: opens ALL token-capture tabs in one minimized window ---
    if (key === 'OPEN_GHOST_TABS') {
        const urls = request.urls || [];   // array of { url, timeout }
        if (!urls.length) { sendResponse({ success: false, error: 'No URLs provided' }); return true; }
        const maxTimeout = Math.max(...urls.map(u => u.timeout || 20000)) + 5000;

        const openAllTabs = (windowId) => {
            urls.forEach(({ url, timeout }) => {
                const opts = windowId != null
                    ? { url, active: false, windowId }
                    : { url, active: false };
                chrome.tabs.create(opts, (tab) => {
                    if (chrome.runtime.lastError || !tab) return;
                    setTimeout(() => chrome.tabs.remove(tab.id, () => { void chrome.runtime.lastError; }), timeout || 20000);
                });
            });
            sendResponse({ success: true });
        };

        const useOrCreateMultiWindow = () => {
            if (ghostWindowId !== null) {
                chrome.windows.get(ghostWindowId, (w) => {
                    if (chrome.runtime.lastError || !w) { ghostWindowId = null; useOrCreateMultiWindow(); }
                    else { openAllTabs(ghostWindowId); }
                });
                return;
            }
            chrome.windows.create({ type: 'popup', state: 'minimized', focused: false }, (win) => {
                if (chrome.runtime.lastError || !win) {
                    openAllTabs(null); // fallback: open in user's window
                    return;
                }
                ghostWindowId = win.id;
                setTimeout(() => {
                    if (ghostWindowId === win.id) {
                        chrome.windows.remove(win.id, () => { void chrome.runtime.lastError; });
                        ghostWindowId = null;
                    }
                }, maxTimeout);
                openAllTabs(ghostWindowId);
            });
        };

        useOrCreateMultiWindow();
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
            'scout_pageToken'
        ], (r) => {
            sendResponse({
                success: true,
                tokens: {
                    cb:      { value: r.scout_cbToken || r.scout_pageToken || null, ts: r.scout_cbToken_ts || null },
                    de:      { value: r.scout_deToken || null,      ts: r.scout_deToken_ts || null },
                    auto:    { value: r.scout_autoToken || null,    ts: r.scout_autoToken_ts || null },
                    journey: { value: r.scout_journeyToken || null, ts: r.scout_journeyToken_ts || null },
                    admin:   { value: r.scout_adminToken || null,   ts: r.scout_adminToken_ts || null }
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
});

// Cleanup registered tabs on close
chrome.runtime.onInstalled.addListener(() => {});
chrome.tabs.onRemoved.addListener((tabId) => {
    const registeredTabs = getRegisteredTabs();
    if (registeredTabs) registeredTabs.delete(tabId);
});

// Toolbar icon click → open debug page
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('debug.html') });
});
