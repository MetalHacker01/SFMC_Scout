/**
 * DE Search Service — the one actually wired up.
 *
 * Call path: panel DE-tools input → background.js → ActionsHandler.handleDESearch
 *            → this file's searchDataExtensions().
 *
 * Folder-path strategy under the cookie-only proxy (no CSRF) — IMPORTANT,
 * read FIXES.md before changing:
 *
 *   1. `/data-internal/v1/customobjects/category/0?retrievalType=1&includeFullPath=true`
 *      returns local DEs with `categoryFullPath` populated. Shared-subfolder
 *      DEs come back here too but `categoryFullPath` is often null because
 *      the server-side path resolver doesn't traverse shared trees at the
 *      root call.
 *   2. `retrievalType=2&includeFullPath=true` catches cross-BU synced DEs.
 *   3. Walking `/legacy/v1/beta/folder/{id}/children` recursively then
 *      hitting `/customobjects/category/{folderId}?retrievalType=1&includeFullPath=true`
 *      per folder returns `categoryFullPath` correctly for shared-subfolder
 *      DEs (verified working — same shape DEReportService uses).
 *
 * Pass 3 here previously omitted `includeFullPath=true` on the per-folder
 * call, so shared-subfolder DEs came back with no path. The legacy fallback
 * `fetchFolderPath(categoryId)` then hit `/legacy/v1/beta/folder/{id}` GET
 * which returns 401/403 on cookie-only — so the user saw
 * `Data Extensions/[Unknown Folder]`.
 *
 * Belt-and-braces: we also build a folderId → fullPath map *during* the
 * Pass 3 children walk (the children responses give us folder names with
 * IDs). Any DE missing categoryFullPath after all passes gets patched from
 * the map. This way we recover even if the server fails to populate
 * categoryFullPath for some shape.
 */

import { InstanceService } from '../utils/InstanceService.js';

const PAGE_SIZE = 1000;

// ─── In-memory cache for the combined DE list ───────────────────────────────
// Keyed by API base URL (instance-specific). 5-minute TTL. Stores the merged
// items from passes 1/2/3 plus the folderId → path map built during Pass 3,
// so subsequent searches don't re-fetch anything.
const _deCache = new Map(); // base → { ts, items, folderPaths }
const CACHE_TTL = 5 * 60 * 1000;

function _getCached(base) {
    const entry = _deCache.get(base);
    if (entry && (Date.now() - entry.ts) < CACHE_TTL) return entry;
    return null;
}

function _setCached(base, items, folderPaths) {
    _deCache.set(base, { ts: Date.now(), items, folderPaths });
}

/**
 * Fetch all pages from a paginated SFMC customobjects endpoint.
 */
async function fetchAllDEPages(baseUrl) {
    let allItems = [];
    let page = 1;

    while (true) {
        const url = `${baseUrl}&$page=${page}&$pagesize=${PAGE_SIZE}`;
        let response;
        try {
            response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: { 'accept': 'application/json', 'Content-Type': 'application/json' }
            });
        } catch (_) { break; }
        if (!response.ok) break;

        const data = await response.json();
        const items = data.items || [];
        allItems = allItems.concat(items);

        const total = data.count || 0;
        if (items.length < PAGE_SIZE || allItems.length >= total) break;
        page++;
        if (page > 500) break;
    }

    return allItems;
}

async function _getJson(url) {
    try {
        const r = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: { 'accept': 'application/json' }
        });
        if (!r.ok) return null;
        return await r.json();
    } catch (_) { return null; }
}

/**
 * Walks a single shared folder, collecting DEs and recording the folder's
 * full path. Both calls fire in parallel; siblings recurse in parallel too.
 *
 * @param {string} base
 * @param {string|number} folderId
 * @param {string} folderPath - accumulated path with back-slashes, e.g.
 *        "Shared Items\Test\UAT_DIana". Used both to record this folder
 *        in folderPaths and to patch DEs that come back without one.
 * @param {Map<string,string>} folderPaths - folderId → full path (mutated)
 * @param {Set<string>} existingIds - DE ids already collected (mutated)
 * @param {Array} out - merged DE list (mutated)
 * @param {number} depth - 3 covers typical 3-level shared trees
 */
async function fetchSharedCategoryTree(base, folderId, folderPath, folderPaths, existingIds, out, depth = 3) {
    if (depth <= 0) return;

    folderPaths.set(String(folderId), folderPath);

    const [deItems, childrenData] = await Promise.all([
        // includeFullPath=true is CRITICAL — without it, categoryFullPath
        // is null and the user sees [Unknown Folder]. This was the bug.
        fetchAllDEPages(
            `${base}/data-internal/v1/customobjects/category/${folderId}?retrievalType=1&includeFullPath=true`
        ).catch(() => []),
        depth > 1
            ? _getJson(`${base}/legacy/v1/beta/folder/${folderId}/children?Localization=true&$top=1000&$skip=0`)
            : null
    ]);

    for (const d of deItems) {
        if (!d || !d.id) continue;
        // Belt: if server didn't populate categoryFullPath, patch from the
        // accumulated walk path (we know the DE is in folderId = current).
        if (!d.categoryFullPath) d.categoryFullPath = folderPath;
        if (!existingIds.has(d.id)) {
            existingIds.add(d.id);
            out.push(d);
        }
    }

    if (childrenData) {
        const children = (childrenData.entry || childrenData.items || []).filter(c => {
            const t = (c.type || '').toLowerCase();
            return t.includes('dataextension') || t.includes('shared_data');
        });
        if (children.length > 0) {
            await Promise.all(children.map(child => {
                const childName = child.name || '';
                const childPath = folderPath ? `${folderPath}\\${childName}` : childName;
                return fetchSharedCategoryTree(
                    base, child.id, childPath, folderPaths, existingIds, out, depth - 1
                );
            }));
        }
    }
}

/**
 * Build the combined DE list and folderId→path map for an instance.
 * Cached for 5 minutes. Failures in Pass 2/3 are non-fatal.
 */
async function _buildOrGetCache(base) {
    const cached = _getCached(base);
    if (cached) return cached;

    const merged = [];
    const seen = new Set();
    const folderPaths = new Map();
    const pushAll = (arr) => {
        for (const d of arr) {
            if (d && d.id && !seen.has(d.id)) {
                seen.add(d.id);
                merged.push(d);
            }
        }
    };

    // Pass 1: local DEs (this BU's standard tree).
    try {
        const standard = await fetchAllDEPages(
            `${base}/data-internal/v1/customobjects/category/0?retrievalType=1&includeFullPath=true`
        );
        pushAll(standard);
    } catch (err) {
        throw new Error(`Failed to fetch own DEs: ${err.message}`);
    }

    // Pass 2: cross-BU synced DEs.
    try {
        const sharedItems = await fetchAllDEPages(
            `${base}/data-internal/v1/customobjects/category/0?retrievalType=2&includeFullPath=true`
        );
        pushAll(sharedItems);
    } catch (_) { /* non-fatal */ }

    // Pass 3: walk "Shared Items" folder tree, collecting DEs AND building
    // folderId → fullPath map for post-processing patch-up.
    try {
        const rootsData = await _getJson(
            `${base}/legacy/v1/beta/folder?$where=allowedtypes%20in%20(%27dataextension%27,%27shared_data%27,%27synchronizeddataextension%27,%27salesforcedataextension%27)&Localization=true`
        );
        if (rootsData) {
            const roots = rootsData.entry || rootsData.items || [];
            const sharedRoots = roots.filter(r => (r.type || r.iconType || '').toLowerCase() === 'shared_data');

            // For each shared root: get its children (top-level shared subfolders).
            const rootChildren = await Promise.all(
                sharedRoots.map(root =>
                    _getJson(`${base}/legacy/v1/beta/folder/${root.id}/children?Localization=true&$top=1000&$skip=0`)
                        .then(cd => ({ root, cd }))
                )
            );

            // Walk each top-level shared subfolder fully in parallel.
            const tasks = [];
            for (const { root, cd } of rootChildren) {
                if (!cd) continue;
                folderPaths.set(String(root.id), root.name || 'Shared Items');
                const children = (cd.entry || cd.items || []).filter(c => {
                    const t = (c.type || '').toLowerCase();
                    return t.includes('dataextension') || t.includes('shared_data');
                });
                for (const child of children) {
                    const childName = child.name || '';
                    const rootName = root.name || 'Shared Items';
                    const childPath = `${rootName}\\${childName}`;
                    tasks.push(fetchSharedCategoryTree(
                        base, child.id, childPath, folderPaths, seen, merged
                    ));
                }
            }
            await Promise.all(tasks);
        }
    } catch (_) { /* non-fatal */ }

    // Belt-and-braces patch-up: any DE still missing categoryFullPath but
    // with a categoryId that the walk discovered gets patched from the map.
    for (const d of merged) {
        if (!d.categoryFullPath && d.categoryId) {
            const p = folderPaths.get(String(d.categoryId));
            if (p) d.categoryFullPath = p;
        }
    }

    _setCached(base, merged, folderPaths);
    return { items: merged, folderPaths };
}

/**
 * Search for Data Extensions
 * @param {string} searchTerm - Search term
 * @param {string} instance - SFMC instance (e.g., 'mc.s50')
 * @returns {Promise<Array>} Array of matching Data Extensions
 */
export async function searchDataExtensions(searchTerm, instance = null) {
    if (!instance) {
        instance = await InstanceService.getInstance();
    }
    if (!instance.startsWith('mc.')) {
        instance = `mc.${instance}`;
    }

    const base = InstanceService.getApiBaseUrl(instance);
    const { items: allItems, folderPaths } = await _buildOrGetCache(base);

    if (!allItems.length) return [];

    const term = searchTerm.toLowerCase();
    const matched = allItems.filter(item =>
        (item.name || '').toLowerCase().includes(term)
    );

    if (!matched.length) return [];

    return matched.map(item => {
        // Use the DE's own categoryFullPath if populated (server-side or
        // patched during Pass 3 walk). Otherwise try the folderId map.
        // Last resort: 'Uncategorized'. No /folder/{id} GET fallback —
        // that endpoint returns 401/403 on shared folder IDs.
        let path = item.categoryFullPath
            ? item.categoryFullPath.replace(/\\/g, '/')
            : (item.categoryPath ? item.categoryPath.replace(/\\/g, '/') : null);
        if (!path && item.categoryId) {
            const mapped = folderPaths.get(String(item.categoryId));
            if (mapped) path = mapped.replace(/\\/g, '/');
        }
        if (!path || path === '[Unknown Folder]' || path.endsWith('/[Unknown Folder]')) {
            path = 'Uncategorized';
        }

        return {
            id: item.id,
            name: item.name,
            customerKey: item.key || item.customerKey || null,
            path: path,
            fieldCount: item.fieldCount,
            rowCount: item.rowCount,
            owner: item.ownerName || null,
            isSendable: item.isSendable,
            createdDate: item.createdDate || null,
            modifiedDate: item.modifiedDate || null,
            modifiedByName: item.modifiedByName || null
        };
    });
}

/**
 * Invalidate the in-memory cache (called when user switches BU / refreshes).
 */
export function invalidateDESearchCache(instance) {
    if (!instance) { _deCache.clear(); return; }
    const inst = instance.startsWith('mc.') ? instance : `mc.${instance}`;
    const base = InstanceService.getApiBaseUrl(inst);
    _deCache.delete(base);
}
