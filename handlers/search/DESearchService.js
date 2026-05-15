// handlers/search/DESearchService.js
// Search service for Data Extensions
//
// Folder path strategy — IMPORTANT, read FIXES.md before changing.
//
// SFMC stores DEs in THREE distinct shapes on any given BU. To get full
// coverage of names AND paths, all three must be queried:
//
//   1. Local DEs (this BU's own "Data Extensions" tree)
//      → /customobjects/category/0?retrievalType=1&includeFullPath=true
//
//   2. Cross-BU synced DEs (DEs from OTHER BUs synced into this one)
//      → /customobjects/category/0?retrievalType=2&includeFullPath=true
//
//   3. This BU's "Shared Items" subfolder DEs (this BU placed DEs inside
//      its own Shared Items tree — NOT covered by retrievalType=1 or =2)
//      → walk the folder tree:
//          /legacy/v1/beta/folder?$where=allowedtypes in (shared_data,...)
//          → /legacy/v1/beta/folder/{rootId}/children
//          → /customobjects/category/{folderId}?retrievalType=1&includeFullPath=true
//          (recurse children)
//
// Missing Pass 3 was the cause of "Data Extensions/[Unknown Folder]" for
// shared DEs like M1_Test_PulseDE etc. The DE Report's fetchAllDeData has
// always done all three passes — this service mirrors that structure.
//
// Per-folder GET (`folder/{id}` WITHOUT `/children`) is NOT usable — it
// returns 401/403 for shared folder IDs. But `folder/{id}/children` works
// (it's what SFMC's own UI uses for the folder-picker modal).
//
// The combined three-pass dump is cached in-memory for 5 minutes keyed by
// API base URL. After that, every subsequent search filters the cache
// client-side. `$search` is NOT used — it does not populate
// `categoryFullPath` reliably (returns null until the SFMC UI primes the
// server cache for that BU).

import { InstanceService } from '../../utils/InstanceService.js';

const _deBasicsCache = new Map(); // base → { ts, items }
const DE_CACHE_TTL_MS = 5 * 60 * 1000;
const PAGE_SIZE = 1000;

async function _fetchAllDEPages(baseUrl) {
    let page = 1;
    let all = [];
    let total = 0;

    while (true) {
        const url = `${baseUrl}&$page=${page}&$pagesize=${PAGE_SIZE}`;
        let resp;
        try {
            resp = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: { 'accept': 'application/json' }
            });
        } catch (_) {
            break;
        }
        if (!resp.ok) {
            if (page === 1) throw new Error(`HTTP ${resp.status}`);
            break;
        }
        const data = await resp.json();
        const items = data.items || data.entry || [];
        all = all.concat(items);
        if (page === 1) total = data.count || data.totalCount || items.length;
        if (items.length < PAGE_SIZE || all.length >= total) break;
        page++;
        if (page > 500) break;
    }
    return all;
}

async function _getJson(url) {
    try {
        const resp = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: { 'accept': 'application/json' }
        });
        if (!resp.ok) return null;
        return await resp.json();
    } catch (_) {
        return null;
    }
}

// Recursively walks one folder of the Shared Items tree, collecting DEs
// from /customobjects/category/{folderId}?retrievalType=1&includeFullPath=true
// and recursing into all DE/shared_data children in parallel. Depth=3
// covers the typical 3-level shared hierarchy SFMC uses.
async function _walkSharedTree(base, folderId, seen, out, depth = 3) {
    if (depth <= 0) return;

    const [deItemsResult, childrenData] = await Promise.all([
        _fetchAllDEPages(
            `${base}/data-internal/v1/customobjects/category/${folderId}?retrievalType=1&includeFullPath=true`
        ).catch(() => []),
        depth > 1
            ? _getJson(`${base}/legacy/v1/beta/folder/${folderId}/children?Localization=true&$top=1000&$skip=0`)
            : null
    ]);

    for (const item of deItemsResult) {
        if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            out.push(item);
        }
    }

    if (childrenData) {
        const children = (childrenData.entry || childrenData.items || []).filter(c => {
            const t = (c.type || '').toLowerCase();
            return t.includes('dataextension') || t.includes('shared_data');
        });
        if (children.length > 0) {
            await Promise.all(
                children.map(child => _walkSharedTree(base, child.id, seen, out, depth - 1))
            );
        }
    }
}

async function _getCachedDeBasics(base) {
    const cached = _deBasicsCache.get(base);
    if (cached && (Date.now() - cached.ts) < DE_CACHE_TTL_MS) {
        return cached.items;
    }

    const merged = [];
    const seen = new Set();
    const pushAll = (arr) => {
        for (const item of arr) {
            if (item && item.id && !seen.has(item.id)) {
                seen.add(item.id);
                merged.push(item);
            }
        }
    };

    // Pass 1 + Pass 2 in parallel — same endpoint as DE Report.
    const standardUrl = `${base}/data-internal/v1/customobjects/category/0?retrievalType=1&includeFullPath=true`;
    const sharedUrl   = `${base}/data-internal/v1/customobjects/category/0?retrievalType=2&includeFullPath=true`;

    const [standard, shared] = await Promise.allSettled([
        _fetchAllDEPages(standardUrl),
        _fetchAllDEPages(sharedUrl)
    ]);
    if (standard.status === 'fulfilled') pushAll(standard.value);
    if (shared.status   === 'fulfilled') pushAll(shared.value);

    // Pass 3 — Shared Items folder tree. Failures here are non-fatal:
    // local + cross-BU still get cached.
    try {
        const rootsData = await _getJson(
            `${base}/legacy/v1/beta/folder?$where=${encodeURIComponent("allowedtypes in ('dataextension','shared_data','synchronizeddataextension','salesforcedataextension')")}&Localization=true`
        );
        if (rootsData) {
            const roots = rootsData.entry || rootsData.items || [];
            const sharedRoots = roots.filter(r =>
                (r.type || r.iconType || '').toLowerCase() === 'shared_data'
            );
            // Get top-level children of every shared root in parallel.
            const rootChildren = await Promise.all(
                sharedRoots.map(root =>
                    _getJson(`${base}/legacy/v1/beta/folder/${root.id}/children?Localization=true&$top=1000&$skip=0`)
                )
            );
            const topFolders = [];
            for (const cd of rootChildren) {
                if (!cd) continue;
                const children = (cd.entry || cd.items || []).filter(c => {
                    const t = (c.type || '').toLowerCase();
                    return t.includes('dataextension') || t.includes('shared_data');
                });
                topFolders.push(...children);
            }
            // Walk all top-level folders fully in parallel.
            await Promise.all(
                topFolders.map(folder => _walkSharedTree(base, folder.id, seen, merged))
            );
        }
    } catch (_) { /* shared tree unavailable — keep what we have */ }

    _deBasicsCache.set(base, { ts: Date.now(), items: merged });
    return merged;
}

export class DESearchService {
    static MAX_RESULTS = 40;

    /**
     * Invalidate the DE basics cache for an instance. Called when the user
     * explicitly refreshes tokens / switches BU, so the next search rebuilds.
     */
    static invalidateCache(instance) {
        if (!instance) {
            _deBasicsCache.clear();
            return;
        }
        const inst = instance.startsWith('mc.') ? instance : `mc.${instance}`;
        const stack = inst.replace(/^mc\./, '');
        const base = `https://mc.${stack}.exacttarget.com/cloud/fuelapi`;
        _deBasicsCache.delete(base);
    }

    static async search(searchTerm, instance = null) {
        if (!searchTerm || searchTerm.trim().length === 0) return [];

        try {
            const sfmcInstance = instance || await InstanceService.getInstance();
            const stack = sfmcInstance.replace(/^mc\./, '');
            const base = `https://mc.${stack}.exacttarget.com/cloud/fuelapi`;

            const allItems = await _getCachedDeBasics(base);

            const term = searchTerm.toLowerCase().trim();
            const matches = [];
            for (const item of allItems) {
                if (matches.length >= this.MAX_RESULTS) break;
                if (!item.name || !item.name.toLowerCase().includes(term)) continue;
                matches.push(item);
            }

            return matches.map(item => ({
                type: 'data-extension',
                id: item.id,
                name: item.name,
                customerKey: item.customerKey || item.key,
                fieldCount: item.fieldCount || 0,
                rowCount: item.rowCount || 0,
                isSendable: item.isSendable || false,
                categoryId: item.categoryId,
                // categoryFullPath is back-slash-separated; normalise to forward-slash
                // for display. categoryPath is a legacy fallback that's almost always
                // missing, but kept for safety.
                path: item.categoryFullPath
                    ? item.categoryFullPath.replace(/\\/g, '/')
                    : (item.categoryPath ? item.categoryPath.replace(/\\/g, '/') : null),
                url: `https://${sfmcInstance}.marketingcloudapps.com/contactsmeta/admin.html#admin/data-extension/${item.id}/properties/`
            }));
        } catch (error) {
            return [];
        }
    }
}
