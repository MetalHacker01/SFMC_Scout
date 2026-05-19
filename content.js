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
    eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    image: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15L16 10L5 21"/></svg>',
    clock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7V12L15 14"/></svg>',
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
    _tokenSection: { cb: false, de: false, auto: false, journey: false },
    // Search
    searchQuery: '',
    searchFilter: 'all',   // all | de | automation | journey | email | asset
    searchResults: [],
    searchLoading: false,
    activeSearchPort: null,
    allSearchResults: [],
    // Group keys (e.g. 'de', 'automation') whose result lists are user-expanded
    // beyond the default top-N. Reset every new search.
    searchExpandedGroups: new Set(),
    // Journey IDs whose inline detail card is currently expanded (shared
    // between main search rows and DE Usage journey rows — expanding in one
    // shows the card in both).
    journeyExpanded: new Set(),
    journeyDetailState: new Map(), // journeyId → { state, evDef, error }
    // Same pattern for asset/email/template rows in main search. Expanded
    // state opens an inline detail card; the Preview button inside the card
    // pops a modal that loads the rendered-HTML thumbnail.
    assetExpanded: new Set(),
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
    theme: 'light',         // dark | light
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
// Status icons used inline in the toast — small enough to chip-mount cleanly.
// Drawn as currentColor SVGs so the CSS variable theming flows through.
const TOAST_ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17.5v.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/></svg>'
};

function toast(msg, type = 'info', duration = 2000) {
    // The container is appended to <body> (so it never clips against the panel's
    // overflow) but mirrors the panel's theme class so light/dark mode flows
    // through via CSS variables. Without this mirror, toasts were stuck in
    // dark mode regardless of the panel's actual theme.
    let container = document.getElementById('scout-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'scout-toast-container';
        document.body.appendChild(container);
    }
    container.classList.toggle('scout-light', S.theme === 'light');

    const safeType = TOAST_ICONS[type] ? type : 'info';
    const t = document.createElement('div');
    t.className = 'scout-toast ' + safeType;
    t.innerHTML =
        '<span class="scout-toast-icon" aria-hidden="true">' + TOAST_ICONS[safeType] + '</span>' +
        '<span class="scout-toast-msg"></span>';
    // Set the message via textContent on the inner span to avoid HTML injection
    // from any caller that builds the string from API output.
    t.querySelector('.scout-toast-msg').textContent = msg;
    container.appendChild(t);

    // Fade out before removal so the toast has a smooth exit instead of vanishing.
    const exitMs = 240;
    if (duration > exitMs) {
        setTimeout(() => t.classList.add('scout-toast-leaving'), duration - exitMs);
    }
    setTimeout(() => t.remove(), duration);
}

// ============================================================
//  RUNTIME GUARDS
// ============================================================
// When the extension reloads (during development, or auto-update), any old
// content scripts still injected into open SFMC tabs become orphaned — their
// chrome.runtime object exists but its `id` is null and any sendMessage throws
// "Extension context invalidated". The page-side panel keeps running because
// the DOM is intact, but background-bound calls silently fail. Wrap every
// sendMessage in a guard so the orphan path is a no-op instead of an uncaught
// exception in the console.
function safeSendMessage(payload, cb) {
    try {
        if (!chrome.runtime || !chrome.runtime.id) {
            if (cb) cb(null);
            return;
        }
        chrome.runtime.sendMessage(payload, (res) => {
            // Swallow chrome.runtime.lastError too — accessing it suppresses Chrome's
            // "Unchecked runtime.lastError" console nag.
            void chrome.runtime.lastError;
            if (cb) cb(res);
        });
    } catch (_) {
        if (cb) cb(null);
    }
}
function safeConnect(name) {
    try {
        if (!chrome.runtime || !chrome.runtime.id) return null;
        return chrome.runtime.connect({ name });
    } catch (_) { return null; }
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
 * Refresh tokens — no longer opens ghost tabs. Read APIs use the cookie-only
 * /cloud/fuelapi/ proxy on mc.{stack}.exacttarget.com and don't need section
 * tokens. FETCH_CSRF still runs to populate the DE/admin slot for the remaining
 * write paths (DE create, field update). Section tokens (CB/Auto/Journey) are
 * captured passively by the webRequest listener as the user navigates SFMC.
 */
function refreshAllTokensWithGhostTabs(silent = false) {
    if (!instance) { if (!silent) toast('No SFMC instance detected', 'warning'); return; }

    const badge = document.getElementById('scout-badge-token');
    if (badge) {
        badge.className = 'scout-token-badge loading';
        badge.innerHTML = '<span class="scout-token-dot"></span> Checking…';
    }

    safeSendMessage({ type: 'FETCH_CSRF', instance }, (res) => {
        S.sessionOk = !!(res && res.sessionOk);
        loadTokens(() => {
            updateTokenBadges();
            if (silent) return;
            if (S.sessionOk) {
                toast('Session active — SFMC reachable', 'success');
            } else if (res && res.hint) {
                toast(res.hint, 'warning');
            } else if (!res) {
                // No response = orphaned content script after extension reload. Reload the page.
                toast('Extension reloaded — refresh this SFMC tab', 'warning');
            } else {
                toast('Could not reach SFMC — open an SFMC tab and sign in', 'error');
            }
        });
    });
}

function loadTokens(cb) {
    safeSendMessage({ type: 'GET_TOKENS_DETAILED' }, res => {
        if (res && res.success && res.tokens) {
            const t = res.tokens;
            // Functional tokens — fallbacks kept for API calls
            S.pageHookToken = t.cb.value;
            S.appcoreToken  = t.admin.value;
            S.deToken       = t.de.value      || t.admin.value || null;
            S.autoToken     = t.auto.value    || t.admin.value || null;
            S.journeyToken  = t.journey.value || t.admin.value || null;
            // Section-specific flags — used by badge.
            // Auto and Journey accept adminToken as valid fallback (confirmed to work).
            // CB and DE need their own tokens (CB via pageToken, DE via FETCH_CSRF).
            S._tokenSection = {
                cb:      !!t.cb.value,
                de:      !!t.de.value,
                auto:    !!(t.auto.value || t.admin.value),
                journey: !!(t.journey.value || t.admin.value)
            };
        }
        updateTokenBadges();
        if (cb) cb();
    });
}

function updateTokenBadges() {
    const badge = document.getElementById('scout-badge-token');
    if (!badge) return;
    // Reads APIs go through the cookie-only /cloud/fuelapi/ proxy. The badge now
    // reflects "is there an active SFMC session reachable from this browser" —
    // which is the only thing the panel cares about. CSRF tokens are still
    // captured passively for the few write endpoints, but they aren't a
    // user-actionable state anymore so we don't surface a per-section count.
    let cls, text;
    if (S.sessionOk === true) {
        cls = 'ok'; text = 'Session';
    } else if (S.sessionOk === false) {
        cls = 'missing'; text = 'No Session';
    } else {
        cls = 'loading'; text = 'Session';
    }
    badge.className = 'scout-token-badge ' + cls;
    badge.innerHTML = '<span class="scout-token-dot"></span> ' + text;
}

function applyTheme() {
    const panel = document.getElementById('scout-panel');
    const toggle = document.getElementById('scout-toggle');
    const btn = document.getElementById('scout-theme-btn');
    const overlay = document.getElementById('scout-about-overlay');
    const toastContainer = document.getElementById('scout-toast-container');
    const isLight = S.theme === 'light';
    if (panel) panel.classList.toggle('scout-light', isLight);
    if (toggle) toggle.classList.toggle('scout-light', isLight);
    if (overlay) overlay.classList.toggle('scout-light', isLight);
    // Toast container is appended to <body>, not the panel, so it needs its own
    // theme-class sync to flip alongside the panel.
    if (toastContainer) toastContainer.classList.toggle('scout-light', isLight);
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
            <span id="scout-badge-token" class="scout-token-badge loading" title="Click to verify SFMC session" style="cursor:pointer;"><span class="scout-token-dot"></span> Session</span>
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

// ─── Journey row helpers ────────────────────────────────────────────────────
// Colour code journey status the way Journey Builder's own UI does: greens for
// active / scheduled, neutral for draft, red for stopped, amber for unpublished
// changes. Anything unknown falls through to a neutral grey.
const JOURNEY_STATUS_COLOR = {
    'Published':         '#04844b',
    'Running':           '#04844b',
    'ScheduledToRun':    '#0176d3',
    'ScheduledToPublish':'#0176d3',
    'Stopped':           '#c23934',
    'Deleted':           '#c23934',
    'Paused':            '#b06f00',
    'Unpublished':       '#b06f00',
    // Draft = amber to match the Activity Report's Draft pill and SFMC's own
    // JB UI (was grey before — felt washed-out next to active/stopped).
    'Draft':             '#b06f00'
};
function getJourneyStatusColor(status) {
    return JOURNEY_STATUS_COLOR[status] || '#64748b';
}

// Build the pill row that sits under a journey's name. Used in both the main
// search results panel and the DE Usage "Used by → journeys" list.
//   variant: 'search' (more pills) | 'usage' (compact)
function renderJourneyPills(j, variant) {
    const out = [];
    if (j.status) {
        const c = getJourneyStatusColor(j.status);
        out.push(`<span class="scout-jp" style="background:${c}20;color:${c};border:1px solid ${c}40">${escHtml(j.status)}</span>`);
    }
    if (j.version) out.push(`<span class="scout-jp">v${escHtml(String(j.version))}</span>`);
    if (j.isHTS)   out.push(`<span class="scout-jp" style="background:#0176d320;color:#0176d3;border:1px solid #0176d340" title="High-Throughput Sending">HTS</span>`);
    if (variant === 'search') {
        if (j.channel)        out.push(`<span class="scout-jp">${escHtml(j.channel)}</span>`);
        if (j.definitionType) out.push(`<span class="scout-jp">${escHtml(j.definitionType)}</span>`);
        if (j.triggerType)    out.push(`<span class="scout-jp" style="opacity:0.85">${escHtml(j.triggerType)}</span>`);
    }
    return out.length ? `<div class="scout-jpills">${out.join('')}</div>` : '';
}

// Module-scoped event-definition cache. Keyed by eventDefinitionId.
// Survives across multiple expands within the same SW lifetime.
const _evDefCache = new Map();
// Interaction-detail cache, keyed by `${journeyId}::${version}`. Replaces
// the older goal-stats approach for activity count — `interactions/{id}?extras=all`
// returns the full activities[] array directly, which is what SFMC's UI counts.
const _interactionDetailCache = new Map();

function fetchJourneyEventDef(eventDefinitionId, instance) {
    if (!eventDefinitionId) return Promise.resolve(null);
    if (_evDefCache.has(eventDefinitionId)) {
        return Promise.resolve(_evDefCache.get(eventDefinitionId));
    }
    return new Promise(resolve => {
        const cb = (resp) => {
            if (chrome.runtime.lastError) { resolve(null); return; }
            if (resp && resp.success && resp.data) {
                _evDefCache.set(eventDefinitionId, resp.data);
                resolve(resp.data);
            } else {
                resolve(null);
            }
        };
        try {
            chrome.runtime.sendMessage(
                { action: 'fetchJourneyEventDefinition', eventDefinitionId, instance },
                cb
            );
        } catch (_) { resolve(null); }
    });
}

// Audit-log fetcher + cache. The endpoint returns the full lifecycle of
// edits (Create / Modify / Publish) — used to populate the timeline modal
// reachable from the journey detail card's "Audit Log" link.
const _journeyAuditCache = new Map(); // interactionId → audit response

function fetchJourneyAuditLog(interactionId, instance) {
    if (!interactionId) return Promise.resolve(null);
    if (_journeyAuditCache.has(interactionId)) {
        return Promise.resolve(_journeyAuditCache.get(interactionId));
    }
    return new Promise(resolve => {
        try {
            chrome.runtime.sendMessage(
                { action: 'fetchJourneyAuditLog', interactionId, instance },
                (resp) => {
                    if (chrome.runtime.lastError) { resolve(null); return; }
                    if (resp && resp.success && resp.data) {
                        _journeyAuditCache.set(interactionId, resp.data);
                        resolve(resp.data);
                    } else { resolve(null); }
                }
            );
        } catch (_) { resolve(null); }
    });
}

// Build a humanized timestamp like "May 19, 2026 · 10:31 AM" from an ISO
// string. Used in the audit timeline.
function formatAuditTime(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${date} · ${time}`;
    } catch (_) { return iso; }
}

// Pops a modal with a chronological timeline of audit entries. Uses the same
// `.scout-preview-overlay` / `.scout-preview-modal` shell as the asset
// preview modal — backdrop blur, scale-in, Esc + click-outside to close.
function showJourneyAuditModal(interactionId, journeyName) {
    if (document.querySelector('.scout-preview-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'scout-preview-overlay';
    _mirrorPanelTheme(overlay);
    overlay.innerHTML = `
        <div class="scout-preview-modal scout-audit-modal">
            <div class="scout-preview-head">
                <div class="scout-preview-title">${I.clock} ${escHtml(journeyName || 'Audit Log')}</div>
                <button class="scout-preview-close" aria-label="Close">${I.close}</button>
            </div>
            <div class="scout-preview-body scout-audit-body" id="scout-audit-body">
                <div class="scout-preview-loading">${I.spinner}<span>Loading audit log…</span></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
        overlay.classList.add('scout-preview-out');
        setTimeout(() => overlay.remove(), 150);
        document.removeEventListener('keydown', onKey);
    };
    function onKey(e) { if (e.key === 'Escape') close(); }
    overlay.querySelector('.scout-preview-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);

    fetchJourneyAuditLog(interactionId, getCurrentInstance()).then(data => {
        const body = document.getElementById('scout-audit-body');
        if (!body) return;
        const items = (data && Array.isArray(data.items)) ? data.items : [];
        if (!items.length) {
            body.innerHTML = `<div class="scout-preview-error">No audit log entries found.</div>`;
            return;
        }
        body.innerHTML = renderJourneyAuditTimeline(items);
    });
}

// Color-coded by action. SFMC's documented audit-log action enum is exactly
// these five values (lowercase in the query param, capitalized in responses):
//   create, modify, publish, unpublish, delete
// The endpoint blurb mentions "activation, deactivation, stopping, and
// deletion" conceptually but does NOT expose those as distinct actions —
// publish/unpublish + the journey's runtime status field are the only signals.
function renderJourneyAuditTimeline(items) {
    // Items already arrive newest-first from the API. Keep that order.
    const ACTION_COLOR = {
        'Create':    '#0176d3', // accent blue — initial creation
        'Modify':    '#64748b', // neutral slate — definition edits
        'Publish':   '#04844b', // success green (overridden to red on Failed)
        'Unpublish': '#b06f00', // amber — definition pulled from runtime
        'Delete':    '#c23934'  // danger red — journey removed
    };
    // Aggregate summary at the top: total events + counts by action +
    // unique editors. Gives the user a quick read before they scroll.
    const counts = {};
    const users = new Set();
    for (const it of items) {
        const a = it.action || 'Other';
        counts[a] = (counts[a] || 0) + 1;
        if (it.user && it.user.name) users.add(it.user.name);
    }
    const summaryPills = Object.entries(counts).map(([action, n]) => {
        const c = ACTION_COLOR[action] || '#64748b';
        return `<span class="scout-audit-pill" style="background:color-mix(in oklab, ${c} 15%, transparent); color:${c}; border:1px solid color-mix(in oklab, ${c} 35%, transparent)">${n} ${escHtml(action)}</span>`;
    }).join('');
    const summary = `<div class="scout-audit-summary">
        <div class="scout-audit-summary-row">${summaryPills}</div>
        <div class="scout-audit-summary-meta">${items.length} event${items.length === 1 ? '' : 's'} · ${users.size} editor${users.size === 1 ? '' : 's'}</div>
    </div>`;

    const rows = items.map(it => {
        const action = it.action || 'Other';
        const c = ACTION_COLOR[action] || '#64748b';
        const user = (it.user && it.user.name) || '—';
        const when = formatAuditTime(it.timeStamp);
        const ver = it.versionNumber ? `v${it.versionNumber}` : '';
        // Publish events carry an extra status (PublishCompleted, PublishFailed)
        // — render as a sub-pill so the user sees succeeded vs failed at a glance.
        const isFailed = it.publishStatus && /fail|error/i.test(it.publishStatus);
        const statusColor = isFailed ? '#c23934' : c;
        const statusPill = it.publishStatus
            ? `<span class="scout-audit-status" style="color:${statusColor}; border-color:${statusColor}">${escHtml(it.publishStatus)}</span>`
            : '';
        return `<div class="scout-audit-item">
            <div class="scout-audit-dot" style="background:${c}"></div>
            <div class="scout-audit-body-cell">
                <div class="scout-audit-line1">
                    <span class="scout-audit-action" style="color:${c}">${escHtml(action)}</span>
                    ${ver ? `<span class="scout-audit-ver">${ver}</span>` : ''}
                    ${statusPill}
                </div>
                <div class="scout-audit-line2">
                    <span class="scout-audit-user">${escHtml(user)}</span>
                    <span class="scout-audit-when">${escHtml(when)}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    return `${summary}<div class="scout-audit-timeline">${rows}</div>
        <div class="scout-audit-note">
            SFMC's audit log has no <code>activate</code> action. The most recent <code>Modify</code> or <code>Publish</code> is usually the activator — once a journey is activated its current version is locked from edits.
        </div>`;
}

function fetchJourneyInteractionDetail(interactionId, versionNumber, instance) {
    if (!interactionId) return Promise.resolve(null);
    const cacheKey = `${interactionId}::${versionNumber || 1}`;
    if (_interactionDetailCache.has(cacheKey)) {
        return Promise.resolve(_interactionDetailCache.get(cacheKey));
    }
    return new Promise(resolve => {
        const cb = (resp) => {
            if (chrome.runtime.lastError) { resolve(null); return; }
            if (resp && resp.success && resp.data) {
                _interactionDetailCache.set(cacheKey, resp.data);
                resolve(resp.data);
            } else { resolve(null); }
        };
        try {
            chrome.runtime.sendMessage(
                { action: 'fetchJourneyInteractionDetail', interactionId, versionNumber, instance },
                cb
            );
        } catch (_) { resolve(null); }
    });
}

// Count user-built activities from the interaction's activities array.
// SFMC's "Activity Count" badge counts entries with a non-empty `type` field
// (unconfigured/placeholder activities have no type and are excluded).
function extractInteractionActivityCount(detail) {
    if (!detail || !Array.isArray(detail.activities)) return null;
    let count = 0;
    for (const a of detail.activities) {
        if (a && a.type) count++;
    }
    return count;
}

// Pretty-print the schedule fields the eventDefinition exposes. Mirrors what
// SFMC's UI renders. IMPORTANT: do NOT short-circuit on
// `metaData.scheduleState === 'No Schedule'` — that field lies. Even a
// fully-configured recurring schedule (Hourly INTERVAL=1, UNTIL=...) has
// scheduleState='No Schedule' alongside fully-populated `schedule` data.
// The signal that there IS a schedule is the presence of `schedule.frequency`
// or `schedule.startDateTime`, NOT the scheduleState text.
function humanizeJourneySchedule(evDef) {
    if (!evDef) return null;
    const meta = evDef.metaData || {};
    const sched = evDef.schedule || {};
    const flowMode = meta.scheduleFlowMode || '';
    const runOnceMode = meta.runOnceScheduleMode || '';

    const hasFreq = !!sched.frequency;
    const hasStart = !!sched.startDateTime;

    if (!hasFreq && !hasStart && flowMode !== 'runOnce' && flowMode !== 'recurring') {
        return null;  // genuinely no schedule
    }

    const tz = sched.timeZone || '';
    const fmtStart = hasStart ? formatJourneyDateTime(sched.startDateTime) : null;
    const fmtEnd   = sched.endDateTime ? formatJourneyDateTime(sched.endDateTime) : null;

    // Recurring schedule: frequency present OR flowMode says so.
    if (flowMode === 'recurring' || hasFreq) {
        const freq = (sched.frequency || 'Recurring');
        const interval = sched.interval || 1;
        let title;
        if (interval === 1) {
            title = freq;  // "Hourly", "Daily", "Weekly" etc.
        } else {
            // "Hourly" → "hour", "Daily" → "day", "Weekly" → "week", "Monthly" → "month"
            const unit = freq.toLowerCase().replace(/ly$/, '');
            const unitNorm = unit === 'dai' ? 'day' : unit;
            title = `Every ${interval} ${unitNorm}s`;
        }

        const parts = [];
        if (fmtStart) parts.push(`Start: ${fmtStart}`);
        if (sched.endType === 'EndDate' && fmtEnd) {
            parts.push(`End: ${fmtEnd}`);
        } else if (sched.endType === 'Occurrences' && sched.occurrences) {
            parts.push(`${sched.occurrences} occurrence${sched.occurrences === 1 ? '' : 's'}`);
        }
        if (tz) parts.push(tz);

        return { title, detail: parts.join(' · ') };
    }

    // One-time schedule.
    if (flowMode === 'runOnce' || hasStart) {
        const lead = runOnceMode === 'immediate' ? 'Run Once · Immediately' : 'One-Time Schedule';
        return {
            title: lead,
            detail: fmtStart ? `Run On: ${fmtStart}${tz ? ' ' + tz : ''}` : ''
        };
    }

    return null;
}

// SFMC schedule dates are ISO. Show as e.g. "8/15/2025 10:30 AM".
function formatJourneyDateTime(iso) {
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleString('en-US', {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    } catch (_) { return iso; }
}

// Build the inline detail card under an expanded journey row. `state` is the
// per-id entry from S.journeyDetailState. The card shows entry source DE,
// schedule, external key, and linked automation — plus an "Open in JB" link.
function renderJourneyDetail(j, state) {
    const stage = state ? state.state : 'idle';
    const evDef = state ? state.evDef : null;
    let inner = '';
    if (stage === 'loading') {
        inner = `<div class="scout-jdetail-row scout-jdetail-loading">${I.spinner || ''} Loading event definition…</div>`;
    } else if (stage === 'error') {
        inner = `<div class="scout-jdetail-row scout-jdetail-error">Couldn't load event definition${state && state.error ? `: ${escHtml(state.error)}` : ''}.</div>`;
    } else if (stage === 'loaded') {
        const actCnt = state && typeof state.activityCount === 'number' ? state.activityCount : null;
        // Population from the search payload (j.stats.cumulativePopulation) —
        // no extra fetch. cumulativePopulation is the total contacts that
        // have entered the journey across all time.
        const popCnt = j.stats && typeof j.stats.cumulativePopulation === 'number'
            ? j.stats.cumulativePopulation : null;

        // ── Stat strip ──
        const stats = [];
        if (actCnt !== null) {
            stats.push(`<div class="scout-jdetail-stat">
                <span class="scout-jdetail-stat-num">${actCnt}</span>
                <span class="scout-jdetail-stat-label">${actCnt === 1 ? 'Activity' : 'Activities'}</span>
            </div>`);
        }
        if (popCnt !== null) {
            stats.push(`<div class="scout-jdetail-stat">
                <span class="scout-jdetail-stat-num">${popCnt.toLocaleString()}</span>
                <span class="scout-jdetail-stat-label">Population</span>
            </div>`);
        }
        const statStrip = stats.length
            ? `<div class="scout-jdetail-stats">${stats.join('')}</div>`
            : '';

        // ── Field rows ─ Entry Source / Criteria / Schedule only. No External
        // Key (not useful), no DE ID inside Entry Source, no entryMode anywhere.
        const rows = [];
        const fieldRow = (label, valueHtml) =>
            `<div class="scout-jdetail-row">
                <span class="scout-jdetail-label">${escHtml(label)}</span>
                <span class="scout-jdetail-val">${valueHtml}</span>
            </div>`;

        if (evDef) {
            const deName = evDef.dataExtensionName || j.dataExtensionName || '';
            if (deName || evDef.type) {
                const sourceBits = [];
                if (evDef.type) sourceBits.push(`<span class="scout-jdetail-tag">${escHtml(evDef.type)}</span>`);
                if (deName) sourceBits.push(`<strong class="scout-jdetail-name">${escHtml(deName)}</strong>`);
                rows.push(fieldRow('Entry Source', sourceBits.join(' ')));
            }
            // Entry criteria as a multi-line code block — handles long AND/OR
            // filter expressions with line wrapping.
            const criteria = (evDef.metaData && evDef.metaData.criteriaDescription) || j.triggerDescription || '';
            if (criteria) {
                rows.push(fieldRow('Entry Criteria', `<pre class="scout-jdetail-codeblock">${escHtml(criteria)}</pre>`));
            }
            const sched = humanizeJourneySchedule(evDef);
            if (sched) {
                const detailBit = sched.detail ? `<div class="scout-jdetail-sub">${escHtml(sched.detail)}</div>` : '';
                rows.push(fieldRow('Schedule', `<strong class="scout-jdetail-name">${escHtml(sched.title)}</strong>${detailBit}`));
            }
            if (evDef.description) {
                rows.push(fieldRow('Description', escHtml(evDef.description)));
            }
        } else if (j.triggerDescription) {
            rows.push(fieldRow('Entry Criteria', `<pre class="scout-jdetail-codeblock">${escHtml(j.triggerDescription)}</pre>`));
        }

        inner = `${statStrip}${rows.length ? `<div class="scout-jdetail-rows">${rows.join('')}</div>` : ''}`;
    }
    // Header bar: title + "Audit Log" + "Open in JB" links
    const auditBtn = j.id
        ? `<button class="scout-jdetail-open" data-audit-id="${escHtml(j.id)}" data-audit-name="${escHtml(j.name || '')}" title="View audit log">${I.clock || '⌚'} Audit Log</button>`
        : '';
    const openBtn = j.url
        ? `<button class="scout-jdetail-open" data-jb-url="${escHtml(j.url)}" title="Open in Journey Builder">${I.linkExt || '↗'} Open in JB</button>`
        : '';
    return `<div class="scout-journey-detail" data-jid="${escHtml(j.id)}">
        <div class="scout-jdetail-head">
            <span class="scout-jdetail-headlabel">Journey Details</span>
            <div class="scout-jdetail-head-actions">${auditBtn}${openBtn}</div>
        </div>
        ${inner || '<div class="scout-jdetail-row scout-jdetail-empty">No additional details.</div>'}
    </div>`;
}

// Triggers the eventDef fetch for a journey if needed and re-renders the
// affected detail host(s). `rerenderFn` is whichever renderer (search results
// or DE usage) needs to be refreshed after state changes.
function loadJourneyDetail(j, rerenderFn) {
    if (!j || !j.id) return;
    const existing = S.journeyDetailState.get(j.id);
    if (existing && (existing.state === 'loading' || existing.state === 'loaded')) return;
    S.journeyDetailState.set(j.id, { state: 'loading' });
    rerenderFn && rerenderFn();

    // Fire both in parallel: eventDefinition (entry source DE, schedule,
    // criteria) + interaction detail (activities array → accurate count).
    // Population now comes from the search payload (j.stats.cumulativePopulation)
    // so no third call is needed.
    const instance = getCurrentInstance();
    Promise.allSettled([
        j.eventDefinitionId
            ? fetchJourneyEventDef(j.eventDefinitionId, instance)
            : Promise.resolve(null),
        fetchJourneyInteractionDetail(j.id, j.version || 1, instance)
    ]).then(([evRes, detRes]) => {
        const evDef  = evRes.status === 'fulfilled' ? evRes.value : null;
        const detail = detRes.status === 'fulfilled' ? detRes.value : null;
        const activityCount = extractInteractionActivityCount(detail);
        if (!evDef && !detail) {
            if (!j.eventDefinitionId) {
                S.journeyDetailState.set(j.id, { state: 'loaded', evDef: null, activityCount: null });
            } else {
                S.journeyDetailState.set(j.id, { state: 'error', error: 'No data returned' });
            }
        } else {
            S.journeyDetailState.set(j.id, { state: 'loaded', evDef, activityCount });
        }
        rerenderFn && rerenderFn();
    });
}

function getCurrentInstance() {
    // InstanceService is in utils/; in content.js we read from S or the live
    // hostname. Most call paths pass instance through chrome.runtime.sendMessage,
    // but the EventDefinition fetcher needs it here.
    if (S.instance) return S.instance;
    try {
        const m = window.location.hostname.match(/mc\.(s\d+)\./);
        return m ? `mc.${m[1]}` : 'mc.s51';
    } catch (_) { return 'mc.s51'; }
}
function getTypeLabel(r) {
    if ((r.type === 'asset' || r.type === 'email') && r.assetType) return r.assetType;
    if (r.type === 'activity' && r.activityTypeLabel) return r.activityTypeLabel;
    return TYPE_LABEL[r.type] || (r.type || 'Object');
}

// ─── Asset detail / preview helpers ─────────────────────────────────────────
// Reuses the `.scout-journey-detail` design language (stat strip + mono-uppercase
// labels + accent-tinted chips) so asset and journey cards feel like siblings.

const _assetPreviewCache = new Map(); // assetId → { image, width, height }

function fetchAssetPreview(assetId, assetTypeName, instance) {
    if (_assetPreviewCache.has(assetId)) {
        return Promise.resolve(_assetPreviewCache.get(assetId));
    }
    return new Promise(resolve => {
        try {
            chrome.runtime.sendMessage(
                { action: 'fetchAssetPreview', assetId, assetTypeName, instance },
                (resp) => {
                    if (chrome.runtime.lastError) { resolve(null); return; }
                    if (resp && resp.success && resp.data) {
                        _assetPreviewCache.set(assetId, resp.data);
                        resolve(resp.data);
                    } else { resolve(null); }
                }
            );
        } catch (_) { resolve(null); }
    });
}

// Asset category tree — pulled once per session so we can resolve full folder
// paths ("Content Builder / Email / Test") rather than just the leaf folder
// name. Mirrors the same idea used in CloudPages Maestro for landing pages.
const _assetCategoryCache = new Map(); // id (string) → { id, name, parentId }
let _assetCategoryLoad = null;          // in-flight Promise, dedupe across rows

function ensureAssetCategoryTree(instance) {
    if (_assetCategoryCache.size > 0) return Promise.resolve();
    if (_assetCategoryLoad) return _assetCategoryLoad;
    _assetCategoryLoad = new Promise(resolve => {
        try {
            chrome.runtime.sendMessage(
                { action: 'fetchAssetCategories', instance },
                (resp) => {
                    if (chrome.runtime.lastError) { resolve(); return; }
                    if (resp && resp.success && resp.data && Array.isArray(resp.data.items)) {
                        for (const c of resp.data.items) {
                            if (c && c.id != null) {
                                _assetCategoryCache.set(String(c.id), {
                                    id: c.id, name: c.name, parentId: c.parentId
                                });
                            }
                        }
                    }
                    resolve();
                }
            );
        } catch (_) { resolve(); }
    });
    return _assetCategoryLoad;
}

function buildFolderPath(categoryId, fallbackName) {
    if (!categoryId) return fallbackName || '';
    const segments = [];
    let id = String(categoryId);
    const seen = new Set();
    let safety = 0;
    while (id && id !== '0' && !seen.has(id) && safety < 20) {
        seen.add(id);
        const c = _assetCategoryCache.get(id);
        if (!c) break;
        segments.unshift(c.name);
        id = c.parentId != null ? String(c.parentId) : null;
        safety++;
    }
    if (segments.length === 0) return fallbackName || '';
    return segments.join(' / ');
}

// Classify an asset to decide which detail layout + actions to render.
// Driven by the data we have (presence of publishedURL / legacyId / type name)
// rather than a brittle ID list — SFMC has 200+ asset type IDs.
function getAssetCategory(item) {
    const t = (item.assetTypeName || item.assetType || '').toLowerCase();
    if (item.publishedURL) return 'file';
    if (item.legacyId || t.includes('email')) return 'email';
    if (t === 'template' || t.includes('template')) return 'template';
    if (t.includes('block') || t.includes('snippet') || t.includes('codesnippet')) return 'code';
    return 'other';
}

function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const ASSET_STATUS_COLOR = {
    'Draft':     '#b06f00',
    'Published': '#04844b',
    'Archived':  '#64748b',
    'Deleted':   '#c23934'
};

function renderAssetDetail(item) {
    const cat = getAssetCategory(item);
    const previewable = cat === 'email' || cat === 'template';
    const isFile      = cat === 'file';
    const isImage     = isFile && /^(png|jpe?g|gif|bmp|webp|svg)$/i.test(item.fileExtension || '');

    // Quieter design: NO big stat strip. NO Status / Customer Key rows.
    // Instead, a single subtle inline meta line under the header carries
    // Email ID / Size / Dimensions as small text. Buttons → text links.

    const headBits = [];
    if (item.legacyId) headBits.push(`<span class="scout-adetail-headbit"><span class="scout-adetail-headbit-label">Email ID</span> <code class="scout-adetail-headbit-mono" data-copy="${escHtml(String(item.legacyId))}" title="Click to copy">${escHtml(String(item.legacyId))}</code></span>`);
    if (isFile && item.fileSize) headBits.push(`<span class="scout-adetail-headbit"><span class="scout-adetail-headbit-label">Size</span> ${escHtml(formatFileSize(item.fileSize))}</span>`);
    if (isFile && item.fileWidth && item.fileHeight) headBits.push(`<span class="scout-adetail-headbit"><span class="scout-adetail-headbit-label">Dimensions</span> ${item.fileWidth}×${item.fileHeight}</span>`);
    const headMeta = headBits.length ? `<div class="scout-adetail-headmeta">${headBits.join('')}</div>` : '';

    // ── Field rows — compact, no large pills.
    const rows = [];
    const fieldRow = (label, valueHtml) =>
        `<div class="scout-jdetail-row">
            <span class="scout-jdetail-label">${escHtml(label)}</span>
            <span class="scout-jdetail-val">${valueHtml}</span>
        </div>`;

    if (item.assetType) {
        // Type chip only — no `id N` follower.
        rows.push(fieldRow('Type', `<span class="scout-jdetail-tag">${escHtml(item.assetType)}</span>`));
    }
    // Full folder path resolved from the category cache (built on first expand).
    const folderPath = item.categoryId
        ? buildFolderPath(item.categoryId, item.path)
        : (item.path || '');
    if (folderPath) {
        rows.push(fieldRow('Folder', escHtml(folderPath)));
    }
    if (item.createdDate || item.createdBy) {
        const bits = [];
        if (item.createdBy) bits.push(escHtml(item.createdBy));
        if (item.createdDate) bits.push(formatDate(item.createdDate));
        rows.push(fieldRow('Created', bits.join(' · ')));
    }
    if (item.modifiedDate || item.modifiedBy) {
        const bits = [];
        if (item.modifiedBy) bits.push(escHtml(item.modifiedBy));
        if (item.modifiedDate) bits.push(formatDate(item.modifiedDate));
        rows.push(fieldRow('Modified', bits.join(' · ')));
    }
    if (item.fileName && isFile) {
        rows.push(fieldRow('File Name', `<code class="scout-jdetail-mono scout-jdetail-mono-wide" data-copy="${escHtml(item.fileName)}" title="Click to copy">${escHtml(item.fileName)}</code>`));
    }
    if (item.description) {
        rows.push(fieldRow('Description', escHtml(item.description)));
    }

    // ── Action row — text links, not buttons. Inline separators between.
    const actions = [];
    if (previewable) {
        actions.push(`<a href="#" class="scout-adetail-link" data-action="preview" data-asset-id="${escHtml(String(item.assetId || item.id))}" data-asset-name="${escHtml(item.name || '')}" data-asset-type-name="${escHtml(item.assetTypeName || '')}">${I.eye} Preview</a>`);
    }
    if (isFile && item.publishedURL) {
        actions.push(`<a href="${escHtml(item.publishedURL)}" target="_blank" class="scout-adetail-link" data-action="view-file">${isImage ? I.image : I.externalLink} ${isImage ? 'View image' : 'Open file'}</a>`);
    }
    if (item.name) {
        actions.push(`<a href="#" class="scout-adetail-link" data-action="copy" data-copy="${escHtml(item.name)}">${I.copy} Copy name</a>`);
    }
    const actionRow = actions.length
        ? `<div class="scout-adetail-actions">${actions.join('<span class="scout-adetail-action-sep">·</span>')}</div>`
        : '';

    const headLabel = cat === 'email' ? 'Email'
                    : cat === 'template' ? 'Template'
                    : cat === 'file' ? 'File'
                    : cat === 'code' ? 'Block'
                    : 'Asset';

    return `<div class="scout-asset-detail" data-aid="${escHtml(String(item.assetId || item.id))}">
        <div class="scout-jdetail-head">
            <span class="scout-jdetail-headlabel">${headLabel}</span>
            ${headMeta}
        </div>
        ${rows.length ? `<div class="scout-jdetail-rows">${rows.join('')}</div>` : ''}
        ${actionRow}
    </div>`;
}

// Mirror the panel's theme class onto a body-level overlay (modal lives
// outside #scout-panel, so the --s-* CSS vars otherwise resolve to the
// :root dark defaults regardless of panel theme). Same fix the toast
// container uses.
function _mirrorPanelTheme(overlay) {
    try {
        const panel = document.getElementById('scout-panel');
        if (panel && panel.classList.contains('scout-light')) {
            overlay.classList.add('scout-light');
        }
    } catch (_) {}
}

// Pops a modal with the rendered-HTML thumbnail. Click outside or Escape closes.
function showAssetPreviewModal(assetId, assetName, assetTypeName) {
    // De-dupe in case of double-click
    if (document.querySelector('.scout-preview-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'scout-preview-overlay';
    _mirrorPanelTheme(overlay);
    overlay.innerHTML = `
        <div class="scout-preview-modal">
            <div class="scout-preview-head">
                <div class="scout-preview-title">${escHtml(assetName || 'Preview')}</div>
                <button class="scout-preview-close" aria-label="Close">${I.close}</button>
            </div>
            <div class="scout-preview-body" id="scout-preview-body">
                <div class="scout-preview-loading">${I.spinner}<span>Rendering preview…</span></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
        overlay.classList.add('scout-preview-out');
        setTimeout(() => overlay.remove(), 150);
        document.removeEventListener('keydown', onKey);
    };
    function onKey(e) { if (e.key === 'Escape') close(); }
    overlay.querySelector('.scout-preview-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);

    fetchAssetPreview(assetId, assetTypeName, getCurrentInstance()).then(data => {
        const body = document.getElementById('scout-preview-body');
        if (!body) return;
        if (data && data.image) {
            const src = `data:image/png;base64,${data.image}`;
            body.innerHTML = `<img class="scout-preview-img" src="${src}" alt="${escHtml(assetName || 'Preview')}">`;
        } else {
            body.innerHTML = `<div class="scout-preview-error">Couldn't load preview. The asset may not have a rendered HTML view.</div>`;
        }
    });
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
    const GROUP_COLLAPSE_THRESHOLD = 10;
    let html = '';
    orderedKeys.forEach(key => {
        const groupKey = key === 'data-extension' ? 'de' : key;
        if (seenGroups.has(groupKey)) return;
        seenGroups.add(groupKey);
        const items = key === 'de' ? (grouped['de']||[]).concat(grouped['data-extension']||[]) : (grouped[key]||[]);
        if (!items.length) return;
        const label = groupLabels[key] || key;
        // Groups with more than N items collapse to the first N by default and
        // expand on click — keeps "test" searches scrollable instead of dumping
        // hundreds of rows at once.
        const isExpanded = S.searchExpandedGroups.has(groupKey);
        const showAll = isExpanded || items.length <= GROUP_COLLAPSE_THRESHOLD;
        const visibleItems = showAll ? items : items.slice(0, GROUP_COLLAPSE_THRESHOLD);
        const hiddenCount = items.length - visibleItems.length;
        html += `<div class="scout-group-label">${escHtml(label)} <span class="scout-group-count">${items.length}</span></div>`;
        visibleItems.forEach(({ r, idx }) => {
            const color = getTypeColor(r.type);
            const icon = getTypeIcon(r.type);
            const name = escHtml(r.name || r.Name || 'Unnamed');
            const isAssetLike = r.type === 'asset' || r.type === 'email';
            const isJourney   = r.type === 'journey';
            const meta1 = [];
            const meta2 = [];
            let pillsHtml = '';
            if (isAssetLike) {
                // Line 1: type · folder · modified · asset ID  (+ Email ID for emails)
                if (r.assetType) meta1.push(escHtml(r.assetType));
                if (r.path) meta1.push(escHtml(r.path));
                if (r.modifiedDate) meta1.push(formatDate(r.modifiedDate));
                if (r.assetId) meta1.push(`ID: ${escHtml(String(r.assetId))}`);
                if (r.legacyId) meta1.push(`Email ID: ${escHtml(String(r.legacyId))}`);
                // Line 2: created by · created date
                if (r.createdBy) meta2.push(`${escHtml(r.createdBy)}`);
                if (r.createdDate) meta2.push(formatDate(r.createdDate));
            } else if (isJourney) {
                // Pills row: Status · vN · HTS · channel · definitionType · trigger
                pillsHtml = renderJourneyPills(r, 'search');
                // Single meta line: modified date only. External key + entryMode
                // dropped — neither is information the user actually scans for
                // in the row preview.
                if (r.modifiedDate) meta1.push(formatDate(r.modifiedDate));
            } else if (r.type === 'activity') {
                // Line 1: type · folder breadcrumb · update mode (SQL/Import/Extract)
                // Line 2: modified date
                if (r.activityTypeLabel) meta1.push(escHtml(r.activityTypeLabel));
                if (r.path) meta1.push(escHtml(r.path));
                if (r.updateType) {
                    meta1.push(`<span class="scout-result-row-pill" title="Update mode">${escHtml(r.updateType)}</span>`);
                }
                if (r.modifiedDate) meta2.push(formatDate(r.modifiedDate));
            } else {
                if (r.path) meta1.push(escHtml(r.path));
                if (r.modifiedDate) meta1.push(formatDate(r.modifiedDate));
            }
            const isExpandedJourney = isJourney && S.journeyExpanded.has(r.id);
            const isExpandedAsset   = isAssetLike && S.assetExpanded.has(r.id);
            const isExpanded        = isExpandedJourney || isExpandedAsset;
            const arrowIcon = (isJourney || isAssetLike)
                ? (isExpanded ? I.chevDown : I.chevRight)
                : I.chevRight;
            html += `<div class="scout-result-row${isExpanded ? ' scout-result-row-expanded' : ''}" data-idx="${idx}" data-type="${escHtml(r.type||'')}">
                <div class="scout-result-type-icon" style="background:${color}20;color:${color}">${icon}</div>
                <div class="scout-result-info">
                    <div class="scout-result-row-name">${name}</div>
                    ${pillsHtml}
                    ${meta1.length ? `<div class="scout-result-row-meta">${meta1.join(' · ')}</div>` : ''}
                    ${meta2.length ? `<div class="scout-result-row-meta" style="font-size:10px;color:var(--s-text-3);margin-top:1px;">${meta2.join(' · ')}</div>` : ''}
                </div>
                <span class="scout-result-row-arrow">${arrowIcon}</span>
            </div>`;
            if (isExpandedJourney) {
                html += renderJourneyDetail(r, S.journeyDetailState.get(r.id));
            } else if (isExpandedAsset) {
                html += renderAssetDetail(r);
            }
        });
        if (hiddenCount > 0) {
            html += `<div class="scout-group-expand" data-group="${escHtml(groupKey)}" role="button" tabindex="0">${I.chevRight} Show all ${items.length} ${escHtml(label.toLowerCase())} <span class="scout-group-expand-hint">(+${hiddenCount} more)</span></div>`;
        }
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
    cont.querySelectorAll('.scout-group-expand').forEach(el => {
        const expand = () => {
            const groupKey = el.dataset.group;
            if (!groupKey) return;
            S.searchExpandedGroups.add(groupKey);
            renderSearchResults();
        };
        el.addEventListener('click', expand);
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expand(); }
        });
    });
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
                // Toggle inline detail expand (same pattern as journeys).
                // Copy-name is now a button inside the expanded card.
                if (S.assetExpanded.has(item.id)) {
                    S.assetExpanded.delete(item.id);
                    renderSearchResults();
                } else {
                    S.assetExpanded.add(item.id);
                    // Trigger category tree fetch so the full folder path
                    // resolves. We re-render after it loads.
                    ensureAssetCategoryTree(getCurrentInstance())
                        .then(() => renderSearchResults());
                    renderSearchResults();
                }
            } else if (item.type === 'journey') {
                // Toggle inline detail card. External open is a separate button
                // inside the expanded card.
                if (S.journeyExpanded.has(item.id)) {
                    S.journeyExpanded.delete(item.id);
                    renderSearchResults();
                } else {
                    S.journeyExpanded.add(item.id);
                    loadJourneyDetail(item, renderSearchResults);
                    renderSearchResults();
                }
            } else if (item.url) {
                window.open(item.url, '_blank');
            }
        });
    });
    // ── Journey detail interactions (Open in JB, Audit Log, mono copy) ──
    cont.querySelectorAll('.scout-journey-detail').forEach(card => {
        // Card-header buttons share `.scout-jdetail-open` styling. Dispatch
        // on dataset attribute to tell them apart.
        card.querySelectorAll('.scout-jdetail-open').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (btn.dataset.jbUrl) {
                    window.open(btn.dataset.jbUrl, '_blank');
                } else if (btn.dataset.auditId) {
                    showJourneyAuditModal(btn.dataset.auditId, btn.dataset.auditName);
                }
            });
        });
        card.querySelectorAll('[data-copy]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(el.dataset.copy)
                    .then(() => toast('Copied', 'success'))
                    .catch(() => toast('Copy failed', 'error'));
            });
        });
    });
    // ── Asset detail interactions (Preview, View file, Copy name, mono copy) ──
    cont.querySelectorAll('.scout-asset-detail').forEach(card => {
        card.querySelectorAll('.scout-adetail-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const action = link.dataset.action;
                if (action === 'view-file') return; // <a target=_blank> handles itself
                e.preventDefault();
                e.stopPropagation();
                if (action === 'preview') {
                    showAssetPreviewModal(
                        link.dataset.assetId,
                        link.dataset.assetName,
                        link.dataset.assetTypeName
                    );
                } else if (action === 'copy') {
                    navigator.clipboard.writeText(link.dataset.copy || '')
                        .then(() => toast(`Copied: ${link.dataset.copy}`, 'success'))
                        .catch(() => toast('Copy failed', 'error'));
                }
            });
        });
        // Mono-pill click-to-copy (Email ID, File name)
        card.querySelectorAll('[data-copy]:not(.scout-adetail-link)').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(el.dataset.copy || '')
                    .then(() => toast('Copied', 'success'))
                    .catch(() => toast('Copy failed', 'error'));
            });
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
    S.searchExpandedGroups = new Set();
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
                `https://${instance}.exacttarget.com/cloud/fuelapi/legacy/v1/beta/bulk/automations/automation/definition/${automationId}`,
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
                `https://${instance}.exacttarget.com/cloud/fuelapi/automation/v1/automations/${automationId}?view=targetObjects`,
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
    const url = `https://${instance}.exacttarget.com/cloud/fuelapi/internal/v1/customobjects/${de.id}/fields`;
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
    let usageCounts  = { queries: '...', automations: null, journeys: null };
    let usageData    = { queries: null,   automations: null, journeys: null };
    let usageState   = { queries: 'loading', automations: 'idle', journeys: 'idle' };
    let usageProgress = { automations: null, journeys: null }; // { done, total } during index build
    let usagePort    = { automations: null, journeys: null }; // active streaming port per type
    let usageExpanded = null;
    const usageDiv = () => document.getElementById('scout-de-usage');

    function renderNumDisplay(type) {
        const state = usageState[type];
        if (state === 'idle') return `<span style="font-size:10px;opacity:0.5;letter-spacing:0">Load</span>`;
        if (state === 'loading') {
            const p = usageProgress[type];
            if (!p) return I.spinner;
            // Journeys have a second phase: event definition fetching
            if (typeof p.evTotal === 'number' && p.evTotal > 0) {
                return `<span style="font-size:9px;line-height:1.2">${p.evDone}<br><span style="opacity:0.5">/${p.evTotal}ev</span></span>`;
            }
            return `<span style="font-size:9px;line-height:1.2">${p.done}<br><span style="opacity:0.5">/${p.total}</span></span>`;
        }
        if (state === 'loaded') return usageCounts[type] !== null ? usageCounts[type] : '0';
        if (state === 'error') return `<span style="color:var(--scout-error,#f87171)">!</span>`;
        return I.spinner;
    }

    function renderUsageCounts() {
        const labels = { queries: 'Queries', automations: 'Automations', journeys: 'Journeys' };
        const items = ['queries', 'automations', 'journeys'].map(type => {
            const isActive = usageExpanded === type;
            const showRefresh = usageState[type] === 'loaded';
            return `<button class="scout-stat-item${isActive ? ' active' : ''}" id="scout-stat-btn-${type}" data-usage-type="${type}" style="position:relative;">
                <div class="scout-stat-num" id="scout-stat-num-${type}">${renderNumDisplay(type)}</div>
                <div class="scout-stat-label">${labels[type]}</div>
                <span class="scout-usage-refresh" id="scout-stat-refresh-${type}" data-refresh-type="${type}" title="Refresh" style="position:absolute;top:2px;right:4px;font-size:11px;opacity:0.35;cursor:pointer;line-height:1;${showRefresh ? '' : 'display:none'}">↻</span>
            </button>`;
        }).join('');
        const detail = usageExpanded ? renderUsageDetail(usageExpanded) : '';
        return `<div class="scout-stat-row">${items}</div>${detail ? `<div class="scout-usage-detail">${detail}</div>` : ''}`;
    }

    // Update only the number display for one section — does NOT touch other sections or detail.
    function updateStatNum(type) {
        const numEl = document.getElementById(`scout-stat-num-${type}`);
        if (numEl) numEl.innerHTML = renderNumDisplay(type);
        // Show/hide refresh icon based on state
        const refreshEl = document.getElementById(`scout-stat-refresh-${type}`);
        if (refreshEl) refreshEl.style.display = usageState[type] === 'loaded' ? '' : 'none';
        // Update active class on button
        const btn = document.getElementById(`scout-stat-btn-${type}`);
        if (btn) btn.classList.toggle('active', usageExpanded === type);
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
                    ${sql ? `<pre class="scout-query-sql">${escHtml(sql)}</pre>` : ''}
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
            return items.map((j, ji) => {
                const pills = renderJourneyPills(j, 'usage');
                const trailingBits = [];
                if (j.eventName) trailingBits.push(escHtml(j.eventName));
                if (j.modifiedDate) trailingBits.push(formatDate(j.modifiedDate));
                const isOpen = S.journeyExpanded.has(j.id);
                const arrow = isOpen ? I.chevDown : I.chevRight;
                return `<button class="scout-usage-item scout-usage-item-journey${isOpen ? ' is-open' : ''}" data-jidx="${ji}">
                    <div class="scout-usage-item-main">
                        <span class="scout-usage-item-name">${escHtml(j.name || j.key || '')}</span>
                        ${pills}
                    </div>
                    ${trailingBits.length ? `<span class="scout-usage-item-meta">${trailingBits.join(' · ')}</span>` : ''}
                    <span class="scout-usage-nav-arrow">${arrow}</span>
                </button>${isOpen ? renderJourneyDetail(j, S.journeyDetailState.get(j.id)) : ''}`;
            }).join('');
        }
        return '';
    }

    function bindUsageInteractions() {
        const div = usageDiv();
        if (!div) return;

        // ── Stat buttons ────────────────────────────────────────────────────
        div.querySelectorAll('.scout-stat-item[data-usage-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Don't trigger load when the refresh icon inside the button is clicked
                if (e.target.closest('.scout-usage-refresh')) return;
                const type = btn.dataset.usageType;
                const state = usageState[type];
                if (state === 'idle' || state === 'error') {
                    loadUsageStreaming(type);
                } else if (state === 'loading') {
                    // Cancel in-flight load
                    if (usagePort[type]) { try { usagePort[type].disconnect(); } catch (_) {} usagePort[type] = null; }
                    usageState[type] = 'idle';
                    usageProgress[type] = null;
                    if (usageDiv()) { usageDiv().innerHTML = renderUsageCounts(); bindUsageInteractions(); }
                } else if (state === 'loaded') {
                    usageExpanded = (usageExpanded === type) ? null : type;
                    if (usageDiv()) { usageDiv().innerHTML = renderUsageCounts(); bindUsageInteractions(); }
                }
            });
        });

        // ── Refresh icons ───────────────────────────────────────────────────
        div.querySelectorAll('.scout-usage-refresh[data-refresh-type]').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = icon.dataset.refreshType;
                chrome.runtime.sendMessage({ action: 'invalidateUsageIndex', instance, indexType: type }, () => {
                    usageState[type] = 'idle';
                    usageData[type] = null;
                    usageCounts[type] = null;
                    usageProgress[type] = null;
                    if (usageExpanded === type) usageExpanded = null;
                    if (usageDiv()) { usageDiv().innerHTML = renderUsageCounts(); bindUsageInteractions(); }
                    loadUsageStreaming(type);
                });
            });
        });

        // ── Automation nav links ────────────────────────────────────────────
        div.querySelectorAll('.scout-usage-nav[data-auto-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                S.tab = 'automations';
                updateTabUI();
                openAutomationDetail(btn.dataset.autoId, btn.dataset.autoName);
            });
        });

        // ── Query SQL expand/collapse ───────────────────────────────────────
        div.querySelectorAll('.scout-usage-query-item[data-qidx]').forEach(btn => {
            btn.addEventListener('click', () => {
                const qi = btn.dataset.qidx;
                const detail = document.getElementById('scout-qdetail-' + qi);
                const arrow  = document.getElementById('scout-qarrow-' + qi);
                if (!detail) return;
                const open = detail.style.display !== 'none';
                detail.style.display = open ? 'none' : 'block';
                if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
            });
        });

        // ── DE Usage journey rows: toggle inline detail expand ──────────────
        const rerenderUsageJourneys = () => {
            if (usageDiv()) { usageDiv().innerHTML = renderUsageCounts(); bindUsageInteractions(); }
        };
        div.querySelectorAll('.scout-usage-item-journey[data-jidx]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Buttons inside the expanded detail card (open in JB, copy key,
                // open automation) should not also toggle the row.
                if (e.target.closest('.scout-journey-detail')) return;
                const ji = parseInt(btn.dataset.jidx, 10);
                const j = (usageData.journeys || [])[ji];
                if (!j) return;
                if (S.journeyExpanded.has(j.id)) {
                    S.journeyExpanded.delete(j.id);
                    rerenderUsageJourneys();
                } else {
                    S.journeyExpanded.add(j.id);
                    loadJourneyDetail(j, rerenderUsageJourneys);
                    rerenderUsageJourneys();
                }
            });
        });
        // Journey detail card interactions inside the usage panel
        div.querySelectorAll('.scout-journey-detail').forEach(card => {
            // Both "Open in JB" + "Audit Log" share the same button class —
            // discriminate by dataset attribute. Mirrors the binder used on
            // the main search journey cards.
            card.querySelectorAll('.scout-jdetail-open').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (btn.dataset.jbUrl) {
                        window.open(btn.dataset.jbUrl, '_blank');
                    } else if (btn.dataset.auditId) {
                        showJourneyAuditModal(btn.dataset.auditId, btn.dataset.auditName);
                    }
                });
            });
            card.querySelectorAll('[data-copy]').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(el.dataset.copy)
                        .then(() => toast('Copied', 'success'))
                        .catch(() => toast('Copy failed', 'error'));
                });
            });
        });
    }

    // Queries still load immediately (1 request, instant)
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
            usageState[type] = 'loaded';
            if (usageDiv()) {
                usageDiv().innerHTML = renderUsageCounts();
                bindUsageInteractions();
            }
        });
    };
    loadUsage('queries', 'fetchDEUsageQueries');
    // Automations and journeys are lazy — only load when user clicks their stat button.

    // Streaming load for automations and journeys (on-demand, with live progress)
    const loadUsageStreaming = (type) => {
        if (usageState[type] === 'loading') return;
        usageState[type] = 'loading';
        usageProgress[type] = null;
        updateStatNum(type);

        const portName = type === 'automations' ? 'fetchDEUsageAutomationsStream' : 'fetchDEUsageJourneysStream';
        const port = chrome.runtime.connect({ name: portName });
        usagePort[type] = port;
        port.postMessage({ action: portName, deName: d.name, deKey: d.customerKey || '', deId: d.id, instance });

        port.onMessage.addListener((msg) => {
            if (msg.type === 'progress') {
                // Surgical update — only the number span for this type, other sections untouched
                // Store full message so renderNumDisplay can show event-def phase for journeys
                usageProgress[type] = msg;
                updateStatNum(type);
            } else if (msg.type === 'result') {
                usageData[type] = msg.data;
                usageCounts[type] = msg.data.length;
                usageState[type] = 'loaded';
                usagePort[type] = null;
                updateStatNum(type);
                // If this section is currently expanded, re-render its detail
                if (usageExpanded === type && usageDiv()) {
                    const detailEl = usageDiv().querySelector('.scout-usage-detail');
                    if (detailEl) { detailEl.innerHTML = renderUsageDetail(type); bindUsageInteractions(); }
                    else { usageDiv().innerHTML = renderUsageCounts(); bindUsageInteractions(); }
                }
            } else if (msg.type === 'error') {
                usageState[type] = 'error';
                usageCounts[type] = '!';
                usagePort[type] = null;
                updateStatNum(type);
            }
        });

        port.onDisconnect.addListener(() => {
            usagePort[type] = null;
            if (usageState[type] === 'loading') {
                usageState[type] = 'idle';
                usageProgress[type] = null;
                updateStatNum(type);
            }
        });
    };

    container.innerHTML = `
<div class="scout-detail-header">
    <button class="scout-back-btn" id="scout-back-de">${I.back} Search</button>
    <span class="scout-detail-header-title">${escHtml(d.name)}</span>
</div>
<div class="scout-overview-card">
    <div class="scout-overview-card-header">
        <div class="scout-section-title">Overview</div>
        <div style="display:flex;gap:6px;align-items:center;">
            <span id="scout-de-export-status" style="font-size:11px;color:var(--scout-text-muted);"></span>
            <div style="position:relative;">
                <button class="scout-btn scout-btn-secondary" id="scout-de-export-records">${I.download} Export ${I.chevDown}</button>
                <div id="scout-de-export-menu" style="display:none;position:absolute;right:0;top:calc(100% + 4px);background:var(--scout-bg-panel);border:1px solid var(--scout-border);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:140px;z-index:9999;overflow:hidden;">
                    <button class="scout-export-menu-item" data-fmt="csv">CSV (.csv)</button>
                    <button class="scout-export-menu-item" data-fmt="txt">Tab delimited (.txt)</button>
                </div>
            </div>
        </div>
    </div>
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
    <div id="scout-de-usage" class="scout-usage-row">${renderUsageCounts()}</div>
</div>
<div class="scout-overview-card">
    <div class="scout-overview-card-header">
        <div class="scout-section-title">Fields Schema</div>
        <a href="${sfmcUrl}" target="_blank" class="scout-btn scout-btn-secondary scout-open-sfmc-btn">${I.externalLink} Open in SFMC</a>
    </div>
    ${fieldsHtml}
</div>`;
    container.querySelector('#scout-de-export-records')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('scout-de-export-menu');
        if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
    container.querySelectorAll('.scout-export-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const menu = document.getElementById('scout-de-export-menu');
            if (menu) menu.style.display = 'none';
            const statusEl = document.getElementById('scout-de-export-status');
            exportDERecordsCSV(d.id, d.name, statusEl, item.dataset.fmt);
        });
    });
    document.addEventListener('click', function closeExportMenu() {
        const menu = document.getElementById('scout-de-export-menu');
        if (menu) menu.style.display = 'none';
        document.removeEventListener('click', closeExportMenu);
    });
    container.querySelector('#scout-back-de')?.addEventListener('click', () => {
        S.deDetail = null;
        renderDESearch(container); // renderDESearch restores S.deSearchQuery + S.deSearchResults
    });
}

async function exportDERecordsCSV(deId, deName, statusEl, fmt = 'csv') {
    const PAGE_SIZE = 500;
    const BATCH_SIZE = 5; // parallel requests per batch
    const delimiter = fmt === 'txt' ? '\t' : ',';
    const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

    const fetchPage = (page) => new Promise((resolve, reject) => {
        const url = `https://${instance}.exacttarget.com/cloud/fuelapi/internal/v1/CustomObjectData/${deId}?$page=${page}&$pagesize=${PAGE_SIZE}&preciseDateTime=true&_=${Date.now()}`;
        chrome.runtime.sendMessage({ type: 'MAKE_REQUEST', url, method: 'GET', headers: { 'accept': 'application/json' } }, res => {
            if (!res || !res.ok) return reject(new Error(res?.error || 'Request failed'));
            resolve(res.data);
        });
    });

    try {
        setStatus('Fetching…');
        const first = await fetchPage(1);
        const totalCount = first?.count || 0;

        if (!totalCount) {
            setStatus('No records');
            setTimeout(() => setStatus(''), 3000);
            return;
        }

        let allItems = first.items || [];
        const totalPages = Math.ceil(totalCount / PAGE_SIZE);
        setStatus(`${allItems.length} / ${totalCount}`);

        // Fetch remaining pages in parallel batches
        const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        for (let b = 0; b < remainingPages.length; b += BATCH_SIZE) {
            const batch = remainingPages.slice(b, b + BATCH_SIZE);
            const results = await Promise.all(batch.map(p => fetchPage(p)));
            results.forEach(r => allItems = allItems.concat(r.items || []));
            setStatus(`${allItems.length} / ${totalCount}`);
        }

        // Build CSV — headers from first item keys
        const headers = Object.keys(allItems[0] || {});
        if (!headers.length) { setStatus('No data'); return; }

        const escape = fmt === 'txt'
            ? (v) => String(v ?? '').replace(/\t/g, ' ')   // tabs in values → space for TSV
            : (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csvRows = [
            headers.map(escape).join(delimiter),
            ...allItems.map(item => headers.map(h => escape(item[h])).join(delimiter))
        ];
        const csv = csvRows.join('\n');

        const mimeType = fmt === 'txt' ? 'text/plain' : 'text/csv';
        const blob = new Blob([csv], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${(deName || 'data-extension').replace(/[^a-z0-9_-]/gi, '_')}-records.${fmt}`;
        a.click();
        URL.revokeObjectURL(blobUrl);

        setStatus(`✓ ${allItems.length} rows`);
        setTimeout(() => setStatus(''), 4000);

    } catch (err) {
        setStatus('Error: ' + err.message);
        setTimeout(() => setStatus(''), 5000);
    }
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
    // CSV download now lives inside the generated HTML report (the blob has
    // a "Download CSV" button in its header). Single button here.
    container.innerHTML = `
<div class="scout-card">
    <div class="scout-card-title">${I.report} Generate DE Report</div>
    <div class="scout-form-row-flex" style="gap:8px;margin-top:12px;">
        <button class="scout-btn scout-btn-primary" id="scout-report-html-btn">${I.report} View HTML Report</button>
    </div>
    <div class="scout-form-hint" style="margin-top:8px;font-size:11px;color:var(--s-text-3);">CSV download is available inside the generated report.</div>
    <div id="scout-report-status" class="scout-status-area"></div>
</div>`;

    document.getElementById('scout-report-html-btn')?.addEventListener('click', () => {
        const statusDiv = document.getElementById('scout-report-status');
        if (statusDiv) statusDiv.innerHTML = `<div class="scout-loading-state">${I.spinner} Generating report…</div>`;
        chrome.runtime.sendMessage({ action: 'generateReport', format: 'html', instance, theme: S.theme }, res => {
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

function reportHtmlShell(title, count, instance, rows, columns, extraCss, logoDataUrl, theme, csvData) {
    const ts = new Date().toLocaleString();
    const isLight = (theme || S.theme) === 'light';
    const colHeaders = columns.map(c => `<th data-col="${c.idx}" style="${c.align==='right'?'text-align:right':''}">${escHtml(c.label)}</th>`).join('');
    // CSV download — embed the structured data as JSON in the page so the
    // download button can build the CSV client-side without round-tripping
    // back to the extension. < escape prevents </script> injection.
    const csvSafe = csvData ? JSON.stringify(csvData).replace(/</g, '\\u003c') : 'null';
    const csvFileName = `${title.replace(/[^A-Za-z0-9]+/g, '_')}_${ts.replace(/[^0-9]/g, '').slice(0, 12)}.csv`;
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
#report-csv-btn{display:inline-flex;align-items:center;gap:6px;background:var(--accent);color:#fff;border:none;padding:7px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s;}
#report-csv-btn:hover{opacity:.88;}
#report-csv-btn:active{transform:translateY(1px);}
#report-csv-btn svg{flex-shrink:0;}
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
  ${csvData ? `<button id="report-csv-btn" type="button" title="Download as CSV"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20H18"/><path d="M12 4V16M12 16L15.5 12.5M12 16L8.5 12.5"/></svg>Download CSV</button>` : ''}
</div>
<div class="report-body">
<div class="search-wrap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M20 20L17 17"/></svg>
<input type="text" id="search-input" placeholder="Filter…"></div>
<div class="table-container"><table>
<thead><tr>${colHeaders}</tr></thead>
<tbody>${rows}</tbody>
</table></div></div>
<script>
const _csvData=${csvSafe};
const _csvFileName=${JSON.stringify(csvFileName)};
function _downloadCsv(){
  if(!_csvData)return;
  const escape=v=>{const s=v==null?'':String(v);return /[",\\n\\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  const lines=[_csvData.headers.map(escape).join(',')];
  for(const r of (_csvData.rows||[]))lines.push(r.map(escape).join(','));
  const blob=new Blob(['﻿'+lines.join('\\r\\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=_csvFileName;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},100);
}
document.getElementById('report-csv-btn')?.addEventListener('click',_downloadCsv);
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
            const d = await sfmcFetch(`https://${instance}.exacttarget.com/cloud/fuelapi/automation/v1/automations?$page=${page}&$pagesize=500`);
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
                _stepCount: a.stepCount != null ? a.stepCount : (Array.isArray(a.steps) ? a.steps.length : (leg.activityCount != null ? leg.activityCount : '')),
                // The legacy gridView items have an `id` field that is the
                // LEGACY NUMERIC id — different from v1's GUID `a.id`. This
                // is the id the legacy bulk endpoint
                // `legacy/v1/beta/bulk/automations/automation/definition/{id}`
                // accepts (passing the GUID returns 400 InvalidParameter).
                _legacyId: leg.id != null ? leg.id : (leg.legacyId != null ? leg.legacyId : null)
            };
        });
        // Hydrate folder + step count by mirroring exactly what the in-panel
        // automation detail view does (see openAutomationDetail at the v1
        // fetch + legacy-bulk enrichment block). Two calls per automation:
        //
        //   1. `automation/v1/automations/{GUID}` — for `steps[]` count.
        //   2. `legacy/v1/beta/bulk/automations/automation/definition/{LEGACY_NUMERIC_ID}`
        //      — for `def.folderPath || def.categoryPath`.
        //
        // The legacy bulk endpoint REQUIRES the legacy numeric id (not the
        // v1 GUID, which 400s with "Definition_ID could not be parsed").
        // The legacy gridView list we already fetched contains the numeric
        // id for each automation — `_legacyId` was set during the merge step
        // by joining on `key` (the GUID that BOTH v1 and legacy list share).
        if (statusEl) statusEl.innerHTML = `<div class="scout-loading-state">${I.spinner} Enriching ${allAutos.length} automations…</div>`;

        const BATCH = 10;
        for (let i = 0; i < allAutos.length; i += BATCH) {
            const slice = allAutos.slice(i, i + BATCH);
            await Promise.allSettled(slice.map(async (a) => {
                if (!a.id) return;
                const [v1Res, legRes] = await Promise.allSettled([
                    // v1 detail with the GUID — for steps count.
                    sfmcFetch(
                        `https://${instance}.exacttarget.com/cloud/fuelapi/automation/v1/automations/${a.id}`,
                        'GET', { 'accept': 'application/json' }
                    ),
                    // Legacy bulk with the NUMERIC id — for folderPath.
                    // Skip when we don't have a numeric id (rare).
                    a._legacyId != null
                        ? sfmcFetch(
                            `https://${instance}.exacttarget.com/cloud/fuelapi/legacy/v1/beta/bulk/automations/automation/definition/${a._legacyId}`,
                            'GET', { 'accept': 'application/json' }
                          )
                        : Promise.resolve(null)
                ]);
                const v1  = v1Res.status === 'fulfilled' ? v1Res.value : null;
                const leg = legRes.status === 'fulfilled' ? legRes.value : null;

                // Step count — `steps` (current) OR `automationProcesses` (legacy).
                if ((a._stepCount === '' || a._stepCount == null) && v1) {
                    const procs = Array.isArray(v1.steps) ? v1.steps
                                : Array.isArray(v1.automationProcesses) ? v1.automationProcesses
                                : null;
                    if (procs) a._stepCount = procs.length;
                }
                // Created / Modified date+by — mirror the in-panel automation
                // detail view's field priority (content.js openAutomationDetail).
                // v1 carries createdBy / createdDate / modifiedDate; legacy bulk
                // carries lastSavedBy / lastSaveDate which often have the most
                // recent edit metadata. Try v1 first, fall back to legacy.
                if (v1) {
                    if (!a._createdBy) {
                        const cb = resolveUser(v1.createdBy);
                        if (cb) a._createdBy = cb;
                    }
                    if (!a._modifiedBy) {
                        const mb = resolveUser(v1.modifiedBy || v1.lastSavedBy || v1.lastModifiedBy);
                        if (mb) a._modifiedBy = mb;
                    }
                    if (!a.createdDate)  a.createdDate  = v1.createdDate || v1.createDate || a.createdDate;
                    if (!a.modifiedDate) a.modifiedDate = v1.modifiedDate || v1.lastSaveDate || a.modifiedDate;
                }
                if (leg) {
                    const def = leg.definition || leg.automation || (Array.isArray(leg.items) ? leg.items[0] : null) || leg;
                    if (def) {
                        // Folder path
                        if (!a._folderPath) {
                            const fp = def.folderPath || def.categoryPath;
                            if (fp) a._folderPath = String(fp);
                        }
                        // Created / Modified by from legacy bulk
                        if (!a._createdBy) {
                            const cb = resolveUser(def.createdBy);
                            if (cb) a._createdBy = cb;
                        }
                        if (!a._modifiedBy) {
                            const mb = resolveUser(def.lastSavedBy || def.modifiedBy || def.lastModifiedBy);
                            if (mb) a._modifiedBy = mb;
                        }
                        if (!a.createdDate)  a.createdDate  = def.createdDate || def.createDate || a.createdDate;
                        if (!a.modifiedDate) a.modifiedDate = def.lastSaveDate || def.lastModifiedDate || def.modifiedDate || a.modifiedDate;
                    }
                }
            }));
        }
        // Columns reordered so Created+Created By and Modified+Modified By
        // sit next to each other (was: Created By alone, then dates at the
        // end — confusing). Added Modified By to match the in-panel detail
        // viewer's overview shape.
        const cols = [
            { idx:0, label:'Name' }, { idx:1, label:'Status' },
            { idx:2, label:'Key', align:'mono' }, { idx:3, label:'Last Run' },
            { idx:4, label:'Schedule' }, { idx:5, label:'Steps', align:'right' },
            { idx:6, label:'Folder' }, { idx:7, label:'Description' },
            { idx:8, label:'Created By' }, { idx:9, label:'Created' },
            { idx:10, label:'Modified By' }, { idx:11, label:'Modified' }
        ];
        const rows = allAutos.map(a => {
            return `<tr>
<td title="${escHtml(a.name||'')}">${escHtml(a.name||'—')}</td>
<td>${reportStatusBadge(a.status||a.statusName||'')}</td>
<td class="mono">${escHtml(a.key||a.automationKey||'—')}</td>
<td>${escHtml(formatDate(a.lastRunTime||a.lastRun||''))}</td>
<td>${escHtml(a._scheduleTypeName||'')}</td>
<td style="text-align:right">${a._stepCount !== '' && a._stepCount != null ? a._stepCount : '—'}</td>
<td style="max-width:200px" title="${escHtml(a._folderPath||'')}">${escHtml(a._folderPath||'—')}</td>
<td style="max-width:180px">${escHtml((a.description||'').substring(0,80))}</td>
<td>${escHtml(a._createdBy||'—')}</td>
<td>${escHtml(formatDate(a.createdDate||a.createDate||'')) || '—'}</td>
<td>${escHtml(a._modifiedBy||'—')}</td>
<td>${escHtml(formatDate(a.modifiedDate||a.lastSaveDate||'')) || '—'}</td>
</tr>`;
        }).join('');
        const csvData = {
            headers: ['Name', 'Status', 'Key', 'Last Run', 'Schedule', 'Steps', 'Folder', 'Description', 'Created By', 'Created', 'Modified By', 'Modified', 'ID'],
            rows: allAutos.map(a => [
                a.name || '', a.status || a.statusName || '',
                a.key || a.automationKey || '', a.lastRunTime || a.lastRun || '',
                a._scheduleTypeName || '', a._stepCount != null ? a._stepCount : '',
                a._folderPath || '', a.description || '',
                a._createdBy || '', a.createdDate || a.createDate || '',
                a._modifiedBy || '', a.modifiedDate || a.lastSaveDate || '',
                a.id || ''
            ])
        };
        const logoUrl = await getLogoDataUrl();
        const html = reportHtmlShell('Automations Report', allAutos.length, instance, rows || '<tr><td colspan="12" style="text-align:center;padding:30px;color:#64748B;">No automations found.</td></tr>', cols, '', logoUrl, S.theme, csvData);
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
        // Bulk-fetch all eventDefinitions in a single paginated call so we can
        // resolve dataExtensionName for the Entry DE column. The trigger
        // metaData on journeys only contains `eventDefinitionId` — the actual
        // DE name lives on the eventDefinition record. Same pattern as
        // DEUsageHandler's journey lookup.
        const evDefIndex = {};
        try {
            const evBulk = await sfmcFetch(`https://${instance}.exacttarget.com/cloud/fuelapi/interaction/v1/eventDefinitions?$sort=createdDate%20desc&$pageSize=1000&$page=1`);
            for (const ev of ((evBulk && evBulk.items) || [])) {
                if (ev.id) evDefIndex[ev.id.toLowerCase()] = ev;
                if (ev.eventDefinitionKey) evDefIndex[ev.eventDefinitionKey] = ev;
            }
        } catch (_) { /* report still works without DE resolution */ }
        const resolveEntryDe = (j) => {
            const trig = (j.triggers && j.triggers[0]) || {};
            const tMeta = trig.metaData || {};
            // Some triggers carry dataExtensionName/Id inline — happens on a
            // minority. Most need the eventDef join.
            if (tMeta.dataExtensionName) return tMeta.dataExtensionName;
            const evId = tMeta.eventDefinitionId;
            if (evId) {
                const ev = evDefIndex[evId.toLowerCase()];
                if (ev) return ev.dataExtensionName || (ev.arguments && ev.arguments.dataExtensionName) || '';
            }
            return '';
        };
        // Columns chosen for an at-a-glance audit: who, what state, scale, type.
        // Dropped Key (external GUID) + Created (redundant w/ Modified) — neither
        // is something readers scan a report for. Added HTS / Trigger Type /
        // Population — operational signals that match the detail-card pills.
        const cols = [
            { idx:0, label:'Name' },
            { idx:1, label:'Status' },
            { idx:2, label:'v', align:'right' },
            { idx:3, label:'HTS', align:'center' },
            { idx:4, label:'Trigger' },
            { idx:5, label:'Entry DE' },
            { idx:6, label:'Population', align:'right' },
            { idx:7, label:'Channel' },
            { idx:8, label:'Modified' }
        ];
        const enriched = allJ.map(j => {
            const trig = (j.triggers && j.triggers[0]) || {};
            const hts = !!(j.metaData && j.metaData.highThroughputSending && j.metaData.highThroughputSending.email);
            const pop = j.stats && typeof j.stats.cumulativePopulation === 'number' ? j.stats.cumulativePopulation : null;
            const entryDe = resolveEntryDe(j);
            const channel = j.channel || j.definitionType || '';
            return { j, trig, hts, pop, entryDe, channel };
        });
        const rows = enriched.map(({ j, trig, hts, pop, entryDe, channel }) => {
            return `<tr>
<td title="${escHtml(j.name||'')}">${escHtml(j.name||'—')}</td>
<td>${reportStatusBadge(j.status||'')}</td>
<td style="text-align:right">${j.version||'—'}</td>
<td style="text-align:center">${hts ? '<span style="font-size:10px;background:rgba(1,118,211,0.15);color:#0176D3;border:1px solid rgba(1,118,211,0.3);padding:1px 6px;border-radius:9px;font-weight:600;letter-spacing:0.04em">HTS</span>' : '—'}</td>
<td>${escHtml(trig.type || '—')}</td>
<td title="${escHtml(entryDe)}">${escHtml(entryDe || '—')}</td>
<td style="text-align:right" class="mono">${pop !== null ? pop.toLocaleString() : '—'}</td>
<td>${escHtml(channel || '—')}</td>
<td>${escHtml(formatDate(j.modifiedDate||j.lastModifiedDate||''))}</td>
</tr>`;
        }).join('');
        const csvData = {
            headers: ['Name', 'Status', 'Version', 'HTS', 'Trigger', 'Entry DE', 'Population', 'Channel', 'Modified', 'Interaction ID'],
            rows: enriched.map(({ j, trig, hts, pop, entryDe, channel }) => [
                j.name || '', j.status || '', j.version || '', hts ? 'Yes' : '',
                trig.type || '', entryDe || '', pop != null ? pop : '',
                channel || '', j.modifiedDate || j.lastModifiedDate || '', j.id || ''
            ])
        };
        const logoUrl = await getLogoDataUrl();
        const html = reportHtmlShell('Journeys Report', allJ.length, instance, rows || '<tr><td colspan="9" style="text-align:center;padding:30px;color:#64748B;">No journeys found.</td></tr>', cols, '', logoUrl, S.theme, csvData);
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
        // Use the cookie-only proxy at mc.{stack}.exacttarget.com instead of
        // the CSRF-required content-builder.{stack}.marketingcloudapps.com.
        // The old CSRF flow was breaking with 403 EBADCSRFTOKEN whenever the
        // stored token went stale. Same endpoint shape; no token needed.
        let allA = [], page = 1;
        while (true) {
            const d = await sfmcFetch(
                `https://mc.${stack}.exacttarget.com/cloud/fuelapi/asset/v1/content/assets/query?scope=ours`,
                'POST',
                {},
                { page: { page, pageSize: 500 } }
            );
            const items = d && (d.items || []);
            if (!items.length) break;
            allA = allA.concat(items);
            if (allA.length >= (d.count || items.length)) break;
            page++;
            if (page > 20) break;
        }
        // Fetch the full category tree once so we can render the full folder
        // breadcrumb ("Content Builder / Email / API_Email") instead of just
        // the leaf folder name. SFMC's UI uses the same idea.
        const catMap = new Map();
        try {
            const catRes = await sfmcFetch(
                `https://mc.${stack}.exacttarget.com/cloud/fuelapi/asset/v1/content/categories?$page=1&$pagesize=500`
            );
            for (const c of (catRes && catRes.items || [])) {
                if (c && c.id != null) catMap.set(String(c.id), c);
            }
        } catch (_) { /* fall back to leaf-only path if categories endpoint errors */ }
        const buildAssetPath = (catId, fallback) => {
            if (!catId) return fallback || '';
            const segs = [];
            let id = String(catId);
            const seen = new Set();
            let depth = 0;
            while (id && id !== '0' && !seen.has(id) && depth < 20) {
                seen.add(id);
                const c = catMap.get(id);
                if (!c) break;
                segs.unshift(c.name);
                id = c.parentId != null ? String(c.parentId) : null;
                depth++;
            }
            return segs.length ? segs.join(' / ') : (fallback || '');
        };

        const cols = [
            { idx:0, label:'Name' }, { idx:1, label:'Type' }, { idx:2, label:'Status' },
            { idx:3, label:'ID', align:'right' }, { idx:4, label:'Email ID', align:'right' },
            { idx:5, label:'Customer Key', align:'mono' },
            { idx:6, label:'Folder' }, { idx:7, label:'Created By' },
            { idx:8, label:'Created' }, { idx:9, label:'Modified' }
        ];
        const enriched = allA.map(a => {
            const type = a.assetType ? (a.assetType.displayName || a.assetType.name || '') : '';
            const folder = buildAssetPath(a.category ? a.category.id : null, a.category ? a.category.name : '');
            const owner = a.owner ? (a.owner.name || a.owner.userName || '') : '';
            const assetStatusRaw = a.status ? (typeof a.status === 'object' ? (a.status.name || '') : String(a.status)) : '';
            const emailLegacyId = a.data && a.data.email && a.data.email.legacy
                ? a.data.email.legacy.legacyId : null;
            const pubUrl = a.fileProperties && a.fileProperties.publishedURL ? a.fileProperties.publishedURL : null;
            return { a, type, folder, owner, assetStatusRaw, emailLegacyId, pubUrl };
        });
        const rows = enriched.map(({ a, type, folder, owner, assetStatusRaw, emailLegacyId, pubUrl }) => {
            const nameCell = pubUrl
                ? `<a href="${escHtml(pubUrl)}" target="_blank" style="color:inherit;text-decoration:underline;text-decoration-color:rgba(127,127,127,0.4);text-underline-offset:2px;">${escHtml(a.name||'—')}</a>`
                : escHtml(a.name||'—');
            return `<tr>
<td title="${escHtml(a.name||'')}">${nameCell}</td>
<td>${escHtml(type)}</td>
<td>${reportStatusBadge(assetStatusRaw)}</td>
<td style="text-align:right" class="mono">${a.id||'—'}</td>
<td style="text-align:right" class="mono">${emailLegacyId != null ? escHtml(String(emailLegacyId)) : '—'}</td>
<td class="mono">${escHtml(a.customerKey||'—')}</td>
<td>${escHtml(folder || '—')}</td>
<td>${escHtml(owner)}</td>
<td>${escHtml(formatDate(a.createdDate||a.createdOn||''))}</td>
<td>${escHtml(formatDate(a.modifiedDate||a.lastModifiedDate||''))}</td>
</tr>`;
        }).join('');
        const csvData = {
            headers: ['Name', 'Type', 'Status', 'ID', 'Email ID', 'Customer Key', 'Folder', 'Created By', 'Created', 'Modified', 'Published URL'],
            rows: enriched.map(({ a, type, folder, owner, assetStatusRaw, emailLegacyId, pubUrl }) => [
                a.name || '', type, assetStatusRaw, a.id || '', emailLegacyId || '',
                a.customerKey || '', folder, owner,
                a.createdDate || a.createdOn || '', a.modifiedDate || a.lastModifiedDate || '',
                pubUrl || ''
            ])
        };
        const logoUrl = await getLogoDataUrl();
        const html = reportHtmlShell('Assets Report', allA.length, instance, rows || '<tr><td colspan="10" style="text-align:center;padding:30px;color:#64748B;">No assets found.</td></tr>', cols, '', logoUrl, S.theme, csvData);
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
        const base = `https://${instance}.exacttarget.com/cloud/fuelapi`;
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
        // Hydrate folder + updateType per-row via parallel ?view=categoryinfo
        // (same trick the activity search uses). HTTP/2 multiplexes, so wall
        // cost ≈ one extra request even for ~hundreds of activities.
        const TYPE_PATH = {
            'SQL Query':      'queries',
            'Script':         'scripts',
            'Filter':         'filters',
            'Send Email':     null,  // emailsenddefinition is on a different base
            'Import':         'imports',
            'File Transfer':  'filetransfers',
            'Data Extract':   'dataextracts'
        };
        if (statusEl) statusEl.innerHTML = `<div class="scout-loading-state">${I.spinner} Enriching ${allActs.length} activities…</div>`;
        await Promise.allSettled(allActs.map(async (a) => {
            const k = a.queryDefinitionId || a.id || a.key || a.customerKey || a.CustomerKey;
            if (!k) return;
            let url;
            if (a._type === 'Send Email') {
                url = `${base}/messaging-internal/v1/emailsenddefinition/${k}?view=categoryinfo`;
            } else if (TYPE_PATH[a._type]) {
                url = `${base}/automation/v1/${TYPE_PATH[a._type]}/${k}?view=categoryinfo`;
            } else return;
            try {
                const d = await sfmcFetch(url);
                if (!d) return;
                if (d.folderLocationText) a._folderPath = String(d.folderLocationText).replace(/\//g, ' / ');
                if (d.targetUpdateTypeName) a._updateType = d.targetUpdateTypeName;
            } catch (_) {}
        }));

        const cols = [
            { idx:0, label:'Name' }, { idx:1, label:'Type' },
            { idx:2, label:'Key', align:'mono' }, { idx:3, label:'Target DE' },
            { idx:4, label:'Update Type' }, { idx:5, label:'Folder' },
            { idx:6, label:'Description' }, { idx:7, label:'Modified' }
        ];
        const rows = allActs.map(a => {
            const target = getActivityTarget(a);
            return `<tr>
<td title="${escHtml(a.name||a.Name||'')}">${escHtml(a.name||a.Name||'—')}</td>
<td>${activityTypeBadge(a._type)}</td>
<td class="mono">${escHtml(a.key||a.customerKey||a.CustomerKey||'—')}</td>
<td>${escHtml(target)}</td>
<td>${escHtml(a._updateType || a.targetUpdateTypeName || '—')}</td>
<td style="max-width:200px" title="${escHtml(a._folderPath||'')}">${escHtml(a._folderPath || '—')}</td>
<td style="max-width:200px">${escHtml(((a.description||a.Description||'').substring(0,100)))}</td>
<td>${escHtml(formatDate(a.modifiedDate||a.lastModifiedDate||a.ModifiedDate||''))}</td>
</tr>`;
        }).join('');
        const csvData = {
            headers: ['Name', 'Type', 'Key', 'Target DE', 'Update Type', 'Folder', 'Description', 'Modified'],
            rows: allActs.map(a => [
                a.name || a.Name || '', a._type || '',
                a.key || a.customerKey || a.CustomerKey || '',
                getActivityTarget(a), a._updateType || a.targetUpdateTypeName || '',
                a._folderPath || '', a.description || a.Description || '',
                a.modifiedDate || a.lastModifiedDate || a.ModifiedDate || ''
            ])
        };
        const logoUrl = await getLogoDataUrl();
        const html = reportHtmlShell('Activities Report', allActs.length, instance, rows || '<tr><td colspan="8" style="text-align:center;padding:30px;color:#64748B;">No activities found.</td></tr>', cols, '', logoUrl, S.theme, csvData);
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
    const base = `https://${instance}.exacttarget.com/cloud/fuelapi`;
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
    const base = `https://${instance}.exacttarget.com/cloud/fuelapi`;
    const key = act.key || act.customerKey || act.CustomerKey;
    let data = null;
    try {
        // `?view=categoryinfo` is the magic param — adds `folderLocationText`
        // (full breadcrumb like "Query/Production Team/Aldorino/X") and
        // `targetUpdateTypeName` (Overwrite/Append/Update/Update Add) to the
        // response. SFMC's UI uses the same param. Confirmed working on SQL
        // queries via HAR; other activity types accept it too.
        const endpointMap = {
            'SQL Query': `${base}/automation/v1/queries/${key}?view=categoryinfo`,
            'Script': `${base}/automation/v1/scripts/${key}?view=categoryinfo`,
            'Filter': `${base}/automation/v1/filters/${key}?view=categoryinfo`,
            'Import': `${base}/automation/v1/imports/${key}?view=categoryinfo`,
            'File Transfer': `${base}/automation/v1/filetransfers/${key}?view=categoryinfo`,
            'Data Extract': `${base}/automation/v1/dataextracts/${key}?view=categoryinfo`,
            'Send Email': `${base}/messaging-internal/v1/emailsenddefinition/${key}?view=categoryinfo`
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

    // Activity body renders with the SAME shape as the automation tab's
    // step-code viewer: `.scout-code-block` for SQL/SSJS (uses highlightSQL /
    // highlightJavaScript + Copy button), `.scout-activity-meta-panel` +
    // `.scout-meta-table` for metadata-only activities (Send Email, Import,
    // Data Extract, File Transfer). Don't inline-style this — panel.css owns
    // both themes (light + dark) for these classes and they need to match the
    // automation tab visually.
    let contentBlock = '';
    if (!loading) {
        const queryText = merged.queryText || merged.query || '';
        const scriptText = merged.script || merged.scriptText || merged.content || '';

        const codeBlock = (codeText, langLabel, language) => {
            const highlighted = language === 'sql'
                ? highlightSQL(codeText)
                : (language === 'javascript' || language === 'ssjs')
                    ? highlightJavaScript(codeText)
                    : escHtml(codeText);
            return `<div class="scout-code-block">
                <div class="scout-code-header">
                    <span class="scout-code-lang">${escHtml(langLabel)}</span>
                    <button class="scout-code-copy">${I.copy} Copy</button>
                </div>
                <span class="scout-code-text" style="display:none;">${escHtml(codeText)}</span>
                <div class="scout-code-highlighted">${highlighted}</div>
            </div>`;
        };

        // Build a metadata-only panel using the same `.scout-meta-table` shape
        // the automation tab uses for non-code activities.
        const metaPanel = (typeName, rows) => {
            const filtered = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
            if (!filtered.length) return '';
            const tableRows = filtered
                .map(([k, v]) => `<tr><td>${escHtml(k)}</td><td>${escHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}</td></tr>`)
                .join('');
            return `<div class="scout-activity-meta-panel">
                <div class="scout-activity-meta-heading"><span class="scout-activity-type-badge">${escHtml(typeName)}</span> ${escHtml(act.name || act.Name || '')}</div>
                ${merged.description || merged.Description ? `<div class="scout-activity-desc">${escHtml(merged.description || merged.Description || '')}</div>` : ''}
                <table class="scout-meta-table">${tableRows}</table>
            </div>`;
        };

        if (act._type === 'SQL Query' && queryText) {
            contentBlock = codeBlock(queryText, 'SQL', 'sql');
        } else if (act._type === 'Script' && scriptText) {
            contentBlock = codeBlock(scriptText, 'SSJS', 'ssjs');
        } else if (act._type === 'Send Email') {
            const emailName = merged.email ? (merged.email.name || merged.email.emailName || '') : (merged.emailName || '');
            const listName = merged.list ? (merged.list.listName || merged.list.name || '') : '';
            const fromName = merged.fromName || merged.senderName || '';
            const fromEmail = merged.fromEmail || merged.senderEmail || '';
            contentBlock = metaPanel('Send Email', [
                ['Email', emailName],
                ['List', listName],
                ['From Name', fromName],
                ['From Email', fromEmail]
            ]);
        } else if (act._type === 'Import') {
            const sourceType = merged.fileTransferLocation ? merged.fileTransferLocation.name : (merged.sourceObjectName || merged.fileLocation || '');
            const updateType = merged.updateType || merged.updateTypeId || '';
            const destDE = (merged.destination && (merged.destination.name || merged.destination.objectName)) || merged.destinationObjectName || '';
            const fileNamingPattern = merged.fileNamingPattern || merged.filenamingpattern || '';
            contentBlock = metaPanel('Import', [
                ['File Location', sourceType],
                ['Update Type', updateType],
                ['Destination DE', destDE],
                ['File Pattern', fileNamingPattern]
            ]);
        } else if (act._type === 'Data Extract') {
            const extractType = merged.extractDefinitionType || merged.dataExtractTypeId || '';
            const filePattern = merged.fileSpec || merged.fileNamingPattern || '';
            const additionalInfo = merged.additionalInfo || '';
            contentBlock = metaPanel('Data Extract', [
                ['Extract Type', extractType],
                ['File Pattern', filePattern],
                ['Additional Info', additionalInfo]
            ]);
        } else if (act._type === 'File Transfer') {
            const direction = merged.fileTransferDirection || merged.direction || '';
            const location = (merged.fileTransferLocation && merged.fileTransferLocation.name) || merged.fileLocation || '';
            const fileNamingPattern = merged.fileNamingPattern || merged.filenamingpattern || '';
            contentBlock = metaPanel('File Transfer', [
                ['Direction', direction],
                ['Location', location],
                ['File Pattern', fileNamingPattern]
            ]);
        } else if (act._type === 'Filter') {
            const sourceDE = (merged.sourceObject && merged.sourceObject.name) || merged.sourceObjectName || '';
            const destDE = (merged.destinationObject && merged.destinationObject.name) || merged.destinationObjectName || '';
            const filterDef = merged.filterDefinitionId || merged.filterActivityDefinitionId || '';
            contentBlock = metaPanel('Filter', [
                ['Source DE', sourceDE],
                ['Destination DE', destDE],
                ['Filter Definition ID', filterDef]
            ]);
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
        ${merged.targetUpdateTypeName ? `<div><span style="color:var(--s-text-3)">Update Type</span><br><strong style="color:var(--s-text-1);">${escHtml(merged.targetUpdateTypeName)}</strong></div>` : ''}
        ${merged.folderLocationText ? `<div style="grid-column:1/-1;"><span style="color:var(--s-text-3)">Folder</span><br><span style="color:var(--s-text-2);">${escHtml(merged.folderLocationText.replace(/\//g, ' / '))}</span></div>` : ''}
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

    // Copy-button delegation — mirrors the handler in renderAutomationDetail()
    // so .scout-code-block in the activity report behaves identically to the
    // automation tab's step-code viewer.
    container.querySelectorAll('.scout-code-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const block = btn.closest('.scout-code-block');
            const code = block?.querySelector('.scout-code-text')?.textContent || '';
            navigator.clipboard.writeText(code).then(() => {
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.innerHTML = I.copy + ' Copy'; }, 1500);
            }).catch(() => toast('Copy failed', 'error'));
        });
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
            // CSV download is now inside the generated HTML report — single
            // button here keeps the panel tight, no flex:1 so it matches the
            // natural width of the buttons in journeys/automations/assets.
            container.innerHTML = renderReportCard('de-report', 'Data Extensions Report', I.database,
                'Exports all DEs with folder path, row count, field count, sendable status, owner and dates. CSV download is inside the report.',
                `<button class="scout-btn scout-btn-primary" id="de-report-html">${I.report} View HTML Report</button>`);
            document.getElementById('de-report-html')?.addEventListener('click', async () => {
                const st = document.getElementById('de-report-status');
                if (st) st.innerHTML = `<div class="scout-loading-state">${I.spinner} Generating…</div>`;
                const logoUrl = await getLogoDataUrl();
                // Theme flows server-side so the report CSS is generated correctly the first time
                // (no brittle </head> string-replace, no light-mode bleed when panel is in dark).
                chrome.runtime.sendMessage({ action: 'generateReport', format: 'html', instance, theme: S.theme }, res => {
                    if (res && res.success && res.html) {
                        let html = res.html;
                        if (logoUrl) {
                            html = html.replace(
                                '<h1 class="report-title">',
                                `<img src="${logoUrl}" style="width:28px;height:28px;border-radius:6px;object-fit:contain;flex-shrink:0;" alt="SFMC Scout"><h1 class="report-title">`
                            );
                        }
                        openBlobReport(html);
                        if (st) st.innerHTML = `<span class="scout-status-success">${I.check} ${res.count} DEs exported.</span>`;
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
    // Click the session badge to manually re-verify SFMC reachability
    document.getElementById('scout-badge-token')?.addEventListener('click', () => {
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

    // Load saved theme (or use the 'light' default) and apply it unconditionally.
    // applyTheme() MUST run on every panel mount even when there's no stored value,
    // otherwise the DOM stays in the hardcoded-HTML state (dark) while S.theme
    // says 'light' — that mismatch is what caused the "first click does nothing"
    // toggle bug: click 1 toggled S.theme light→dark with no visual change because
    // the DOM was already dark, click 2 finally hit a real transition.
    chrome.storage.local.get(['scout_theme'], res => {
        if (res.scout_theme === 'light' || res.scout_theme === 'dark') {
            S.theme = res.scout_theme;
        }
        applyTheme();
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
        // Quietly probe the session on first open so the badge reflects reality
        // without nagging the user with a toast.
        if (!S.panelOpenedOnce) {
            S.panelOpenedOnce = true;
            refreshAllTokensWithGhostTabs(true);
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
