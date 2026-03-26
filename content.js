// content.js — SFMC Scout
// Copyright (c) 2026 Aldorino Rrushi
// Injected side panel for SFMC — session-based auth, no login form required.

(function() {
'use strict';

if (window.__SCS_LOADED__) return;
window.__SCS_LOADED__ = true;

// ============================================================
//  CONFIG
// ============================================================
const SCS = {
    PANEL_WIDTH_DEFAULT: 660,
    PANEL_WIDTH_MIN: 440,
    PANEL_WIDTH_MAX: 1100,
    CACHE_TTL_MS: 5 * 60 * 1000,
    TOKEN_POLL_MS: 1500,
    TOKEN_TIMEOUT_MS: 22000
};

// ============================================================
//  STACK / INSTANCE
// ============================================================
function getStack() {
    const m = window.location.hostname.match(/\.(s\d+)\.|^mc\.(s\d+)\./);
    return m ? (m[1] || m[2]) : null;
}
const stack = getStack();

function getInstance() {
    const h = window.location.hostname;
    const m1 = h.match(/^mc\.(s\d+)\.exacttarget/);
    if (m1) return 'mc.' + m1[1];
    const m2 = h.match(/^([\w-]+)\.marketingcloudapps/);
    if (m2) return m2[1];
    return stack ? 'mc.' + stack : null;
}
const instance = getInstance();

// ============================================================
//  ICONS (Iconoir SVG)
// ============================================================
const I = {
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20L17 17"/></svg>',
    automation: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17.5 17.5V14M14 17.5H17.5"/></svg>',
    database: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19C3 20.6569 7.02944 22 12 22C16.9706 22 21 20.6569 21 19V5"/><path d="M3 12C3 13.6569 7.02944 15 12 15C16.9706 15 21 13.6569 21 12"/></svg>',
    snippets: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 6L10 18.5"/><path d="M6.5 8.5L3 12L6.5 15.5"/><path d="M17.5 8.5L21 12L17.5 15.5"/></svg>',
    refresh: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.168 8A10.003 10.003 0 0012 2C6.477 2 2 6.477 2 12s4.477 10 10 10c4.478 0 8.268-2.943 9.542-7"/><path d="M17 8H21.4C21.7314 8 22 7.73137 22 7.4V3"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.758 17.243L12.001 12M17.244 6.757L12.001 12M12.001 12L6.758 6.757M12.001 12L17.244 17.243"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 11V17"/><path d="M12 7.01L12.01 6.9989"/></svg>',
    back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6L9 12L15 18"/></svg>',
    download: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20H18"/><path d="M12 4V16M12 16L15.5 12.5M12 16L8.5 12.5"/></svg>',
    copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.4 20H9.6C9.26863 20 9 19.7314 9 19.4V9.6C9 9.26863 9.26863 9 9.6 9H19.4C19.7314 9 20 9.26863 20 9.6V19.4C20 19.7314 19.7314 20 19.4 20Z"/><path d="M15 9V4.6C15 4.26863 14.7314 4 14.4 4H4.6C4.26863 4 4 4.26863 4 4.6V14.4C4 14.7314 4.26863 15 4.6 15H9"/></svg>',
    chevDown: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9L12 15L18 9"/></svg>',
    chevRight: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6L15 12L9 18"/></svg>',
    play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3L20 12L6 21V3Z"/></svg>',
    plus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5V19M5 12H19"/></svg>',
    upload: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 13V22"/><path d="M9 16L12 13L15 16"/><path d="M20 17.607C21.262 16.534 22 14.938 22 13.173C22 9.826 19.379 7.102 16.098 7.102C15.756 7.102 15.419 7.13 15.09 7.185C14.097 4.712 11.739 3 9 3C5.134 3 2 6.177 2 10.098C2 12.002 2.756 13.735 4 14.985"/></svg>',
    report: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 18H5C3.89543 18 3 17.1046 3 16V5C3 3.89543 3.89543 3 5 3H15C16.1046 3 17 3.89543 17 5V8"/><path d="M8 21H20C21.1046 21 22 20.1046 22 19V11C22 9.89543 21.1046 9 20 9H8C6.89543 9 6 9.89543 6 11V19C6 20.1046 6.89543 21 8 21Z"/><path d="M10 14H18M10 17H15"/></svg>',
    spinner: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="scout-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13L9 17L19 7"/></svg>',
    folder: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7C3 5.89543 3.89543 5 5 5H9.58579C9.851 5 10.1054 5.10536 10.2929 5.29289L11.7071 6.70711C11.8946 6.89464 12.149 7 12.4142 7H19C20.1046 7 21 7.89543 21 9V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V7Z"/></svg>',
    user: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20C4 17.7909 7.58172 16 12 16C16.4183 16 20 17.7909 20 20"/></svg>',
    attach: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.4 11.6L12.5 20.5C10.1 22.9 6.2 22.9 3.8 20.5C1.4 18.1 1.4 14.2 3.8 11.8L12.7 2.9C14.3 1.3 16.9 1.3 18.5 2.9C20.1 4.5 20.1 7.1 18.5 8.7L9.6 17.6C8.8 18.4 7.5 18.4 6.7 17.6C5.9 16.8 5.9 15.5 6.7 14.7L14.9 6.5"/></svg>',
    searchEmpty: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20L17 17"/></svg>',
    gearEmpty: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"/><path d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L13.0074 2H10.9926L10.4422 4.36974L7.73529 5.48295L6 4L4 6L5.47528 7.7448L4.37776 10.3954L2 10.9926V13.0074L4.37776 13.6046L5.47528 16.2552L4 18L6 20L7.73529 18.517L10.4422 19.6303L10.9926 22H13.0074L13.5578 19.6303L16.2647 18.517L18 20L20 18L18.5247 16.2552L19.6224 13.6046L22 13.0074V10.9926L19.6224 10.3954Z"/></svg>',
    externalLink: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11"/><path d="M15 3H21V9"/><path d="M10 14L21 3"/></svg>',
    journey: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17L9 11L13 15L21 7"/><path d="M15 7H21V13"/></svg>',
    email: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8"/><path d="M21 8C21 6.89543 20.1046 6 19 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18H19C20.1046 18 21 17.1046 21 16V8Z"/></svg>',
    asset: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15L8 10L12 14"/><path d="M12 14L15 11L21 17"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>',
    query: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2"/><path d="M16 2H20V6"/><path d="M10 14L20 4"/></svg>',
    chevLeft: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6L9 12L15 18"/></svg>',
    reports: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H15M9 13H15M9 9H11"/><path d="M5 3H14.5L19 7.5V21H5V3Z"/><path d="M14 3V8H19"/></svg>',
    deTable: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19C3 20.66 7.03 22 12 22C16.97 22 21 20.66 21 19V5"/><path d="M3 12C3 13.66 7.03 15 12 15C16.97 15 21 13.66 21 12"/></svg>',
    deSendable: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="10" cy="5" rx="7" ry="2.5"/><path d="M3 5v12c0 1.38 3.13 2.5 7 2.5h.5"/><path d="M3 11c0 1.38 3.13 2.5 7 2.5"/><path fill="currentColor" stroke="none" d="M17.5 12.5L22 15.5L17.5 18.5Z"/></svg>',
    sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>'
};

// ============================================================
//  STATE
// ============================================================
const S = {
    open: false,
    tab: 'search',         // search | automations | de | reports
    pageHookToken: null,
    appcoreToken: null,
    deToken: null,
    autoToken: null,
    journeyToken: null,
    // Search
    searchQuery: '',
    searchFilter: 'all',   // all | de | automation | journey | email | asset
    searchResults: [],
    searchLoading: false,
    activeSearchPort: null,
    allSearchResults: [],
    splitHoverIdx: null,   // hovered result index for split preview
    deSearchQuery: '',
    deSearchResults: [],
    // Automations
    autoDetail: null,
    autoDetailLoading: false,
    autoSplitHoverId: null,  // hovered automation id for split preview
    autoSearchQuery: '',
    autoSearchResults: [],
    // DE Tools
    deSubTab: 'search',    // search | create | report
    deResults: [],
    deLoading: false,
    deCreateFields: [],
    deDetail: null,
    deWizardStep: 1,       // 1 | 2 | 3
    deWizardData: {},      // persists values across wizard steps
    reportsTab: 'de',       // de | automations | journeys | assets | activities
    panelOpenedOnce: false,
    theme: 'dark',          // dark | light
    // Activities browser
    actDetail: null,
    actList: [],
    actListLoading: false,
    actListFilter: 'all'
};

// ============================================================
function injectStyles() {
    if (document.getElementById('scout-styles')) return;
    const link = document.createElement('link');
    link.id = 'scout-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('panel.css');
    document.head.appendChild(link);
}

// ============================================================
//  TOAST NOTIFICATIONS
// ============================================================
function toast(msg, type = 'info', duration = 3500) {
    const t = document.createElement('div');
    t.className = 'scout-toast ' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), duration);
}

// ============================================================
//  TOKEN CAPTURE (CPM pattern)
// ============================================================
function captureTokensFromDOM() {
    const origFetch = window.fetch;
    window.fetch = function(...args) {
        return origFetch.apply(this, args).then(res => {
            const tok = res.headers.get('x-csrf-token') || res.headers.get('X-CSRF-Token');
            if (tok && tok.length > 20) {
                const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
                const type = url.includes('content-builder') || url.includes('asset/v1') ? 'pageHook' : 'appcore';
                chrome.runtime.sendMessage({ type: 'TOKEN_CAPTURED', tokenType: type, token: tok }).catch(() => {});
            }
            return res;
        });
    };

    const origOpen = XMLHttpRequest.prototype.open;
    const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.open = function(method, url) {
        this.__scout_url = url;
        return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
        if (String(header).toLowerCase() === 'x-csrf-token' && value && value.length > 20) {
            const url = this.__scout_url || '';
            const type = url.includes('content-builder') || url.includes('asset/v1') ? 'pageHook' : 'appcore';
            chrome.runtime.sendMessage({ type: 'TOKEN_CAPTURED', tokenType: type, token: value }).catch(() => {});
        }
        return origSetHeader.apply(this, arguments);
    };
}

function injectTokenCaptureIframes(onComplete) {
    // Tokens are captured passively via the webRequest listener in background.js
    // as the ghost tabs load SFMC module pages. No active fetch needed here.
    if (onComplete) onComplete(null, null);
}

/**
 * Ghost-window token refresh:
 * 1. Fetch DE/admin CSRF token via service worker (direct, no CORS issue)
 * 2. Open invisible ghost tabs to CB, Auto, Journey SFMC sections so the
 *    webRequest listener intercepts the x-csrf-token headers from those pages
 * 3. Poll GET_TOKENS for up to 30 s; update badge as each token lands
 */
function refreshAllTokensWithGhostTabs() {
    if (!instance) { toast('No SFMC instance detected', 'warning'); return; }

    const badge = document.getElementById('scout-badge-token');
    if (badge) {
        badge.className = 'scout-token-badge loading';
        badge.innerHTML = '<span class="scout-token-dot"></span> Refreshing…';
    }
    toast('Opening ghost tabs to capture tokens…', 'info');

    // Ghost tabs — each page loads and fires credentialed requests
    // that the webRequest listener in background.js intercepts and stores
    const ghostUrls = [
        { url: `https://mc.${stack}.exacttarget.com/cloud/#app/Content%20Builder`, label: 'Content Builder', timeout: 28000 },
        { url: `https://mc.${stack}.marketingcloudapps.com/contactsmeta/`, label: 'Contact Builder (DE)', timeout: 22000 },
        { url: `https://mc.${stack}.exacttarget.com/cloud/#app/Automation%20Studio/AutomationStudioFuel3/%23Activities`, label: 'Automation Studio', timeout: 32000 },
        { url: `https://mc.${stack}.exacttarget.com/cloud/#app/Journey%20Builder`, label: 'Journey Builder', timeout: 30000 }
    ];
    chrome.runtime.sendMessage(
        { type: 'OPEN_GHOST_TABS', urls: ghostUrls },
        () => { void chrome.runtime.lastError; }
    );

    // 3. Poll for tokens every 2s for up to 30s
    let polls = 0;
    const pollId = setInterval(() => {
        polls++;
        chrome.runtime.sendMessage({ type: 'GET_TOKENS' }, res => {
            if (!res || !res.success) return;
            S.pageHookToken = res.tokens.pageHookToken || S.pageHookToken;
            S.appcoreToken  = res.tokens.appcoreToken  || S.appcoreToken;
            S.deToken       = res.tokens.deToken       || S.deToken;
            S.autoToken     = res.tokens.autoToken     || S.autoToken;
            S.journeyToken  = res.tokens.journeyToken  || S.journeyToken;
            updateTokenBadges();

            const captured = [S.pageHookToken, S.deToken, S.autoToken, S.journeyToken].filter(Boolean).length;
            if (captured === 4 || polls >= 15) {
                clearInterval(pollId);
                if (captured === 4) toast('All tokens captured!', 'success');
                else toast(`${captured}/4 tokens captured — navigate to missing SFMC sections`, captured > 0 ? 'warning' : 'error');
            }
        });
    }, 2000);
}

function loadTokens(cb) {
    chrome.runtime.sendMessage({ type: 'GET_TOKENS' }, res => {
        if (res && res.success) {
            S.pageHookToken = res.tokens.pageHookToken;
            S.appcoreToken  = res.tokens.appcoreToken;
            S.deToken       = res.tokens.deToken;
            S.autoToken     = res.tokens.autoToken;
            S.journeyToken  = res.tokens.journeyToken;
        }
        updateTokenBadges();
        if (cb) cb();
    });
}

function updateTokenBadges() {
    const badge = document.getElementById('scout-badge-token');
    if (!badge) return;
    const tokens = [S.pageHookToken, S.deToken, S.autoToken, S.journeyToken];
    const captured = tokens.filter(Boolean).length;
    const total = tokens.length;
    let cls, text;
    if (captured === 0) {
        cls = 'missing'; text = 'No Tokens';
    } else if (captured < total) {
        cls = 'partial'; text = captured + '/' + total + ' Tokens';
    } else {
        cls = 'ok'; text = 'All Tokens';
    }
    badge.className = 'scout-token-badge ' + cls;
    badge.innerHTML = '<span class="scout-token-dot"></span> ' + text;
}

function applyTheme() {
    const panel = document.getElementById('scout-panel');
    const toggle = document.getElementById('scout-toggle');
    const btn = document.getElementById('scout-theme-btn');
    const overlay = document.getElementById('scout-about-overlay');
    const isLight = S.theme === 'light';
    if (panel) panel.classList.toggle('scout-light', isLight);
    if (toggle) toggle.classList.toggle('scout-light', isLight);
    if (overlay) overlay.classList.toggle('scout-light', isLight);
    if (btn) btn.innerHTML = isLight ? I.moon : I.sun;
    if (btn) btn.title = isLight ? 'Switch to dark mode' : 'Switch to light mode';
}

// ============================================================
//  API HELPER (via background CORS proxy)
// ============================================================
function sfmcFetch(url, method, extraHeaders, body) {
    const headers = { 'accept': 'application/json', 'content-type': 'application/json', ...extraHeaders };
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'MAKE_REQUEST', url, method: method || 'GET', headers, body: body || null }, res => {
            if (!res) return reject(new Error('No response from background'));
            if (!res.ok) return reject(new Error(res.error || ('HTTP ' + res.status)));
            resolve(res.data);
        });
    });
}

// ============================================================
//  PANEL HTML BUILDER
// ============================================================
function buildPanelHTML() {
    return `
<div id="scout-resize-handle"></div>
<div class="scout-header">
    <div class="scout-header-brand">
        <img src="${chrome.runtime.getURL('icons/icon-48.png')}" class="scout-logo" alt="Scout">
        <span class="scout-brand-name">SFMC Scout</span>
    </div>
    <nav class="scout-tabs">
        <button class="scout-tab active" data-tab="search">${I.search} Search</button>
        <button class="scout-tab" data-tab="automations">${I.automation} Automations</button>
        <button class="scout-tab" data-tab="de">${I.database} DE Tools</button>
        <button class="scout-tab" data-tab="reports">${I.reports} Reports</button>
    </nav>
    <div class="scout-header-right">
        <button class="scout-icon-btn" id="scout-theme-btn" title="Toggle light/dark mode" aria-label="Toggle theme">${I.sun}</button>
        <button class="scout-icon-btn" id="scout-about-btn" title="About" aria-label="About">${I.info}</button>
        <button class="scout-icon-btn" id="scout-close-btn" title="Close panel" aria-label="Close">${I.close}</button>
    </div>
</div>
<div class="scout-main">
    <div class="scout-content" id="scout-content"></div>
    <div class="scout-statusbar">
        <span class="scout-statusbar-stack">${stack ? stack.toUpperCase() : '——'}</span>
        <div class="scout-statusbar-right">
            <button class="scout-statusbar-btn" id="scout-recapture-btn" title="Re-capture tokens" aria-label="Refresh tokens">${I.refresh}</button>
            <span id="scout-badge-token" class="scout-token-badge loading"><span class="scout-token-dot"></span> Token</span>
        </div>
    </div>
</div>`;
}

// ============================================================
//  ABOUT MODAL
// ============================================================
function buildAboutModal() {
    const el = document.createElement('div');
    el.id = 'scout-about-overlay';
    el.innerHTML = `
<div class="scout-about-modal">
    <button class="scout-about-x" id="scout-about-close" aria-label="Close">${I.close}</button>

    <div class="scout-about-top">
        <div class="scout-about-logo-ring">
            <img src="${chrome.runtime.getURL('icons/icon-48.png')}" width="32" height="32" alt="">
        </div>
        <div>
            <div class="scout-about-brand">SFMC <span>Scout</span></div>
            <div class="scout-about-tagline">Developer tool for Salesforce Marketing Cloud</div>
        </div>
        <span class="scout-about-version">v2.0.0</span>
    </div>

    <div class="scout-about-tags">
        <span class="scout-about-tag">DE Tools</span>
        <span class="scout-about-tag">Automations</span>
        <span class="scout-about-tag">Universal Search</span>
        <span class="scout-about-tag">Snippets</span>
        <span class="scout-about-tag">Reports</span>
    </div>

    <div class="scout-about-divider"></div>

    <div class="scout-about-section-label">Built by</div>
    <div class="scout-about-link-cards">
        <a href="https://www.linkedin.com/in/aldorino-rrushi/" target="_blank" rel="noopener" class="scout-about-link-card">
            <div class="scout-about-link-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8V16C21 18.761 18.761 21 16 21H8C5.239 21 3 18.761 3 16V8C3 5.239 5.239 3 8 3H16C18.761 3 21 5.239 21 8Z"/><path d="M7 17V13.5V10"/><path d="M11 17V13.75M11 10V13.75M11 13.75C11 10 17 10 17 13.75V17"/><path d="M7 7.01L7.01 6.999"/></svg>
            </div>
            <div class="scout-about-link-text">
                <span class="scout-about-link-name">Aldorino Rrushi</span>
                <span class="scout-about-link-handle">linkedin.com/in/aldorino-rrushi</span>
            </div>
            <span class="scout-about-link-arrow">${I.externalLink}</span>
        </a>
        <a href="https://martech-maestro-folio-sroh.vercel.app/" target="_blank" rel="noopener" class="scout-about-link-card">
            <div class="scout-about-link-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22Z"/><path d="M2.5 12.5L8 11L10 14L8 17L9 22"/><path d="M17 21.5L16 17.5L13 16V13L17 12L21.5 13"/><path d="M15 2.5L14 6L10 7V10L14 9L15.5 7L19 8"/></svg>
            </div>
            <div class="scout-about-link-text">
                <span class="scout-about-link-name">Portfolio</span>
                <span class="scout-about-link-handle">MarTech Maestro</span>
            </div>
            <span class="scout-about-link-arrow">${I.externalLink}</span>
        </a>
        <a href="https://github.com/MetalHacker01" target="_blank" rel="noopener" class="scout-about-link-card">
            <div class="scout-about-link-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 22.027V19.157C16.037 18.68 15.973 18.2 15.811 17.75C15.649 17.3 15.393 16.89 15.06 16.547C18.2 16.197 21.5 15.007 21.5 9.517C21.5 8.1 20.963 6.738 20 5.717C20.456 4.481 20.424 3.113 19.91 1.897C19.91 1.897 18.73 1.547 16 3.487C13.708 2.886 11.292 2.886 9 3.487C6.27 1.547 5.09 1.897 5.09 1.897C4.576 3.113 4.544 4.481 5 5.717C4.03 6.745 3.493 8.116 3.5 9.547C3.5 15.007 6.8 16.197 9.94 16.577C9.611 16.917 9.357 17.322 9.195 17.767C9.033 18.211 8.967 18.685 9 19.157V22.027"/><path d="M9 20.027C6 21 3.5 20.027 2 17.027"/></svg>
            </div>
            <div class="scout-about-link-text">
                <span class="scout-about-link-name">GitHub</span>
                <span class="scout-about-link-handle">MetalHacker01</span>
            </div>
            <span class="scout-about-link-arrow">${I.externalLink}</span>
        </a>
    </div>

    <div class="scout-about-footer">&copy; 2026 Aldorino Rrushi &mdash; All rights reserved</div>
</div>`;
    return el;
}

// ============================================================
//  VIEW RENDERERS
// ============================================================

// ── Type icon + color maps ──────────────────────────────────
const TYPE_ICON = {
    'de': I.database, 'data-extension': I.database,
    'automation': I.automation,
    'journey': I.journey,
    'email': I.email,
    'asset': I.asset,
    'query': I.query,
    'script': I.snippets,
    'activity': I.query
};
const TYPE_COLOR = {
    'de': '#0176D3', 'data-extension': '#0176D3',
    'automation': '#7C3AED',
    'journey': '#0891B2',
    'email': '#C2410C',
    'asset': '#C2410C',
    'query': '#059669',
    'script': '#2563EB',
    'activity': '#059669'
};
const TYPE_LABEL = {
    'de': 'DE', 'data-extension': 'DE',
    'automation': 'Automation',
    'journey': 'Journey',
    'email': 'Email',
    'asset': 'Asset',
    'query': 'Query',
    'script': 'Script',
    'activity': 'Activity'
};

function getTypeIcon(type) { return TYPE_ICON[type] || I.search; }
function getTypeColor(type) { return TYPE_COLOR[type] || '#64748B'; }
function getTypeLabel(r) {
    if ((r.type === 'asset' || r.type === 'email') && r.assetType) return r.assetType;
    if (r.type === 'activity' && r.activityTypeLabel) return r.activityTypeLabel;
    return TYPE_LABEL[r.type] || (r.type || 'Object');
}

// ── Preview pane helpers ────────────────────────────────────
function renderPreviewEmpty(context) {
    const icon = context === 'automations' ? I.gearEmpty : I.searchEmpty;
    const msg = context === 'automations'
        ? 'Select an automation to see details'
        : 'Hover or click a result to preview';
    return `<div class="scout-preview-empty">${icon}<p>${msg}</p></div>`;
}

function renderPreviewItem(item) {
    if (!item) return renderPreviewEmpty();
    const color = getTypeColor(item.type);
    const icon = getTypeIcon(item.type);
    const label = getTypeLabel(item);
    const meta = [];
    if (item.path) meta.push(`<div class="scout-preview-meta-row">${I.folder} <span>${escHtml(item.path)}</span></div>`);
    if (item.target) meta.push(`<div class="scout-preview-meta-row">${I.database} <span>Target: ${escHtml(item.target)}</span></div>`);
    if (item.modifiedDate) meta.push(`<div class="scout-preview-meta-row">${I.refresh} <span>Modified: ${formatDate(item.modifiedDate)}${item.modifiedBy ? ` by ${escHtml(item.modifiedBy)}` : ''}</span></div>`);
    if (item.createdDate) meta.push(`<div class="scout-preview-meta-row">${I.plus} <span>Created: ${formatDate(item.createdDate)}</span></div>`);
    if (item.createdBy) meta.push(`<div class="scout-preview-meta-row">${I.user} <span>Created by: ${escHtml(item.createdBy)}</span></div>`);
    if (item.assetId != null) meta.push(`<div class="scout-preview-meta-row">${I.attach} <span>ID: ${escHtml(String(item.assetId))}</span></div>`);
    if (item.description) meta.push(`<div class="scout-preview-meta-row">${I.info} <span>${escHtml(item.description)}</span></div>`);
    return `
<div class="scout-preview-content">
    <div class="scout-preview-type-row">
        <span class="scout-preview-type-icon" style="color:${color}">${icon}</span>
        <span class="scout-preview-type-label" style="color:${color}">${escHtml(label)}</span>
    </div>
    <div class="scout-preview-name">${escHtml(item.name || item.Name || 'Unnamed')}</div>
    ${meta.length ? `<div class="scout-preview-meta">${meta.join('')}</div>` : ''}
    ${item.url ? `<a href="${escHtml(item.url)}" target="_blank" class="scout-preview-action scout-btn scout-btn-primary">${I.externalLink} Open in SFMC</a>` : ''}
    ${item.type === 'automation' ? `<button class="scout-preview-action scout-btn scout-btn-primary" id="scout-preview-open-auto" data-id="${escHtml(String(item.id||''))}" data-name="${escHtml(item.name||'')}">View Steps ${I.chevRight}</button>` : ''}
</div>`;
}

// --- SEARCH VIEW (Q3-A: filter pills / Q4-B: full-width list) ---
function renderSearchView() {
    const cont = document.getElementById('scout-content');
    if (!cont) return;
    if (S.searchFilter === 'de') S.searchFilter = 'all';
    const filterDefs = [
        { id:'all', label:'All' },
        { id:'automation', label:'Automations' },
        { id:'journey', label:'Journeys' },
        { id:'email', label:'Emails' },
        { id:'asset', label:'Assets' },
        { id:'activity', label:'Activities' }
    ];

    cont.innerHTML = `
<div class="scout-search-wrap">
    <span class="scout-search-icon">${I.search}</span>
    <input class="scout-search-input" id="scout-search-input"
        placeholder="Search SFMC resources…"
        value="${escHtml(S.searchQuery)}">
</div>
<div class="scout-filter-pills">
    ${filterDefs.map(f => `
    <button class="scout-pill${S.searchFilter===f.id?' active':''}" data-filter="${f.id}">
        ${f.id !== 'all' ? `<span class="scout-pill-icon">${getTypeIcon(f.id==='activity'?'query':f.id)}</span>` : ''}
        ${f.label}
    </button>`).join('')}
</div>
<div id="scout-search-results" class="scout-results-list">
    ${renderSearchRows()}
</div>`;

    const input = document.getElementById('scout-search-input');
    if (input) {
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { S.searchQuery = input.value.trim(); runSearch(); } });
        input.addEventListener('input', e => { S.searchQuery = e.target.value; });
        setTimeout(() => input.focus && input.focus(), 50);
    }
    cont.querySelectorAll('.scout-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            S.searchFilter = btn.dataset.filter;
            if (S.allSearchResults.length) {
                applySearchFilter();
                renderSearchView(); // rebuild pills + results from existing data
            } else {
                renderSearchView();
                if (S.searchQuery) runSearch();
            }
        });
    });
    bindSearchRowEvents(cont);
}

// Full-width result rows (Q4-B: dense list)
function renderSearchRows() {
    if (S.searchLoading) return `<div class="scout-list-state">${I.spinner} Searching…</div>`;
    if (!S.searchResults.length && S.searchQuery) {
        return `<div class="scout-list-state scout-list-empty">${I.searchEmpty}<p>No results for "<strong>${escHtml(S.searchQuery)}</strong>"</p></div>`;
    }
    if (!S.searchResults.length) {
        return `<div class="scout-list-state scout-list-empty">${I.searchEmpty}<p>Press Enter to search</p></div>`;
    }
    const groupOrder = ['de','data-extension','automation','journey','asset','email','query','script','activity'];
    const groupLabels = { de:'Data Extensions','data-extension':'Data Extensions',automation:'Automations',journey:'Journeys',asset:'Assets',email:'Emails',query:'Queries',script:'Scripts',activity:'Activities' };
    const grouped = {};
    S.searchResults.forEach((r, idx) => {
        const key = r.type || 'other';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({ r, idx });
    });
    const orderedKeys = Object.keys(grouped).sort((a,b) => {
        const ai = groupOrder.indexOf(a); const bi = groupOrder.indexOf(b);
        return (ai===-1?99:ai)-(bi===-1?99:bi);
    });
    const seenGroups = new Set();
    let html = '';
    orderedKeys.forEach(key => {
        const groupKey = key === 'data-extension' ? 'de' : key;
        if (seenGroups.has(groupKey)) return;
        seenGroups.add(groupKey);
        const items = key === 'de' ? (grouped['de']||[]).concat(grouped['data-extension']||[]) : (grouped[key]||[]);
        if (!items.length) return;
        const label = groupLabels[key] || key;
        html += `<div class="scout-group-label">${escHtml(label)} <span class="scout-group-count">${items.length}</span></div>`;
        items.forEach(({ r, idx }) => {
            const color = getTypeColor(r.type);
            const icon = getTypeIcon(r.type);
            const name = escHtml(r.name || r.Name || 'Unnamed');
            const isAssetLike = r.type === 'asset' || r.type === 'email';
            const meta1 = [];
            const meta2 = [];
            if (isAssetLike) {
                // Line 1: type label · folder · modified date
                if (r.assetType) meta1.push(escHtml(r.assetType));
                if (r.path) meta1.push(escHtml(r.path));
                if (r.modifiedDate) meta1.push(formatDate(r.modifiedDate));
                // Line 2: created by · created date · ID
                if (r.createdBy) meta2.push(`${escHtml(r.createdBy)}`);
                if (r.createdDate) meta2.push(formatDate(r.createdDate));
                if (r.assetId) meta2.push(`ID: ${escHtml(String(r.assetId))}`);
            } else {
                if (r.path) meta1.push(escHtml(r.path));
                if (r.modifiedDate) meta1.push(formatDate(r.modifiedDate));
            }
            html += `<div class="scout-result-row" data-idx="${idx}" data-type="${escHtml(r.type||'')}">
                <div class="scout-result-type-icon" style="background:${color}20;color:${color}">${icon}</div>
                <div class="scout-result-info">
                    <div class="scout-result-row-name">${name}</div>
                    ${meta1.length ? `<div class="scout-result-row-meta">${meta1.join(' · ')}</div>` : ''}
                    ${meta2.length ? `<div class="scout-result-row-meta" style="font-size:10px;color:var(--s-text-3);margin-top:1px;">${meta2.join(' · ')}</div>` : ''}
                </div>
                <span class="scout-result-row-arrow" style="opacity:${isAssetLike ? '0.45' : '1'}">${isAssetLike ? I.copy : I.chevRight}</span>
            </div>`;
        });
    });
    return html || `<div class="scout-list-state scout-list-empty">No results</div>`;
}

function renderSearchResults() {
    const resultsDiv = document.getElementById('scout-search-results');
    if (resultsDiv) {
        resultsDiv.innerHTML = renderSearchRows();
        bindSearchRowEvents(document.getElementById('scout-content'));
    }
}

function bindSearchRowEvents(cont) {
    if (!cont) return;
    cont.querySelectorAll('.scout-result-row').forEach(row => {
        row.addEventListener('click', () => {
            const idx = parseInt(row.dataset.idx, 10);
            const item = S.searchResults[idx];
            if (!item) return;
            if (item.type === 'automation') {
                S.tab = 'automations';
                updateTabUI();
                openAutomationDetail(item.id || item.ID, item.name || item.Name);
            } else if (item.type === 'asset' || item.type === 'email') {
                const nameText = item.name || item.Name || '';
                navigator.clipboard.writeText(nameText).then(() => {
                    toast(`Copied: ${nameText}`, 'success');
                    const arrow = row.querySelector('.scout-result-row-arrow');
                    if (arrow) {
                        arrow.innerHTML = I.check;
                        arrow.style.cssText = 'color:var(--s-success);opacity:1;';
                        setTimeout(() => {
                            arrow.innerHTML = I.copy;
                            arrow.style.cssText = 'opacity:0.45;';
                        }, 1500);
                    }
                }).catch(() => toast('Copy failed', 'error'));
            } else if (item.url) {
                window.open(item.url, '_blank');
            }
        });
    });
}

function bindSearchResultClicks(container) {
    bindSearchRowEvents(container);
}

function applySearchFilter() {
    const f = S.searchFilter;
    S.searchResults = S.allSearchResults.filter(r => {
        // DE results excluded from main search (use DE Tools tab instead)
        if (r.type === 'de' || r.type === 'data-extension') return false;
        if (f === 'all') return true;
        if (f === 'asset') return r.type === 'asset';
        if (f === 'email') return r.type === 'email';
        if (f === 'activity') return r.type === 'query' || r.type === 'script' || r.type === 'activity';
        return r.type === f;
    });
}

function runSearch() {
    if (!S.searchQuery) return;
    // Disconnect any in-flight search before starting a new one
    if (S.activeSearchPort) { try { S.activeSearchPort.disconnect(); } catch (_) {} S.activeSearchPort = null; }
    S.allSearchResults = [];
    S.searchResults = [];
    S.searchLoading = true;
    const resultsDiv = document.getElementById('scout-search-results');
    if (resultsDiv) resultsDiv.innerHTML = `<div class="scout-loading-state">${I.spinner} Searching…</div>`;

    const activePort = chrome.runtime.connect({ name: 'universalSearchStream' });
    S.activeSearchPort = activePort;

    activePort.postMessage({
        action: 'universalSearchStream',
        searchTerm: S.searchQuery,
        filter: S.searchFilter,
        instance: instance
    });

    activePort.onMessage.addListener((msg) => {
        if (msg.type === 'searchResult') {
            S.allSearchResults.push(msg.result);
            applySearchFilter();
            renderSearchResults();
        } else if (msg.type === 'searchComplete') {
            S.searchLoading = false;
            applySearchFilter();
            renderSearchResults();
            activePort.disconnect();
        } else if (msg.type === 'searchError') {
            S.searchLoading = false;
            toast('Search error: ' + (msg.error || 'Unknown error'), 'error');
            activePort.disconnect();
        }
    });

    activePort.onDisconnect.addListener(() => {
        S.searchLoading = false;
        if (S.activeSearchPort === activePort) S.activeSearchPort = null;
    });
}

// --- AUTOMATIONS VIEW (split panel) ---
function renderAutomationsView() {
    const cont = document.getElementById('scout-content');
    if (!cont) return;
    if (S.autoDetail) {
        cont.innerHTML = `<div class="scout-full-detail" id="scout-auto-detail-wrap"></div>`;
        renderAutomationDetail(document.getElementById('scout-auto-detail-wrap'));
        return;
    }
    cont.innerHTML = `
<div class="scout-search-wrap">
    <span class="scout-search-icon">${I.search}</span>
    <input class="scout-search-input" id="scout-auto-search"
        placeholder="Search automations by name…">
    <button class="scout-search-go" id="scout-auto-go">${I.chevRight}</button>
</div>
<div id="scout-auto-results" class="scout-results-list">
    <div class="scout-list-state scout-list-empty">${I.gearEmpty}<p>Enter a name to search</p></div>
</div>`;

    const inp = document.getElementById('scout-auto-search');
    const goBtn = document.getElementById('scout-auto-go');
    // Restore previous search
    if (inp && S.autoSearchQuery) inp.value = S.autoSearchQuery;
    if (S.autoSearchResults.length) renderAutoResults(S.autoSearchResults);
    if (inp) {
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') searchAutomations(inp.value.trim()); });
        if (!S.autoSearchResults.length) setTimeout(() => inp.focus && inp.focus(), 50);
    }
    if (goBtn) goBtn.addEventListener('click', () => inp && searchAutomations(inp.value.trim()));
}

function autoStatusClass(s) {
    const m = { 1:'active', 2:'inactive', 4:'building', 5:'scheduled', 6:'running', 7:'stopped', 8:'paused', '-1':'error' };
    return m[String(s)] || 'unknown';
}
function autoStatusLabel(s) {
    const m = { 1:'Active', 2:'Inactive', 4:'Building', 5:'Scheduled', 6:'Running', 7:'Stopped', 8:'Paused', '-1':'Error' };
    return m[String(s)] || (s !== undefined ? `Status ${s}` : 'Unknown');
}
function renderAutoPreview(a) {
    if (!a) return renderPreviewEmpty('automations');
    const statusCls = autoStatusClass(a.status);
    const statusLbl = autoStatusLabel(a.status);
    const lr = a.lastRunTime || a.LastRunTime;
    return `<div class="scout-preview-content">
        <div class="scout-preview-type-row">
            <span class="scout-preview-type-icon" style="color:#7C3AED">${I.automation}</span>
            <span class="scout-preview-type-label" style="color:#7C3AED">Automation</span>
        </div>
        <div class="scout-preview-name">${escHtml(a.name || a.Name || 'Unnamed')}</div>
        <div class="scout-preview-meta">
            ${a.status !== undefined ? `<div class="scout-preview-meta-row"><span class="scout-auto-status-badge scout-auto-status-${statusCls}">${statusLbl}</span></div>` : ''}
            <div class="scout-preview-meta-row">${I.refresh} <span>${lr ? formatDate(lr) : 'Never run'}</span></div>
        </div>
        <button class="scout-preview-action scout-btn scout-btn-primary" id="scout-preview-open-auto" data-id="${escHtml(String(a.id||a.ID||''))}" data-name="${escHtml(a.name||a.Name||'')}">View Steps ${I.chevRight}</button>
    </div>`;
}

function renderAutoResults(autos) {
    const res = document.getElementById('scout-auto-results');
    if (!res || !autos.length) return;
    res.innerHTML = autos.map((a, i) => {
        const sCls = autoStatusClass(a.status);
        const sLbl = autoStatusLabel(a.status);
        return `<div class="scout-result-row" data-idx="${i}">
            <div class="scout-result-type-icon" style="background:#7C3AED20;color:#7C3AED">${I.automation}</div>
            <div class="scout-result-info">
                <div class="scout-result-row-name">${escHtml(a.name || a.Name || 'Unnamed')}</div>
                <div class="scout-result-row-meta">
                    <span class="scout-auto-status-badge scout-auto-status-${sCls}">${sLbl}</span>
                </div>
            </div>
            <span class="scout-result-row-arrow">${I.chevRight}</span>
        </div>`;
    }).join('');
    res.querySelectorAll('.scout-result-row').forEach((row, i) => {
        row.addEventListener('click', () => {
            openAutomationDetail(autos[i].id || autos[i].ID, autos[i].name || autos[i].Name);
        });
    });
}

function searchAutomations(query) {
    if (!query) return;
    S.autoSearchQuery = query;
    const res = document.getElementById('scout-auto-results');
    if (res) res.innerHTML = `<div class="scout-list-state">${I.spinner} Searching…</div>`;
    chrome.runtime.sendMessage({
        action: 'universalSearch', searchTerm: query, filter: 'automation', instance: instance
    }, resp => {
        if (!res) return;
        if (resp && resp.success && resp.results && resp.results.length) {
            const autos = resp.results.filter(r => r.type === 'automation');
            if (!autos.length) {
                S.autoSearchResults = [];
                res.innerHTML = `<div class="scout-list-state scout-list-empty">${I.gearEmpty}<p>No automations found</p></div>`;
                return;
            }
            S.autoSearchResults = autos;
            renderAutoResults(autos);
        } else {
            S.autoSearchResults = [];
            res.innerHTML = `<div class="scout-list-state scout-list-empty">${I.gearEmpty}<p>No automations found for "${escHtml(query)}"</p></div>`;
        }
    });
}

function openAutomationDetail(automationId, name) {
    if (!automationId) { toast('No automation ID found', 'error'); return; }
    S.autoDetail = { id: automationId, name: name || 'Automation', steps: [], loading: true };
    S.autoDetailLoading = true;
    renderCurrentView();

    chrome.runtime.sendMessage({ action: 'fetchAutomationDefinition', automationId, instance }, res => {
        S.autoDetailLoading = false;
        if (!res || !res.success || !res.data) {
            toast('Failed to load automation details', 'error');
            S.autoDetail.loading = false;
            S.autoDetail.error = (res && res.error) || 'Unknown error';
            renderCurrentView();
            return;
        }
        const data = res.data;
        S.autoDetail = {
            id: automationId,
            name: data.name || name,
            status: data.status || '',
            schedule: data.schedule ? JSON.stringify(data.schedule) : null,
            lastRunTime: data.lastRunTime || data.lastRun || null,
            createdDate: data.createdDate || null,
            modifiedDate: data.modifiedDate || null,
            createdBy: (data.createdBy && typeof data.createdBy === 'object') ? (data.createdBy.name || data.createdBy.userName || String(data.createdBy.id || '') || 'Unknown') : (data.createdBy || null),
            folderPath: data.categoryPath || data.folderPath || null,
            automationKey: data.key || data.automationKey || null,
            steps: [],
            loading: false
        };

        // Parse steps from definition
        const processes = data.steps || data.automationProcesses || [];
        processes.forEach((proc, pi) => {
            const activities = proc.step?.stepActivities || proc.stepActivities || proc.activities || [];
            activities.forEach((act, ai) => {
                S.autoDetail.steps.push({
                    num: S.autoDetail.steps.length + 1,
                    name: act.name || act.activityName || 'Step ' + (pi + 1) + '.' + (ai + 1),
                    type: mapActivityType(act.objectTypeId || act.activityTypeId),
                    objectTypeId: act.objectTypeId || act.activityTypeId,
                    activityObjectId: act.activityObjectId || act.id || act.objectId || null,
                    code: null,
                    loadingCode: true,
                    expanded: false
                });
            });
        });

        renderCurrentView();

        // Enrich with legacy + v1?view=targetObjects endpoints (non-blocking)
        if (instance) {
            const enrichOverview = () => {
                const overviewEl = document.querySelector('.scout-overview-grid');
                if (!overviewEl || !S.autoDetail) return;
                overviewEl.innerHTML = buildAutoOverviewGridHtml(S.autoDetail);
            };
            sfmcFetch(
                `https://${instance}.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/legacy/v1/beta/bulk/automations/automation/definition/${automationId}`,
                'GET', { 'accept': 'application/json' }
            ).then(d => {
                if (!d || !S.autoDetail) return;
                // Try multiple response paths — legacy endpoint wraps differently
                const def = d.definition || d.automation || (Array.isArray(d.items) ? d.items[0] : null) || d;
                const savedBy = def.lastSavedBy || def.modifiedBy || def.lastModifiedBy;
                if (savedBy) S.autoDetail.lastSavedBy = typeof savedBy === 'object' ? (savedBy.name || savedBy.userName || savedBy.email || null) : savedBy;
                if (def.description && !S.autoDetail.description) S.autoDetail.description = def.description;
                const schedObj = def.scheduleObject || def.schedule;
                if (schedObj && typeof schedObj === 'object' && schedObj.description) S.autoDetail.scheduleDescription = schedObj.description;
                const saveDate = def.lastSaveDate || def.lastModifiedDate || def.modifiedDate;
                if (saveDate && !S.autoDetail.lastSaveDate) S.autoDetail.lastSaveDate = saveDate;
                if (!S.autoDetail.folderPath && (def.folderPath || def.categoryPath)) S.autoDetail.folderPath = def.folderPath || def.categoryPath;
                enrichOverview();
            }).catch(() => {});
            sfmcFetch(
                `https://${instance}.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/automation/v1/automations/${automationId}?view=targetObjects`,
                'GET', { 'accept': 'application/json' }
            ).then(d => {
                if (!d || !S.autoDetail) return;
                // v1 may have schedule at root or inside items
                const src = (Array.isArray(d.items) ? d.items[0] : null) || d;
                if (src.schedule) S.autoDetail.scheduleV1 = src.schedule;
                if (src.automationTriggers) S.autoDetail.automationTriggers = src.automationTriggers;
                if (!S.autoDetail.lastSavedBy && src.lastSavedBy) {
                    const sb = src.lastSavedBy;
                    S.autoDetail.lastSavedBy = typeof sb === 'object' ? (sb.name || sb.userName || null) : sb;
                }
                enrichOverview();
            }).catch(() => {});
        }

        // Fetch activity codes in background
        S.autoDetail.steps.forEach((step, idx) => {
            if (!step.activityObjectId) {
                S.autoDetail.steps[idx].loadingCode = false;
                S.autoDetail.steps[idx].activityData = { type: 'metadata-only', typeName: step.type, message: 'No object ID available for this activity.' };
                const codeBlock = document.getElementById('scout-code-' + idx);
                if (codeBlock) codeBlock.innerHTML = renderCodeContent(S.autoDetail.steps[idx]);
                return;
            }
            chrome.runtime.sendMessage({
                action: 'fetchActivityCode',
                activityObjectId: step.activityObjectId,
                objectTypeId: step.objectTypeId,
                instance
            }, codeRes => {
                if (codeRes?.success && codeRes.data) {
                    S.autoDetail.steps[idx].activityData = codeRes.data;
                    if (codeRes.data.code) S.autoDetail.steps[idx].code = codeRes.data.code;
                } else {
                    S.autoDetail.steps[idx].activityData = { type: 'error', message: codeRes?.error || 'Failed to load activity details' };
                }
                S.autoDetail.steps[idx].loadingCode = false;
                const codeBlock = document.getElementById('scout-code-' + idx);
                if (codeBlock) {
                    codeBlock.innerHTML = renderCodeContent(S.autoDetail.steps[idx]);
                }
            });
        });
    });
}

function mapActivityType(typeId) {
    const map = {
        42: 'Send Email', 43: 'Import', 300: 'SQL Query', 423: 'Script (SSJS)',
        427: 'Build Audience', 440: 'Data Extract', 457: 'File Transfer',
        771: 'SF Send', 1018: 'Verification', 3014: 'Push Notification'
    };
    return map[typeId] || ('Activity #' + typeId);
}

function buildAutoOverviewGridHtml(d) {
    const oi = (label, val) => `<div class="scout-overview-item"><label>${label}</label><span>${val}</span></div>`;
    const oiMono = (label, val) => `<div class="scout-overview-item"><label>${label}</label><span class="scout-monospace">${val}</span></div>`;
    let html = '';
    if (d.lastRunTime) html += oi('Last Run', formatDate(d.lastRunTime));
    const sched = formatSchedule(d);
    if (sched) html += oi('Schedule', escHtml(sched));
    if (d.scheduleDescription) html += oi('Schedule Desc', escHtml(d.scheduleDescription));
    if (d.scheduleV1) {
        const sv = d.scheduleV1;
        if (sv.startDate) html += oi('Sched Start', formatDate(sv.startDate));
        if (sv.endDate) html += oi('Sched End', formatDate(sv.endDate));
        if (sv.scheduleStatus) html += oi('Sched Status', escHtml(sv.scheduleStatus));
    }
    if (d.createdDate) html += oi('Created', formatDate(d.createdDate));
    if (d.createdBy) html += oi('Created By', escHtml(d.createdBy));
    if (d.modifiedDate) html += oi('Modified', formatDate(d.modifiedDate));
    if (d.lastSaveDate) html += oi('Last Saved', formatDate(d.lastSaveDate));
    if (d.lastSavedBy) html += oi('Last Saved By', escHtml(d.lastSavedBy));
    if (d.folderPath) html += oi('Folder', escHtml(d.folderPath));
    if (d.automationKey) html += oiMono('Key', escHtml(d.automationKey));
    if (d.description) html += oi('Description', escHtml(d.description));
    html += oi('Steps', String(d.steps.length));
    return html;
}

function renderAutomationDetail(cont) {
    if (!S.autoDetail) return;
    if (S.autoDetail.loading) {
        cont.innerHTML = `<div class="scout-detail-header">
            <button class="scout-back-btn" id="scout-back-auto">${I.back} Automations</button>
            <span class="scout-detail-name-muted">${escHtml(S.autoDetail.name)}</span>
        </div>
        <div class="scout-loading-state">${I.spinner} Loading automation definition…</div>`;
        cont.querySelector('#scout-back-auto').addEventListener('click', () => {
            S.autoDetail = null; renderCurrentView();
        });
        return;
    }

    const d = S.autoDetail;
    const statusClass = statusToClass(d.status);

    cont.innerHTML = `
<div class="scout-detail-header">
    <button class="scout-back-btn" id="scout-back-auto">${I.back} Automations</button>
    <span class="scout-detail-header-title">${escHtml(d.name)}</span>
    ${d.status ? `<span class="scout-status-badge ${statusClass}">${escHtml(d.status)}</span>` : ''}
    <a href="https://${instance}.exacttarget.com/cloud/#app/Automation%20Studio/AutomationStudioFuel3/%23Instance/${encodeURIComponent(d.id||d.key||'')}" target="_blank" class="scout-btn scout-btn-secondary scout-auto-action-btn" style="margin-left:auto;flex-shrink:0;">${I.externalLink} Open</a>
</div>
<div class="scout-auto-filter-bar">
    <span class="scout-auto-filter-label">Filter:</span>
    <button class="scout-chip scout-auto-filter active" data-filter="all">All</button>
    <button class="scout-chip scout-auto-filter" data-filter="query">Query</button>
    <button class="scout-chip scout-auto-filter" data-filter="script">Script</button>
    <button class="scout-chip scout-auto-filter" data-filter="transfer">Transfer</button>
    <button class="scout-chip scout-auto-filter" data-filter="other">Other</button>
    <div class="scout-auto-filter-actions">
        <button class="scout-btn scout-btn-secondary scout-auto-action-btn" id="scout-expand-all">Expand All</button>
        <button class="scout-btn scout-btn-secondary scout-auto-action-btn" id="scout-collapse-all">Collapse All</button>
    </div>
</div>

<div class="scout-overview-card">
    <div class="scout-section-title">Overview</div>
    <div class="scout-overview-grid">${buildAutoOverviewGridHtml(d)}</div>
</div>

${d.steps.length ? `
<div class="scout-section-title scout-steps-title">Steps &amp; Activities <span class="scout-steps-count">${d.steps.length}</span></div>
<div class="scout-step-cards" id="scout-steps-list">
    ${d.steps.map((step, idx) => `
    <div class="scout-step-card scout-step" id="scout-step-${idx}">
        <div class="scout-step-card-header scout-step-header" data-step="${idx}">
            <div class="scout-step-card-num">${step.num}</div>
            <div class="scout-step-card-info">
                <span class="scout-step-name">${escHtml(step.name)}</span>
                <span class="scout-step-type">${escHtml(step.type)}</span>
            </div>
            <span class="scout-step-chevron">${I.chevDown}</span>
        </div>
        <div class="scout-step-body">
            <div id="scout-code-${idx}">${renderCodeContent(step)}</div>
        </div>
    </div>`).join('')}
</div>` : `<div class="scout-empty"><p>No steps found in this automation.</p></div>`}`;

    cont.querySelector('#scout-back-auto')?.addEventListener('click', () => {
        S.autoDetail = null; renderCurrentView();
    });

    // Step type filter
    const typeKeywords = { query: ['query','sql'], script: ['script','ssjs'], transfer: ['transfer','file','extract'], other: [] };
    const matchesFilter = (step, filter) => {
        if (filter === 'all') return true;
        const t = (step.type || '').toLowerCase();
        const kw = typeKeywords[filter] || [];
        if (filter === 'other') return !Object.values(typeKeywords).flat().some(k => t.includes(k));
        return kw.some(k => t.includes(k));
    };
    cont.querySelectorAll('.scout-auto-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            cont.querySelectorAll('.scout-auto-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            cont.querySelectorAll('.scout-step').forEach((el, idx) => {
                const step = S.autoDetail.steps[idx];
                el.style.display = matchesFilter(step, filter) ? '' : 'none';
            });
        });
    });

    // Expand / collapse all
    cont.querySelector('#scout-expand-all')?.addEventListener('click', () => {
        cont.querySelectorAll('.scout-step').forEach(el => {
            el.classList.add('expanded');
            el.querySelector('.scout-step-chevron')?.classList.add('rotated');
        });
    });
    cont.querySelector('#scout-collapse-all')?.addEventListener('click', () => {
        cont.querySelectorAll('.scout-step').forEach(el => {
            el.classList.remove('expanded');
            el.querySelector('.scout-step-chevron')?.classList.remove('rotated');
        });
    });

    // Step accordion toggle
    cont.querySelectorAll('.scout-step-header').forEach(hdr => {
        hdr.addEventListener('click', () => {
            const idx = parseInt(hdr.dataset.step, 10);
            const stepEl = document.getElementById('scout-step-' + idx);
            if (!stepEl) return;
            const isExp = stepEl.classList.contains('expanded');
            stepEl.classList.toggle('expanded', !isExp);
            hdr.querySelector('.scout-step-chevron')?.classList.toggle('rotated', !isExp);
            S.autoDetail.steps[idx].expanded = !isExp;
        });
    });

    // Copy buttons (delegated)
    cont.addEventListener('click', e => {
        if (e.target.closest('.scout-code-copy')) {
            const btn = e.target.closest('.scout-code-copy');
            const block = btn.closest('.scout-code-block');
            const code = block?.querySelector('.scout-code-text')?.textContent || '';
            navigator.clipboard.writeText(code).then(() => {
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.innerHTML = I.copy + ' Copy'; }, 1500);
            }).catch(() => toast('Copy failed', 'error'));
        }
    });
}

function renderCodeContent(step) {
    if (step.loadingCode) {
        return `<div class="scout-code-loading">${I.spinner} Loading…</div>`;
    }

    const d = step.activityData;

    if (!d) {
        return `<div class="scout-code-empty">No details available for this activity.</div>`;
    }

    if (d.type === 'error') {
        return `<div class="scout-activity-error">Failed to load: ${escHtml(d.message || 'Unknown error')}</div>`;
    }

    if (d.type === 'metadata-only') {
        return `<div class="scout-activity-no-code"><span class="scout-activity-type-badge">${escHtml(d.typeName || '')}</span> ${escHtml(d.message || '')}</div>`;
    }

    if (d.type === 'code' && d.code) {
        let metaHtml = '';
        if (d.name || d.description || d.targetDE) {
            metaHtml = `<div class="scout-activity-meta">`;
            if (d.name) metaHtml += `<span class="scout-meta-label">Name:</span> ${escHtml(d.name)}<br>`;
            if (d.description) metaHtml += `<span class="scout-meta-label">Description:</span> ${escHtml(d.description)}<br>`;
            if (d.targetDE) metaHtml += `<span class="scout-meta-label">Target DE:</span> ${escHtml(d.targetDE)}<br>`;
            if (d.updateType) metaHtml += `<span class="scout-meta-label">Update Type:</span> ${escHtml(d.updateType)}<br>`;
            metaHtml += `</div>`;
        }
        const highlighted = d.codeLanguage === 'sql'
            ? highlightSQL(d.code)
            : (d.codeLanguage === 'javascript' || d.codeLanguage === 'ssjs')
                ? highlightJavaScript(d.code)
                : escHtml(d.code);
        const langLabel = d.codeLanguage === 'sql' ? 'SQL' : (d.codeLanguage === 'ssjs' ? 'SSJS' : d.codeLanguage === 'javascript' ? 'JavaScript' : (d.codeLanguage || 'Code').toUpperCase());
        return `${metaHtml}<div class="scout-code-block">
            <div class="scout-code-header">
                <span class="scout-code-lang">${langLabel}</span>
                <button class="scout-code-copy">${I.copy} Copy</button>
            </div>
            <span class="scout-code-text" style="display:none;">${escHtml(d.code)}</span>
            <div class="scout-code-highlighted">${highlighted}</div>
        </div>`;
    }

    if (d.metadata) {
        const rows = Object.entries(d.metadata)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => `<tr><td>${escHtml(k)}</td><td>${escHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}</td></tr>`)
            .join('');
        return `<div class="scout-activity-meta-panel">
            <div class="scout-activity-meta-heading"><span class="scout-activity-type-badge">${escHtml(d.typeName || '')}</span> ${escHtml(d.name || '')}</div>
            ${d.description ? `<div class="scout-activity-desc">${escHtml(d.description)}</div>` : ''}
            ${rows ? `<table class="scout-meta-table">${rows}</table>` : '<div class="scout-activity-no-code">No configuration details available.</div>'}
        </div>`;
    }

    return `<div class="scout-code-empty">No details available for this activity.</div>`;
}

function highlightJavaScript(code) {
    const keywords = /\b(var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|new|this|typeof|instanceof|in|of|try|catch|finally|throw|class|extends|import|export|default|true|false|null|undefined|async|await|yield|delete|void|with)\b/g;
    const builtins = /\b(Platform|Variable|Attribute|DataExtension|Row|Column|Rows|HTTP|HTTPParameter|HTTPRequest|HTTPResponse|HTTPGet|HTTPPost|Write|WriteSafe|WriteBlock|Redirect|CreateObject|InvokeCreate|InvokeRetrieve|InvokeUpdate|InvokeDelete|Stringify|DeSerialize|IIF|Now|DateAdd|FormatDate|GUID|AmpScript|RunScript|TreatAsContent|BeginImpressionRegion|EndImpressionRegion|console|JSON|Math|Date|Array|Object|String|Number|Boolean|parseInt|parseFloat|encodeURIComponent|decodeURIComponent)\b/g;
    const strings = /'[^'\\]*(?:\\[\s\S][^'\\]*)*'|`[^`\\]*(?:\\[\s\S][^`\\]*)*`/g;
    const dqStrings = /&quot;[^<]*?&quot;/g;
    const comments = /\/\/[^\n]*/g;
    const numbers = /\b\d+(\.\d+)?\b/g;
    return escHtml(code)
        .replace(comments, m => `<span class="scout-js-comment">${m}</span>`)
        .replace(dqStrings, m => `<span class="scout-js-str">${m}</span>`)
        .replace(strings, m => `<span class="scout-js-str">${m}</span>`)
        .replace(keywords, m => `<span class="scout-js-kw">${m}</span>`)
        .replace(builtins, m => `<span class="scout-js-builtin">${m}</span>`)
        .replace(numbers, m => `<span class="scout-js-num">${m}</span>`);
}

function highlightSQL(sql) {
    const keywords = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|EXISTS|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|INSERT|INTO|UPDATE|SET|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|VIEW|AS|DISTINCT|UNION|ALL|CASE|WHEN|THEN|ELSE|END|NULL|IS|LIKE|BETWEEN|COUNT|SUM|AVG|MIN|MAX|TOP|WITH|CTE|FULL)\b/gi;
    const strings = /'[^']*'/g;
    return escHtml(sql)
        .replace(strings, m => `<span class="scout-sql-str">${m}</span>`)
        .replace(keywords, m => `<span class="scout-sql-kw">${m}</span>`);
}

// --- DE TOOLS VIEW ---
function renderDEToolsView() {
    const cont = document.getElementById('scout-content');
    if (!cont) return;

    const subTabs = [
        { id: 'search', icon: I.search, label: 'Search' },
        { id: 'create', icon: I.plus, label: 'Create' }
    ];

    cont.innerHTML = `
<div class="scout-subnav">
    ${subTabs.map(t => `<button class="scout-subnav-btn${S.deSubTab === t.id ? ' active' : ''}" data-subtab="${t.id}">${t.icon} ${t.label}</button>`).join('')}
</div>
<div id="scout-de-body"></div>`;

    cont.querySelectorAll('.scout-subnav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            S.deSubTab = btn.dataset.subtab;
            S.deDetail = null;
            cont.querySelectorAll('.scout-subnav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderDESubView(document.getElementById('scout-de-body'));
        });
    });

    renderDESubView(document.getElementById('scout-de-body'));
}

function renderDESubView(container) {
    if (!container) return;
    switch (S.deSubTab) {
        case 'search': renderDESearch(container); break;
        case 'create': renderDECreate(container); break;
        default: renderDESearch(container); break;
    }
}

function renderDEResultCards(resEl, results, inp) {
    resEl.innerHTML = `<div class="scout-results">` + results.map((de, _di) => `
        <div class="scout-result-card scout-de-result" data-di="${_di}">
            <div class="scout-de-type-icon ${de.isSendable ? 'scout-de-sendable-icon' : 'scout-de-table-icon'}">
                ${de.isSendable ? I.deSendable : I.deTable}
            </div>
            <div class="scout-result-body">
                <div class="scout-result-name">${escHtml(de.name || de.Name)}</div>
                <div class="scout-result-meta">
                    ${de.customerKey ? `<span class="scout-meta-key">${escHtml(de.customerKey)}</span>` : ''}
                    ${de.rowCount != null ? `<span>${de.rowCount.toLocaleString()} rows</span>` : ''}
                </div>
                <div class="scout-result-meta scout-result-meta-2">
                    ${de.path ? `<span class="scout-meta-folder">${I.folder} ${escHtml(de.path)}</span>` : ''}
                    ${de.fieldCount != null ? `<span>${de.fieldCount} fields</span>` : ''}
                    ${de.isSendable ? `<span class="scout-sendable-pill">Sendable</span>` : ''}
                    ${de.owner ? `<span>${I.user} ${escHtml(de.owner)}</span>` : ''}
                </div>
            </div>
            <span class="scout-result-view-btn">${I.chevRight}</span>
        </div>`).join('') + `</div>`;
    resEl.querySelectorAll('.scout-de-result').forEach(card => {
        card.addEventListener('click', () => {
            const _di = parseInt(card.dataset.di, 10);
            S.deSearchQuery = inp ? inp.value : S.deSearchQuery;
            S.deSearchResults = results;
            openDEDetail(results[_di]);
        });
    });
}

function renderDESearch(container) {
    if (S.deDetail) { renderDEDetail(container); return; }
    container.innerHTML = `
<div class="scout-search-wrap">
    <span class="scout-search-icon">${I.search}</span>
    <input class="scout-search-input" id="scout-de-search-input" placeholder="Search Data Extensions by name…">
</div>
<div id="scout-de-search-results">
    <div class="scout-empty"><p>Enter a name and press Enter to search</p></div>
</div>`;
    const inp = document.getElementById('scout-de-search-input');
    // Restore previous search state
    if (inp && S.deSearchQuery) inp.value = S.deSearchQuery;
    if (S.deSearchResults && S.deSearchResults.length) {
        const res = document.getElementById('scout-de-search-results');
        if (res) renderDEResultCards(res, S.deSearchResults, inp);
    }
    inp?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const q = e.target.value.trim();
            if (!q) return;
            S.deSearchQuery = q;
            const res = document.getElementById('scout-de-search-results');
            res.innerHTML = `<div class="scout-loading-state">${I.spinner} Searching DEs…</div>`;
            chrome.runtime.sendMessage({ action: 'deSearch', searchTerm: q, instance }, resp => {
                if (resp && resp.success && resp.results && resp.results.length) {
                    S.deSearchResults = resp.results;
                    renderDEResultCards(res, S.deSearchResults, inp);
                } else {
                    S.deSearchResults = [];
                    res.innerHTML = `<div class="scout-empty"><p>${resp && resp.error ? escHtml(resp.error) : 'No DEs found'}</p></div>`;
                }
            });
        }
    });
}

function updateSendableFieldOptions() {
    const sel = document.getElementById('scout-sendable-field');
    if (!sel) return;
    const fieldNames = Array.from(document.querySelectorAll('.scout-field-name'))
        .map(inp => inp.value.trim())
        .filter(Boolean);
    const current = sel.value;
    sel.innerHTML = '<option value="">— Select a field —</option>' +
        fieldNames.map(n => `<option value="${escHtml(n)}"${current === n ? ' selected' : ''}>${escHtml(n)}</option>`).join('');
}

function showFolderModal(folders, parentId, currentPath) {
    const existing = document.getElementById('scout-folder-modal');
    if (existing) existing.remove();
    const panel = document.getElementById('scout-panel');
    if (!panel) return;
    const modal = document.createElement('div');
    modal.id = 'scout-folder-modal';
    modal.className = 'scout-modal-overlay';
    modal.innerHTML = `
<div class="scout-modal">
    <div class="scout-modal-header">
        <span>Select Folder${currentPath ? ' — ' + escHtml(currentPath) : ''}</span>
        <button class="scout-modal-close" id="scout-folder-modal-close">${I.close}</button>
    </div>
    <div class="scout-modal-body">
        ${parentId !== null ? `<div class="scout-folder-item scout-folder-back" data-id="${escHtml(String(parentId || 0))}" data-name="${escHtml(currentPath || '')}" data-path="${escHtml(currentPath || '')}">← Back</div>` : ''}
        ${(folders || []).map(f => `
        <div class="scout-folder-item" data-id="${escHtml(String(f.id))}" data-name="${escHtml(f.name || '')}" data-path="${currentPath ? escHtml(currentPath + '/' + (f.name || '')) : escHtml(f.name || '')}">
            <span class="scout-folder-item-icon">${I.folder}</span> ${escHtml(f.name || 'Unnamed')}
            <button class="scout-folder-expand scout-folder-expand-btn" data-id="${escHtml(String(f.id))}">${I.chevRight}</button>
        </div>`).join('')}
        ${!folders || !folders.length ? '<div style="padding:12px 16px;color:#5a6e8c;font-size:13px;">No subfolders found</div>' : ''}
    </div>
    <div class="scout-modal-footer">
        <button class="scout-btn scout-btn-secondary" id="scout-folder-select-root">Use Root Folder</button>
    </div>
</div>`;
    panel.appendChild(modal);
    document.getElementById('scout-folder-modal-close')?.addEventListener('click', () => modal.remove());
    document.getElementById('scout-folder-select-root')?.addEventListener('click', () => {
        const disp = document.getElementById('scout-de-folder-display');
        const hid = document.getElementById('scout-de-folder-id');
        if (disp) disp.value = '';
        if (hid) hid.value = '0';
        modal.remove();
    });
    modal.querySelectorAll('.scout-folder-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('scout-folder-expand-btn')) return;
            const id = item.dataset.id;
            const name = item.dataset.name;
            const path = item.dataset.path;
            const disp = document.getElementById('scout-de-folder-display');
            const hid = document.getElementById('scout-de-folder-id');
            if (disp) disp.value = path || name;
            if (hid) hid.value = id;
            modal.remove();
        });
    });
    modal.querySelectorAll('.scout-folder-expand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const folderId = btn.dataset.id;
            const item = btn.closest('.scout-folder-item');
            const itemPath = item ? (item.dataset.path || item.dataset.name || '') : '';
            chrome.runtime.sendMessage({ action: 'fetchFolderChildren', parentId: folderId, instance }, res => {
                if (res && res.success) showFolderModal(res.folders, folderId, itemPath);
                else toast('Could not load subfolders', 'error');
            });
        });
    });
}

function renderDECreate(container) {
    if (!S.deCreateFields) S.deCreateFields = [];
    if (!S.deWizardData) S.deWizardData = {};

    const stepDefs = [
        { num: 1, label: 'Basic Info' },
        { num: 2, label: 'Fields' },
        { num: 3, label: 'Settings' }
    ];
    const stepHeader = stepDefs.map((s, i) => {
        const isDone = S.deWizardStep > s.num;
        const isActive = S.deWizardStep === s.num;
        const cls = isDone ? 'done' : isActive ? 'active' : '';
        return `${i > 0 ? '<div class="scout-wizard-connector"></div>' : ''}
        <div class="scout-wizard-step ${cls}">
            <span class="scout-wizard-step-num">${isDone ? I.check : s.num}</span>
            <span class="scout-wizard-step-label">${s.label}</span>
        </div>`;
    }).join('');

    let bodyHtml = '';
    if (S.deWizardStep === 1) {
        bodyHtml = `
        <div class="scout-form-row"><label>Name <span class="scout-required">*</span></label>
            <input class="scout-input" id="scout-de-name" placeholder="Data Extension name" value="${escHtml(S.deWizardData.name || '')}">
        </div>
        <div class="scout-form-row"><label>External Key</label>
            <input class="scout-input" id="scout-de-key" placeholder="Auto-generated if blank" value="${escHtml(S.deWizardData.key || '')}">
        </div>
        <div class="scout-form-row"><label>Folder</label>
            <div class="scout-folder-picker-wrap">
                <input class="scout-input scout-folder-display" id="scout-de-folder-display"
                    placeholder="Data Extensions (root)" readonly style="cursor:pointer;"
                    value="${escHtml(S.deWizardData.folderPath || '')}">
                <input type="hidden" id="scout-de-folder-id" value="${escHtml(String(S.deWizardData.folderId || '0'))}">
            </div>
        </div>`;
    } else if (S.deWizardStep === 2) {
        bodyHtml = `
        <div class="scout-field-header">
            <span class="scout-section-title">Fields</span>
            <div class="scout-field-actions">
                <button class="scout-btn scout-btn-secondary" id="scout-add-field">${I.plus} Add Field</button>
            </div>
        </div>
        <div id="scout-fields-list"></div>
        ${!S.deCreateFields.length ? `<div class="scout-wizard-fields-empty">${I.searchEmpty}<p>No fields yet — click Add Field to start</p></div>` : ''}`;
    } else if (S.deWizardStep === 3) {
        const fieldOptions = S.deCreateFields.filter(f=>f.name).map(f =>
            `<option value="${escHtml(f.name)}"${S.deWizardData.sendableField===f.name?' selected':''}>${escHtml(f.name)}</option>`
        ).join('');
        bodyHtml = `
        <div class="scout-wizard-summary">
            <div class="scout-wizard-summary-item"><label>Name</label><span>${escHtml(S.deWizardData.name || '—')}</span></div>
            <div class="scout-wizard-summary-item"><label>Fields</label><span>${S.deCreateFields.length} field${S.deCreateFields.length !== 1 ? 's' : ''}</span></div>
            ${S.deWizardData.folderPath ? `<div class="scout-wizard-summary-item"><label>Folder</label><span>${escHtml(S.deWizardData.folderPath)}</span></div>` : ''}
        </div>
        <div class="scout-form-row-flex" style="margin-top:16px;">
            <label class="scout-checkbox-label"><input type="checkbox" id="scout-de-sendable"${S.deWizardData.isSendable?' checked':''}> Sendable</label>
            <label class="scout-checkbox-label"><input type="checkbox" id="scout-de-testable"${S.deWizardData.isTestable?' checked':''}> Testable</label>
        </div>
        <div id="scout-sendable-config" style="display:${S.deWizardData.isSendable?'block':'none'};">
            <div class="scout-form-row"><label>Sendable Field <span class="scout-required">*</span></label>
                <select class="scout-select" id="scout-sendable-field">
                    <option value="">— Select a field —</option>${fieldOptions}
                </select>
            </div>
            <div class="scout-form-row"><label>Subscriber Field</label>
                <select class="scout-select" id="scout-subscriber-field">
                    <option value="_SubscriberKey"${(!S.deWizardData.subscriberField||S.deWizardData.subscriberField==='_SubscriberKey')?' selected':''}>_SubscriberKey (default)</option>
                    <option value="EmailAddress"${S.deWizardData.subscriberField==='EmailAddress'?' selected':''}>EmailAddress</option>
                </select>
            </div>
        </div>`;
    }

    container.innerHTML = `
<div class="scout-wizard">
    <div class="scout-wizard-header">${stepHeader}</div>
    <div class="scout-wizard-body">${bodyHtml}</div>
    <div class="scout-wizard-footer">
        ${S.deWizardStep > 1 ? `<button class="scout-btn scout-btn-secondary" id="scout-wizard-prev">${I.back} Back</button>` : '<span></span>'}
        ${S.deWizardStep === 3
            ? `<button class="scout-btn scout-btn-primary" id="scout-wizard-create">${I.plus} Create DE</button>`
            : `<button class="scout-btn scout-btn-primary" id="scout-wizard-next">Next ${I.chevRight}</button>`}
    </div>
</div>`;

    if (S.deWizardStep === 1) {
        document.getElementById('scout-de-folder-display')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'fetchFolderChildren', parentId: null, instance }, res => {
                if (res && res.success) showFolderModal(res.folders, null, '');
                else toast('Could not load folders', 'error');
            });
        });
        document.getElementById('scout-wizard-next')?.addEventListener('click', () => {
            const name = document.getElementById('scout-de-name')?.value.trim();
            if (!name) { toast('DE name is required', 'warning'); return; }
            S.deWizardData.name = name;
            S.deWizardData.key = document.getElementById('scout-de-key')?.value.trim() || null;
            S.deWizardData.folderId = document.getElementById('scout-de-folder-id')?.value || '0';
            S.deWizardData.folderPath = document.getElementById('scout-de-folder-display')?.value || '';
            S.deWizardStep = 2;
            renderDECreate(container);
        });
    } else if (S.deWizardStep === 2) {
        renderFieldsList();
        document.getElementById('scout-add-field')?.addEventListener('click', () => {
            syncFieldsFromDOM();
            S.deCreateFields.push({ name: '', type: 'Text', length: '50', isPrimaryKey: false, isRequired: false });
            renderFieldsList();
        });
        document.getElementById('scout-wizard-prev')?.addEventListener('click', () => {
            syncFieldsFromDOM();
            S.deWizardStep = 1; renderDECreate(container);
        });
        document.getElementById('scout-wizard-next')?.addEventListener('click', () => {
            syncFieldsFromDOM();
            const valid = S.deCreateFields.filter(f => f.name);
            if (!valid.length) { toast('Add at least one field', 'warning'); return; }
            S.deWizardStep = 3; renderDECreate(container);
        });
    } else if (S.deWizardStep === 3) {
        document.getElementById('scout-de-sendable')?.addEventListener('change', (e) => {
            const config = document.getElementById('scout-sendable-config');
            if (config) config.style.display = e.target.checked ? 'block' : 'none';
            S.deWizardData.isSendable = e.target.checked;
        });
        document.getElementById('scout-wizard-prev')?.addEventListener('click', () => {
            S.deWizardData.isSendable = document.getElementById('scout-de-sendable')?.checked || false;
            S.deWizardData.isTestable = document.getElementById('scout-de-testable')?.checked || false;
            S.deWizardStep = 2; renderDECreate(container);
        });
        document.getElementById('scout-wizard-create')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            if (btn.disabled) return;
            const isSendable = document.getElementById('scout-de-sendable')?.checked || false;
            const isTestable = document.getElementById('scout-de-testable')?.checked || false;
            const sendableField = isSendable ? (document.getElementById('scout-sendable-field')?.value || '') : null;
            const subscriberField = isSendable ? (document.getElementById('scout-subscriber-field')?.value || '_SubscriberKey') : null;
            if (isSendable && !sendableField) { toast('Select a sendable field', 'warning'); return; }
            const TYPE_CODES = { 'Text': 0, 'Number': 1, 'Date': 2, 'Boolean': 4, 'Email': 8, 'Phone': 16, 'Decimal': 32, 'Locale': 64 };
            const NO_LENGTH_CODES = new Set([1, 2, 4]); // Number, Date, Boolean
            const fields = S.deCreateFields.filter(f => f.name).map(f => {
                const typeCode = typeof f.type === 'number' ? f.type : (TYPE_CODES[f.type] !== undefined ? TYPE_CODES[f.type] : 0);
                const field = {
                    name: f.name,
                    type: typeCode,
                    isPrimaryKey: f.isPrimaryKey || false,
                    isRequired: f.isRequired || f.isPrimaryKey || false
                };
                if (!NO_LENGTH_CODES.has(typeCode)) field.length = parseInt(f.length, 10) || 50;
                return field;
            });
            // Loading state
            btn.disabled = true;
            btn.innerHTML = I.spinner + ' Creating…';
            chrome.runtime.sendMessage({
                action: 'createDE', deName: S.deWizardData.name, customerKey: S.deWizardData.key || null,
                fields, isSendable, isTestable, folderId: S.deWizardData.folderId || '0',
                sendableField, subscriberField, instance
            }, res => {
                if (res && res.success) {
                    const deName = S.deWizardData.name;
                    toast('"' + deName + '" created successfully!', 'success');
                    // Small delay so the toast is visible before wizard resets
                    setTimeout(() => {
                        S.deCreateFields = [];
                        S.deWizardStep = 1;
                        S.deWizardData = {};
                        renderDECreate(container);
                    }, 1200);
                } else {
                    btn.disabled = false;
                    btn.innerHTML = I.plus + ' Create DE';
                    const errMsg = (res && res.error) || (res && res.message) || 'Unknown error';
                    toast('Create failed: ' + errMsg, 'error');
                }
            });
        });
    }
}

// --- DE DETAIL VIEW ---
function openDEDetail(de) {
    S.deDetail = {
        id: de.id,
        name: de.name || de.Name || 'Data Extension',
        customerKey: de.customerKey || de.key || null,
        rowCount: de.rowCount,
        fieldCount: de.fieldCount,
        path: de.path || de.folderPath || null,
        isSendable: de.isSendable || false,
        createdDate: de.createdDate || null,
        modifiedDate: de.modifiedDate || null,
        owner: de.owner || de.ownerName || null,
        modifiedByName: de.modifiedByName || null,
        fields: null,
        loading: true
    };
    const container = document.getElementById('scout-de-body');
    if (container) renderDEDetail(container);
    // Fetch DE details including fields
    const url = `https://${instance}.marketingcloudapps.com/contactsmeta/fuelapi/internal/v1/customobjects/${de.id}/fields`;
    chrome.runtime.sendMessage({ type: 'MAKE_REQUEST', url, method: 'GET', headers: { 'accept': 'application/json' } }, res => {
        if (res && res.ok && res.data) {
            S.deDetail.fields = res.data.items || res.data.fields || res.data || [];
        }
        S.deDetail.loading = false;
        const cont2 = document.getElementById('scout-de-body');
        if (cont2 && S.deDetail) renderDEDetail(cont2);
    });
}

function renderDEDetail(container) {
    if (!container || !S.deDetail) return;
    const d = S.deDetail;
    const sfmcUrl = `https://${instance}.marketingcloudapps.com/contactsmeta/admin.html#admin/data-extension/${d.id}/properties/`;
    const fieldsHtml = d.loading
        ? `<div class="scout-loading-state">${I.spinner} Loading fields…</div>`
        : (!d.fields || !d.fields.length)
            ? `<div class="scout-detail-name-muted">No fields data available.</div>`
            : `<div class="scout-fields-table-wrap"><table class="scout-fields-table">
                <thead><tr>
                    <th>Field Name</th>
                    <th>Type</th>
                    <th>Length</th>
                    <th>PK</th>
                    <th>Req</th>
                </tr></thead>
                <tbody>${d.fields.map((f) => `<tr>
                    <td class="td-name">${escHtml(f.name || f.Name || '')}</td>
                    <td class="td-type">${escHtml(f.fieldType || f.type || f.Type || '')}</td>
                    <td class="td-len">${f.length != null ? f.length : (f.maxLength != null ? f.maxLength : '—')}</td>
                    <td class="td-center">${(f.isPrimaryKey || f.isKey) ? `<span class="td-pk">${I.check}</span>` : '<span class="td-muted">—</span>'}</td>
                    <td class="td-center">${(f.isRequired || f.required) ? `<span class="td-req">${I.check}</span>` : '<span class="td-muted">—</span>'}</td>
                </tr>`).join('')}
                </tbody></table></div>`;
    // Kick off usage count fetches — store raw results for click-to-expand
    let usageCounts = { queries: '...', automations: '...', journeys: '...' };
    let usageData   = { queries: null, automations: null, journeys: null };
    let usageExpanded = null;
    const usageDiv = () => document.getElementById('scout-de-usage');

    function renderUsageCounts(u) {
        const labels = { queries: 'Queries', automations: 'Automations', journeys: 'Journeys' };
        const items = ['queries', 'automations', 'journeys'].map(type =>
            `<button class="scout-stat-item${usageExpanded === type ? ' active' : ''}" data-usage-type="${type}" ${usageData[type] === null ? 'disabled' : ''}>
                <div class="scout-stat-num">${u[type] === null ? I.spinner : u[type]}</div>
                <div class="scout-stat-label">${labels[type]}</div>
            </button>`
        ).join('');
        const detail = usageExpanded ? renderUsageDetail(usageExpanded) : '';
        return `<div class="scout-stat-row">${items}</div>${detail ? `<div class="scout-usage-detail">${detail}</div>` : ''}`;
    }

    function renderUsageDetail(type) {
        const items = usageData[type] || [];
        if (!items.length) return `<div class="scout-usage-empty">No ${type} reference this DE</div>`;
        if (type === 'queries') {
            return items.map((q, qi) => {
                const name = q.name || q.queryDefinitionId || q.id || 'Unknown Query';
                const target = q.targetName || '';
                const sql = q.queryText || '';
                const hasDetails = sql || target;
                return `<button class="scout-usage-item scout-usage-query-item" data-qidx="${qi}">
                    <span class="scout-usage-item-name">${escHtml(name)}</span>
                    ${target ? `<span class="scout-usage-item-meta">${I.chevRight} ${escHtml(target)}</span>` : ''}
                    ${hasDetails ? `<span class="scout-usage-nav-arrow" id="scout-qarrow-${qi}">${I.chevDown}</span>` : ''}
                </button>
                ${hasDetails ? `<div class="scout-query-detail" id="scout-qdetail-${qi}" style="display:none;">
                    ${sql ? `<pre class="scout-query-sql">${escHtml(sql.length > 400 ? sql.slice(0, 400) + '…' : sql)}</pre>` : ''}
                </div>` : ''}`;
            }).join('');
        }
        if (type === 'automations') {
            return items.map(a => `<button class="scout-usage-item scout-usage-nav" data-auto-id="${escHtml(String(a.id || ''))}" data-auto-name="${escHtml(a.name || '')}">
                <span class="scout-usage-item-name">${escHtml(a.name || a.id || '')}</span>
                <span class="scout-usage-item-meta">${escHtml(a.status || '')}</span><span class="scout-usage-nav-arrow">${I.chevRight}</span>
            </button>`).join('');
        }
        if (type === 'journeys') {
            return items.map(j => `<div class="scout-usage-item">
                <span class="scout-usage-item-name">${escHtml(j.name || j.key || '')}</span>
                <span class="scout-usage-item-meta">${j.eventName ? escHtml(j.eventName) : ''}${j.version ? ' · v' + j.version : ''}</span>
            </div>`).join('');
        }
        return '';
    }

    function bindUsageInteractions() {
        const div = usageDiv();
        if (!div) return;
        div.querySelectorAll('.scout-stat-item[data-usage-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.usageType;
                if (usageData[type] === null) return;
                usageExpanded = (usageExpanded === type) ? null : type;
                if (usageDiv()) usageDiv().innerHTML = renderUsageCounts(usageCounts);
                bindUsageInteractions();
            });
        });
        div.querySelectorAll('.scout-usage-nav[data-auto-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                S.tab = 'automations';
                updateTabUI();
                openAutomationDetail(btn.dataset.autoId, btn.dataset.autoName);
            });
        });
        div.querySelectorAll('.scout-usage-query-item[data-qidx]').forEach(btn => {
            btn.addEventListener('click', () => {
                const qi = btn.dataset.qidx;
                const detail = document.getElementById('scout-qdetail-' + qi);
                const arrow = document.getElementById('scout-qarrow-' + qi);
                if (!detail) return;
                const open = detail.style.display !== 'none';
                detail.style.display = open ? 'none' : 'block';
                if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
            });
        });
    }

    const loadUsage = (type, action) => {
        chrome.runtime.sendMessage({ action, deName: d.name, deKey: d.customerKey || '', deId: d.id, instance }, res => {
            if (res && res.success) {
                const raw = res.data !== undefined ? res.data : (res.results || []);
                const arr = Array.isArray(raw) ? raw : (raw.items || raw.entry || []);
                usageData[type] = arr;
                usageCounts[type] = arr.length;
            } else {
                usageData[type] = [];
                usageCounts[type] = '?';
            }
            if (usageDiv()) {
                usageDiv().innerHTML = renderUsageCounts(usageCounts);
                bindUsageInteractions();
            }
        });
    };
    loadUsage('queries', 'fetchDEUsageQueries');
    loadUsage('automations', 'fetchDEUsageAutomations');
    loadUsage('journeys', 'fetchDEUsageJourneys');

    container.innerHTML = `
<div class="scout-detail-header">
    <button class="scout-back-btn" id="scout-back-de">${I.back} Search</button>
    <span class="scout-detail-header-title">${escHtml(d.name)}</span>
</div>
<div class="scout-overview-card">
    <div class="scout-section-title">Overview</div>
    <div class="scout-overview-grid">
        ${d.customerKey ? `<div class="scout-overview-item"><label>External Key</label><span class="scout-monospace">${escHtml(d.customerKey)}</span></div>` : ''}
        ${d.rowCount != null ? `<div class="scout-overview-item"><label>Row Count</label><span>${Number(d.rowCount).toLocaleString()}</span></div>` : ''}
        ${d.fieldCount != null ? `<div class="scout-overview-item"><label>Fields</label><span>${d.fieldCount}</span></div>` : ''}
        ${d.path ? `<div class="scout-overview-item"><label>Folder</label><span>${escHtml(d.path)}</span></div>` : ''}
        ${d.owner ? `<div class="scout-overview-item"><label>Owner</label><span>${escHtml(d.owner)}</span></div>` : ''}
        ${d.createdDate ? `<div class="scout-overview-item"><label>Created</label><span>${escHtml(formatDate(d.createdDate))}</span></div>` : ''}
        ${d.modifiedDate ? `<div class="scout-overview-item"><label>Modified</label><span>${escHtml(formatDate(d.modifiedDate))}</span></div>` : ''}
        ${d.modifiedByName ? `<div class="scout-overview-item"><label>Modified By</label><span>${escHtml(d.modifiedByName)}</span></div>` : ''}
    </div>
</div>
<div class="scout-overview-card">
    <div class="scout-section-title">Used In</div>
    <div id="scout-de-usage" class="scout-usage-row">${renderUsageCounts(usageCounts)}</div>
</div>
<div class="scout-overview-card">
    <div class="scout-overview-card-header">
        <div class="scout-section-title">Fields Schema</div>
        <a href="${sfmcUrl}" target="_blank" class="scout-btn scout-btn-secondary scout-open-sfmc-btn">${I.externalLink} Open in SFMC</a>
    </div>
    ${fieldsHtml}
</div>`;
    container.querySelector('#scout-back-de')?.addEventListener('click', () => {
        S.deDetail = null;
        renderDESearch(container); // renderDESearch restores S.deSearchQuery + S.deSearchResults
    });
}

function syncFieldsFromDOM() {
    document.querySelectorAll('.scout-field-row').forEach((row, i) => {
        if (i < S.deCreateFields.length) {
            S.deCreateFields[i].name = row.querySelector('.scout-field-name')?.value ?? S.deCreateFields[i].name;
            S.deCreateFields[i].type = row.querySelector('.scout-field-type')?.value ?? S.deCreateFields[i].type;
            S.deCreateFields[i].length = row.querySelector('.scout-field-len')?.value ?? S.deCreateFields[i].length;
            S.deCreateFields[i].isPrimaryKey = row.querySelector('.scout-field-pk')?.checked ?? false;
            S.deCreateFields[i].isRequired = row.querySelector('.scout-field-req')?.checked ?? false;
        }
    });
}

function renderFieldsList() {
    const list = document.getElementById('scout-fields-list');
    if (!list) return;
    const NO_LEN_TYPES = ['Boolean', 'Date', 'Number'];
    list.innerHTML = S.deCreateFields.map((f, idx) => `
<div class="scout-field-row" data-idx="${idx}">
    <input class="scout-input scout-field-name" placeholder="Field name" value="${escHtml(f.name)}">
    <select class="scout-select scout-field-type">
        ${['Text','Number','Date','Boolean','Email','Phone','Decimal','Locale'].map(t => `<option${f.type===t?' selected':''}>${t}</option>`).join('')}
    </select>
    <input class="scout-input scout-field-len" placeholder="Len" value="${escHtml(String(f.length))}"${NO_LEN_TYPES.includes(f.type)?' style="display:none"':''}>
    <label class="scout-field-pk-label" title="Primary Key">
        <input type="checkbox" class="scout-field-pk"${f.isPrimaryKey?' checked':''}> PK
    </label>
    <label class="scout-field-req-label" title="Required">
        <input type="checkbox" class="scout-field-req"${f.isRequired?' checked':''}> Req
    </label>
    <button class="scout-remove-field" data-idx="${idx}">${I.close}</button>
</div>`).join('');
    list.querySelectorAll('.scout-remove-field').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx, 10);
            S.deCreateFields.splice(idx, 1);
            renderFieldsList();
        });
    });
    list.querySelectorAll('.scout-field-type').forEach(sel => {
        sel.addEventListener('change', () => {
            const lenInput = sel.closest('.scout-field-row').querySelector('.scout-field-len');
            if (lenInput) lenInput.style.display = NO_LEN_TYPES.includes(sel.value) ? 'none' : '';
        });
    });
    updateSendableFieldOptions();
}

function renderDEExport(container) {
    container.innerHTML = `
<div class="scout-card">
    <div class="scout-card-title">${I.download} Export All Data Extensions</div>
    <div class="scout-form-row"><label>Filter</label>
        <select class="scout-select" id="scout-export-filter">
            <option value="all">All DEs</option>
            <option value="sendable">Sendable only</option>
            <option value="nonsendable">Non-sendable only</option>
        </select>
    </div>
    <p class="scout-export-note">Exports all DEs as a JSON report including fields &amp; metadata.</p>
    <button class="scout-btn scout-btn-primary scout-btn-full" id="scout-export-btn">${I.download} Export</button>
    <div id="scout-export-status" class="scout-status-area"></div>
</div>`;
    document.getElementById('scout-export-btn')?.addEventListener('click', () => {
        const filter = document.getElementById('scout-export-filter')?.value || 'all';
        const statusDiv = document.getElementById('scout-export-status');
        if (statusDiv) statusDiv.innerHTML = `<div class="scout-loading-state">${I.spinner} Exporting — this may take a moment…</div>`;
        chrome.runtime.sendMessage({ action: 'exportDE', filter, format: 'json', instance }, res => {
            if (res && res.success && res.exportData) {
                const blob = new Blob([JSON.stringify(res.exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const ts = new Date().toISOString().slice(0, 10);
                a.href = url; a.download = `sfmc-de-export-${filter}-${ts}.json`; a.click();
                URL.revokeObjectURL(url);
                const count = (res.exportData.exportInfo && res.exportData.exportInfo.totalCount) || 0;
                if (statusDiv) statusDiv.innerHTML = `<span class="scout-status-success">${I.check} Exported ${count} DE(s).</span>`;
                toast('Exported ' + count + ' DEs', 'success');
            } else {
                if (statusDiv) statusDiv.innerHTML = `<span class="scout-status-error">Export failed: ${escHtml((res && res.error) || 'Unknown')}</span>`;
                toast('Export failed', 'error');
            }
        });
    });
}


function renderDEReport(container) {
    container.innerHTML = `
<div class="scout-card">
    <div class="scout-card-title">${I.report} Generate DE Report</div>
    <div class="scout-form-row-flex" style="gap:8px;margin-top:12px;">
        <button class="scout-btn scout-btn-primary" style="flex:1;" id="scout-report-html-btn">${I.report} View HTML Report</button>
        <button class="scout-btn scout-btn-secondary" style="flex:1;" id="scout-report-csv-btn">${I.download} Export CSV</button>
    </div>
    <div id="scout-report-status" class="scout-status-area"></div>
</div>`;

    document.getElementById('scout-report-html-btn')?.addEventListener('click', () => {
        const statusDiv = document.getElementById('scout-report-status');
        if (statusDiv) statusDiv.innerHTML = `<div class="scout-loading-state">${I.spinner} Generating report…</div>`;
        chrome.runtime.sendMessage({ action: 'generateReport', format: 'html', instance }, res => {
            if (res && res.success && res.html) {
                const blob = new Blob([res.html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 30000);
                if (statusDiv) statusDiv.innerHTML = `<span class="scout-status-success">${I.check} Report opened in new tab (${res.count} DEs).</span>`;
                toast('Report generated — ' + res.count + ' DEs', 'success');
            } else {
                if (statusDiv) statusDiv.innerHTML = `<span class="scout-status-error">Failed: ${escHtml((res && res.error) || 'Unknown')}</span>`;
                toast('Report failed', 'error');
            }
        });
    });

    document.getElementById('scout-report-csv-btn')?.addEventListener('click', () => {
        const statusDiv = document.getElementById('scout-report-status');
        if (statusDiv) statusDiv.innerHTML = `<div class="scout-loading-state">${I.spinner} Fetching DE data…</div>`;
        chrome.runtime.sendMessage({ action: 'generateReport', format: 'csv', instance }, res => {
            if (res && res.success && res.csv) {
                const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const ts = new Date().toISOString().slice(0, 10);
                a.href = url; a.download = `sfmc-de-report-${ts}.csv`; a.click();
                URL.revokeObjectURL(url);
                if (statusDiv) statusDiv.innerHTML = `<span class="scout-status-success">${I.check} Exported ${res.count} DEs to CSV.</span>`;
                toast('Exported ' + res.count + ' DEs to CSV', 'success');
            } else {
                if (statusDiv) statusDiv.innerHTML = `<span class="scout-status-error">Failed: ${escHtml((res && res.error) || 'Unknown')}</span>`;
                toast('CSV export failed', 'error');
            }
        });
    });
}

// ============================================================
//  REPORTS VIEW
// ============================================================
const REPORT_TABS = [
    { id: 'de',          label: 'Data Extensions', icon: 'database' },
    { id: 'automations', label: 'Automations',      icon: 'automation' },
    { id: 'journeys',    label: 'Journeys',         icon: 'journey' },
    { id: 'assets',      label: 'Assets',           icon: 'asset' },
    { id: 'activities',  label: 'Activities',       icon: 'query' }
];

let _logoDataUrl = null;
async function getLogoDataUrl() {
    if (_logoDataUrl !== null) return _logoDataUrl;
    try {
        const res = await fetch(chrome.runtime.getURL('icons/icon-48.png'));
        const blob = await res.blob();
        _logoDataUrl = await new Promise(resolve => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.readAsDataURL(blob);
        });
    } catch (_) { _logoDataUrl = ''; }
    return _logoDataUrl;
}

function reportStatusBadge(status) {
    if (!status) return '<span style="color:var(--text3)">—</span>';
    const s = status.toLowerCase().trim();
    let cls;
    // Check unpublished before published to avoid false-positive substring match
    if (['draft','paused','building','unpublished'].some(k => s.includes(k))) cls = 'scheduled';
    else if (s === 'ready') cls = 'ready';
    else if (['active','running','published','scheduled'].some(k => s.includes(k))) cls = 'active';
    else if (['error','stopped','failed','deleted'].some(k => s.includes(k))) cls = 'error';
    else cls = 'inactive';
    return `<span class="badge badge-${cls}">${escHtml(status)}</span>`;
}

function activityTypeBadge(typeName) {
    const colors = { 'SQL Query':'#7C3AED','Script':'#0EA5E9','Filter':'#F59E0B','Send Email':'#10B981','Import':'#6366F1','File Transfer':'#F97316','Data Extract':'#EC4899' };
    const c = colors[typeName] || '#64748B';
    return `<span class="badge" style="background:${c}22;color:${c}">${escHtml(typeName)}</span>`;
}

function reportHtmlShell(title, count, instance, rows, columns, extraCss, logoDataUrl, theme) {
    const ts = new Date().toLocaleString();
    const isLight = (theme || S.theme) === 'light';
    const colHeaders = columns.map(c => `<th data-col="${c.idx}" style="${c.align==='right'?'text-align:right':''}">${escHtml(c.label)}</th>`).join('');
    // Theme-aware CSS variables
    const vars = isLight
        ? `--bg:#F3F2F2;--bg2:#FFFFFF;--surface:#FFFFFF;--surf2:#F9F8F7;--border:rgba(0,0,0,0.08);--border2:rgba(0,0,0,0.12);--text:#032D60;--text2:#3E3E3C;--text3:#706E6B;--accent:#0176D3;--success:#04844B;--error:#C23934;--warning:#DD7A01;--th-bg:#F9F8F7;--th-hover:#F0EFEE;--td-hover:rgba(1,118,211,0.05);`
        : `--bg:#0F172A;--bg2:#0D1F35;--surface:#1E2D42;--surf2:#243451;--border:rgba(255,255,255,0.08);--border2:rgba(255,255,255,0.12);--text:#F8FAFC;--text2:#94A3B8;--text3:#64748B;--accent:#4F8EF7;--success:#34D399;--error:#F87171;--warning:#FBBF24;--th-bg:#162032;--th-hover:#1E2D42;--td-hover:rgba(255,255,255,0.03);`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SFMC Scout — ${escHtml(title)}</title>
<style>
:root{${vars}}
*{box-sizing:border-box;}
html,body{height:100%;overflow:hidden;margin:0;padding:0;}
body{font-family:'Space Grotesk','DM Sans',system-ui,sans-serif;font-size:13px;background:var(--bg);color:var(--text);display:flex;flex-direction:column;}
.report-header{background:var(--bg2);border-bottom:1px solid var(--border2);padding:14px 24px;flex-shrink:0;display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.report-title{font-size:17px;font-weight:700;color:var(--text);margin:0;}
.report-title span{color:var(--accent);}
.report-meta{font-size:11px;color:var(--text3);font-family:monospace;margin-left:auto;display:flex;gap:16px;}
.report-meta strong{color:var(--text2);}
.report-body{padding:16px 24px;flex:1;overflow-y:auto;}
.search-wrap{display:flex;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:0 14px;gap:10px;margin-bottom:12px;}
.search-wrap svg{flex-shrink:0;color:var(--text3);}
#search-input{flex:1;background:none;border:none;outline:none;color:var(--text);font-size:13px;height:36px;font-family:inherit;}
#search-input::placeholder{color:var(--text3);}
.table-container{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow-x:auto;}
table{border-collapse:collapse;width:100%;min-width:900px;font-size:12px;}
thead{position:sticky;top:0;z-index:10;}
th{background:var(--th-bg);padding:10px;text-align:left;font-weight:600;font-size:11px;color:var(--text2);letter-spacing:.04em;text-transform:uppercase;border-bottom:1px solid var(--border2);cursor:pointer;user-select:none;white-space:nowrap;}
th:hover{background:var(--th-hover);}
td{padding:9px 10px;border-bottom:1px solid var(--border);color:var(--text2);vertical-align:top;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
tr:last-child td{border-bottom:none;}
tr:hover td{background:var(--td-hover);}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;letter-spacing:.03em;}
.badge-active{background:rgba(52,211,153,.15);color:var(--success);}
.badge-inactive{background:rgba(100,116,139,.15);color:var(--text3);}
.badge-error{background:rgba(248,113,113,.15);color:var(--error);}
.badge-scheduled{background:rgba(251,191,36,.15);color:var(--warning);}
.badge-ready{background:rgba(79,142,247,.15);color:var(--accent);}
.mono{font-family:monospace;font-size:11px;color:var(--text2);}
.hidden-row{display:none;}
::-webkit-scrollbar{width:6px;height:6px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--surf2);border-radius:3px;}
${extraCss||''}
</style></head><body>
<div class="report-header">
  ${logoDataUrl ? `<img src="${logoDataUrl}" style="width:28px;height:28px;border-radius:6px;object-fit:contain;flex-shrink:0;" alt="SFMC Scout">` : ''}
  <h1 class="report-title">SFMC Scout <span>${escHtml(title)}</span></h1>
  <div class="report-meta">
    <span><strong>Instance:</strong> ${escHtml(instance)}</span>
    <span><strong>Generated:</strong> ${escHtml(ts)}</span>
    <span><strong>Total:</strong> ${count}</span>
  </div>
</div>
<div class="report-body">
<div class="search-wrap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M20 20L17 17"/></svg>
<input type="text" id="search-input" placeholder="Filter…"></div>
<div class="table-container"><table>
<thead><tr>${colHeaders}</tr></thead>
<tbody>${rows}</tbody>
</table></div></div>
<script>
document.getElementById('search-input').addEventListener('input',function(){
  const q=this.value.toLowerCase();
  document.querySelectorAll('tbody tr').forEach(tr=>{tr.classList.toggle('hidden-row',q?!tr.textContent.toLowerCase().includes(q):false);});
});
document.querySelectorAll('thead th[data-col]').forEach(th=>{
  th.addEventListener('click',function(){
    const col=parseInt(this.dataset.col);
    const asc=!this.classList.contains('sort-asc');
    document.querySelectorAll('thead th').forEach(t=>t.classList.remove('sort-asc','sort-desc'));
    this.classList.add(asc?'sort-asc':'sort-desc');
    const tbody=document.querySelector('tbody');
    const rows=Array.from(tbody.querySelectorAll('tr:not(.hidden-row)'));
    rows.sort((a,b)=>{const av=a.cells[col]?.textContent||'';const bv=b.cells[col]?.textContent||'';return asc?av.localeCompare(bv,undefined,{numeric:true}):bv.localeCompare(av,undefined,{numeric:true});});
    rows.forEach(r=>tbody.appendChild(r));
  });
});
<\/script></body></html>`;
}

function openBlobReport(html) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ── Automation report ──────────────────────────────────────────────────────
async function generateAutomationsReport(statusEl) {
    if (statusEl) statusEl.innerHTML = `<div class="scout-loading-state">${I.spinner} Fetching automations…</div>`;
    try {
        // Primary endpoint — full list with pagination
        let allAutos = [], page = 1;
        while (true) {
            const d = await sfmcFetch(`https://${instance}.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/automation/v1/automations?$page=${page}&$pagesize=500`);
            const items = d && (d.items || d.entry || []);
            if (!items.length) break;
            allAutos = allAutos.concat(items);
            if (allAutos.length >= (d.count || items.length)) break;
            page++;
            if (page > 10) break;
        }
        // Legacy endpoint — richer metadata (lastRunTime, createdBy, description, scheduleObject)
        let legacyMap = {};
        try {
            const legacyData = await sfmcFetch(`https://${instance}.exacttarget.com/cloud/fuelapi/legacy/v1/beta/automations/automation/definition/?$sort=lastRunTime%20desc&view=gridView&$pageSize=500`);
            const legacyItems = (legacyData && (legacyData.entry || legacyData.items || []));
            legacyItems.forEach(a => {
                const k = a.key || a.automationKey;
                if (k) legacyMap[k] = a;
            });
        } catch (_) { /* legacy fetch is supplemental — ignore failures */ }
        // Helper: resolve a user field (may be string or {name,email,id} object)
        const resolveUser = (u) => {
            if (!u) return '';
            if (typeof u === 'string') return u;
            if (typeof u === 'object') return u.name || u.userName || u.email || String(u.id || '') || '';
            return String(u);
        };
        // Merge legacy fields into primary items
        allAutos = allAutos.map(a => {
            const k = a.key || a.automationKey;
            const leg = k ? (legacyMap[k] || {}) : {};
            const schedObj = a.schedule || (leg.scheduleObject ? leg.scheduleObject : null);
            return {
                ...a,
                lastRunTime: a.lastRunTime || leg.lastRunTime || '',
                _createdBy: resolveUser(a.createdBy) || resolveUser(leg.lastSavedBy) || resolveUser(leg.createdBy) || '',
                description: a.description || leg.description || '',
                _scheduleTypeName: (schedObj && schedObj.scheduleTypeName) || '',
                _folderPath: a.categoryPath || a.folderPath || leg.categoryPath || leg.folderPath || '',
                _stepCount: a.stepCount != null ? a.stepCount : (Array.isArray(a.steps) ? a.steps.length : (leg.activityCount != null ? leg.activityCount : ''))
            };
        });
        const cols = [
            { idx:0, label:'Name' }, { idx:1, label:'Status' },
            { idx:2, label:'Key', align:'mono' }, { idx:3, label:'Last Run' },
            { idx:4, label:'Schedule' }, { idx:5, label:'Steps', align:'right' },
            { idx:6, label:'Folder' }, { idx:7, label:'Created By' },
            { idx:8, label:'Description' },
            { idx:9, label:'Created' }, { idx:10, label:'Modified' }
        ];
        const rows = allAutos.map(a => {
            return `<tr>
<td title="${escHtml(a.name||'')}">${escHtml(a.name||'—')}</td>
<td>${reportStatusBadge(a.status||a.statusName||'')}</td>
<td class="mono">${escHtml(a.key||a.automationKey||'—')}</td>
<td>${escHtml(formatDate(a.lastRunTime||a.lastRun||''))}</td>
<td>${escHtml(a._scheduleTypeName||'')}</td>
<td style="text-align:right">${a._stepCount !== '' ? a._stepCount : '—'}</td>
<td style="max-width:150px">${escHtml(a._folderPath||'')}</td>
<td>${escHtml(a._createdBy||'')}</td>
<td style="max-width:180px">${escHtml((a.description||'').substring(0,80))}</td>
<td>${escHtml(formatDate(a.createdDate||a.createDate||''))}</td>
<td>${escHtml(formatDate(a.modifiedDate||a.lastSaveDate||''))}</td>
</tr>`;
        }).join('');
        const logoUrl = await getLogoDataUrl();
        const html = reportHtmlShell('Automations Report', allAutos.length, instance, rows || '<tr><td colspan="11" style="text-align:center;padding:30px;color:#64748B;">No automations found.</td></tr>', cols, '', logoUrl);
        openBlobReport(html);
        if (statusEl) statusEl.innerHTML = `<span class="scout-status-success">${I.check} ${allAutos.length} automations exported.</span>`;
    } catch (e) {
        if (statusEl) statusEl.innerHTML = `<span class="scout-status-error">Failed: ${escHtml(e.message)}</span>`;
        toast('Automations report failed', 'error');
    }
}

// ── Journeys report ────────────────────────────────────────────────────────
async function generateJourneysReport(statusEl) {
    if (statusEl) statusEl.innerHTML = `<div class="scout-loading-state">${I.spinner} Fetching journeys…</div>`;
    try {
        let allJ = [], page = 1;
        while (true) {
            const d = await sfmcFetch(`https://${instance}.exacttarget.com/cloud/fuelapi/interaction/v1/interactions/?mostRecentVersionOnly=false&mostRecentVersionOrRunningOnly=true&$page=${page}&$pageSize=500&extras=trigger%2Cstats%2Ctag`);
            const items = d && (d.items || []);
            if (!items.length) break;
            allJ = allJ.concat(items);
            if (allJ.length >= (d.count || items.length)) break;
            page++;
            if (page > 10) break;
        }
        const cols = [
            { idx:0, label:'Name' }, { idx:1, label:'Status' },
            { idx:2, label:'Key', align:'mono' }, { idx:3, label:'Version', align:'right' },
            { idx:4, label:'Channel' }, { idx:5, label:'Created' }, { idx:6, label:'Modified' }
        ];
        const rows = allJ.map(j => {
            return `<tr>
<td title="${escHtml(j.name||'')}">${escHtml(j.name||'—')}</td>
<td>${reportStatusBadge(j.status||'')}</td>
<td class="mono">${escHtml(j.key||'—')}</td>
<td style="text-align:right">${j.version||'—'}</td>
<td>${escHtml(j.channel||j.definitionType||'—')}</td>
<td>${escHtml(formatDate(j.createdDate||''))}</td>
<td>${escHtml(formatDate(j.modifiedDate||j.lastModifiedDate||''))}</td>
</tr>`;
        }).join('');
        const logoUrl = await getLogoDataUrl();
        const html = reportHtmlShell('Journeys Report', allJ.length, instance, rows || '<tr><td colspan="7" style="text-align:center;padding:30px;color:#64748B;">No journeys found.</td></tr>', cols, '', logoUrl);
        openBlobReport(html);
        if (statusEl) statusEl.innerHTML = `<span class="scout-status-success">${I.check} ${allJ.length} journeys exported.</span>`;
    } catch (e) {
        if (statusEl) statusEl.innerHTML = `<span class="scout-status-error">Failed: ${escHtml(e.message)}</span>`;
        toast('Journeys report failed', 'error');
    }
}

// ── Assets report ──────────────────────────────────────────────────────────
async function generateAssetsReport(statusEl) {
    if (statusEl) statusEl.innerHTML = `<div class="scout-loading-state">${I.spinner} Fetching assets…</div>`;
    try {
        // Get the freshest CB token from storage (may have been captured after panel opened)
        const freshCbToken = await new Promise(resolve => {
            chrome.runtime.sendMessage({ type: 'GET_TOKENS' }, res => {
                resolve(res && res.tokens ? (res.tokens.cbToken || res.tokens.pageHookToken || S.pageHookToken || '') : (S.pageHookToken || ''));
            });
        });
        let allA = [], page = 1;
        while (true) {
            const d = await sfmcFetch(
                `https://content-builder.${stack}.marketingcloudapps.com/fuelapi/asset/v1/content/assets/query?scope=ours`,
                'POST',
                { 'x-csrf-token': freshCbToken },
                { page: { page, pageSize: 500 } }
            );
            const items = d && (d.items || []);
            if (!items.length) break;
            allA = allA.concat(items);
            if (allA.length >= (d.count || items.length)) break;
            page++;
            if (page > 20) break;
        }
        const cols = [
            { idx:0, label:'Name' }, { idx:1, label:'Type' }, { idx:2, label:'Status' },
            { idx:3, label:'ID', align:'right' }, { idx:4, label:'Customer Key', align:'mono' },
            { idx:5, label:'Folder' }, { idx:6, label:'Created By' },
            { idx:7, label:'Created' }, { idx:8, label:'Modified' }
        ];
        const rows = allA.map(a => {
            const type = a.assetType ? (a.assetType.displayName || a.assetType.name || '') : '';
            const folder = a.category ? a.category.name : '';
            const owner = a.owner ? (a.owner.name || a.owner.userName || '') : '';
            const assetStatusRaw = a.status ? (typeof a.status === 'object' ? (a.status.name || '') : String(a.status)) : '';
            return `<tr>
<td title="${escHtml(a.name||'')}">${escHtml(a.name||'—')}</td>
<td>${escHtml(type)}</td>
<td>${reportStatusBadge(assetStatusRaw)}</td>
<td style="text-align:right" class="mono">${a.id||'—'}</td>
<td class="mono">${escHtml(a.customerKey||'—')}</td>
<td>${escHtml(folder)}</td>
<td>${escHtml(owner)}</td>
<td>${escHtml(formatDate(a.createdDate||a.createdOn||''))}</td>
<td>${escHtml(formatDate(a.modifiedDate||a.lastModifiedDate||''))}</td>
</tr>`;
        }).join('');
        const logoUrl = await getLogoDataUrl();
        const html = reportHtmlShell('Assets Report', allA.length, instance, rows || '<tr><td colspan="9" style="text-align:center;padding:30px;color:#64748B;">No assets found.</td></tr>', cols, '', logoUrl);
        openBlobReport(html);
        if (statusEl) statusEl.innerHTML = `<span class="scout-status-success">${I.check} ${allA.length} assets exported.</span>`;
    } catch (e) {
        if (statusEl) statusEl.innerHTML = `<span class="scout-status-error">Failed: ${escHtml(e.message)}</span>`;
        toast('Assets report failed', 'error');
    }
}

// ── Activities report (all 7 activity types) ──────────────────────────────
async function generateActivitiesReport(statusEl) {
    if (statusEl) statusEl.innerHTML = `<div class="scout-loading-state">${I.spinner} Fetching activities…</div>`;
    try {
        const base = `https://${instance}.marketingcloudapps.com/AutomationStudioFuel3/fuelapi`;
        const [sqlData, scriptData, filterData, sendEmailData, importData, fileXferData, dataExtractData] = await Promise.allSettled([
            sfmcFetch(`${base}/automation/v1/queries/?$page=1&$pageSize=500&$orderBy=modifiedDate%20desc&retrievalType=1`),
            sfmcFetch(`${base}/automation/v1/scripts/?$page=1&$pageSize=500&$orderBy=modifiedDate%20desc`),
            sfmcFetch(`${base}/automation/v1/filters/?$page=1&$pageSize=500`),
            sfmcFetch(`${base}/messaging-internal/v1/emailsenddefinition/?$page=1&$pageSize=500`),
            sfmcFetch(`${base}/automation/v1/imports?$page=1&$pageSize=500`),
            sfmcFetch(`${base}/automation/v1/filetransfers?$page=1&$pageSize=500`),
            sfmcFetch(`${base}/automation/v1/dataextracts?$page=1&$pageSize=500`)
        ]);
        const gather = (r, typeName) => ((r.status === 'fulfilled' && r.value && (r.value.items || r.value.definitions || [])) || []).map(a => ({ ...a, _type: typeName }));
        const allActs = [
            ...gather(sqlData, 'SQL Query'),
            ...gather(scriptData, 'Script'),
            ...gather(filterData, 'Filter'),
            ...gather(sendEmailData, 'Send Email'),
            ...gather(importData, 'Import'),
            ...gather(fileXferData, 'File Transfer'),
            ...gather(dataExtractData, 'Data Extract')
        ];
        const cols = [
            { idx:0, label:'Name' }, { idx:1, label:'Type' },
            { idx:2, label:'Key', align:'mono' }, { idx:3, label:'Target DE' },
            { idx:4, label:'Description' }, { idx:5, label:'Modified' }
        ];
        const rows = allActs.map(a => {
            const target = getActivityTarget(a);
            return `<tr>
<td title="${escHtml(a.name||a.Name||'')}">${escHtml(a.name||a.Name||'—')}</td>
<td>${activityTypeBadge(a._type)}</td>
<td class="mono">${escHtml(a.key||a.customerKey||a.CustomerKey||'—')}</td>
<td>${escHtml(target)}</td>
<td style="max-width:200px">${escHtml(((a.description||a.Description||'').substring(0,100)))}</td>
<td>${escHtml(formatDate(a.modifiedDate||a.lastModifiedDate||a.ModifiedDate||''))}</td>
</tr>`;
        }).join('');
        const logoUrl = await getLogoDataUrl();
        const html = reportHtmlShell('Activities Report', allActs.length, instance, rows || '<tr><td colspan="6" style="text-align:center;padding:30px;color:#64748B;">No activities found.</td></tr>', cols, '', logoUrl);
        openBlobReport(html);
        if (statusEl) statusEl.innerHTML = `<span class="scout-status-success">${I.check} ${allActs.length} activities exported.</span>`;
    } catch (e) {
        if (statusEl) statusEl.innerHTML = `<span class="scout-status-error">Failed: ${escHtml(e.message)}</span>`;
        toast('Activities report failed', 'error');
    }
}

// ── Activity helpers ───────────────────────────────────────────────────────
function getActivityTarget(a) {
    if (a.targetDataExtension) return a.targetDataExtension.name || a.targetDataExtension.key || '';
    if (a.dataExtensionTarget) return a.dataExtensionTarget.name || '';
    if (a.dataExtension) return a.dataExtension.name || '';
    if (a.destinationObject) return a.destinationObject.name || '';
    return '';
}

async function loadActivitiesForPanel() {
    if (S.actListLoading) return;
    S.actListLoading = true;
    renderReportSubView(document.getElementById('scout-reports-body'));
    const base = `https://${instance}.marketingcloudapps.com/AutomationStudioFuel3/fuelapi`;
    const [sqlD, scrD, filD, semD, impD, fxD, dexD] = await Promise.allSettled([
        sfmcFetch(`${base}/automation/v1/queries/?$page=1&$pageSize=500&$orderBy=modifiedDate%20desc&retrievalType=1`),
        sfmcFetch(`${base}/automation/v1/scripts/?$page=1&$pageSize=500&$orderBy=modifiedDate%20desc`),
        sfmcFetch(`${base}/automation/v1/filters/?$page=1&$pageSize=500`),
        sfmcFetch(`${base}/messaging-internal/v1/emailsenddefinition/?$page=1&$pageSize=500`),
        sfmcFetch(`${base}/automation/v1/imports?$page=1&$pageSize=500`),
        sfmcFetch(`${base}/automation/v1/filetransfers?$page=1&$pageSize=500`),
        sfmcFetch(`${base}/automation/v1/dataextracts?$page=1&$pageSize=500`)
    ]);
    const gather = (r, t) => ((r.status === 'fulfilled' && r.value && (r.value.items || r.value.definitions || [])) || []).map(a => ({ ...a, _type: t }));
    S.actList = [
        ...gather(sqlD, 'SQL Query'), ...gather(scrD, 'Script'),
        ...gather(filD, 'Filter'), ...gather(semD, 'Send Email'),
        ...gather(impD, 'Import'), ...gather(fxD, 'File Transfer'),
        ...gather(dexD, 'Data Extract')
    ];
    S.actListLoading = false;
    renderReportSubView(document.getElementById('scout-reports-body'));
}

async function openActivityDetail(act) {
    S.actDetail = { act, loading: true, data: null };
    renderReportSubView(document.getElementById('scout-reports-body'));
    const base = `https://${instance}.marketingcloudapps.com/AutomationStudioFuel3/fuelapi`;
    const key = act.key || act.customerKey || act.CustomerKey;
    let data = null;
    try {
        const endpointMap = {
            'SQL Query': `${base}/automation/v1/queries/${key}`,
            'Script': `${base}/automation/v1/scripts/${key}`,
            'Filter': `${base}/automation/v1/filters/${key}`,
            'Import': `${base}/automation/v1/imports/${key}`,
            'File Transfer': `${base}/automation/v1/filetransfers/${key}`,
            'Data Extract': `${base}/automation/v1/dataextracts/${key}`,
            'Send Email': `${base}/messaging-internal/v1/emailsenddefinition/${key}`
        };
        if (key && endpointMap[act._type]) data = await sfmcFetch(endpointMap[act._type]);
    } catch (_) {}
    S.actDetail = { act, loading: false, data };
    renderReportSubView(document.getElementById('scout-reports-body'));
}

function renderActivityDetail(container) {
    if (!S.actDetail) return;
    const { act, loading, data } = S.actDetail;
    const merged = { ...act, ...(data || {}) };
    const target = getActivityTarget(merged) || getActivityTarget(act);
    const key = act.key || act.customerKey || act.CustomerKey || '';
    const ACT_TYPE_ID = { 'SQL Query': 300, 'Script': 423, 'Send Email': 42, 'Import': 43, 'File Transfer': 457, 'Data Extract': 440, 'Filter': 303 };
    const actTypeId = ACT_TYPE_ID[act._type];
    const actObjId = act.queryDefinitionId || act.id || act.objectId || '';
    const sfmcUrl = (actTypeId && actObjId)
        ? `https://${instance}.exacttarget.com/cloud/#app/Automation%20Studio/AutomationStudioFuel3/%23ActivityDetails/${actTypeId}/${actObjId}`
        : null;

    let contentBlock = '';
    if (!loading) {
        const queryText = merged.queryText || merged.query || '';
        const scriptText = merged.script || merged.scriptText || merged.content || '';
        const preStyle = `font-family:monospace;font-size:12px;color:var(--s-text-2);background:var(--s-bg-2);border:1px solid var(--s-border);padding:10px 12px;border-radius:6px;overflow-x:auto;white-space:pre-wrap;max-height:320px;overflow-y:auto;margin:0;line-height:1.6;`;
        const labelStyle = `font-size:10px;color:var(--s-text-3);margin-top:12px;margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;`;
        if (act._type === 'SQL Query' && queryText) {
            contentBlock = `<div style="${labelStyle}">SQL Query</div><pre style="${preStyle}">${escHtml(queryText)}</pre>`;
        } else if (act._type === 'Script' && scriptText) {
            contentBlock = `<div style="${labelStyle}">Script (SSJS)</div><pre style="${preStyle}">${escHtml(scriptText)}</pre>`;
        } else if (act._type === 'Send Email') {
            const emailName = merged.email ? (merged.email.name || merged.email.emailName || '') : (merged.emailName || '');
            const listName = merged.list ? (merged.list.listName || merged.list.name || '') : '';
            const fromName = merged.fromName || merged.senderName || '';
            const fromEmail = merged.fromEmail || merged.senderEmail || '';
            if (emailName || listName || fromName) {
                contentBlock = `<div style="${labelStyle}">Send Email Details</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:12px;margin-top:4px;">
${emailName ? `<div><span style="color:var(--s-text-3)">Email</span><br><span style="color:var(--s-text-2);">${escHtml(emailName)}</span></div>` : ''}
${listName ? `<div><span style="color:var(--s-text-3)">List</span><br><span style="color:var(--s-text-2);">${escHtml(listName)}</span></div>` : ''}
${fromName ? `<div><span style="color:var(--s-text-3)">From Name</span><br><span style="color:var(--s-text-2);">${escHtml(fromName)}</span></div>` : ''}
${fromEmail ? `<div><span style="color:var(--s-text-3)">From Email</span><br><span style="color:var(--s-text-2);">${escHtml(fromEmail)}</span></div>` : ''}
</div>`;
            }
        } else if (act._type === 'Import') {
            const sourceType = merged.fileTransferLocation ? merged.fileTransferLocation.name : (merged.sourceObjectName || merged.fileLocation || '');
            const updateType = merged.updateType || merged.updateTypeId || '';
            if (sourceType || updateType) {
                contentBlock = `<div style="${labelStyle}">Import Details</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:12px;margin-top:4px;">
${sourceType ? `<div><span style="color:var(--s-text-3)">File Location</span><br><span style="color:var(--s-text-2);">${escHtml(String(sourceType))}</span></div>` : ''}
${updateType ? `<div><span style="color:var(--s-text-3)">Update Type</span><br><span style="color:var(--s-text-2);">${escHtml(String(updateType))}</span></div>` : ''}
</div>`;
            }
        } else if (act._type === 'Data Extract') {
            const extractType = merged.extractDefinitionType || merged.dataExtractTypeId || '';
            const filePattern = merged.fileSpec || merged.fileNamingPattern || '';
            if (extractType || filePattern) {
                contentBlock = `<div style="${labelStyle}">Data Extract Details</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:12px;margin-top:4px;">
${extractType ? `<div><span style="color:var(--s-text-3)">Extract Type</span><br><span style="color:var(--s-text-2);">${escHtml(String(extractType))}</span></div>` : ''}
${filePattern ? `<div><span style="color:var(--s-text-3)">File Pattern</span><br><span style="color:var(--s-text-2);">${escHtml(String(filePattern))}</span></div>` : ''}
</div>`;
            }
        }
    }

    container.innerHTML = `
<button id="act-back-btn" class="scout-btn scout-btn-secondary" style="margin-bottom:10px;">${I.back} All Activities</button>
<div class="scout-card">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
        <div>
            <span style="font-size:10px;background:var(--s-accent-dim);color:var(--s-accent);padding:1px 6px;border-radius:3px;font-weight:600;">${escHtml(act._type)}</span>
            <div class="scout-card-title" style="margin-top:4px;">${escHtml(act.name||act.Name||'—')}</div>
        </div>
        ${sfmcUrl ? `<a href="${sfmcUrl}" target="_blank" class="scout-btn scout-btn-secondary" style="flex-shrink:0;font-size:11px;">${I.externalLink} Open in SFMC</a>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:12px;margin-top:10px;">
        <div><span style="color:var(--s-text-3)">Key</span><br><span style="font-family:monospace;font-size:11px;color:var(--s-text-2);">${escHtml(key)}</span></div>
        ${target ? `<div><span style="color:var(--s-text-3)">Target DE</span><br><strong style="color:var(--s-text-1);">${escHtml(target)}</strong></div>` : ''}
        ${merged.modifiedDate||merged.lastModifiedDate ? `<div><span style="color:var(--s-text-3)">Modified</span><br>${escHtml(formatDate(merged.modifiedDate||merged.lastModifiedDate))}</div>` : ''}
        ${merged.createdDate ? `<div><span style="color:var(--s-text-3)">Created</span><br>${escHtml(formatDate(merged.createdDate))}</div>` : ''}
        ${merged.description||merged.Description ? `<div style="grid-column:1/-1;"><span style="color:var(--s-text-3)">Description</span><br><span style="color:var(--s-text-2);">${escHtml((merged.description||merged.Description||'').substring(0,200))}</span></div>` : ''}
    </div>
    ${loading ? `<div class="scout-loading-state" style="margin-top:12px;">${I.spinner} Loading details…</div>` : contentBlock}
</div>`;

    document.getElementById('act-back-btn')?.addEventListener('click', () => {
        S.actDetail = null;
        renderActivitiesList(document.getElementById('scout-reports-body'));
    });
}

function renderActivitiesList(container) {
    if (!container) return;
    if (S.actListLoading) {
        container.innerHTML = `<div class="scout-loading-state" style="padding:24px;">${I.spinner} Loading activities…</div>`;
        return;
    }
    if (!S.actList.length) {
        container.innerHTML = `<div class="scout-card" style="margin-bottom:10px;">
<div class="scout-card-title">${I.query} Activities Browser</div>
<div style="font-size:12px;color:var(--s-text-3);margin:4px 0 12px;">Browse all 7 activity types: SQL Queries, Scripts, Filters, Send Emails, Imports, File Transfers &amp; Data Extracts. Click any row to see details and content.</div>
<div class="scout-form-row-flex" style="gap:8px;">
    <button class="scout-btn scout-btn-primary" id="act-load-btn">${I.search} Load Activities</button>
    <button class="scout-btn scout-btn-secondary" id="act-export-btn">${I.report} HTML Report</button>
</div>
<div id="act-load-status" class="scout-status-area"></div>
</div>`;
        document.getElementById('act-load-btn')?.addEventListener('click', () => loadActivitiesForPanel());
        document.getElementById('act-export-btn')?.addEventListener('click', () => generateActivitiesReport(document.getElementById('act-load-status')));
        return;
    }
    const typeOrder = ['SQL Query','Script','Filter','Send Email','Import','File Transfer','Data Extract'];
    const filtered = S.actListFilter === 'all' ? S.actList : S.actList.filter(a => a._type === S.actListFilter);
    const typeCounts = {};
    typeOrder.forEach(t => { typeCounts[t] = S.actList.filter(a => a._type === t).length; });

    container.innerHTML = `
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-bottom:8px;">
    <button class="scout-subnav-btn${S.actListFilter==='all'?' active':''}" data-filter="all" style="font-size:10px;padding:3px 7px;">All (${S.actList.length})</button>
    ${typeOrder.filter(t => typeCounts[t]>0).map(t => `<button class="scout-subnav-btn${S.actListFilter===t?' active':''}" data-filter="${escHtml(t)}" style="font-size:10px;padding:3px 7px;">${escHtml(t.replace(' Query','').replace(' Email',''))} (${typeCounts[t]})</button>`).join('')}
    <div style="flex:1;min-width:4px;"></div>
    <button class="scout-btn scout-btn-secondary" id="act-export-btn" style="font-size:11px;padding:4px 8px;">${I.report} Export</button>
</div>
<div style="overflow-y:auto;max-height:calc(100vh - 230px);" id="act-list">
${filtered.map((a, idx) => {
    const target = getActivityTarget(a);
    return `<div class="scout-result-item" data-act-idx="${idx}" style="cursor:pointer;padding:7px 10px;border-radius:6px;margin-bottom:2px;">
    <div style="display:flex;align-items:center;gap:6px;min-width:0;">
        <span style="flex-shrink:0;font-size:10px;background:var(--s-accent-dim);color:var(--s-accent);padding:1px 5px;border-radius:3px;font-weight:600;">${escHtml(a._type)}</span>
        <span style="font-weight:500;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(a.name||a.Name||'—')}</span>
    </div>
    ${target ? `<div style="font-size:11px;color:var(--s-text-3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(target)}</div>` : ''}
</div>`;
}).join('')}
</div>`;

    container.querySelectorAll('[data-act-idx]').forEach(el => {
        el.addEventListener('click', () => { openActivityDetail(filtered[parseInt(el.dataset.actIdx, 10)]); });
    });
    container.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => { S.actListFilter = btn.dataset.filter; renderActivitiesList(container); });
    });
    document.getElementById('act-export-btn')?.addEventListener('click', () => generateActivitiesReport(null));
}

function renderReportCard(id, title, icon, description, buttons) {
    return `<div class="scout-card" style="margin-bottom:10px;">
<div class="scout-card-title">${icon} ${escHtml(title)}</div>
<div style="font-size:12px;color:var(--s-text-3);margin:4px 0 12px;">${escHtml(description)}</div>
<div class="scout-form-row-flex" style="gap:8px;">${buttons}</div>
<div id="${id}-status" class="scout-status-area"></div>
</div>`;
}

function renderReportsView() {
    const cont = document.getElementById('scout-content');
    if (!cont) return;

    const tabs = REPORT_TABS;
    cont.innerHTML = `
<div class="scout-subnav">
    ${tabs.map(t => `<button class="scout-subnav-btn${S.reportsTab === t.id ? ' active' : ''}" data-rtab="${t.id}">${I[t.icon]||''} ${t.label}</button>`).join('')}
</div>
<div id="scout-reports-body"></div>`;

    cont.querySelectorAll('.scout-subnav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            S.reportsTab = btn.dataset.rtab;
            cont.querySelectorAll('.scout-subnav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderReportSubView(document.getElementById('scout-reports-body'));
        });
    });
    renderReportSubView(document.getElementById('scout-reports-body'));
}

function renderReportSubView(container) {
    if (!container) return;
    switch (S.reportsTab) {
        case 'de':
            container.innerHTML = renderReportCard('de-report', 'Data Extensions Report', I.database,
                'Exports all DEs with folder path, row count, field count, sendable status, owner and dates.',
                `<button class="scout-btn scout-btn-primary" style="flex:1;" id="de-report-html">${I.report} View HTML Report</button>
                 <button class="scout-btn scout-btn-secondary" style="flex:1;" id="de-report-csv">${I.download} Export CSV</button>`);
            document.getElementById('de-report-html')?.addEventListener('click', async () => {
                const st = document.getElementById('de-report-status');
                if (st) st.innerHTML = `<div class="scout-loading-state">${I.spinner} Generating…</div>`;
                const logoUrl = await getLogoDataUrl();
                const isLight = S.theme === 'light';
                chrome.runtime.sendMessage({ action: 'generateReport', format: 'html', instance }, res => {
                    if (res && res.success && res.html) {
                        let html = res.html;
                        // Inject logo into DE report header
                        if (logoUrl) {
                            html = html.replace(
                                '<h1 class="report-title">',
                                `<img src="${logoUrl}" style="width:28px;height:28px;border-radius:6px;object-fit:contain;flex-shrink:0;" alt="SFMC Scout"><h1 class="report-title">`
                            );
                        }
                        // Apply current theme to DE report by injecting overriding style block
                        if (isLight) {
                            const lightOverride = `<style>:root{--bg:#F3F2F2!important;--bg2:#FFFFFF!important;--surface:#FFFFFF!important;--surf2:#F9F8F7!important;--border:rgba(0,0,0,0.08)!important;--border2:rgba(0,0,0,0.12)!important;--text:#032D60!important;--text2:#3E3E3C!important;--text3:#706E6B!important;--accent:#0176D3!important;--success:#04844B!important;--error:#C23934!important;}</style>`;
                            html = html.replace('</head>', lightOverride + '</head>');
                        }
                        openBlobReport(html);
                        if (st) st.innerHTML = `<span class="scout-status-success">${I.check} ${res.count} DEs exported.</span>`;
                    } else {
                        if (st) st.innerHTML = `<span class="scout-status-error">Failed: ${escHtml((res&&res.error)||'Unknown')}</span>`;
                    }
                });
            });
            document.getElementById('de-report-csv')?.addEventListener('click', () => {
                const st = document.getElementById('de-report-status');
                if (st) st.innerHTML = `<div class="scout-loading-state">${I.spinner} Generating…</div>`;
                chrome.runtime.sendMessage({ action: 'generateReport', format: 'csv', instance }, res => {
                    if (res && res.success && res.csv) {
                        const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `sfmc-de-report-${new Date().toISOString().slice(0,10)}.csv`; a.click();
                        URL.revokeObjectURL(url);
                        if (st) st.innerHTML = `<span class="scout-status-success">${I.check} ${res.count} DEs exported to CSV.</span>`;
                    } else {
                        if (st) st.innerHTML = `<span class="scout-status-error">Failed: ${escHtml((res&&res.error)||'Unknown')}</span>`;
                    }
                });
            });
            break;

        case 'automations':
            container.innerHTML = renderReportCard('auto-report', 'Automations Report', I.automation,
                'Exports all automations with status, schedule, step count, key and dates.',
                `<button class="scout-btn scout-btn-primary" id="auto-report-html">${I.report} View HTML Report</button>`);
            document.getElementById('auto-report-html')?.addEventListener('click', () => {
                generateAutomationsReport(document.getElementById('auto-report-status'));
            });
            break;

        case 'journeys':
            container.innerHTML = renderReportCard('journey-report', 'Journeys Report', I.journey,
                'Exports all journeys with status, version, channel, key and dates.',
                `<button class="scout-btn scout-btn-primary" id="journey-report-html">${I.report} View HTML Report</button>`);
            document.getElementById('journey-report-html')?.addEventListener('click', () => {
                generateJourneysReport(document.getElementById('journey-report-status'));
            });
            break;

        case 'assets':
            container.innerHTML = renderReportCard('asset-report', 'Assets Report', I.asset,
                'Exports all Content Builder assets with type, folder, owner and dates.',
                `<button class="scout-btn scout-btn-primary" id="asset-report-html">${I.report} View HTML Report</button>`);
            document.getElementById('asset-report-html')?.addEventListener('click', () => {
                generateAssetsReport(document.getElementById('asset-report-status'));
            });
            break;

        case 'activities':
            if (S.actDetail) {
                renderActivityDetail(container);
            } else {
                renderActivitiesList(container);
            }
            break;
    }
}

// ============================================================
//  VIEW CONTROLLER
// ============================================================
function renderCurrentView() {
    switch (S.tab) {
        case 'search':      renderSearchView(); break;
        case 'automations': renderAutomationsView(); break;
        case 'de':          renderDEToolsView(); break;
        case 'reports':     renderReportsView(); break;
        default:            renderSearchView();
    }
}

function updateTabUI() {
    document.querySelectorAll('.scout-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === S.tab);
    });
    renderCurrentView();
}

// ============================================================
//  UTILS
// ============================================================
function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function formatDate(ds) {
    if (!ds) return '';
    try { return new Date(ds).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (_) { return String(ds); }
}
function formatSchedule(d) {
    let trigger = null;
    if (d.schedule) {
        try { trigger = typeof d.schedule === 'string' ? JSON.parse(d.schedule) : d.schedule; } catch (_) {}
    }
    if (!trigger && Array.isArray(d.automationTriggers)) trigger = d.automationTriggers[0] || null;
    if (!trigger) return null;
    const typeMap = { 0:'Once', 1:'Hourly', 2:'Daily', 3:'Weekly', 4:'Monthly', 5:'Yearly' };
    const freq = typeMap[trigger.scheduleTypeId] || trigger.scheduleTypeName || 'Scheduled';
    const start = trigger.startDate
        ? new Date(trigger.startDate).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
        : null;
    return start ? `${freq} — starts ${start}` : freq;
}
function statusToClass(s) {
    const lower = (s || '').toLowerCase();
    if (['active', 'running', 'scheduled'].includes(lower)) return 'scout-status-active';
    if (['error', 'inactive', 'stopped'].includes(lower)) return 'scout-status-error';
    return 'scout-status-paused';
}

// ============================================================
//  PANEL & TOGGLE SETUP
// ============================================================
function createPanel() {
    if (document.getElementById('scout-panel')) return;

    const savedWidth = parseInt(localStorage.getItem('scout_panel_width') || SCS.PANEL_WIDTH_DEFAULT, 10);

    const panel = document.createElement('div');
    panel.id = 'scout-panel';
    panel.style.width = Math.min(Math.max(savedWidth, SCS.PANEL_WIDTH_MIN), SCS.PANEL_WIDTH_MAX) + 'px';
    panel.innerHTML = buildPanelHTML();
    document.body.appendChild(panel);

    const aboutOverlay = buildAboutModal();
    document.body.appendChild(aboutOverlay);

    // Toggle button: chevron top, logo + "Scout" below
    const toggle = document.createElement('button');
    toggle.id = 'scout-toggle';
    toggle.setAttribute('aria-label', 'Toggle SFMC Scout panel');
    toggle.innerHTML = `
        <svg class="scout-toggle-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6L9 12L15 18"/></svg>
        <img src="${chrome.runtime.getURL('icons/icon-48.png')}" class="scout-toggle-logo" alt="">
        <span class="scout-toggle-label">Scout</span>`;
    toggle.addEventListener('click', togglePanel);
    document.body.appendChild(toggle);

    // Resize drag
    setupResizeDrag(panel);

    // Header events
    document.getElementById('scout-close-btn')?.addEventListener('click', togglePanel);
    document.getElementById('scout-theme-btn')?.addEventListener('click', () => {
        S.theme = S.theme === 'dark' ? 'light' : 'dark';
        applyTheme();
        chrome.storage.local.set({ scout_theme: S.theme });
    });
    document.getElementById('scout-about-btn')?.addEventListener('click', () => {
        aboutOverlay.classList.add('open');
    });
    document.getElementById('scout-about-close')?.addEventListener('click', () => {
        aboutOverlay.classList.remove('open');
    });
    aboutOverlay.addEventListener('click', e => {
        if (e.target === aboutOverlay) aboutOverlay.classList.remove('open');
    });
    document.getElementById('scout-recapture-btn')?.addEventListener('click', () => {
        refreshAllTokensWithGhostTabs();
    });


    // Tab clicks
    panel.querySelectorAll('.scout-tab').forEach(t => {
        t.addEventListener('click', () => {
            if (S.tab === t.dataset.tab) return;
            S.tab = t.dataset.tab;
            if (S.tab === 'automations') S.autoDetail = null;
            if (S.tab === 'de') { S.deWizardStep = 1; S.deWizardData = {}; }
            updateTabUI();
        });
    });

    // Keyboard
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && S.open) togglePanel();
        if (e.ctrlKey && e.shiftKey && e.key === 'F') {
            if (!S.open) togglePanel();
            setTimeout(() => {
                const inp = document.getElementById('scout-search-input') || document.getElementById('scout-auto-search');
                inp?.focus();
            }, 150);
        }
    });

    // Load saved theme
    chrome.storage.local.get(['scout_theme'], res => {
        if (res.scout_theme) { S.theme = res.scout_theme; applyTheme(); }
    });
}

function togglePanel() {
    S.open = !S.open;
    const panel = document.getElementById('scout-panel');
    if (!panel) return;
    panel.classList.toggle('scout-open', S.open);
    const tog = document.getElementById('scout-toggle');
    if (tog) {
        tog.classList.toggle('panel-open', S.open);
        document.documentElement.style.setProperty('--scout-panel-w', panel.offsetWidth + 'px');
    }
    if (S.open) {
        loadTokens(() => {
            renderCurrentView();
            updateTokenBadges();
        });
        if (!S.panelOpenedOnce) {
            S.panelOpenedOnce = true;
            // First open: only capture tokens if we don't already have them all
            chrome.runtime.sendMessage({ type: 'GET_TOKENS' }, res => {
                const t = res && res.tokens;
                const captured = t ? [t.cbToken, t.deToken, t.autoToken, t.journeyToken].filter(Boolean).length : 0;
                if (captured < 4) setTimeout(() => refreshAllTokensWithGhostTabs(), 800);
            });
        }
    }
}

function setupResizeDrag(panel) {
    const handle = document.getElementById('scout-resize-handle');
    if (!handle) return;
    let dragging = false;
    let startX = 0;
    let startW = 0;

    handle.addEventListener('mousedown', e => {
        dragging = true;
        startX = e.clientX;
        startW = panel.offsetWidth;
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        const content = panel.querySelector('.scout-content');
        if (content) content.style.pointerEvents = 'none';
        e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
        if (!dragging) return;
        const dx = startX - e.clientX;
        const newW = Math.min(Math.max(startW + dx, SCS.PANEL_WIDTH_MIN), SCS.PANEL_WIDTH_MAX);
        panel.style.width = newW + 'px';
        document.documentElement.style.setProperty('--scout-panel-w', newW + 'px');
    });
    window.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        const content = panel.querySelector('.scout-content');
        if (content) content.style.pointerEvents = '';
        localStorage.setItem('scout_panel_width', panel.offsetWidth);
    });
}

// ============================================================
//  INJECTED SCRIPT RELAY (for Snippet deployment)
// ============================================================
function injectMainScript() {
    try {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = chrome.runtime.getURL('injected_script.js');
        script.onload = () => script.remove();
        (document.head || document.documentElement).appendChild(script);
    } catch (_) {}
}

// ============================================================
//  INIT
// ============================================================
function init() {
    // Register with background
    chrome.runtime.sendMessage({ action: 'registerContentScript' }).catch(() => {});

    // Token capture hooks — passive interception via background webRequest listener
    captureTokensFromDOM();

    // Inject CSS + build panel
    injectStyles();
    createPanel();

    // Inject main script (for Ace editor integration)
    injectMainScript();
}

init();

})(); // end IIFE
